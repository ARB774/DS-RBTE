import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkActions, classifyAction, selectOnlyActions } from '../lib/dilemma-actions';
import { definitionFor } from '../lib/steps';
test('actions require two classified actions and both distinct selections',()=>{
 assert.ok(checkActions('').length);
 const rows=[{text:'Поговорить с Ивановым',kind:'forced',selected:true},{text:'Ничего не предпринимать',kind:'preferred',selected:true}];
 assert.equal(checkActions(JSON.stringify(rows)).length,0);
 assert.ok(checkActions(JSON.stringify([rows[0]])).length);
 assert.ok(checkActions(JSON.stringify(rows.map(r=>({...r,selected:false})))).length);
 assert.ok(checkActions(JSON.stringify([rows[0],{...rows[1],text:rows[0].text}])).length);
});
test('the first action of each type becomes main without an extra click',()=>{
 const initial=[{text:'Использовать ИИ',kind:'' as const,selected:false},{text:'Не использовать ИИ',kind:'' as const,selected:false}];
 const preferred=classifyAction(initial,0,'preferred');
 assert.deepEqual(preferred[0],{text:'Использовать ИИ',kind:'preferred',selected:true});
 const complete=classifyAction(preferred,1,'forced');
 assert.deepEqual(complete[1],{text:'Не использовать ИИ',kind:'forced',selected:true});
 assert.equal(checkActions(JSON.stringify(complete)).length,0);
 const alternative=classifyAction([...complete,{text:'Отложить решение',kind:'' as const,selected:false}],2,'forced');
 assert.equal(alternative[1].selected,true);
 assert.equal(alternative[2].selected,false);
 const restored=selectOnlyActions(complete.map(row=>({...row,selected:false})));
 assert.equal(restored[0].selected,true);
 assert.equal(restored[1].selected,true);
});
test('actions and simplified cloud apply only to personal dilemma',()=>{
 assert.equal(definitionFor('actions','CONFLICT'),undefined);
 assert.equal(definitionFor('cloud','DILEMMA')?.fields.length,5);
 assert.ok((definitionFor('cloud','CONFLICT')?.fields.length||0)>5);
});
