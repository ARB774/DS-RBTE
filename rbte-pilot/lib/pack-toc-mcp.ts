import 'server-only';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { existsSync } from 'node:fs';
import { join,resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { TOC_COMMIT,TOC_VERSION,tocSourceIds,tocSources } from './pack-toc';

export type TocMcpEvidence={id:string;title:string;url:string;path:string;sha256:string;excerpt:string};
export type TocMcpRetrieval={transport:'mcp-stdio';server:'pilot-pack-toc';commit:string;version:string;queries:string[];sourceIds:string[]};
const queries=[
 'TOCT.13 личная дилемма вынужденное предпочитаемое действие потребность цель инъекция',
 'TOC.M.003 критерии качества формулировок проверка логики связей необходимость конфликт угрозы',
 'TOCT.13 личная дилемма предположение B* C* контекст'
];
export async function retrieveDilemmaEvidence() {
 return retrievePackTocEvidence(tocSourceIds('DILEMMA', 'cloud'), queries);
}

export async function retrievePackTocEvidence(allowed: readonly string[], searchQueries: string[] = []) {
 const cwd=process.cwd(),root=existsSync(join(cwd,'scripts/pack-toc-mcp.mjs'))?cwd:resolve(cwd,'../..');
 const script=join(root,'scripts/pack-toc-mcp.mjs');
 if(!existsSync(script))throw new Error('Поиск Pack-TOC через MCP недоступен: не найден сервер знаний.');
 const client=new Client({name:'pilot-pack-toc-client',version:'1.0.0'});
 const transport=new StdioClientTransport({command:process.execPath,args:[script],cwd:root,env:{NODE_ENV:'production'},stderr:'pipe'});
 // No API keys, database credentials or learner text are passed to this process.
 transport.stderr?.on('data',()=>{});
 async function call(name:string,args:Record<string,unknown>){
  const response=await client.callTool({name,arguments:args},{timeout:5000});
  if(response.isError)throw new Error('MCP tool failed');
  const text=response.content?.filter((x:any)=>x.type==='text').map((x:any)=>x.text).join('')||'';
  if(text.length>100000)throw new Error('MCP response too large');
  const data=JSON.parse(text);
  if(data.commit!==TOC_COMMIT)throw new Error('MCP source revision mismatch');
  return data;
 }
 try{
  await client.connect(transport,{timeout:10000});
  const tools=await client.listTools({}, {timeout:5000});
  if(!['search_pack_toc','get_pack_toc'].every(name=>tools.tools.some(t=>t.name===name)))throw new Error('MCP tools missing');
  const searches=[];
  for(const query of searchQueries)searches.push(await call('search_pack_toc',{query,limit:6}));
  if(searchQueries.length && !searches.some(s=>s.hits?.some((h:any)=>h.id==='TOCT.13')))throw new Error('Personal dilemma pattern not found via MCP');
  const evidence:TocMcpEvidence[]=[];
  // Read all required criteria, not only the most popular search hits.
  for(const id of allowed){
   const {source}=await call('get_pack_toc',{id}),expected=tocSources[id];
   if(!expected||source.id!==id||source.path!==expected.path||source.sha256!==expected.sha256||typeof source.text!=='string'||createHash('sha256').update(source.text).digest('hex')!==expected.sha256)throw new Error('MCP source integrity mismatch');
   const max=searchQueries.length?(id==='TOCT.13'?24000:id==='TOC.M.003'?14000:9000):42000;
   if(source.text.length>max)throw new Error('MCP source exceeds review budget');
   evidence.push({id,title:expected.title,url:expected.url,path:expected.path,sha256:expected.sha256,excerpt:source.text});
  }
  if(searchQueries.length && evidence.reduce((n,e)=>n+e.excerpt.length,0)>42000)throw new Error('MCP evidence exceeds review budget');
  const retrieval:TocMcpRetrieval={transport:'mcp-stdio',server:'pilot-pack-toc',commit:TOC_COMMIT,version:TOC_VERSION,queries:searchQueries,sourceIds:evidence.map(e=>e.id)};
  return {evidence,retrieval};
 }catch{
  throw new Error('Поиск Pack-TOC через MCP недоступен или источники не прошли проверку. Смысловая проверка не выполнена; повторите позже.');
 }finally{await client.close();await transport.close();}
}
