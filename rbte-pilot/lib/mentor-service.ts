import { retrieveMentorMethods, type MentorMethodSource } from './mentor-method-client';
import { extractProjectAdmission, generateValuePropositionMentorTurn } from './value-proposition-mentor';
import { activeProduct, mergeAdmission, mentorIntent, normalizeQuestion, readMentorState, explicitAnonymizedConsent, type MentorState } from './mentor-state';
import { nextValuePropositionStage, valuePropositionRoute, type ValuePropositionStage } from './value-proposition-route';
import type { ValuePropositionDiagram } from './value-proposition-visualization';
import { restoreMentorCloud, mentorCloudQuestion, mentorUndesirableEffectLabels } from './mentor-cloud';

export type MentorServiceInput = {
  stage: ValuePropositionStage; project: { name: string; ownerRole: string; confidentiality: string; systemBoundary: string; trainingResult: string; openGap: string; nextStep: string };
  history: Array<{ authorRole: string; stage: string; content: string }>;
  answer: string; intent?: string; dataMode?: string; evidence: unknown; currentDiagram: ValuePropositionDiagram | null;
};
type Dependencies = { retrieve: typeof retrieveMentorMethods; extract: typeof extractProjectAdmission; generate: typeof generateValuePropositionMentorTurn };
const defaultDependencies: Dependencies = { retrieve: retrieveMentorMethods, extract: extractProjectAdmission, generate: generateValuePropositionMentorTurn };
export type MentorServiceResult = { stage: ValuePropositionStage; state: MentorState; content: string; sources: Omit<MentorMethodSource, 'text'>[];
  openGap: string; nextStep: string; criterion: string; learningAction: string; diagram: ValuePropositionDiagram | null };
