import { retrieveMentorMethods, type MentorMethodSource } from './mentor-method-client';
import { extractProjectAdmission, generateValuePropositionMentorTurn } from './value-proposition-mentor';
import { activeProduct, admissionProduct, admissionLabels, admissionQuestions, mergeAdmission, mentorIntent, missingAdmission, normalizeQuestion, readMentorState, explicitAnonymizedConsent, type MentorState } from './mentor-state';
import { nextValuePropositionStage, valuePropositionRoute, type ValuePropositionStage } from './value-proposition-route';
import type { ValuePropositionDiagram } from './value-proposition-visualization';

export type MentorServiceInput = {
  stage: ValuePropositionStage; project: { name: string; ownerRole: string; confidentiality: string; systemBoundary: string; trainingResult: string; openGap: string; nextStep: string };
  history: Array<{ authorRole: string; stage: string; content: string }>;
  answer: string; intent?: string; dataMode?: string; evidence: unknown; currentDiagram: ValuePropositionDiagram | null;
};
type Dependencies = { retrieve: typeof retrieveMentorMethods; extract: typeof extractProjectAdmission; generate: typeof generateValuePropositionMentorTurn };
const defaultDependencies: Dependencies = { retrieve: retrieveMentorMethods, extract: extractProjectAdmission, generate: generateValuePropositionMentorTurn };
export type MentorServiceResult = { stage: ValuePropositionStage; state: MentorState; content: string; sources: Omit<MentorMethodSource, 'text'>[];
  openGap: string; nextStep: string; criterion: string; learningAction: string; diagram: ValuePropositionDiagram | null };
