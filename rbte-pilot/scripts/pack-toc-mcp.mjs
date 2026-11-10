// Read-only MCP server. The corpus is a pinned, hash-checked Pack-TOC edition.
import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { readFile,realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname,join,relative,isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(await readFile(join(root,'lib/pack-toc-sources.json'),'utf8'));
const corpusRoot=await realpath(join(root,'knowledge/pack-toc'));
const records=await Promise.all(Object.values(manifest.sources).map(async source=>{
 const path=await realpath(join(corpusRoot,source.path)),rel=relative(corpusRoot,path);
 if(rel.startsWith('..')||isAbsolute(rel))throw new Error('Pack-TOC path outside corpus');
 const data=await readFile(path);
 if(createHash('sha256').update(data).digest('hex')!==source.sha256)throw new Error('Pack-TOC source integrity check failed');
 return {...source,text:data.toString('utf8')};
}));
const meta={repository:manifest.repo,commit:manifest.commit,adaptationVersion:manifest.adaptationVersion};
const result=value=>({content:[{type:'text',text:JSON.stringify(value)}]});
const annotations={readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false};
serveStdio(()=>{
 const server=new McpServer({name:'pilot-pack-toc',version:'1.0.0'});
 server.registerTool('search_pack_toc',{
  description:'Search the pinned Pack-TOC corpus for methods, formulation criteria and logic of personal dilemma clouds. Returns genuine source identifiers, revision and excerpts.',
  inputSchema:z.object({query:z.string().min(1).max(500),limit:z.number().int().min(1).max(8).default(6)}),annotations
 },async({query,limit})=>{
  const tokens=[...new Set(query.toLocaleLowerCase('ru').match(/[\p{L}\p{N}.′-]{3,}/gu)||[])];
  const ranked=records.map(record=>{
   const title=(record.id+' '+record.title).toLocaleLowerCase('ru'),body=record.text.toLocaleLowerCase('ru');
   const score=tokens.reduce((sum,token)=>sum+(title.includes(token)?8:0)+(body.includes(token)?1:0),0);
   const sections=record.text.split(/(?=^#{1,4} )/m);
   const excerpt=sections.map(text=>({text,score:tokens.reduce((n,t)=>n+(text.toLocaleLowerCase('ru').includes(t)?1:0),0)})).sort((a,b)=>b.score-a.score)[0]?.text||record.text;
   const {text,...source}=record;return {...source,score,excerpt:excerpt.slice(0,3000)};
  }).filter(r=>r.score>0).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)).slice(0,limit);
  return result({...meta,hits:ranked});
 });
 server.registerTool('get_pack_toc',{
  description:'Read an exact Pack-TOC source by its identifier. Returns complete text and verifiable source metadata; unknown IDs are errors.',
  inputSchema:z.object({id:z.string().min(1).max(80)}),annotations
 },async({id})=>{
  const record=records.find(r=>r.id===id);
  if(!record)return {...result({error:'Unknown Pack-TOC source ID'}),isError:true};
  return result({...meta,source:record});
 });
 return server;
});
