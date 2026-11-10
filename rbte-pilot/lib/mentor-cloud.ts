import { parseValuePropositionDiagram, type ValuePropositionDiagram } from './value-proposition-visualization';
import { valuePropositionS5ExpectedBlock } from './value-proposition-route';

const blocks = ['B', 'D', 'C', 'Dprime', 'A'] as const;
export function restoreMentorCloud(values: unknown[]): ValuePropositionDiagram {
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
  const cloud: ValuePropositionDiagram = { version: diagrams[0]?.version ?? 1, kind: 'cloud', title: diagrams[0]?.title ?? 'Туча',
    purpose: diagrams[0]?.purpose ?? 'Построение Тучи по одному блоку', activeElementId: null,
    nodes: [...nodes.values()], edges: [...edges.values()].filter(e => nodes.has(e.from) && nodes.has(e.to)) };
  const active = valuePropositionS5ExpectedBlock(cloud);
  cloud.activeElementId = active === 'verification' ? null : active;
  return cloud;
}

export function mentorCloudQuestion(cloud: ValuePropositionDiagram): string {
  const questions = {
    B: 'Какое необходимое условие важного результата организации ставит под угрозу выбранное НЖЯ?',
    D: 'Что клиентская организация делает, чтобы обеспечить принятое необходимое условие B?',
    C: 'Какое другое необходимое условие организация должна обеспечить и что действие D ставит под угрозу?',
    Dprime: 'Какое другое действие клиентская организация выполняет, чтобы обеспечить C?',
    A: 'Какова общая цель, для которой нужны оба необходимых условия B и C?',
    verification: 'Как вы читаете связи необходимости и объясняете несовместимость действий в этой Туче?',
  };
  return questions[valuePropositionS5ExpectedBlock(cloud)];
}
