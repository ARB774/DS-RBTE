import { z } from 'zod';
import { steps } from './steps';

export const creationLabels: Record<string,string> = {
 title:'Название ситуации', profile:'Профиль ситуации', sensitivity:'Чувствительность',
 signal:'Исходный сигнал', task:'Значимая рабочая задача', desiredChange:'Желаемое изменение собственного действия',
 experience:'Относящийся к ситуации опыт', authority:'Доступные полномочия и границы риска',
 supportLevel:'Требуемый уровень поддержки',
};
export const fieldLabels:Record<string,string> = Object.fromEntries([
 ...Object.entries(creationLabels).map(([key,label])=>['creation.'+key,label]),
 ...Object.entries(steps).flatMap(([step,def])=>def.fields.map(f=>[step+'.'+f.key,f.label])),
]);
const text=z.string().trim().min(1).max(1800);
export const reportSchema=z.object({
 gaps:z.array(z.object({fields:z.array(z.string()).min(1).max(65),importance:z.enum(['blocking','minor']),impact:text,question:text}).strict()).max(20),
 reused:z.array(z.object({field:z.string(),from:z.string()}).strict()).max(65),
 summary:z.object({problem:z.string().max(1800),contradiction:z.string().max(1800),decision:z.string().max(1800),trial:z.string().max(1800),result:z.string().max(1800)}).strict(),
 assessment:z.object({conclusion:z.string().max(1800),strengths:z.array(text).max(6),risks:z.array(text).max(6),recommendations:z.array(text).max(6)}).strict(),
}).strict();
export type ReviewReport=z.infer<typeof reportSchema>;
export type ReviewSnapshot={profile:string;fields:Record<string,string>};
export type ReviewView={fingerprint:string;state:'none'|'pending'|'ready'|'error'|'stale';report:ReviewReport|null;updatedAt:string|null;error?:string};
export function checkedReport(raw:unknown,snapshot:ReviewSnapshot):ReviewReport {
 const report=reportSchema.parse(raw), covered=new Set<string>();
 for(const gap of report.gaps) for(const key of gap.fields){
  if(!Object.hasOwn(fieldLabels,key))throw new Error('Invalid field reference');
  if(covered.has(key))throw new Error('Duplicate field reference');
  covered.add(key);
 }
 for(const item of report.reused){
  if(!Object.hasOwn(fieldLabels,item.field)||!Object.hasOwn(fieldLabels,item.from)||item.field===item.from||
     snapshot.fields[item.field]?.trim()||!snapshot.fields[item.from]?.trim()||covered.has(item.field))throw new Error('Invalid reuse reference');
  covered.add(item.field);
 }
 for(const key of Object.keys(fieldLabels))if(!snapshot.fields[key]?.trim()&&!covered.has(key))throw new Error('Unclassified missing field');
 if(report.gaps.some(g=>g.importance==='blocking')){
  report.summary={problem:'',contradiction:'',decision:'',trial:'',result:''};
  report.assessment={conclusion:'',strengths:[],risks:[],recommendations:[]};
 } else if(Object.values(report.summary).some(v=>!v.trim())||!report.assessment.conclusion.trim())throw new Error('Incomplete review');
 return report;
}
