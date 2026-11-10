import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mentorResponseSchema } from '../lib/value-proposition-mentor';
import { valuePropositionDiagramSchema } from '../lib/value-proposition-visualization';
import { visibleMentorTurns } from '../lib/mentor-history';

test('required diagram stages cannot request a nullable provider response', () => {
  for (const stage of ['S4','S5','S6.1','S6.2','S6.3','S7','S8','S9','S10'] as const) {
    assert.equal((mentorResponseSchema(stage).properties.diagram as any).type, 'object');
    assert.equal((mentorResponseSchema(stage).properties.diagram as any).anyOf, undefined);
  }
  const s4 = mentorResponseSchema('S4').properties.diagram as any;
  assert.deepEqual(s4.properties.kind.enum, ['undesirable-effects']);
  assert.equal(s4.properties.nodes.minItems, 1);
  assert.ok((mentorResponseSchema('S4','explanation').properties.diagram as any).anyOf);
});

test('a single raw undesirable-effect candidate is a valid map without invented causes', () => {
  const diagram = valuePropositionDiagramSchema.parse({ version:1,kind:'undesirable-effects',title:'Кандидаты НЖЯ',purpose:'Уточнить наблюдение',activeElementId:'ude1',
    nodes:[{id:'ude1',label:'мало заявок через интернет',type:'ude',status:'candidate',rank:0,order:0}],edges:[] });
  assert.equal(diagram.nodes[0].label, 'мало заявок через интернет');
  assert.equal(diagram.edges.length, 0);
});

test('repeated notices are collapsed without removing learner answers or changing stored history', () => {
  const content = JSON.stringify({ message:'Ответ сохранён',participantId:'00000000-0000-4000-8000-000000000001',intent:'answer',dataMode:'' });
  const turns = [{id:'p1',authorRole:'PARTICIPANT',content:'мало заявок через интернет'},...['e1','e2','e3'].map(id=>({id,authorRole:'SERVICE',content}))];
  assert.deepEqual(visibleMentorTurns(turns).map(t=>t.id), ['p1','e3']);
  assert.equal(turns.length,4);
  assert.deepEqual(visibleMentorTurns([...turns,{id:'m1',authorRole:'MENTOR',content:'Новая самостоятельная проба'}]).map(t=>t.id), ['p1','m1']);
});
