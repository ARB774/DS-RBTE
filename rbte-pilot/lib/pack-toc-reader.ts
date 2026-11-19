import 'server-only';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { tocSourceIds,tocSources } from './pack-toc';
import type { Profile } from './cloud-method';
export async function getTocEvidence(profile:Profile,step:string){
 const ids=tocSourceIds(profile,step);
 const records=await Promise.all(ids.map(async id=>{
  const source=tocSources[id];if(!source)throw new Error('Unknown Pack-TOC source');
  const text=(await readFile(join(process.cwd(),'knowledge/pack-toc',source.path),'utf8')).replace(/\r\n?/g,'\n');
  if(createHash('sha256').update(text).digest('hex')!==source.sha256)throw new Error('Pack-TOC source integrity check failed');
  // Retrieve the substantive solution/order sections instead of front matter.
  const start=text.search(/^### TOCT\.\d+:4 -|^## Порядок построения|^## 12-шаговый алгоритм|^## Критерии качества|^## Минимум опознания/m);
  return {...source,excerpt:text.slice(Math.max(0,start),Math.max(0,start)+Math.min(1800,Math.floor(12000/ids.length)))};
 }));
 return records;
}
