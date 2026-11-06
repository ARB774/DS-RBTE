import { createHash } from 'node:crypto';
import { creationLabels,fieldLabels,type ReviewSnapshot } from './review-types';
export const REVIEW_VERSION='pilot2-review-packtoc-836c4058-1';
export function reviewInput(situation:Record<string,any>,drafts:Array<{step:string;fields:Record<string,string>;version:number}>) {
 const fields:Record<string,string>={};
 for(const key of Object.keys(fieldLabels))fields[key]='';
 for(const key of Object.keys(creationLabels))fields['creation.'+key]=String(situation[key]??'');
 for(const draft of drafts)for(const [key,value] of Object.entries(draft.fields)){
  const ref=draft.step+'.'+key;if(Object.hasOwn(fields,ref))fields[ref]=String(value??'');
 }
 const snapshot:ReviewSnapshot={profile:situation.profile,fields};
 const serialized=JSON.stringify(snapshot);
 if(serialized.length>55000)throw new Error('Для оценки сократите общий объём сохранённых текстов до 55 000 символов.');
 const fingerprint=createHash('sha256').update(REVIEW_VERSION+'\n'+serialized+'\n'+JSON.stringify(drafts.map(d=>[d.step,d.version]).sort())).digest('hex');
 return {snapshot,fingerprint};
}
