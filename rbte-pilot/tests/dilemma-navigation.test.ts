import test from 'node:test';
import assert from 'node:assert/strict';
import { dilemmaResume,dilemmaReady } from '../lib/dilemma-navigation';
import { definitionFor } from '../lib/steps';
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
 assert.equal(definitionFor('cloud','CONFLICT')?.title,'2 · Построение грозовой тучи');
 assert.equal(definitionFor('actions','IMMUNITY'),undefined);
});
