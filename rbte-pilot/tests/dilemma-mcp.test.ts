import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { join } from 'node:path';
import { evaluateDilemmaCloud,dilemmaResponseSchema } from '../lib/dilemma-review-ai';
import { z } from 'zod/v4';
import { acceptedDilemmaRevisions,dilemmaLinkKeys,hasDilemmaSemanticReview,priorDilemmaReview,unresolvedDilemmaIssues } from '../lib/dilemma-review';
import { checkStep } from '../lib/workflow-check';
import { dilemmaAssistantEvidence } from '../lib/value-proposition-evidence';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { readDilemmaReviewReplies,upsertDilemmaReviewReply } from '../lib/dilemma-review-replies';
const cloud={goal:'Сдать достоверный квартальный отчёт в согласованный срок',needA:'Соблюсти срок передачи',needB:'Обеспечить точность данных',actionA:'Передать отчёт сегодня без проверки',actionB:'Проверить отчёт до передачи завтра'};
const links=()=>dilemmaLinkKeys.map(key=>({key,status:'ok',observation:'По учебному тексту связь логически согласована.',question:'',sourceIds:['DS-RBTE.DILEMMA.ASSISTANT-SPEC']}));
function provider(report:unknown,onRequest?:(body:any)=>void):typeof fetch{
 const value=report as any;
 const wire={...value,issues:value.issues?.map((issue:any)=>({proposedValue:'',...issue})),acceptedRevisions:value.acceptedRevisions||{goal:'',needA:'',needB:'',actionA:'',actionB:''},links:Array.isArray(value.links)?Object.fromEntries(value.links.map(({key,...link}:any)=>[key,link])):value.links};
 return (async(_url,init)=>{onRequest?.(JSON.parse(String(init?.body)));return new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(wire)}]}]}));}) as typeof fetch;
}
const situation={profile:'DILEMMA',signal:'Учебный пример: срок сдачи сегодня, проверка занимает дополнительный день.'};
const assistantSources=async()=>dilemmaAssistantEvidence('cloud').map(source=>({...source,origin:'verified-cache' as const,fetchedAt:'2026-11-14',excerptSha256:createHash('sha256').update(source.text).digest('hex')}));
const evaluate=(s:Parameters<typeof evaluateDilemmaCloud>[0],d:Parameters<typeof evaluateDilemmaCloud>[1],c:Parameters<typeof evaluateDilemmaCloud>[2],t:typeof fetch=fetch)=>evaluateDilemmaCloud(s,d,c,t,assistantSources);
test('MCP exposes only read-only search/get; unknown IDs and path traversal fail',async()=>{
 const client=new Client({name:'test',version:'1'});
 const transport=new StdioClientTransport({command:process.execPath,args:[join(process.cwd(),'scripts/pack-toc-mcp.mjs')],env:{NODE_ENV:'test'},stderr:'pipe'});
 transport.stderr?.on('data',()=>{});
 try{
  await client.connect(transport);
  const {tools}=await client.listTools();
  assert.deepEqual(tools.map(t=>t.name).sort(),['get_pack_toc','search_pack_toc']);
  assert.ok(tools.every(t=>t.annotations?.readOnlyHint===true));
  assert.equal((await client.callTool({name:'get_pack_toc',arguments:{id:'../../etc/passwd'}})).isError,true);
 }finally{await client.close();}
});
test('semantic review uses MCP evidence, checks all seven links and excludes future/private metadata',async()=>{
 let body:any;
 const report=await evaluate(situation,[{step:'cloud',fields:{...cloud,__check:'PRIVATE_CHECK'}},{step:'result',fields:{actual:'FUTURE_SECRET'}}],{key:'test-key',model:'test-model'},provider({issues:[],links:links(),note:'Учебная проверка.'},b=>body=b));
 assert.equal(body.store,false);
 assert.ok(!body.input.includes('FUTURE_SECRET')&&!body.input.includes('PRIVATE_CHECK'));
 const input=JSON.parse(body.input);assert.equal(input.retrieval.transport,'mcp-stdio');
 assert.equal(input.retrieval.server,'pilot-mentor-methods');
 assert.deepEqual(input.methodEvidence.map((e:any)=>e.id).sort(),['DS-RBTE.ASSISTANT-SKILL','DS-RBTE.DILEMMA.ASSISTANT-SPEC']);
 assert.equal(input.formalFindings,undefined);
 assert.equal(report.semantic?.links.length,7);assert.equal(hasDilemmaSemanticReview(report),true);
 assert.equal(hasDilemmaSemanticReview(checkStep('cloud','DILEMMA',cloud)),false);
});
test('provider contract forbids the production failure: empty hint or sources and omitted readings',()=>{
 const contract=dilemmaResponseSchema(['DS-RBTE.DILEMMA.ASSISTANT-SPEC']);
 const shape=z.toJSONSchema(contract) as any;
 assert.equal(shape.properties.issues.items.properties.question.minLength,1);
 assert.ok(shape.properties.issues.items.required.includes('proposedValue'));
 assert.equal(shape.properties.issues.items.properties.sourceIds.minItems,1);
 assert.deepEqual(shape.properties.links.required,dilemmaLinkKeys);
 const valid={issues:[],links:Object.fromEntries(links().map(({key,...link})=>[key,link])),acceptedRevisions:{goal:'',needA:'',needB:'',actionA:'',actionB:''},note:'Проверено.'};
 assert.equal(contract.safeParse(valid).success,true);
 for(const patch of [{question:'',sourceIds:['DS-RBTE.DILEMMA.ASSISTANT-SPEC']},{question:'Уточните действие.',sourceIds:[]},{question:'   ',sourceIds:['DS-RBTE.DILEMMA.ASSISTANT-SPEC']}]){
  const issue={field:'actionA',criterion:'Конкретное действие',observation:'Фрагмент формулировки',proposedValue:'',...patch};
  assert.equal(contract.safeParse({...valid,issues:[issue]}).success,false);
 }
 const {ab,...incomplete}=valid.links;
 assert.equal(contract.safeParse({...valid,links:incomplete}).success,false);
 assert.equal(contract.safeParse({...valid,links:{...valid.links,ab:{...ab,status:'issue',question:''}}}).success,false);
 assert.equal(contract.safeParse({...valid,links:{...valid.links,ab:{...ab,status:'ok',question:'Нужно ли ещё подтвердить эту связь?'}}}).success,false);
});
test('an initial all-green hallucination is critically audited against assistant documentation',async()=>{
 let count=0;
 const signals:AbortSignal[]=[];
 const wrong={...cloud,goal:'Купить велосипед',needA:cloud.actionA};
 const first=provider({issues:[],links:links(),note:'Всё согласовано.'});
 const checked=links();checked[0]={...checked[0],status:'uncertain',observation:'В описании отчёта нет основания связать срок сдачи с покупкой велосипеда.',question:'Как эта потребность необходима для указанной общей цели?'};
 const second=provider({issues:[{field:'goal',criterion:'Цель относится к ситуации',observation:wrong.goal,question:'Какой общий результат нужен в описанной ситуации?',sourceIds:['DS-RBTE.DILEMMA.ASSISTANT-SPEC']}],links:checked,note:'Предыдущий ответ придумал связь.'},body=>{assert.ok(JSON.parse(body.input).previousReview);assert.equal(body.model,'gpt-5.4');});
 const transport:typeof fetch=(...args)=>{count++;signals.push(args[1]?.signal as AbortSignal);return (count===1?first:second)(...args);};
 const report=await evaluate(situation,[{step:'cloud',fields:wrong}],{key:'test',model:'gpt-4.1-mini',dilemmaModel:'gpt-5.4'},transport);
 assert.equal(count,2);assert.equal(report.semantic?.verification?.passes,2);
 assert.notEqual(signals[0],signals[1]);
 assert.ok(signals.every(signal=>signal&&!signal.aborted));
 assert.ok(report.issues.some(i=>i.field==='goal'));
 assert.equal(report.semantic?.links.find(l=>l.key==='ab')?.status,'uncertain');
});
test('application does not inject substantive findings; a failed audit never passes',async()=>{
 const wrong={...cloud,needA:cloud.actionA};
 let request:any;
 const report=await evaluate(situation,[{step:'cloud',fields:wrong}],{key:'test',model:'test'},provider({issues:[],links:links(),note:'Всё согласовано.'},body=>request=JSON.parse(body.input)));
 assert.deepEqual(report.issues,[]);
 assert.equal(request.formalFindings,undefined);
 let count=0;
 const first=provider({issues:[],links:links(),note:'Всё согласовано.'});
 await assert.rejects(()=>evaluate(situation,[{step:'cloud',fields:cloud}],{key:'test',model:'test'},((...args)=>++count===1?first(...args):Promise.resolve(new Response('offline',{status:503}))) as typeof fetch),/unavailable/);
 assert.equal(count,2);
});
test('link errors become field feedback with a source and a concrete hint',async()=>{
 const checked=links();checked[1]={...checked[1],status:'issue',observation:'D не обеспечивает B.',question:'Как это действие обеспечивает вашу потребность B?'};
 const report=await evaluate(situation,[{step:'cloud',fields:cloud}],{key:'test',model:'test'},provider({issues:[],links:checked,note:'Уточните связь.'}));
 assert.equal(report.issues[0].field,'actionA');assert.equal(report.issues[0].link,'bd');
 assert.match(report.issues[0].question,/потребность B/);
});
test('missing/duplicate links, invented sources and unanswered uncertainty are rejected',async()=>{
 const invalid=[
  {issues:[],links:links().slice(1),note:'Неполная проверка.'},
  {issues:[],links:links().map(l=>({...l,key:'ab'})),note:'Повтор связей.'},
  {issues:[],links:links().map(l=>({...l,sourceIds:['FAKE.123']})),note:'Вымышленный источник.'},
  {issues:[],links:links().map(l=>({...l,status:'uncertain'})),note:'Нет подсказки.'}
 ];
 for(const report of invalid)await assert.rejects(()=>evaluate(situation,[{step:'cloud',fields:cloud}],{key:'test',model:'test'},provider(report)));
});
test('MCP semantic path is limited to DILEMMA and a provider failure is not a passed review',async()=>{
 await assert.rejects(()=>evaluate({...situation,profile:'CONFLICT'},[],{key:'test',model:'test'}),/limited/);
 await assert.rejects(()=>evaluate(situation,[{step:'cloud',fields:cloud}],{key:'test',model:'test'},(async()=>new Response('offline',{status:503})) as typeof fetch),/unavailable/);
});
test('participant reply is saved as review context and must be considered instead of ignored',async()=>{
 const prior={field:'actionA',criterion:'Формулировка D',observation:cloud.actionA,question:'Нужно ли уточнить контекст?',sourceIds:['DS-RBTE.DILEMMA.ASSISTANT-SPEC']};
 const reviewReplies=upsertDilemmaReviewReply(undefined,prior,'Речь о сдаче отчёта 18 ноября; в этот день проверку выполнить невозможно.');
 const checked=links();checked[1]={...checked[1],status:'uncertain',observation:'Ответ участника требует проверки в контексте связи.',question:'Что именно делает проверку невозможной в этом эпизоде?'};
 let body:any;
 await evaluate(situation,[{step:'cloud',fields:{...cloud,reviewReplies}}],{key:'test',model:'test'},provider({issues:[prior],links:checked,note:'Ответ участника учтён; требуется одно уточнение.'},request=>body=request));
 const input=JSON.parse(body.input);
 assert.equal(input.participantReplies.length,1);
 assert.match(input.participantReplies[0].reply,/18 ноября/);
 assert.match(body.instructions,/не повторяй его/);
 assert.match(body.instructions,/Окончательный выбор формулировки остаётся за участником/);
});
test('a confirmed unchanged link is carried forward and cannot be reopened on the next reply',async()=>{
 const prior=JSON.stringify({mode:'ai',semantic:{status:'completed',links:links()}});
 const checked=links();checked[1]={...checked[1],status:'issue',observation:'Повторная проверка ранее принятой связи.',question:'Почему снова нужно D для B?'};
 const requests:any[]=[];
 const report=await evaluate(situation,[{step:'cloud',fields:{...cloud,__priorReview:prior}}],{key:'test',model:'test'},provider({issues:[],links:checked,note:'Попытка открыть связь повторно.'},body=>requests.push(JSON.parse(body.input))));
 assert.equal(requests.length,2);
 assert.ok(requests[0].previouslyConfirmedLinks.some((link:any)=>link.key==='bd'&&link.status==='ok'));
 assert.equal(report.semantic?.links.find(link=>link.key==='bd')?.status,'ok');
 assert.equal(report.issues.some(issue=>issue.link==='bd'),false);
 assert.equal(report.semantic?.verification?.passes,2);
});
test('a semantic review is carried to the next reply only while all cloud elements stay unchanged',()=>{
 const check=JSON.stringify({mode:'ai',semantic:{status:'completed',links:links()}});
 assert.equal(priorDilemmaReview({...cloud,__check:check},cloud),check);
 assert.equal(priorDilemmaReview({...cloud,__check:check},{...cloud,needA:'Другая потребность'}),undefined);
 assert.equal(priorDilemmaReview({...cloud,__check:'{"mode":"local"}'},cloud),undefined);
});
test('a proposed revision is returned separately and never silently replaces the cloud field',async()=>{
 const proposedValue='Передать отчёт сегодня без дополнительной проверки';
 const issue={field:'actionA',criterion:'Формулировка D',observation:cloud.actionA,question:'Сохраняет ли эта формулировка ваш смысл?',proposedValue,sourceIds:['DS-RBTE.DILEMMA.ASSISTANT-SPEC']};
 const report=await evaluate(situation,[{step:'cloud',fields:cloud}],{key:'test',model:'test'},provider({issues:[issue],links:links(),note:'Предложение требует решения участника.'}));
 assert.equal(report.issues[0].proposedValue,proposedValue);
 assert.equal(cloud.actionA,'Передать отчёт сегодня без проверки');
});
test('only an accepted revision for a field with a participant reply can update the cloud',async()=>{
 const accepted='Передать отчёт сегодня без дополнительной проверки';
 const prior={field:'actionA',criterion:'Формулировка D',observation:cloud.actionA,question:'Принимаете предложенную формулировку?',proposedValue:accepted,sourceIds:['DS-RBTE.DILEMMA.ASSISTANT-SPEC']};
 const replies=readDilemmaReviewReplies(upsertDilemmaReviewReply(undefined,prior,'Да, принимаю эту формулировку.'));
 const report=await evaluate(situation,[{step:'cloud',fields:{...cloud,reviewReplies:JSON.stringify(replies)}}],{key:'test',model:'test'},provider({issues:[],links:links(),acceptedRevisions:{goal:'Чужая цель',needA:'',needB:'',actionA:accepted,actionB:''},note:'D принято участником.'}));
 assert.deepEqual(acceptedDilemmaRevisions(report,replies),{actionA:accepted});
});
test('an accepted current revision cannot remain as a duplicate confirmation issue',()=>{
 const accepted=cloud.actionB;
 const duplicate={field:'actionB',criterion:'D′ должно быть предпочитаемым действием.',observation:'Формулировка уже принята.',question:'Оставляем эту формулировку?',proposedValue:accepted,sourceIds:['DS-RBTE.DILEMMA.ASSISTANT-SPEC']};
 const repeatedWithoutProposal={...duplicate,proposedValue:'',question:'Почему этот элемент нужен в Туче?'};
 const linkIssue={...duplicate,link:'cd',proposedValue:'',question:'Почему D′ необходимо для C?'};
 assert.deepEqual(unresolvedDilemmaIssues([duplicate,repeatedWithoutProposal,linkIssue],{actionB:accepted},cloud),[linkIssue]);
 assert.deepEqual(unresolvedDilemmaIssues([duplicate],{},cloud),[]);
});
test('personal dilemma cannot fall back to embedded method rules when assistant documentation is unavailable',async()=>{
 let providerCalled=false;
 await assert.rejects(()=>evaluateDilemmaCloud(situation,[{step:'cloud',fields:cloud}],{key:'test',model:'test'},(async()=>{providerCalled=true;return new Response('{}');}) as typeof fetch,async()=>{throw new Error('docs offline');}),/docs offline/);
 assert.equal(providerCalled,false);
 const files=['../lib/dilemma-review-ai.ts','../lib/dilemma-cloud-flow.ts','../lib/workflow-check.ts','../app/components/situation-context.tsx','../app/situations/new/page.tsx'];
 const source=(await Promise.all(files.map(file=>readFile(new URL(file,import.meta.url),'utf8')))).join('\n');
 assert.doesNotMatch(source,/retrieveDilemmaEvidence|checkCloud\('DILEMMA'|formalFindings|недавн.*эпизод|один конкретный эпизод|настоящ.*времен/);
});
