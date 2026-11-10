import { checkActions } from './dilemma-actions';
import type { LinkReview } from './dilemma-review';
import type { TocMcpRetrieval } from './pack-toc-mcp';
import { TOC_VERSION,tocProfiles,tocSourceIds } from './pack-toc';
import { definitionFor, stepOrder } from './steps';
import { checkCloud, type Profile, type MethodIssue } from './cloud-method';
export type WorkflowCheck={mode:'local'|'ai';issues:MethodIssue[];note:string;method?:{version:string;methodId:string;sourceIds:string[]};semantic?:{status:'completed';retrieval:TocMcpRetrieval;links:LinkReview[];verification?:{model:string;passes:number}}};
export function checkStep(step:string,profile:Profile,fields:Record<string,string>):WorkflowCheck{
 const issues=step==='actions'?checkActions(fields.actionRows):step==='cloud'||step==='practice'?checkCloud(profile,fields):[];
 const definition=definitionFor(step,profile);
 for(const f of definition?.fields||[]){
  if(['cloud','practice'].includes(step)&&['goal','needA','needB','actionA','actionB'].includes(f.key))continue;
  if(step==='decision'&&fields.choice==='Отказ от выбора'&&!['choice','reason','risks'].includes(f.key))continue;
  const value=fields[f.key]?.trim();
  if(f.required&&(!value||['Не проверено','Не выбран','Не выбрано','Нужно уточнить','Не знаю'].includes(value)))issues.push({field:f.key,criterion:f.label,observation:value||'Ответ пока не записан',question:'Уточните: '+f.label,sourceIds:f.sourceIds});
 }
 if(step==='assumptions')for(const key of ['ab','ac','bd','cd','conflict']){
  if((fields[key]||'').split('\n').some(line=>/^\s*потому\s+что(?=\s|[.,:]|$)/iu.test(line)))issues.push({field:key,criterion:'Самостоятельная запись исходной посылки',observation:fields[key],question:'Оставьте само проверяемое утверждение без префикса «потому что». Объясняет ли оно связь обоих элементов?',sourceIds:['TOC.M.004','TOC.WP.003']});
 }
 if(profile==='CONFLICT'&&step==='cloud'&&fields.otherPositionStatus==='Гипотеза автора — требуется уточнение')issues.push({field:'otherPositionStatus',criterion:'Подтверждение позиции другой стороны',observation:fields.otherPositionStatus,question:'Как проверить потребность и предлагаемое действие с самой стороной? Сохраните статус гипотезы, пока проверки нет.',sourceIds:['TOCT.14']});
 if(profile==='LT_CLOUD'&&step==='cloud'&&fields.stabilization==='Требуется срочное реагирование')issues.push({field:'stabilization',criterion:'Разделение срочного реагирования и разбора',observation:fields.stabilization,question:'Кто уполномочен защитить результат сейчас и когда можно вернуться к разбору механизма повторения?',sourceIds:['TOCT.15']});
 return {mode:'local',issues,method:{version:TOC_VERSION,methodId:tocProfiles[profile].method,sourceIds:tocSourceIds(profile,step)},note:'Локально проверены заполнение, явные повторы, причинные связки внутри блоков и ваши ответы самопроверки по критериям Pack-TOC. Смысл, достоверность и логическая необходимость автоматически не доказаны. Отсутствие замечаний не означает освоения метода или соответствия DPF.'};
}
export function basisData(step:string,profile:string,signal:string,drafts:Array<{step:string;fields:Record<string,string>}>){
 const index=stepOrder.indexOf(step);
 return JSON.stringify({methodVersion:TOC_VERSION,profile,signal,drafts:drafts.filter(d=>stepOrder.indexOf(d.step)>=0&&stepOrder.indexOf(d.step)<=index).sort((a,b)=>a.step.localeCompare(b.step)).map(d=>({step:d.step,fields:Object.fromEntries(Object.entries(d.fields).filter(([k])=>!k.startsWith('__')).sort(([a],[b])=>a.localeCompare(b)))}))});
}
