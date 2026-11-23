import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { eq } from 'drizzle-orm';
import { checkCloud,cloudGroups,profileLinks,type Profile } from '../lib/cloud-method';
import { definitionFor,dilemmaDecisionReviewVersion,isCurrentDecisionReviewVersion,parseStepFields,personalDecisionConditionLabel,readSelectedDecisionKeys,stepOrder } from '../lib/steps';
import { allAssumptionInjectionsComplete,checkStep,basisData,readInjections } from '../lib/workflow-check';
import { evaluateWorkflow } from '../lib/workflow-ai';
import { contextOf,hashBasis } from '../lib/workflow-store';
import { persistDraft } from '../lib/drafts';
import { persistSituation } from '../lib/create-situation';
import { stepDrafts,users,revisions,situations } from '../db/schema';
import { dilemmaAssistantEvidence } from '../lib/value-proposition-evidence';
import { createHash } from 'node:crypto';
import { readDilemmaReviewReplies,upsertDilemmaReviewReply } from '../lib/dilemma-review-replies';
const cloud={goal:'Устойчиво выполнять свою работу',needA:'Сохранять сроки поставки',needB:'Сохранять качество продукции',actionA:'Отгрузить заказ сегодня',actionB:'Проверить все детали до отгрузки'};
const dilemmaDocs=async(step:string)=>dilemmaAssistantEvidence(step).map(source=>({...source,origin:'verified-cache' as const,fetchedAt:'2026-11-14',excerptSha256:createHash('sha256').update(source.text).digest('hex')}));
test('personal dilemma forms one injection for every assumption before choosing',async()=>{
 const draftsAction=await readFile(new URL('../app/actions/drafts.ts',import.meta.url),'utf8');
 const workflowForm=await readFile(new URL('../app/components/workflow-form.tsx',import.meta.url),'utf8');
 const solutionDiagram=await readFile(new URL('../app/components/solution-diagram.tsx',import.meta.url),'utf8');
 const assistantSpecification=await readFile(new URL('../../WP-45/ТЗ помощника по построению личной дилеммы.md',import.meta.url),'utf8');
 assert.match(draftsAction,/situation\.profile==='DILEMMA'&&!\['assumptions','trial','result'\]\.includes\(step\)[\s\S]*reviewWorkflow\(id,step,savedVersion,true\)/);
 assert.doesNotMatch(draftsAction,/step==='assumption-check'[\s\S]*return \{version:savedVersion,report:checkStep/);
 assert.doesNotMatch(workflowForm,/Дополнительно проверить смысл с ИИ/);
 assert.match(workflowForm,/assistantReviewRequired=personal&&!personalAssumptions&&!personalTrial&&!personalResult/);
 assert.match(workflowForm,/Исходные предположения сохранены без оспаривания/);
 assert.match(workflowForm,/!personalCloud&&!personalAssumptions&&!personalAssumptionCheck&&!personalTrial&&!personalResult&&currentReport/);
 assert.match(workflowForm,/assumptionChoices\.map\(\(choice,index\)=>/);
 assert.match(workflowForm,/<table className="w-full border-collapse">/);
 assert.match(workflowForm,/Исходное убеждение<\/th><th[\s\S]*Инъекция, опровергающая убеждение/);
 assert.match(workflowForm,/textarea id=\{'injection-'\+choice\.key\}/);
 assert.match(workflowForm,/changeInjection\(choice\.key,event\.target\.value\)/);
 assert.match(workflowForm,/allAssumptionInjectionsComplete/);
 assert.doesNotMatch(workflowForm,/Помощник предлагает решение-кандидат/);
 assert.doesNotMatch(workflowForm,/Принимаю эту формулировку как решение-кандидат/);
 assert.match(workflowForm,/Выберите одно лучшее решение или несколько решений для комбинации/);
 assert.match(workflowForm,/Сохранить черновик/);
 assert.match(assistantSpecification,/Для каждого принятого участником предположения активная роль помогает\s+сформулировать инъекцию `D\*`/);
 assert.match(assistantSpecification,/Вопросы о подтверждающих\s+фактах, контрпримерах и готовности поставить убеждение\s+под сомнение на этом этапе запрещены/);
 assert.match(assistantSpecification,/Этап\s+завершается, когда решение-кандидат записано\s+для каждого предположения/);
 assert.match(assistantSpecification,/одновременно показывает все пары в таблице/);
 assert.match(assistantSpecification,/Инъекция имеет право быть\s+фантастической или пока нереализуемой/);
 assert.match(assistantSpecification,/Проверка допускает два независимых основания:[\s\S]*убеждение либо становится неверным[\s\S]*новое условие, способность, действие или правило делает прежнее действие\s+необязательным/);
 assert.match(assistantSpecification,/Явный отказ руководствоваться убеждением[\s\S]*частным случаем второго основания/);
 assert.match(assistantSpecification,/Мы сами научимся достаточно быстро разрабатывать и\s+тестировать без ИИ/);
 assert.match(workflowForm,/Сохранить и проверить/);
 assert.match(workflowForm,/personalStepComplete\?'btn btn-ghost':'btn btn-primary'/);
 assert.match(workflowForm,/personalStepComplete\?<Link className="btn btn-primary ml-auto"/);
 assert.match(workflowForm,/Помощник подтвердил: каждая инъекция опровергает соответствующее убеждение/);
 assert.match(assistantSpecification,/Сценарий 15\. Помощник не возвращает участника к проверке убеждения/);
 assert.match(assistantSpecification,/выбрать наилучшую инъекцию либо их комбинацию/);
 assert.match(assistantSpecification,/после снятия её исходной\s+посылки участник формулирует `C\*`/);
 assert.match(assistantSpecification,/Выбранное `D\*` должно обеспечивать актуальную пару условий:[\s\S]*`B\*` и `C`[\s\S]*`B` и `C\*`[\s\S]*`B\*` и `C\*`/);
 assert.match(assistantSpecification,/не требует сохранить заменённое условие/);
 assert.doesNotMatch(assistantSpecification,/Почему вы решили поставить под сомнение это\s+убеждение/);
 assert.match(workflowForm,/personalReviewReady/);
 assert.match(workflowForm,/personalDecisionConditionLabel\(field\.key,selectedDecisionKeys\)/);
 assert.match(workflowForm,/showSolution\?<SolutionDiagram/);
 assert.match(workflowForm,/Решение D\* и необходимые условия/);
 assert.match(workflowForm,/Изменить B\*, C\* и решение D\* →/);
 assert.match(solutionDiagram,/D\* · Решение/);
 assert.match(solutionDiagram,/D\* → \{bName\}/);
 assert.match(solutionDiagram,/D\* → \{cName\}/);
 assert.match(workflowForm,/obsoleteDecisionReview=personalDecision&&storedReport\?\.mode==='ai'&&!isCurrentDecisionReviewVersion/);
 assert.match(workflowForm,/Записи изменились[\s\S]*type="submit"[\s\S]*Сохранить изменения и повторить проверку/);
 assert.match(workflowForm,/activeLogicKey=issueLogicKey\|\|\(personalLogic&&dirty\?logicLinkKeys\[logicCursor\]/);
});
test('personal dilemma adds actions; other profiles retain nine steps',()=>{
 assert.equal(stepOrder.filter(s=>definitionFor(s,'DILEMMA')).length+1,10);
 assert.equal(stepOrder.filter(s=>definitionFor(s,'CONFLICT')).length+1,9);
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
test('personal dilemma application checks only interface completeness',()=>{
 assert.deepEqual(checkStep('cloud','DILEMMA',{...cloud,needA:cloud.actionA,actionB:cloud.actionA,goal:'не знаю'}).issues,[]);
 assert.ok(checkStep('cloud','DILEMMA',{...cloud,actionA:''}).issues.some(i=>i.field==='actionA'));
});
test('current step checks do not require future decisions or results',()=>{
 assert.deepEqual(checkStep('cloud','DILEMMA',{...cloud,actionsCheck:'Да',needsCheck:'Да',goalCheck:'Да'}).issues,[]);
 assert.ok(checkStep('logic','DILEMMA',{ab:'Не знаю'}).issues.some(i=>i.field==='ab'));
 assert.deepEqual(checkStep('decision','DILEMMA',{selected:'["ab"]',finalInjection:'Изолировать передаваемый фрагмент кода',reason:'Сохраняет скорость без передачи всей разработки',conditionB:'Сохранять коммерческую тайну бизнеса',ensureB:'Изоляция не раскрывает полный замысел',ensureC:'ИИ ускоряет изолированную задачу'}).issues,[]);
 assert.ok(checkStep('decision','DILEMMA',{selected:'["ab"]',finalInjection:'Решение',reason:'Причина',ensureB:'Причина B',ensureC:'Причина C'}).issues.some(issue=>issue.field==='conditionB'));
 assert.ok(!checkStep('decision','DILEMMA',{selected:'["ab"]',finalInjection:'Решение',reason:'Причина',conditionB:'Новое B*',ensureB:'Причина B',ensureC:'Причина C'}).issues.some(issue=>issue.field==='conditionC'));
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
 const issue={field:'actionA',criterion:'Формулировка D',observation:cloud.actionA,question:'Нужно ли уточнить формулировку?',sourceIds:['DS-RBTE.DILEMMA.ASSISTANT-SPEC']};
 const reviewReplies=upsertDilemmaReviewReply(undefined,issue,'Эпизод 18 ноября.');
 assert.equal(readDilemmaReviewReplies(parseStepFields('cloud',{...cloud,reviewReplies},'DILEMMA').reviewReplies)[0].reply,'Эпизод 18 ноября.');
 assert.throws(()=>parseStepFields('cloud',{...cloud,reviewReplies:'[{"reply":"подмена"}]'},'DILEMMA'),/некорректный ответ/);
});
test('personal decision replaces B or C labels when their necessity assumption is challenged',async()=>{
 assert.deepEqual(readSelectedDecisionKeys('["ab"]'),['ab']);
 assert.equal(personalDecisionConditionLabel('ensureB',['ab']),'Почему решение D* приводит к необходимому условию B*?');
 assert.equal(personalDecisionConditionLabel('ensureC',['ab']),'Почему решение D* приводит к необходимому условию C?');
 let body:any;
 const report=await evaluateWorkflow('decision',{profile:'DILEMMA',signal:'эпизод'},[{step:'decision',fields:{selected:'["ab"]',finalInjection:'Новое решение',reason:'Меняет условие',conditionB:'Новое B*',ensureB:'D* приводит к B*',ensureC:'D* приводит к C'}}],{key:'fake',model:'fake'},(async(_url,init)=>{body=JSON.parse(String(init?.body));return new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({issues:[],note:'Проверено по документации.'})}]}]}));}) as typeof fetch,dilemmaDocs);
 const input=JSON.parse(body.input);
 assert.equal(input.definition.fields.find((field:any)=>field.key==='conditionB').label,'Новое необходимое условие B*');
 assert.equal(input.definition.fields.find((field:any)=>field.key==='conditionC'),undefined);
 assert.equal(input.definition.fields.find((field:any)=>field.key==='ensureB').label,'Почему решение D* приводит к необходимому условию B*?');
 assert.equal(input.definition.fields.find((field:any)=>field.key==='ensureC').label,'Почему решение D* приводит к необходимому условию C?');
 assert.equal(report.method?.version.endsWith(' / '+dilemmaDecisionReviewVersion),true);
 assert.equal(isCurrentDecisionReviewVersion(report.method?.version),true);
 assert.equal(isCurrentDecisionReviewVersion('DS-RBTE old-commit'),false);
});
test('assumption step is complete only after every recorded assumption has an injection',()=>{
 const base={assumptionKeys:'["ab","db"]',selected:'ab',injections:'{}'};
 assert.equal(allAssumptionInjectionsComplete(base),false);
 assert.deepEqual(readInjections('{"ab":"Изолировать код"}'),{ab:'Изолировать код'});
 assert.equal(allAssumptionInjectionsComplete({...base,injections:'{"ab":"Изолировать код","db":"Передавать только обезличенный фрагмент"}'}),true);
});
test('semantic review sends only current/earlier content and validates field references',async()=>{
 let body:any;
 const transport=async(_url:any,init:any)=>{body=JSON.parse(init.body);return new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({issues:[],note:'Нужна проверка автором.'})}]}]}));};
 const report=await evaluateWorkflow('cloud',{profile:'IMMUNITY',signal:'Учебный эпизод'},[{step:'cloud',fields:cloud},{step:'result',fields:{actual:'FUTURE_SECRET'}},{step:'explore',fields:{observations:'LEGACY_SECRET'}}],{key:'fake',model:'fake'},transport as typeof fetch);
 assert.equal(report.mode,'ai');assert.equal(body.store,false);
 assert.ok(!body.input.includes('FUTURE_SECRET'));assert.ok(!body.input.includes('LEGACY_SECRET'));
 let dilemmaBody:any;
 await evaluateWorkflow('logic',{profile:'DILEMMA',signal:'эпизод'},[{step:'cloud',fields:cloud},{step:'logic',fields:{ab:'Да'}}],{key:'fake',model:'fake',dilemmaModel:'gpt-5.4'},(async(_url,init)=>{dilemmaBody=JSON.parse(String(init?.body));return new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({issues:[],note:'Проверено по документации.'})}]}]}));}) as typeof fetch,dilemmaDocs);
 const dilemmaInput=JSON.parse(dilemmaBody.input);
 assert.deepEqual(dilemmaInput.methodEvidence.map((source:any)=>source.id).sort(),['DS-RBTE.ASSISTANT-SKILL','DS-RBTE.DILEMMA.ASSISTANT-SPEC']);
 assert.equal(dilemmaBody.model,'gpt-5.4');
 assert.deepEqual(dilemmaInput.definition.fields.find((field:any)=>field.key==='acReason'),{key:'acReason',label:'Исходное предположение: для того чтобы A, необходимо C, потому что…',issueField:'acReason — Исходное предположение: для того чтобы A, необходимо C, потому что…'});
 assert.equal(dilemmaInput.questions,undefined);assert.equal(dilemmaInput.learningCriteria,undefined);assert.equal(dilemmaInput.toc,undefined);assert.equal(dilemmaInput.evidence,undefined);
 assert.doesNotMatch(dilemmaBody.instructions,/D — конкретное|бездействие — тоже действие/);
 const acReference=dilemmaInput.definition.fields.find((field:any)=>field.key==='acReason').issueField;
 const mapped=await evaluateWorkflow('logic',{profile:'DILEMMA',signal:'эпизод'},[{step:'logic',fields:{ac:'Да',acReason:'Продавать можно только готовый продукт'}}],{key:'fake',model:'fake'},(async()=>new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({issues:[{field:acReference,criterion:'Связь A–C',observation:'Наблюдение',question:'Вопрос',sourceIds:['DS-RBTE.DILEMMA.ASSISTANT-SPEC']}],note:'Проверено.'})}]}]}))) as typeof fetch,dilemmaDocs);
 assert.equal(mapped.issues[0].field,'acReason');
 await assert.rejects(()=>evaluateWorkflow('cloud',{profile:'DILEMMA',signal:'эпизод'},[],{key:'fake',model:'fake'},(async()=>new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({issues:[{field:'trial.action',criterion:'x',observation:'x',question:'x'}],note:'x'})}]}]}))) as typeof fetch,dilemmaDocs));
});
test('personal dilemma sends the current work to the MCP source selector',async()=>{
 let retrievalContext='';
 const retrieve=async(step:string,context?:string)=>{retrievalContext=context||'';return dilemmaDocs(step);};
 const transport=async()=>new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({issues:[],note:'Проверено по документации.'})}]}]}));
 await evaluateWorkflow('logic',{profile:'DILEMMA',signal:'Выбор способа разработки WA-SCM'},[{step:'cloud',fields:cloud},{step:'logic',fields:{ab:'Да',abReason:'Конкуренты используют ИИ'}}],{key:'fake',model:'fake'},transport as typeof fetch,retrieve);
 assert.match(retrievalContext,/Выбор способа разработки WA-SCM/);
 assert.match(retrievalContext,/Конкуренты используют ИИ/);
});
test('assistant accepts an alternative capability that makes a true belief non-binding',async()=>{
 let reviewBody:any;
 const fields={assumptionKeys:'["cd"]',injections:'{"cd":"Мы сами научимся достаточно быстро разрабатывать и тестировать без ИИ"}'};
 const accepted=await evaluateWorkflow('assumption-check',{profile:'DILEMMA',signal:'эпизод'},[{step:'assumption-check',fields}],{key:'fake',model:'fake'},(async(_url,init)=>{reviewBody=JSON.parse(String(init?.body));return new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({issues:[],note:'Убеждение может оставаться верным, но новая способность делает использование ИИ необязательным; реализуемость не оценивалась.'})}]}]}));}) as typeof fetch,dilemmaDocs);
 assert.equal(reviewBody.text.format.schema.properties.dialogue,undefined);
 assert.equal(reviewBody.text.format.schema.properties.issues.minItems,undefined);
 assert.match(reviewBody.instructions,/используй только маршрут и критерии из methodEvidence/);
 assert.doesNotMatch(reviewBody.instructions,/фактах|контрпримерах|поставить его под сомнение|фантастическ|реализуемост/);
 assert.equal(accepted.issues.length,0);
 const injectionsReference=reviewBody.text.format.schema.properties.issues.items.properties.field.enum.find((value:string)=>value.startsWith('injections —'));
 const rejected=await evaluateWorkflow('assumption-check',{profile:'DILEMMA',signal:'эпизод'},[{step:'assumption-check',fields}],{key:'fake',model:'fake'},(async()=>new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({issues:[{field:injectionsReference,criterion:'Инъекция должна снять ограничивающую силу убеждения',observation:'Мы надеемся, что всё получится',question:'Какое новое правило выбора заменит прежнее убеждение?',sourceIds:['DS-RBTE.DILEMMA.ASSISTANT-SPEC']}],note:'Запись не делает убеждение неверным и не задаёт нового правила выбора.'})}]}]}))) as typeof fetch,dilemmaDocs);
 assert.equal(rejected.issues[0].field,'injections');
 assert.equal(rejected.issues.length,1);
});
test('personal dilemma workflow stops before the provider when assistant documentation is unavailable',async()=>{
 let providerCalled=false;
 await assert.rejects(()=>evaluateWorkflow('logic',{profile:'DILEMMA',signal:'эпизод'},[{step:'logic',fields:{ab:'Да'}}],{key:'fake',model:'fake'},(async()=>{providerCalled=true;return new Response('{}');}) as typeof fetch,async()=>{throw new Error('docs unavailable');}),/docs unavailable/);
 assert.equal(providerCalled,false);
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