const openingQuestions: Record<ValuePropositionStage, string> = {
  S0: admissionQuestions.scope,
  S1: 'Опишите своими словами вашу компанию, какого клиента вы представляете и с какой проблемой он приобретает услугу.',
  S2: 'Какое одно поле исследования и какую наблюдаемую проблему организаций берём в работу?',
  S3: 'По каким признакам вы включите организацию в профиль потенциального клиента, а по каким исключите?',
  S4: 'Какой нежелательный результат в работе организации-клиента вы наблюдали в конкретном случае?',
  S5: 'Какое действующее действие клиента поддерживает выбранное нежелательное явление?',
  'S6.1': 'Как вы объясняете необходимость первой связи принятой Тучи?',
  'S6.2': 'В каких условиях первое принятое предположение обосновано, а в каких перестаёт работать?',
  'S6.3': 'Какое из проверенных предположений вы выбираете для изменения в решении?',
  S7: 'Какие разные изменения могут снять выбранное ограничение и обеспечить обе потребности?',
  S8: 'Как от принятого решения последовательно возникают желательные результаты и возможный отрицательный эффект?',
  S9: 'Как вы проверите текущую версию предложения на представителе выбранного профиля?',
  S10: 'Какие свидетельства показывают, что поставщик способен устойчиво исполнить текущее обещание?',
  S11: 'Соберите итоговую формулировку предложения и основания из принятых рабочих продуктов в отчёт.',
};
function sourceMetadata(sources: MentorMethodSource[]) { return sources.map(({ text: _text, ...source }) => source); }
function sourceAnswer(sources: MentorMethodSource[]) {
  return 'Я прочитал через MCP следующие методические материалы:\n\n' + sources.map(s =>
    `${s.id} — ${s.path}\nРедакция: ${s.commit}; фрагмент: ${s.range}; получение: ${s.origin === 'github' ? 'GitHub' : 'проверенный кэш GitHub'}.\n${s.url}`,
  ).join('\n\n') + '\n\nПредметные документы Pack-TOC подключаются к этапам Тучи, предположений и решения; список выше показывает материалы именно текущего этапа. Кэш сверяется по SHA-256; если источник недоступен и проверенной копии нет, я останавливаю ход. Вопрос об источниках не является учебной ошибкой и не меняет этап.';
}
export async function runMentorTurn(input: MentorServiceInput, deps: Dependencies = defaultDependencies): Promise<MentorServiceResult> {
  let state = readMentorState(input.evidence);
  let stage = input.stage;
  let sources = await deps.retrieve(stage);
  const intent = mentorIntent(input.answer, input.intent);
  const definition = valuePropositionRoute[stage];
  const base = (content: string, openGap = input.project.openGap, nextStep = input.project.nextStep): MentorServiceResult => ({
    stage, state, content, sources: sourceMetadata(sources), openGap, nextStep,
    criterion: valuePropositionRoute[stage].acceptance, learningAction: valuePropositionRoute[stage].workProduct, diagram: input.currentDiagram,
  });
  if (intent === 'sources') return base(sourceAnswer(sources));
  if (intent === 'explanation') {
    if (stage === 'S0') return base('Граница проекта — это договорённость, какую одну B2B-услугу берём, за что вы отвечаете, на какой материал о клиентах можете опереться и как защищаем данные. Учиться разрабатывать предложение можно, даже если утверждает его директор. Готового способа разработки от вас сейчас не требуется.\n\nНапример, можно работать с обезличенными случаями одной услуги, а окончательное предложение передавать на утверждение руководителю. Это пример формы, а не готовая формулировка вашего проекта.\n\n' + (state.pending?.text ? `Текущая версия:\n${state.pending.text}\n\nКакой пункт этой версии вам непонятен?` : 'Какую одну услугу вашей компании для организаций берём в работу?'));
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
    state.lastQuestion = openingQuestions[next];
    return base(`Принятая версия «${definition.workProduct}»:\n${confirmed.text}\n\nНеизвестное, которое сохраняем: ${confirmed.unknowns.join('; ') || 'не указано'}.\n\nТеперь работаем над «${valuePropositionRoute[next].workProduct}». ${valuePropositionRoute[next].goal}\n\n${openingQuestions[next]}`, valuePropositionRoute[next].workProduct, openingQuestions[next]);
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
    const missing = missingAdmission(state);
    const text = admissionProduct(state);
    if (!missing.length) {
    state.pending = { stage, version: (activeProduct(state, stage)?.version ?? 0) + 1, status: 'draft', ready: true, text, unknowns: [], sourceIds: ['DS-RBTE.S0'] };
      state.lastGapKey = 'confirmation';
      state.lastQuestion = 'Подтвердите эту границу проекта или исправьте конкретный пункт.';
      return base(`Для допуска проекта уже достаточно сведений. Уметь разрабатывать предложение заранее не требуется; утверждение директором не мешает обучению.\n\nГраница проекта:\n${text}\n\nПодтвердите эту версию кнопкой ниже или исправьте конкретный пункт. После подтверждения перейдём к исходному представлению о клиенте.`, 'Подтверждение показанной границы проекта', state.lastQuestion);
    }
    const key = missing[0];
    const repeated = state.lastGapKey === key;
    state = { ...state, pending: null, lastGapKey: key, repeats: repeated ? state.repeats + 1 : 0, lastQuestion: admissionQuestions[key] };
    const help = repeated ? 'Поясню, зачем этот пункт: он нужен только для допуска учебного проекта. Не требуется готовый анализ, знание всех клиентов или полномочие утверждать предложение. Можно назвать ограничение или попросить объяснить вопрос.\n\n' : '';
    return base(`Уже зафиксировано:\n${text || 'Пока нет согласованных пунктов.'}\n\nОсталось уточнить: ${admissionLabels[key]}. Основание: DS-RBTE.S0.\n\n${help}${admissionQuestions[key]}`, admissionLabels[key], admissionQuestions[key]);
  }
  const turn = await deps.generate({ ...input, stateCard: state, methodEvidence: sources, intent: 'answer' });
  const repeated = normalizeQuestion(turn.question) === normalizeQuestion(state.lastQuestion);
  if (repeated) {
    state = { ...state, repeats: state.repeats + 1 };
    return base(`Предыдущий вопрос уже был задан. Повторять его как новое требование нельзя.\n\nТекущий рабочий продукт:\n${state.pending?.text || activeProduct(state, stage)?.text || 'Ещё не собран'}\n\nЧто мешает следующей попытке: непонятен смысл задания, недоступны сведения или нужно исправить моё понимание вашего ответа?`, 'Уточнить препятствие выполнения', 'Объяснить затруднение, не повторяя прежнее задание');
  }
  state.lastQuestion = turn.question;
  state.lastGapKey = turn.priorityGap;
  state.repeats = 0;
  if (turn.workingProduct) state.pending = { stage, version: (activeProduct(state, stage)?.version ?? 0) + 1, status: 'draft', ready: turn.readyForNextStage, text: turn.workingProduct, unknowns: turn.unknowns, sourceIds: turn.sourceIds, visualization: turn.diagram ?? input.currentDiagram };
  // Only a complete product may be offered for closure; ordinary drafts stay editable.
  if (state.pending && !turn.readyForNextStage) state.pending = { ...state.pending, sourceIds: turn.sourceIds };
  const result = base(`${turn.reflection}\n\nТекущий рабочий продукт:\n${turn.workingProduct || 'Пока не собран'}\n\nКритерий: ${turn.criterion}\nОснования: ${turn.sourceIds.join(', ')}\n\n${turn.readyForNextStage && turn.workingProduct ? 'Версия готова к подтверждению. Подтвердите её кнопкой ниже или внесите исправление.' : `Главное затруднение: ${turn.priorityGap}\n\n${turn.question}`}`, turn.priorityGap, turn.nextStep);
  return { ...result, learningAction: turn.learningAction, diagram: turn.diagram ?? input.currentDiagram };
}
