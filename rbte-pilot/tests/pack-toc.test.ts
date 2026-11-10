import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { TOC_COMMIT,TOC_VERSION,tocProfiles,tocSources,tocCriteriaForStep } from '../lib/pack-toc';
import { checkCloud,cloudGroups,profileQuestions,type Profile } from '../lib/cloud-method';
import { checkStep,basisData } from '../lib/workflow-check';
import { definitionFor,stepOrder } from '../lib/steps';
import { getTocEvidence } from '../lib/pack-toc-reader';
import { evaluateWorkflow } from '../lib/workflow-ai';
const cloud={goal:'Выполнять обязательства перед клиентами',needA:'Сохранять согласованные сроки',needB:'Поддерживать качество продукции',actionA:'Передаём заказ сегодня',actionB:'Проверяем каждую деталь до передачи'};
test('pinned Pack-TOC sources are complete and match their recorded SHA256',async()=>{
 assert.equal(TOC_COMMIT,'836c4058ae5c801247f1b76f89b650523492ebbf');
 for(const source of Object.values(tocSources)){
  const bytes=await readFile(new URL('../knowledge/pack-toc/'+source.path,import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),source.sha256,source.id);
  assert.ok(source.url.includes('/blob/'+TOC_COMMIT+'/'));
 }
});
test('four profiles use their own source-based order and role definitions',()=>{
 assert.deepEqual(cloudGroups('DILEMMA').flat(),['D','Dp','C','B','A']);
 assert.deepEqual(cloudGroups('CONFLICT').flat(),['D','Dp','B','C','A']);
 assert.deepEqual(cloudGroups('LT_CLOUD').flat(),['B','D','Dp','C','A']);
 assert.deepEqual(cloudGroups('IMMUNITY').flat(),['B','Dp','D','C','A']);
 assert.match(profileQuestions.CONFLICT.D,/другая сторона/);
 assert.match(tocProfiles.IMMUNITY.labels.D,/Желаемое/);
 for(const profile of Object.keys(tocProfiles) as Profile[])for(const step of stepOrder){
  for(const c of tocCriteriaForStep(profile,step))assert.ok(c.sourceIds.every(id=>tocSources[id]));
 }
});
test('meaningful short actions are not rejected by an invented length threshold',()=>{
 assert.deepEqual(checkCloud('DILEMMA',{...cloud,actionA:'Жду'}),[]);
});
test('local objections cite the actual method or failure mode',()=>{
 const repeated=checkCloud('DILEMMA',{...cloud,needA:cloud.actionA});
 assert.ok(repeated.some(i=>i.field==='needA'&&i.sourceIds?.includes('TOC.M.003')));
 const causal=checkCloud('LT_CLOUD',{...cloud,actionA:'Передаём сегодня, потому что нужен срок'});
 assert.ok(causal.some(i=>i.criterion==='Внутри блока — одно утверждение'));
 assert.ok(checkCloud('CONFLICT',{...cloud,goal:'Быть успешными'}).some(i=>i.sourceIds?.includes('TOC.FM.002')));
});
test('profile entry conditions do not silently pass as established facts',()=>{
 const conflict=checkStep('cloud','CONFLICT',{...cloud,otherPositionStatus:'Гипотеза автора — требуется уточнение'});
 assert.ok(conflict.issues.some(i=>i.field==='otherPositionStatus'&&i.sourceIds?.includes('TOCT.14')));
 const fire=checkStep('cloud','LT_CLOUD',{...cloud,stabilization:'Требуется срочное реагирование'});
 assert.ok(fire.issues.some(i=>i.field==='stabilization'&&i.sourceIds?.includes('TOCT.15')));
 const immunity=definitionFor('cloud','IMMUNITY')!;
 assert.ok(immunity.fields.some(f=>f.key==='contextBarriers'&&f.required));
 assert.ok(immunity.fields.some(f=>f.key==='protectiveCommitmentConfirmed'&&f.required));
});
test('assumption focus does not impose all links or a fixed number of beliefs',()=>{
 const immunity=definitionFor('assumptions','IMMUNITY')!;
 assert.equal(immunity.fields.find(f=>f.key==='cd')?.required,true);
 assert.equal(immunity.fields.find(f=>f.key==='ab')?.required,false);
 assert.ok(checkStep('assumptions','DILEMMA',{bd:'Потому что поставка возможна только сегодня'}).issues.some(i=>i.field==='bd'&&i.sourceIds?.includes('TOC.WP.003')));
 assert.ok(basisData('cloud','IMMUNITY','episode',[]).includes(TOC_VERSION));
});
test('runtime retrieval reads authenticated-source snapshots instead of a repository placeholder',async()=>{
 const records=await getTocEvidence('IMMUNITY','cloud');
 assert.ok(records.some(r=>r.id==='TOCT.16'&&r.excerpt.includes('желаемое действие')));
 assert.ok(records.every(r=>r.excerpt.length>0));
});
test('AI receives pinned source excerpts and rejects invented source references',async()=>{
 let body:any;
 const transport=async(_url:any,init:any)=>{body=JSON.parse(init.body);return new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({issues:[],note:'Проверьте формулировки с автором.'})}]}]}));};
 await evaluateWorkflow('cloud',{profile:'IMMUNITY',signal:'Учебный эпизод'},[{step:'cloud',fields:cloud}],{key:'test',model:'test'},transport as typeof fetch);
 const input=JSON.parse(body.input);assert.equal(input.toc.commit,TOC_COMMIT);
 assert.ok(input.evidence.some((r:any)=>r.id==='TOCT.16'&&r.excerpt));
 const invalid=async()=>new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({issues:[{field:'goal',criterion:'x',observation:'x',question:'x',sourceIds:['INVENTED.999']}],note:'x'})}]}]}));
 await assert.rejects(()=>evaluateWorkflow('cloud',{profile:'IMMUNITY',signal:'Учебный эпизод'},[],{key:'test',model:'test'},invalid as typeof fetch));
});
