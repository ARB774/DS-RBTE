import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkActions } from '../lib/dilemma-actions';
import { definitionFor } from '../lib/steps';
test('actions require two classified actions and both distinct selections',()=>{
 assert.ok(checkActions('').length);
 const rows=[{text:'Поговорить с Ивановым',kind:'forced',selected:true},{text:'Ничего не предпринимать',kind:'preferred',selected:true}];
 assert.equal(checkActions(JSON.stringify(rows)).length,0);
 assert.ok(checkActions(JSON.stringify([rows[0]])).length);
 assert.ok(checkActions(JSON.stringify(rows.map(r=>({...r,selected:false})))).length);
 assert.ok(checkActions(JSON.stringify([rows[0],{...rows[1],text:rows[0].text}])).length);
});
test('actions and simplified cloud apply only to personal dilemma',()=>{
 assert.equal(definitionFor('actions','CONFLICT'),undefined);
 assert.equal(definitionFor('cloud','DILEMMA')?.fields.length,5);
 assert.ok((definitionFor('cloud','CONFLICT')?.fields.length||0)>5);
});
