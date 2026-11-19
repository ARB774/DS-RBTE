import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runMentorTurn, type MentorServiceInput } from '../lib/mentor-service';
import { readMentorState, mergeAdmission, admissionKeys, mentorIntent, missingAdmission } from '../lib/mentor-state';
import { valuePropositionEvidence } from '../lib/value-proposition-evidence';
import type { ValuePropositionStage } from '../lib/value-proposition-route';

const retrieve = async (stage: ValuePropositionStage) => valuePropositionEvidence(stage).map(s => ({ ...s, origin: 'verified-cache' as const, fetchedAt: '2026-11-09', excerptSha256: 'test' }));
const participant = ['Мы продаём услугу организациям', 'Веду переговоры, утверждает директор', 'Есть беседы о проблемах клиентов', 'Работаем с обезличенными случаями', 'Хочу научиться разрабатывать предложение'];
const updates = admissionKeys.map((key, i) => ({ key, value: participant[i], quote: participant[i] }));
function input(): MentorServiceInput { return { stage: 'S0', project: { name: 'Учебная B2B-услуга', ownerRole: 'Руководитель отдела', confidentiality: participant[3], systemBoundary: participant[0], trainingResult: participant[4], openGap: 'Объяснить, как уже умеете разрабатывать предложение', nextStep: 'Повторить старый вопрос' },
  history: [{ authorRole: 'PARTICIPANT', stage: 'S0', content: participant[1] }, { authorRole: 'PARTICIPANT', stage: 'S0', content: participant[2] }, ...Array.from({ length: 40 }, () => ({ authorRole: 'MENTOR', stage: 'S0', content: 'Сначала докажите, как используете данные' }))], answer: 'Давайте продолжим обучение', evidence: [], currentDiagram: null }; }
const noGenerate = async (): Promise<never> => { throw new Error('Learning assessment must not run'); };
const generateFromDocuments = async (request: any) => {
  const complete = request.stage !== 'S0' || request.stateCard.admission.length === admissionKeys.length;
  const sourceId = `DS-RBTE.${request.stage}`;
  const text = request.stage === 'S0'
    ? request.stateCard.admission.map((item: any) => `${item.key}: ${item.value}`).join('\n')
    : request.stateCard.products.at(-1)?.text ?? '';
  return {
    reflection: request.intent === 'opening' ? 'Активный модуль загружен из документации.' : 'Попытка сопоставлена с активной процедурой.',
    acceptedUpdate: text || 'Изменений нет', observations: [], criterion: 'Критерий активного модуля',
    priorityGap: complete ? 'confirmation' : 'missing-admission', learningAction: 'Выполнить действие активного модуля',
    helpLevel: 'question' as const, question: complete ? 'Подтвердите показанный рабочий продукт или исправьте его.' : 'Какое недостающее условие допуска вы можете уточнить?',
    proposedStage: request.stage, readyForNextStage: complete, nextStep: complete ? 'Подтвердить продукт' : 'Уточнить условие допуска',
    activeS5Block: null, diagram: request.currentDiagram, workingProduct: text, unknowns: complete ? [] : ['Условие допуска'],
    sourceIds: [sourceId], criterionEvidence: { sourceId, passageIndex: 0 }, criterionQuote: 'Критерий активного модуля',
  };
};

test('legacy looping dialogue reconstructs participant facts beyond 36 turns and offers closure', async () => {
  const result = await runMentorTurn(input(), { retrieve, generate: generateFromDocuments, extract: async ({ texts }) => {
    assert.ok(texts.includes(participant[1]));
    assert.ok(texts.includes(participant[3]));
    assert.ok(!texts.some(t => t.includes('Сначала докажите')));
    return updates;
  } });
  assert.equal(result.stage, 'S0');
  assert.equal(result.state.pending?.ready, true);
  assert.equal(result.state.admission.length, 5);
  assert.match(result.content, /Текущий рабочий продукт/);
  assert.doesNotMatch(result.nextStep, /используете данные/);
});

