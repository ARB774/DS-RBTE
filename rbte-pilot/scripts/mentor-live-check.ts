// A synthetic regression, no production learner records or database writes.
import assert from 'node:assert/strict';
import { runMentorTurn, type MentorServiceInput } from '../lib/mentor-service';
import { readMentorState } from '../lib/mentor-state';
let checkpoint = 'sources';

async function main() {
  const input: MentorServiceInput = {
    stage: 'S0', project: { name: 'Разработка предложения B2B-услуги', ownerRole: 'Руководитель маркетинга',
      confidentiality: '', systemBoundary: 'Агентство продаёт услуги интернет-маркетинга организациям',
      trainingResult: 'Научиться самостоятельно разрабатывать предложение ценности',
      openGap: 'Как используете данные, если утверждает директор?', nextStep: 'Повторить вопрос' },
    history: [
      { authorRole: 'PARTICIPANT', stage: 'S0', content: 'Я веду переговоры с клиентами и заключаю сделки, а предложение утверждает директор агентства.' },
      { authorRole: 'PARTICIPANT', stage: 'S0', content: 'Есть история общения с компаниями и записи бесед об их проблемах. У меня есть доступ к конфиденциальным данным.' },
      { authorRole: 'MENTOR', stage: 'S0', content: 'Неясно, как используете данные, если утверждает директор. Объясните ещё раз.' },
      { authorRole: 'PARTICIPANT', stage: 'S0', content: 'Анализирую беседы с клиентами об их проблемах.' },
    ], answer: 'Я хочу научиться разрабатывать предложение ценности. Давайте продолжим обучение.', evidence: [], currentDiagram: null,
  };
  const sources = await runMentorTurn({ ...input, answer: 'Какие документы тебе доступны?' });
  assert.match(sources.content, /через MCP/);
  assert.ok(sources.sources.every(s => ['github', 'verified-cache'].includes(s.origin)));
  checkpoint = 'explanation';
  const explanation = await runMentorTurn({ ...input, answer: 'Что входит в границы проекта?' });
  assert.match(explanation.content, /Граница проекта — это/);
  checkpoint = 'admission';
  const admission = await runMentorTurn(input);
  assert.equal(admission.stage, 'S0');
  assert.ok(admission.state.admission.some(f => f.key === 'role'));
  assert.ok(admission.state.admission.some(f => f.key === 'data'));
  assert.ok(!admission.state.admission.some(f => f.key === 'privacy' && f.usable !== false), 'access to secrets is not permission to upload them');
  assert.match(admission.nextStep, /обезличенными/);
  checkpoint = 'privacy';
  const ready = await runMentorTurn({ ...input, evidence: admission.state, history: [], answer: 'Да, работаем только с обезличенными случаями без имён, контактов и закрытых документов.' });
  assert.equal(ready.state.pending?.ready, true);
  checkpoint = 'confirmation';
  const next = await runMentorTurn({ ...input, evidence: ready.state, answer: 'Подтверждаю показанную версию', intent: 'confirm' });
  assert.equal(next.stage, 'S1');
  assert.equal(next.state.products[0].status, 'confirmed');
  assert.equal(next.state.packets[0].to, 'S1');
  assert.doesNotMatch(next.content, /как используете данные, если утверждает директор/i);
  checkpoint = 'S1 attempt';
  const attempt = await runMentorTurn({ ...input, stage: 'S1', evidence: next.state, history: [], project: { ...input.project, openGap: next.openGap, nextStep: next.nextStep },
    answer: 'Наша компания — агентство интернет-маркетинга. Клиент — производственная B2B-компания, которой не хватает обращений потенциальных покупателей. Руководитель ищет услугу привлечения обращений. Это пока моё исходное представление из разговоров с клиентами.' });
  assert.equal(attempt.stage, 'S1');
  assert.ok(attempt.state.pending?.text);
  assert.ok(attempt.sources.some(s => s.id === 'DS-RBTE.S1'));
  checkpoint = 'S4 first undesirable effect';
  const s4State=readMentorState(next.state);
  s4State.products.push({stage:'S3',version:1,status:'confirmed',ready:true,text:'Производственные B2B-компании, которым не хватает обращений покупателей через интернет.',unknowns:[],sourceIds:['DS-RBTE.S3']});
  const s4 = await runMentorTurn({ ...input, stage:'S4', evidence:s4State, history:[],currentDiagram:null,
    project:{...input.project,openGap:'Согласованный набор НЖЯ',nextStep:'Какой нежелательный результат вы наблюдали?'}, answer:'мало заявок через интернет' });
  assert.equal(s4.diagram?.kind,'undesirable-effects');
  assert.ok(s4.diagram?.nodes.some(node=>node.label.includes('заявок') && node.status==='candidate'));
  assert.ok(!s4.diagram?.edges.some(edge=>edge.kind==='cause'||edge.kind==='necessity'));
  console.log('LIVE REGRESSION PASSED: MCP sources, explanation, admission, confidentiality, confirmation, S1 transition, S4 single candidate map. No learner data or DB writes.');
}
main().catch(error => { console.error('LIVE REGRESSION FAILED:', checkpoint, String(error.message).slice(0, 2000)); process.exitCode = 1; });
