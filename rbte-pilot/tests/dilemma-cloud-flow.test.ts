import test from 'node:test';
import assert from 'node:assert/strict';
import { dilemmaCloudFlow,confirmedCloud } from '../lib/dilemma-cloud-flow';
const full={actionA:'Отправить отчёт',actionB:'Проверить отчёт',needB:'Точность',needA:'Срок',goal:'Выполнить обязательства'};
test('an entered but unconfirmed answer restores the same active question',()=>{
 assert.deepEqual(dilemmaCloudFlow({}),{cursor:0,editing:null});
 assert.deepEqual(dilemmaCloudFlow({actionA:'Отправить отчёт',__cloudProgress:'0'}),{cursor:0,editing:null});
 assert.deepEqual(dilemmaCloudFlow({actionA:'Отправить отчёт',__cloudProgress:'1'}),{cursor:1,editing:null});
 assert.equal(confirmedCloud({...full,__cloudProgress:'4'}),false);
 assert.equal(confirmedCloud({...full,__cloudProgress:'5'}),true);
});
test('invalid progress cannot skip empty nodes; legacy complete answers reopen for correction',()=>{
 assert.deepEqual(dilemmaCloudFlow({__cloudProgress:'5'}),{cursor:0,editing:null});
 assert.deepEqual(dilemmaCloudFlow({actionA:'Ответ',__cloudProgress:'999'}),{cursor:1,editing:null});
 assert.deepEqual(dilemmaCloudFlow(full),{cursor:5,editing:null});
 assert.deepEqual(dilemmaCloudFlow({...full,__cloudProgress:'5',__cloudEditing:'injected'}),{cursor:5,editing:null});
});
test('an unfinished correction restores only the edited node and cannot pass as complete',()=>{
 const draft={...full,goal:'',__cloudProgress:'5',__cloudEditing:'A'};
 assert.deepEqual(dilemmaCloudFlow(draft),{cursor:5,editing:'A'});
 assert.equal(confirmedCloud(draft),false);
 assert.deepEqual(dilemmaCloudFlow({...draft,needA:''}),{cursor:3,editing:null});
});