test('source question calls MCP and directly answers without assessing learner or changing state', async () => {
  const data = input(); data.answer = 'Какие документы тебе доступны как наставнику?';
  const result = await runMentorTurn(data, { retrieve, extract: noGenerate, generate: noGenerate });
  assert.match(result.content, /через MCP/);
  assert.match(result.content, /Постоянное ядро наставника/);
  assert.equal(result.openGap, data.project.openGap);
  assert.equal(result.state.pending, null);
});

test('asking what a boundary means receives an explanation instead of a failed attempt', async () => {
  const data = input(); data.answer = 'Что входит в границы проекта?';
  const result = await runMentorTurn(data, { retrieve, extract: noGenerate, generate: async request => ({ ...(await generateFromDocuments(request)), reflection: 'Объяснение сформировано по DS-RBTE.S0.' }) });
  assert.match(result.content, /DS-RBTE\.S0/);
  assert.doesNotMatch(result.content, /вместо того|не соответствует/);
  assert.equal(result.stage, 'S0');
});

test('confirming displayed product closes module, stores transition packet and reads next module', async () => {
  const data = input();
  const first = await runMentorTurn(data, { retrieve, extract: async () => updates, generate: generateFromDocuments });
  const stages: string[] = [];
  const result = await runMentorTurn({ ...data, evidence: first.state, answer: 'Подтверждаю показанный рабочий продукт', intent: 'confirm' }, {
    retrieve: async stage => { stages.push(stage); return retrieve(stage); }, extract: noGenerate, generate: generateFromDocuments,
  });
  assert.equal(result.stage, 'S1');
  assert.deepEqual(stages, ['S0', 'S1']);
  assert.equal(result.state.products[0].status, 'confirmed');
  assert.equal(result.state.packets[0].product.text, first.state.pending?.text);
  assert.equal(result.state.pending, null);
});

test('a confirmation cannot skip an unfinished module; fabricated participant evidence is rejected', async () => {
  const data = input(); data.answer = 'Да';
  const result = await runMentorTurn(data, { retrieve, extract: noGenerate, generate: noGenerate });
  assert.equal(result.stage, 'S0');
  assert.match(result.content, /ещё не предъявлена/);
  assert.throws(() => mergeAdmission(readMentorState([]), [{ key: 'privacy', value: 'Разрешено всё', quote: 'Разрешено всё' }], participant), /не найден/);
});

test('missing privacy asks only about permitted data, not ability to develop value proposition', async () => {
  const data = input(); data.project.confidentiality = 'Имею доступ к конфиденциальным данным';
  const result = await runMentorTurn(data, { retrieve, extract: async () => [...updates.filter(s => s.key !== 'privacy'), { key: 'privacy', value: 'Разрешено', quote: data.project.confidentiality, usable: true }], generate: generateFromDocuments });
  assert.ok(missingAdmission(result.state).includes('privacy'));
  assert.equal(result.state.pending?.ready, false);
  assert.doesNotMatch(result.content, /как используете данные|все заинтересованные/);
});

test('explicit message intent takes precedence and persisted facts survive a short new history', async () => {
  assert.equal(mentorIntent('Что такое MCP?', 'answer'), 'answer');
  const state = mergeAdmission(readMentorState(['legacy']), updates, participant);
  const result = await runMentorTurn({ ...input(), evidence: state, history: [], answer: 'Продолжим' }, { retrieve, extract: async () => [], generate: generateFromDocuments });
  assert.equal(result.state.admission.length, 5);
  assert.deepEqual(result.state.legacyEvidence, ['legacy']);
});

test('knowing a forbidden data regime does not satisfy admission', () => {
  const state = mergeAdmission(readMentorState([]), [{ key: 'privacy', value: 'Использование запрещено', quote: 'Использование запрещено', usable: false }], ['Использование запрещено']);
  assert.ok(missingAdmission(state).includes('privacy'));
});

