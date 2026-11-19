import { parseValuePropositionDiagram, type ValuePropositionDiagram } from './value-proposition-visualization';
import { valuePropositionS5ExpectedBlock, valuePropositionS5NeedIssue } from './value-proposition-route';

const blocks = ['B', 'D', 'C', 'Dprime', 'A'] as const;
export function mentorUndesirableEffectLabels(values: unknown[]): string[] {
  return [...new Set(values
    .map(parseValuePropositionDiagram)
    .filter((diagram): diagram is ValuePropositionDiagram => diagram?.kind === 'undesirable-effects')
    .flatMap(diagram => diagram.nodes.filter(node => node.type === 'ude' && node.status !== 'rejected').map(node => node.label.trim()))
    .filter(Boolean))];
}

export function restoreMentorCloud(values: unknown[], undesirableEffects: string[] = []): ValuePropositionDiagram {
  const diagrams = values.map(parseValuePropositionDiagram).filter((d): d is ValuePropositionDiagram => d?.kind === 'cloud');
  const canonical = (id: string) => ["D'", 'D′'].includes(id) ? 'Dprime' : id;
  const nodes = new Map<string, ValuePropositionDiagram['nodes'][number]>();
  const edges = new Map<string, ValuePropositionDiagram['edges'][number]>();
  for (const diagram of diagrams) {
    for (const node of diagram.nodes) {
      const id = canonical(node.id);
      if (!nodes.has(id) || (nodes.get(id)?.status === 'unknown' && node.status !== 'unknown')) nodes.set(id, { ...node, id });
    }
    for (const edge of diagram.edges) if (!edges.has(edge.id)) edges.set(edge.id, { ...edge, from: canonical(edge.from), to: canonical(edge.to) });
  }
  for (const [order, id] of blocks.entries()) if (!nodes.has(id)) nodes.set(id, {
    id, label: 'Не сформулировано', type: id === 'A' ? 'goal' : id === 'B' || id === 'C' ? 'need' : 'action', status: 'unknown', rank: 0, order,
  });
  let invalidNeedSeen = false;
  for (const id of blocks) {
    const node = nodes.get(id)!;
    if ((id === 'B' || id === 'C') && node.status === 'accepted' && valuePropositionS5NeedIssue(node.label, undesirableEffects)) invalidNeedSeen = true;
    if (invalidNeedSeen && node.status === 'accepted') nodes.set(id, { ...node, status: 'candidate' });
  }
  const cloud: ValuePropositionDiagram = { version: diagrams[0]?.version ?? 1, kind: 'cloud', title: diagrams[0]?.title ?? 'Туча',
    purpose: diagrams[0]?.purpose ?? 'Построение Тучи по одному блоку', activeElementId: null,
    nodes: [...nodes.values()], edges: [...edges.values()].filter(e => nodes.has(e.from) && nodes.has(e.to)) };
  const active = valuePropositionS5ExpectedBlock(cloud);
  cloud.activeElementId = active === 'verification' ? null : active;
  return cloud;
}

export function mentorCloudQuestion(cloud: ValuePropositionDiagram, sourceText: string): string {
  const block = valuePropositionS5ExpectedBlock(cloud);
  if (block === 'verification') {
    const firstCheck = sourceText.match(/1\.\s+(Для достижения `?A`? необходимо `?B`?\.)/u)?.[1];
    if (!firstCheck) throw new Error('В прочитанном модуле S5 не найдена первая проверка Тучи.');
    return `${firstCheck} Верна ли эта связь в данном случае и почему?`;
  }
  const label = block === 'Dprime' ? 'D′' : block;
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const question = sourceText.match(new RegExp(`\\*\\*${escaped}:\\*\\*\\s*«([\\s\\S]*?)»`, 'u'))?.[1];
  if (!question) throw new Error(`В прочитанном модуле S5 не найден вопрос для блока ${label}.`);
  return question.replace(/\s+/g, ' ').trim();
}
