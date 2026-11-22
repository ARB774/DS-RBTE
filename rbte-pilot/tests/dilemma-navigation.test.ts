import test from 'node:test';
import assert from 'node:assert/strict';
import { dilemmaResume,dilemmaReady,firstIncompleteLogicLink } from '../lib/dilemma-navigation';
import { definitionFor,logicLinkKeys,seedDilemmaAssumptions } from '../lib/steps';
import { checkStep } from '../lib/workflow-check';
const fields={actionRows:JSON.stringify([{text:'Сообщить руководителю',kind:'forced',selected:true},{text:'Не сообщать руководителю',kind:'preferred',selected:true}])};
const saved={...fields,__check:JSON.stringify(checkStep('actions','DILEMMA',fields))};
test('resume requires checked, fresh steps and never treats a draft as completion',()=>{
 assert.equal(dilemmaResume([]),'actions');
 assert.equal(dilemmaResume([{step:'actions',fields:saved}]),'cloud');
 assert.equal(dilemmaResume([{step:'actions',fields:saved,fresh:false}]),'actions');
 assert.equal(dilemmaResume([{step:'actions',fields:{...saved,__draft:'true'}}]),'actions');
 assert.equal(dilemmaReady('cloud',{goal:'Цель',__check:JSON.stringify({mode:'local',issues:[]})}),false);
});
test('personal step numbering leaves other profile titles intact',()=>{
 assert.equal(definitionFor('cloud','DILEMMA')?.title,'3 · Туча');
 assert.equal(definitionFor('logic','DILEMMA')?.title,'4 · Проверка связей');
 assert.equal(definitionFor('practice','DILEMMA')?.title,'11 · Самостоятельная практика');
 assert.equal(definitionFor('assumption-check','DILEMMA')?.title,'6 · Решения для предположений');
 assert.equal(definitionFor('decision','DILEMMA')?.title,'7 · Выбор решения');
 assert.equal(definitionFor('cloud','CONFLICT')?.title,'2 · Построение грозовой тучи');
 assert.equal(definitionFor('actions','IMMUNITY'),undefined);
});
test('logic reason fields ask for the assumption that holds each cloud link',()=>{
 const fields=definitionFor('logic','DILEMMA')!.fields;
 const reasons=fields.filter(field=>field.key.endsWith('Reason'));
 assert.equal(reasons.length,7);
 assert.equal(reasons.find(field=>field.key==='abReason')?.label,'Исходное предположение: для того чтобы A, необходимо B, потому что…');
 assert.equal(reasons.find(field=>field.key==='conflictReason')?.label,'Исходное предположение: D и D′ несовместимы, потому что…');
 assert.ok(reasons.every(field=>field.label.startsWith('Исходное предположение:')&&field.label.endsWith('потому что…')));
});
test('logic screen has a stable seven-link sequence for one-link-at-a-time navigation',()=>{
 assert.deepEqual(logicLinkKeys,['ab','bd','ac','cd','conflict','dc','db']);
 const keys=definitionFor('logic','DILEMMA')!.fields.map(field=>field.key);
 for(const key of logicLinkKeys)assert.deepEqual(keys.filter(field=>field===key||field===key+'Reason'),[key,key+'Reason']);
});
test('completed logic links do not reopen the last saved yes answer',()=>{
 const completed=Object.fromEntries(logicLinkKeys.flatMap(key=>[[key,'Да'],[key+'Reason','Принятое исходное предположение']]));
 assert.equal(firstIncompleteLogicLink(completed,logicLinkKeys),undefined);
 assert.equal(firstIncompleteLogicLink({...completed,cdReason:''},logicLinkKeys),'cd');
});
test('assumptions reuse all seven accepted logic reasons without asking for sources again',()=>{
 const logic=Object.fromEntries(logicLinkKeys.map(key=>[key+'Reason','Исходное предположение '+key]));
 const definition=definitionFor('assumptions','DILEMMA')!;
 assert.deepEqual(definition.fields.map(field=>field.key),logicLinkKeys);
 assert.ok(definition.fields.every(field=>field.label.includes('Исходное предположение')));
 const seeded=seedDilemmaAssumptions({},logic);
 for(const key of logicLinkKeys)assert.equal(seeded[key],logic[key+'Reason']);
 assert.equal(seedDilemmaAssumptions({ab:'Уточнённая формулировка'},logic).ab,'Уточнённая формулировка');
});
test('personal injection step contains only interface state, not a hardcoded method questionnaire',()=>{
 const fields=definitionFor('assumption-check','DILEMMA')!.fields;
 assert.deepEqual(fields.map(field=>field.key),['injections','assumptionKeys','routeVersion']);
 assert.ok(fields.every(field=>field.required===false));
 assert.ok(fields.every(field=>!/факты|исключения|условия|неизвестно/iu.test(field.label)));
});
test('personal decision compares accepted injections instead of asking for new variants',()=>{
 assert.deepEqual(definitionFor('decision','DILEMMA')!.fields.map(field=>field.key),['selected','finalInjection','reason','conditionB','ensureB','conditionC','ensureC']);
});