test('a repeated question cannot discard a newly formed working product or its diagram', async () => {
  const data=input(); data.stage='S4'; const state=readMentorState([]);state.lastQuestion='Какой результат вы наблюдали?';data.evidence=state;
  const diagram={version:1,kind:'undesirable-effects' as const,title:'Кандидат',purpose:'Уточнение',activeElementId:'ude1',nodes:[{id:'ude1',label:'мало заявок через интернет',type:'ude' as const,status:'candidate' as const,rank:0,order:0}],edges:[]};
  const result=await runMentorTurn(data,{retrieve,extract:noGenerate,generate:async()=>({
    reflection:'Кандидат сохранён',acceptedUpdate:'Новая попытка',observations:['Наблюдение'],criterion:'Критерий',priorityGap:'Конкретность',learningAction:'Уточнить НЖЯ',helpLevel:'question',question:state.lastQuestion,
    proposedStage:'S4',readyForNextStage:false,nextStep:'Уточнить',activeS5Block:null,diagram,workingProduct:'Кандидат: мало заявок через интернет',unknowns:[],sourceIds:['DS-RBTE.S4'],criterionEvidence:{sourceId:'DS-RBTE.S4',passageIndex:0},criterionQuote:'Критерий',
  })});
  assert.equal(result.diagram?.nodes[0].label,'мало заявок через интернет');
  assert.equal(result.state.pending?.text,'Кандидат: мало заявок через интернет');
});

test('приёмка S5: команда начать сначала очищает ошибочный B и возвращает вопрос о необходимом условии', async () => {
  const data = input();
  data.stage = 'S5';
  data.answer = 'Начни S5 сначала';
  const undesirableEffect = {
    version: 1, kind: 'undesirable-effects' as const, title: 'НЖЯ', purpose: 'Выбранные НЖЯ', activeElementId: null,
    nodes: [{ id: 'ude1', label: 'Мало заявок через интернет', type: 'ude' as const, status: 'accepted' as const, rank: 0, order: 0 }], edges: [],
  };
  const badCloud = {
    version: 1, kind: 'cloud' as const, title: 'Туча', purpose: 'Построение Тучи', activeElementId: 'D',
    nodes: [
      { id: 'B', label: 'Мало заявок через интернет', type: 'need' as const, status: 'accepted' as const, rank: 0, order: 0 },
      { id: 'D', label: 'Не сформулировано', type: 'action' as const, status: 'unknown' as const, rank: 0, order: 1 },
      { id: 'C', label: 'Не сформулировано', type: 'need' as const, status: 'unknown' as const, rank: 0, order: 2 },
      { id: 'Dprime', label: 'Не сформулировано', type: 'action' as const, status: 'unknown' as const, rank: 0, order: 3 },
      { id: 'A', label: 'Не сформулировано', type: 'goal' as const, status: 'unknown' as const, rank: 0, order: 4 },
    ], edges: [],
  };
  const state = readMentorState([]);
  state.products.push({ stage: 'S4', version: 1, text: 'Мало заявок через интернет', status: 'confirmed', ready: true, unknowns: [], sourceIds: ['DS-RBTE.S4'], visualization: undesirableEffect });
  state.pending = { stage: 'S5', version: 1, text: 'B: Мало заявок через интернет', status: 'draft', ready: false, unknowns: ['D', 'C', 'Dprime', 'A'], sourceIds: ['DS-RBTE.S5'], visualization: badCloud };
  data.evidence = state;
  data.currentDiagram = badCloud;

  const result = await runMentorTurn(data, { retrieve, extract: noGenerate, generate: noGenerate });

  assert.equal(result.state.pending, null);
  assert.match(result.content, /Черновик текущего этапа сброшен/);
  assert.match(result.nextStep, /необходимое условие/);
  assert.equal(result.diagram?.activeElementId, 'B');
  assert.equal(result.diagram?.nodes.find(node => node.id === 'B')?.status, 'unknown');
});