function sourceMetadata(sources: MentorMethodSource[]) { return sources.map(({ text: _text, ...source }) => source); }
function sourceAnswer(sources: MentorMethodSource[]) {
  return 'Я прочитал через MCP следующие методические материалы:\n\n' + sources.map(s =>
    `${s.id} — ${s.path}\nРедакция: ${s.commit}; фрагмент: ${s.range}; получение: ${s.origin === 'github' ? 'GitHub' : 'проверенный кэш GitHub'}.\n${s.url}`,
  ).join('\n\n') + '\n\nПредметные документы Pack-TOC подключаются к этапам Тучи, предположений и решения; список выше показывает материалы именно текущего этапа. Кэш сверяется по SHA-256; если источник недоступен и проверенной копии нет, я останавливаю ход. Вопрос об источниках не является учебной ошибкой и не меняет этап.';
}
export async function runMentorTurn(input: MentorServiceInput, deps: Dependencies = defaultDependencies): Promise<MentorServiceResult> {
  let state = readMentorState(input.evidence);
  const undesirableEffects = mentorUndesirableEffectLabels([
    input.currentDiagram,
    state.pending?.visualization,
    ...state.products.map(product => product.visualization),
    ...state.packets.map(packet => packet.product.visualization),
  ]);
  if (input.stage === 'S5') input = { ...input, currentDiagram: restoreMentorCloud([
    input.currentDiagram, state.pending?.stage === 'S5' ? state.pending.visualization : null,
    ...state.products.filter(p => p.stage === 'S5').reverse().map(p => p.visualization),
  ], undesirableEffects) };
  let stage = input.stage;
  let sources = await deps.retrieve(stage);
  const intent = mentorIntent(input.answer, input.intent);
  const definition = valuePropositionRoute[stage];
  const base = (content: string, openGap = input.project.openGap, nextStep = input.project.nextStep): MentorServiceResult => ({
    stage, state, content, sources: sourceMetadata(sources), openGap, nextStep,
    criterion: valuePropositionRoute[stage].acceptance, learningAction: valuePropositionRoute[stage].workProduct, diagram: input.currentDiagram,
  });
  if (intent === 'restart' && stage === 'S5') {
    const cloud = restoreMentorCloud([], undesirableEffects);
    input = { ...input, currentDiagram: cloud };
    const question = mentorCloudQuestion(cloud, sources.find(source => source.id === 'DS-RBTE.S5')?.text ?? '');
    state = { ...state, products: state.products.filter(product => product.stage !== 'S5'), pending: null,
      lastQuestion: question, lastGapKey: 'B', repeats: 0 };
    return base(`Черновик текущего этапа сброшен. Активная процедура перечитана из DS-RBTE.S5.\n\n${question}`, 'B', question);
  }
  if (intent === 'sources') return base(sourceAnswer(sources));
  if (intent === 'explanation') {
    const turn = await deps.generate({ ...input, stateCard: state, methodEvidence: sources, intent: 'explanation' });
    return base(`${turn.reflection}\n\n${turn.question}`);
  }
  if (intent === 'confirm' && state.pending?.stage === stage && state.pending.ready) {
    const confirmed = { ...state.pending, status: 'confirmed' as const };
    const next = nextValuePropositionStage(stage);
    state = { ...state, products: [...state.products, confirmed], pending: null, lastGapKey: '', lastQuestion: '', repeats: 0 };
    if (!next) return base(`Принят итоговый отчёт:\n${confirmed.text}\n\nНеизвестное: ${confirmed.unknowns.join('; ') || 'не указано'}. Цикл разработки завершён.`, '', 'Цикл завершён');
    state.packets.push({ from: stage, to: next, product: confirmed, decisions: [input.answer], unknowns: confirmed.unknowns,
      assistance: 'Рабочий продукт показан целиком и подтверждён участником', independentAction: 'Участник представил и подтвердил свою версию' });
    // Load the next module only after closing and accepting the previous one.
    sources = await deps.retrieve(next);
    stage = next;
    if (next === 'S5') {
      input = { ...input, currentDiagram: restoreMentorCloud([]) };
    }
    const opening = await deps.generate({ ...input, stage: next, stateCard: state, methodEvidence: sources, intent: 'opening' });
    state.lastQuestion = opening.question;
    return { ...base(`Принятая версия «${definition.workProduct}»:\n${confirmed.text}\n\nНеизвестное, которое сохраняем: ${confirmed.unknowns.join('; ') || 'не указано'}.\n\n${opening.reflection}\n\n${opening.question}`, valuePropositionRoute[next].workProduct, opening.question), diagram: opening.diagram ?? input.currentDiagram };
  }
  if (intent === 'confirm') return base('Готовая версия для подтверждения ещё не предъявлена. Сначала соберём и покажем рабочий продукт; согласие само по себе не заменяет его содержание.');
  // A new correction invalidates the old closure offer until it is checked.
  if (state.pending) state.pending = { ...state.pending, ready: false };
  if (stage === 'S0') {
    const isLegacy = !state.admission.length;
    const texts = [input.project.name, input.project.ownerRole, input.project.systemBoundary, input.project.trainingResult, input.project.confidentiality,
      ...(isLegacy ? input.history.filter(t => ['PARTICIPANT', 'CONTEXT'].includes(t.authorRole)).map(t => t.content) : []), input.answer].filter(Boolean);
    if (input.dataMode === 'anonymized') texts.push('Согласен: работаем только с обезличенными случаями без имён, контактов и закрытых документов.');
    let updates = await deps.extract({ texts, current: state.admission, sources });
    // Access to confidential material is never permission to submit it.
    // Only a separate explicit choice or a clear affirmative statement qualifies.
    const consent = texts.find(explicitAnonymizedConsent);
    updates = updates.filter(f => f.key !== 'privacy');
    if (consent) updates.push({ key: 'privacy', value: 'Работаем только с обезличенными случаями без имён, контактов и закрытых документов.', quote: consent, usable: true });
    state = mergeAdmission(state, updates, texts);
  }
  const turn = await deps.generate({ ...input, stateCard: state, methodEvidence: sources, intent: 'answer' });
  if (turn.workingProduct) state.pending = { stage, version: (activeProduct(state, stage)?.version ?? 0) + 1, status: 'draft', ready: turn.readyForNextStage, text: turn.workingProduct, unknowns: turn.unknowns, sourceIds: turn.sourceIds, visualization: turn.diagram ?? input.currentDiagram };
  const repeated = normalizeQuestion(turn.question) === normalizeQuestion(state.lastQuestion);
  if (repeated && !turn.readyForNextStage) {
    state = { ...state, repeats: state.repeats + 1 };
    state.lastQuestion='Что мешает следующей попытке: непонятен смысл задания, недоступны сведения или нужно исправить моё понимание вашего ответа?';
    return { ...base(`Предыдущий вопрос уже был задан. Повторять его как новое требование нельзя.\n\nТекущий рабочий продукт:\n${state.pending?.text || activeProduct(state, stage)?.text || 'Ещё не собран'}\n\n${state.lastQuestion}`, 'Уточнить препятствие выполнения', 'Объяснить затруднение, не повторяя прежнее задание'), diagram:turn.diagram??input.currentDiagram };
  }
  state.lastQuestion = turn.question;
  state.lastGapKey = turn.priorityGap;
  state.repeats = 0;
  // Only a complete product may be offered for closure; ordinary drafts stay editable.
  if (state.pending && !turn.readyForNextStage) state.pending = { ...state.pending, sourceIds: turn.sourceIds };
  const result = base(`${turn.reflection}\n\nТекущий рабочий продукт:\n${turn.workingProduct || 'Пока не собран'}\n\nКритерий: ${turn.criterion}\nОснования: ${turn.sourceIds.join(', ')}\n\n${turn.readyForNextStage && turn.workingProduct ? 'Версия готова к подтверждению. Подтвердите её кнопкой ниже или внесите исправление.' : `Главное затруднение: ${turn.priorityGap}\n\n${turn.question}`}`, turn.priorityGap, turn.nextStep);
  return { ...result, criterion: `${turn.criterion}\nИсточник: ${turn.criterionEvidence.sourceId}, фрагмент ${turn.criterionEvidence.passageIndex + 1}\n${turn.criterionQuote.slice(0, 1200)}`, learningAction: turn.learningAction, diagram: turn.diagram ?? input.currentDiagram };
}
