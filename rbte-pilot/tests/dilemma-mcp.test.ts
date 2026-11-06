import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { join } from 'node:path';
import { retrieveDilemmaEvidence } from '../lib/pack-toc-mcp';
import { evaluateDilemmaCloud,dilemmaResponseSchema } from '../lib/dilemma-review-ai';
import { z } from 'zod/v4';
import { dilemmaLinkKeys,hasDilemmaSemanticReview } from '../lib/dilemma-review';
import { checkStep } from '../lib/workflow-check';
import { TOC_COMMIT } from '../lib/pack-toc';
const cloud={goal:'Сдать достоверный квартальный отчёт в согласованный срок',needA:'Соблюсти срок передачи',needB:'Обеспечить точность данных',actionA:'Передать отчёт сегодня без проверки',actionB:'Проверить отчёт до передачи завтра'};
const links=()=>dilemmaLinkKeys.map(key=>({key,status:'ok',observation:'По учебному тексту связь логически согласована.',question:'',sourceIds:['TOC.M.003']}));
function provider(report:unknown,onRequest?:(body:any)=>void):typeof fetch{
 const value=report as any;
 const wire={...value,links:Array.isArray(value.links)?Object.fromEntries(value.links.map(({key,...link}:any)=>[key,link])):value.links};
 return (async(_url,init)=>{onRequest?.(JSON.parse(String(init?.body)));return new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(wire)}]}]}));}) as typeof fetch;
}
const situation={profile:'DILEMMA',signal:'Учебный пример: срок сдачи сегодня, проверка занимает дополнительный день.'};
test('real MCP stdio search retrieves pinned criteria and complete seven readings',async()=>{
 const {evidence,retrieval}=await retrieveDilemmaEvidence();
 assert.equal(retrieval.transport,'mcp-stdio');assert.equal(retrieval.commit,TOC_COMMIT);
 assert.ok(retrieval.queries.length>=2);
 assert.ok(evidence.some(e=>e.id==='TOC.M.006'&&e.excerpt.includes('вынужденное')));
 assert.match(evidence.find(e=>e.id==='TOC.M.003')!.excerpt,/7\. \[D'\] ставит под угрозу/);
 assert.ok(evidence.every(e=>e.sha256.length===64&&e.url.includes(TOC_COMMIT)));
});
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
 const report=await evaluateDilemmaCloud(situation,[{step:'cloud',fields:{...cloud,__check:'PRIVATE_CHECK'}},{step:'result',fields:{actual:'FUTURE_SECRET'}}],{key:'test-key',model:'test-model'},provider({issues:[],links:links(),note:'Учебная проверка.'},b=>body=b));
 assert.equal(body.store,false);
 assert.ok(!body.input.includes('FUTURE_SECRET')&&!body.input.includes('PRIVATE_CHECK'));
 const input=JSON.parse(body.input);assert.equal(input.retrieval.transport,'mcp-stdio');
 assert.ok(input.evidence.some((e:any)=>e.id==='TOCT.13'));
 assert.equal(report.semantic?.links.length,7);assert.equal(hasDilemmaSemanticReview(report),true);
 assert.equal(hasDilemmaSemanticReview(checkStep('cloud','DILEMMA',cloud)),false);
});
test('provider contract forbids the production failure: empty hint or sources and omitted readings',()=>{
 const contract=dilemmaResponseSchema(['TOC.M.003']);
 const shape=z.toJSONSchema(contract) as any;
 assert.equal(shape.properties.issues.items.properties.question.minLength,1);
 assert.equal(shape.properties.issues.items.properties.sourceIds.minItems,1);
 assert.deepEqual(shape.properties.links.required,dilemmaLinkKeys);
 const valid={issues:[],links:Object.fromEntries(links().map(({key,...link})=>[key,link])),note:'Проверено.'};
 assert.equal(contract.safeParse(valid).success,true);
 for(const patch of [{question:'',sourceIds:['TOC.M.003']},{question:'Уточните действие.',sourceIds:[]},{question:'   ',sourceIds:['TOC.M.003']}]){
  const issue={field:'actionA',criterion:'Конкретное действие',observation:'Фрагмент формулировки',...patch};
  assert.equal(contract.safeParse({...valid,issues:[issue]}).success,false);
 }
 const {ab,...incomplete}=valid.links;
 assert.equal(contract.safeParse({...valid,links:incomplete}).success,false);
 assert.equal(contract.safeParse({...valid,links:{...valid.links,ab:{...ab,status:'issue',question:''}}}).success,false);
 assert.equal(contract.safeParse({...valid,links:{...valid.links,ab:{...ab,status:'ok',question:'Нужно ли ещё подтвердить эту связь?'}}}).success,false);
});
test('an initial all-green hallucination is critically audited and cannot override formal findings',async()=>{
 let count=0;
 const wrong={...cloud,goal:'Купить велосипед',needA:cloud.actionA};
 const first=provider({issues:[],links:links(),note:'Всё согласовано.'});
 const checked=links();checked[0]={...checked[0],status:'uncertain',observation:'В описании отчёта нет основания связать срок сдачи с покупкой велосипеда.',question:'Как эта потребность необходима для указанной общей цели?'};
 const second=provider({issues:[{field:'goal',criterion:'Цель относится к эпизоду',observation:wrong.goal,question:'Какой общий результат нужен в описанном эпизоде?',sourceIds:['TOC.M.003']}],links:checked,note:'Предыдущий ответ придумал связь.'},body=>{assert.ok(JSON.parse(body.input).previousReview);assert.equal(body.model,'gpt-5.4');});
 const transport:typeof fetch=(...args)=>{count++;return (count===1?first:second)(...args);};
 const report=await evaluateDilemmaCloud(situation,[{step:'cloud',fields:wrong}],{key:'test',model:'gpt-4.1-mini',dilemmaModel:'gpt-5.4'},transport);
 assert.equal(count,2);assert.equal(report.semantic?.verification?.passes,2);
 assert.ok(report.issues.some(i=>i.field==='goal'));assert.ok(report.issues.some(i=>i.field==='needA'&&i.criterion==='Потребность объясняет действие'));
 assert.equal(report.semantic?.links.find(l=>l.key==='ab')?.status,'uncertain');
});
test('formal errors survive two falsely positive semantic reports; a failed audit never passes',async()=>{
 const wrong={...cloud,needA:cloud.actionA};
 const report=await evaluateDilemmaCloud(situation,[{step:'cloud',fields:wrong}],{key:'test',model:'test'},provider({issues:[],links:links(),note:'Всё согласовано.'}));
 assert.ok(report.issues.some(i=>i.criterion==='Потребность объясняет действие'));
 let count=0;
 const first=provider({issues:[],links:links(),note:'Всё согласовано.'});
 await assert.rejects(()=>evaluateDilemmaCloud(situation,[{step:'cloud',fields:cloud}],{key:'test',model:'test'},((...args)=>++count===1?first(...args):Promise.resolve(new Response('offline',{status:503}))) as typeof fetch),/unavailable/);
 assert.equal(count,2);
});
test('link errors become field feedback with a source and a concrete hint',async()=>{
 const checked=links();checked[1]={...checked[1],status:'issue',observation:'D не обеспечивает B.',question:'Как это действие обеспечивает вашу потребность B?'};
 const report=await evaluateDilemmaCloud(situation,[{step:'cloud',fields:cloud}],{key:'test',model:'test'},provider({issues:[],links:checked,note:'Уточните связь.'}));
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
 for(const report of invalid)await assert.rejects(()=>evaluateDilemmaCloud(situation,[{step:'cloud',fields:cloud}],{key:'test',model:'test'},provider(report)));
});
test('MCP semantic path is limited to DILEMMA and a provider failure is not a passed review',async()=>{
 await assert.rejects(()=>evaluateDilemmaCloud({...situation,profile:'CONFLICT'},[],{key:'test',model:'test'}),/limited/);
 await assert.rejects(()=>evaluateDilemmaCloud(situation,[{step:'cloud',fields:cloud}],{key:'test',model:'test'},(async()=>new Response('offline',{status:503})) as typeof fetch),/unavailable/);
});
