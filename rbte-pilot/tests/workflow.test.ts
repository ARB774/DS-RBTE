import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { eq } from 'drizzle-orm';
import { checkCloud,cloudGroups,profileLinks,type Profile } from '../lib/cloud-method';
import { definitionFor,parseStepFields,stepOrder } from '../lib/steps';
import { checkStep,basisData } from '../lib/workflow-check';
import { evaluateWorkflow } from '../lib/workflow-ai';
import { contextOf,hashBasis } from '../lib/workflow-store';
import { persistDraft } from '../lib/drafts';
import { persistSituation } from '../lib/create-situation';
import { stepDrafts,users,revisions,situations } from '../db/schema';
const cloud={goal:'Устойчиво выполнять свою работу',needA:'Сохранять сроки поставки',needB:'Сохранять качество продукции',actionA:'Отгрузить заказ сегодня',actionB:'Проверить все детали до отгрузки'};
test('personal dilemma adds actions; other profiles retain ten steps',()=>{
 assert.equal(stepOrder.filter(s=>definitionFor(s,'DILEMMA')).length+1,11);
 assert.equal(stepOrder.filter(s=>definitionFor(s,'CONFLICT')).length+1,10);
 for(const p of ['DILEMMA','CONFLICT','LT_CLOUD','IMMUNITY'] as Profile[])for(const step of stepOrder.filter(s=>s!=='actions'||p==='DILEMMA'))assert.ok(definitionFor(step,p));
 assert.deepEqual(cloudGroups('IMMUNITY'),[['B'],['Dp'],['D'],['C'],['A']]);
 assert.equal(profileLinks('IMMUNITY').length,7);
});
test('full Pack-TOC immunity map retains D and asks for a missing desired action',()=>{
 const fields=parseStepFields('cloud',cloud,'IMMUNITY');
 assert.equal(fields.actionA,cloud.actionA);
 assert.ok(checkCloud('IMMUNITY',{...cloud,actionA:''}).some(i=>i.field==='actionA'));
 assert.deepEqual(checkCloud('IMMUNITY',fields),[]);
});
test('formulation checks ask about repetitions and placeholders',()=>{
 assert.ok(checkCloud('DILEMMA',{...cloud,needA:cloud.actionA}).some(i=>i.field==='needA'));
 assert.ok(checkCloud('DILEMMA',{...cloud,actionB:cloud.actionA}).some(i=>i.field==='actionB'));
 assert.ok(checkCloud('DILEMMA',{...cloud,goal:'не знаю'}).some(i=>i.field==='goal'));
});
test('current step checks do not require future decisions or results',()=>{
 assert.deepEqual(checkStep('cloud','DILEMMA',{...cloud,actionsCheck:'Да',needsCheck:'Да',goalCheck:'Да'}).issues,[]);
 assert.ok(checkStep('logic','DILEMMA',{ab:'Не знаю'}).issues.some(i=>i.field==='ab'));
 assert.deepEqual(checkStep('decision','DILEMMA',{choice:'Отказ от выбора',reason:'Нужны сведения о доступных ресурсах',risks:'Нет полномочий менять процедуру'}).issues,[]);
});
test('freshness ignores check metadata and future steps but tracks upstream edits',()=>{
 const original=[{step:'cloud',fields:cloud},{step:'logic',fields:{ab:'Да'}}];
 const basis=basisData('logic','DILEMMA','эпизод',original);
 assert.equal(basis,basisData('logic','DILEMMA','эпизод',[...original,{step:'result',fields:{actual:'позже'}}]));
 assert.equal(basis,basisData('logic','DILEMMA','эпизод',original.map(d=>({...d,fields:{...d.fields,__check:'metadata'}}))));
 assert.notEqual(basis,basisData('logic','DILEMMA','эпизод',[{step:'cloud',fields:{...cloud,goal:'Новая общая цель'}},original[1]]));
 assert.notEqual(basis,basisData('logic','IMMUNITY','эпизод',original));
 assert.notEqual(hashBasis('logic','DILEMMA',contextOf({signal:'эпизод',task:'исходная задача'}),original),hashBasis('logic','DILEMMA',contextOf({signal:'эпизод',task:'новая задача'}),original));
});
test('invalid fields and option values are rejected; caller cannot forge check metadata',()=>{
 assert.throws(()=>parseStepFields('logic',{ab:'incorrect'},'DILEMMA'));
 assert.throws(()=>parseStepFields('cloud',{goal:'x'.repeat(4001)},'DILEMMA'));
 assert.equal(parseStepFields('cloud',{...cloud,__basis:'forged'},'DILEMMA').__basis,undefined);
});
test('semantic review sends only current/earlier content and validates field references',async()=>{
 let body:any;
 const transport=async(_url:any,init:any)=>{body=JSON.parse(init.body);return new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({issues:[],note:'Нужна проверка автором.'})}]}]}));};
 const report=await evaluateWorkflow('cloud',{profile:'IMMUNITY',signal:'Учебный эпизод'},[{step:'cloud',fields:cloud},{step:'result',fields:{actual:'FUTURE_SECRET'}},{step:'explore',fields:{observations:'LEGACY_SECRET'}}],{key:'fake',model:'fake'},transport as typeof fetch);
 assert.equal(report.mode,'ai');assert.equal(body.store,false);
 assert.ok(!body.input.includes('FUTURE_SECRET'));assert.ok(!body.input.includes('LEGACY_SECRET'));
 await assert.rejects(()=>evaluateWorkflow('cloud',{profile:'DILEMMA',signal:'эпизод'},[],{key:'fake',model:'fake'},(async()=>new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({issues:[{field:'trial.action',criterion:'x',observation:'x',question:'x'}],note:'x'})}]}]}))) as typeof fetch));
});
test('database persistence: four profiles, history, ownership, locked situations, conflicts, baseline',async()=>{
 const pg=new PGlite();const database=drizzle(pg);
 try{
  for(const name of ['0000_boring_strong_guy.sql','0001_portal_identity.sql','0002_situation_reviews.sql'])await pg.exec(await readFile(new URL('../db/migrations/'+name,import.meta.url),'utf8'));
  const userId=randomUUID(),otherId=randomUUID();
  await database.insert(users).values([{id:userId,email:'author@example.test',name:'Автор',passwordHash:'unused'},{id:otherId,email:'other@example.test',name:'Другой',passwordHash:'unused'}]);
  for(const profile of ['DILEMMA','CONFLICT','LT_CLOUD','IMMUNITY'] as Profile[]){
   const id=randomUUID();await persistSituation(database,{id:userId},{profile,title:'Учебная ситуация',signal:'Подробное описание эпизода',sensitivity:'STANDARD',supportLevel:'NONE'},id,randomUUID());
   if(profile==='DILEMMA'){
    await assert.rejects(()=>persistDraft(database,userId,id,'cloud',0,cloud),/сначала заполните/);
    await assert.rejects(()=>persistDraft(database,userId,id,'actions',0,{actionRows:'[]'}),/как минимум два/);
    const draftId=randomUUID();await persistSituation(database,{id:userId},{profile,title:'Черновик ситуации',signal:'Подробное описание эпизода',sensitivity:'STANDARD',supportLevel:'NONE'},draftId,randomUUID());
    await persistDraft(database,userId,draftId,'actions',0,{actionRows:'[]'},true);
    const [partial]=await database.select().from(stepDrafts).where(eq(stepDrafts.situationId,draftId));
    assert.equal(partial.fields.__draft,'true');
    await assert.rejects(()=>persistDraft(database,otherId,draftId,'actions',1,{actionRows:'[]'},true),/недоступна/);
    await assert.rejects(()=>persistDraft(database,userId,draftId,'cloud',0,cloud,true),/сначала заполните/);
    const rows=JSON.stringify([{text:cloud.actionA,kind:'forced',selected:true},{text:cloud.actionB,kind:'preferred',selected:true}]);
    await persistDraft(database,userId,draftId,'actions',1,{actionRows:rows},true);
    await assert.rejects(()=>persistDraft(database,userId,draftId,'cloud',0,cloud,true),/сначала заполните/);
    await persistDraft(database,userId,draftId,'actions',2,{actionRows:rows});
    await persistDraft(database,userId,draftId,'cloud',0,{actionA:'Незавершённая запись'},true);
    const partialCloud=(await database.select().from(stepDrafts).where(eq(stepDrafts.situationId,draftId))).find(d=>d.step==='cloud')!;
    assert.equal(partialCloud.fields.__draft,'true');assert.equal(partialCloud.fields.actionA,'Незавершённая запись');
    assert.equal(partialCloud.fields.__cloudProgress,'1');
    await persistDraft(database,userId,draftId,'cloud',1,{actionA:'Незавершённая запись',__cloudProgress:'0'},true);
    const reopened=(await database.select().from(stepDrafts).where(eq(stepDrafts.situationId,draftId))).find(d=>d.step==='cloud')!;
    assert.equal(reopened.fields.__cloudProgress,'0');
    assert.equal(reopened.fields.__cloudReview,undefined);
    await assert.rejects(()=>persistDraft(database,userId,draftId,'cloud',2,{...cloud,__cloudProgress:'4'}),/подтвердите ответы/);


    await persistDraft(database,userId,id,'actions',0,{actionRows:JSON.stringify([{text:cloud.actionA,kind:'forced',selected:true},{text:cloud.actionB,kind:'preferred',selected:true}])});
    await assert.rejects(()=>persistDraft(database,userId,id,'cloud',0,{...cloud,needA:cloud.actionA}),/повторили действие/);
   }
   const first=await persistDraft(database,userId,id,'cloud',0,cloud);assert.equal(first,1);
   const [draft]=await database.select().from(stepDrafts).where(eq(stepDrafts.situationId,id));
   const cloudDraft=(await database.select().from(stepDrafts).where(eq(stepDrafts.situationId,id))).find(d=>d.step==='cloud')!;
   assert.ok(cloudDraft.fields.__basis);assert.equal(JSON.parse(draft.fields.__check).mode,'local');
   if(profile==='IMMUNITY')assert.equal(draft.fields.actionA,cloud.actionA);
   await assert.rejects(()=>persistDraft(database,otherId,id,'cloud',1,cloud),/недоступна/);
   await assert.rejects(()=>persistDraft(database,userId,id,'cloud',0,cloud),/другой вкладке/);
   await persistDraft(database,userId,id,'cloud',1,{...cloud,goal:'Уточнённая общая цель'});
   const history=await database.select().from(revisions).where(eq(revisions.situationId,id));
   const cloudHistory=history.filter(h=>(h.snapshot as any).step!=='actions');
   assert.equal(cloudHistory.length,3);assert.equal((cloudHistory[1].snapshot as any).fields.goal,cloud.goal);
   assert.equal((cloudHistory[2].snapshot as any).fields.goal,'Уточнённая общая цель');
   if(profile==='DILEMMA'){
    await database.update(stepDrafts).set({fields:{...cloud,links:'Прежние записи о связях'},version:3}).where(eq(stepDrafts.step,'cloud'));
    await persistDraft(database,userId,id,'cloud',3,cloud);
    const legacyHistory=await database.select().from(revisions).where(eq(revisions.situationId,id));
    assert.ok(legacyHistory.some((h:any)=>h.snapshot.fields?.links==='Прежние записи о связях'));
   }
   await database.update(situations).set({locked:true}).where(eq(situations.id,id));
   await assert.rejects(()=>persistDraft(database,userId,id,'cloud',2,cloud),/недоступна/);
  }
 }finally{await pg.close();}
});
