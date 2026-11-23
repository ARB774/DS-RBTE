import { checkActions } from './dilemma-actions';
import type { LinkReview } from './dilemma-review';
import { TOC_VERSION,tocProfiles,tocSourceIds } from './pack-toc';
import { definitionFor, readSelectedDecisionKeys, stepOrder } from './steps';
import { checkCloud, nodeFields, type Profile, type MethodIssue } from './cloud-method';
export type AssistantMcpRetrieval={transport:'mcp-stdio';server:'pilot-mentor-methods';commit:string;sourceIds:string[]};
export type DilemmaRevisionField='goal'|'needA'|'needB'|'actionA'|'actionB';
export type WorkflowCheck={mode:'local'|'ai';issues:MethodIssue[];note:string;acceptedRevisions?:Partial<Record<DilemmaRevisionField,string>>;method?:{version:string;methodId:string;sourceIds:string[]};semantic?:{status:'completed';retrieval:AssistantMcpRetrieval;links:LinkReview[];verification?:{model:string;passes:number}}};
export function readAssumptionKeys(value:string|undefined):string[]{
 try{const parsed:unknown=JSON.parse(value||'[]');return Array.isArray(parsed)&&parsed.length<=20&&parsed.every(key=>typeof key==='string'&&key.length<=100)?[...new Set(parsed)]:[];}catch{return [];}
}
export function readInjections(value:string|undefined):Record<string,string>{
 try{const parsed:unknown=JSON.parse(value||'{}');if(!parsed||Array.isArray(parsed)||typeof parsed!=='object')return {};const entries=Object.entries(parsed);if(entries.length>20||entries.some(([key,injection])=>key.length>100||typeof injection!=='string'||injection.length>4000))return {};return Object.fromEntries(entries.map(([key,injection])=>[key,(injection as string).trim()]).filter(([,injection])=>injection));}catch{return {};}
}
export function allAssumptionInjectionsComplete(fields:Record<string,string>){
 const keys=readAssumptionKeys(fields.assumptionKeys),injections=readInjections(fields.injections);
 return keys.length>0&&keys.every(key=>Boolean(injections[key]));
}
function interfaceCloudIssues(fields:Record<string,string>):MethodIssue[]{
 return Object.entries(nodeFields).flatMap(([node,field])=>fields[field]?.trim()?[]:[{field,criterion:`Поле ${node==='Dp'?'D′':node} заполнено`,observation:'Поле пока пусто',question:'Введите формулировку или сохраните шаг как черновик.'}]);
}
export function checkStep(step:string,profile:Profile,fields:Record<string,string>):WorkflowCheck{
 const issues=step==='actions'?checkActions(fields.actionRows):step==='cloud'?(profile==='DILEMMA'?interfaceCloudIssues(fields):checkCloud(profile,fields)):[];
 const definition=definitionFor(step,profile);
 for(const f of definition?.fields||[]){
  if(step==='cloud'&&['goal','needA','needB','actionA','actionB'].includes(f.key))continue;
  if(step==='decision'&&fields.choice==='Отказ от выбора'&&!['choice','reason','risks'].includes(f.key))continue;
  if(profile==='DILEMMA'&&step==='trial'){
   const stage=fields.stage;
   if(stage==='Действие уже выполнено'&&f.key!=='stage')continue;
   if(stage==='Готовлю ближайшее выполнение'&&!['stage','situationAction','expectation','riskLevel','riskBoundary'].includes(f.key))continue;
   if(stage==='Готовлю ближайшее выполнение'&&f.key==='riskBoundary'&&fields.riskLevel!=='Есть ограниченный риск')continue;
   if(stage==='Сначала нужно изменить условия'&&!['stage','conditionChange'].includes(f.key))continue;
   if(!stage&&f.key!=='stage')continue;
  }
  const value=fields[f.key]?.trim();
  if(f.required&&(!value||['Не проверено','Не выбран','Не выбрано','Нужно уточнить','Не знаю'].includes(value)))issues.push({field:f.key,criterion:f.label,observation:value||'Ответ пока не записан',question:'Уточните: '+f.label,sourceIds:f.sourceIds});
 }
 if(profile==='DILEMMA'&&step==='trial'&&fields.stage==='Готовлю ближайшее выполнение'&&fields.riskLevel==='Есть ограниченный риск'&&!fields.riskBoundary?.trim())issues.push({field:'riskBoundary',criterion:'Для указанного риска задана наблюдаемая граница остановки',observation:'Граница риска пока не записана',question:'При каком наблюдаемом признаке действие нужно остановить?'});
 if(profile==='DILEMMA'&&step==='trial'&&fields.stage==='Сначала нужно изменить условия'&&!fields.conditionChange?.trim())issues.push({field:'conditionChange',criterion:'Названо условие, которое необходимо изменить до действия',observation:'Условие пока не записано',question:'Что именно нужно изменить до выполнения выбранного решения?'});
 if(profile==='DILEMMA'&&step==='assumption-check'){
  const keys=readAssumptionKeys(fields.assumptionKeys),injections=readInjections(fields.injections);
  if(!keys.length)issues.push({field:'assumptionKeys',criterion:'Есть исходные предположения для работы',observation:'Список предположений не передан',question:'Вернитесь к предыдущему шагу и сохраните исходные предположения.'});
  else if(keys.some(key=>!injections[key]))issues.push({field:'injections',criterion:'Для каждого исходного убеждения записана инъекция',observation:`Заполнено ${keys.filter(key=>Boolean(injections[key])).length} из ${keys.length}`,question:'Запишите инъекцию в правой колонке напротив каждого исходного убеждения.'});
 }
 if(profile==='DILEMMA'&&step==='decision'){
  const selected=readSelectedDecisionKeys(fields.selected);
  if(!selected.length)issues.push({field:'selected',criterion:'Выбрано хотя бы одно решение-кандидат',observation:'Решение пока не выбрано',question:'Выберите лучшее решение либо несколько решений для комбинации.'});
  if(selected.includes('ab')&&!fields.conditionB?.trim())issues.push({field:'conditionB',criterion:'Сформулировано новое необходимое условие B*',observation:'Новое условие B* пока не записано',question:'Какое необходимое условие B* заменяет прежнее B после того, как исходная посылка A–B поставлена под сомнение?'});
  if(selected.includes('ac')&&!fields.conditionC?.trim())issues.push({field:'conditionC',criterion:'Сформулировано новое необходимое условие C*',observation:'Новое условие C* пока не записано',question:'Какое необходимое условие C* заменяет прежнее C после того, как исходная посылка A–C поставлена под сомнение?'});
 }
 if(profile!=='DILEMMA'&&step==='assumptions')for(const key of ['ab','ac','bd','cd','conflict']){
  if((fields[key]||'').split('\n').some(line=>/^\s*потому\s+что(?=\s|[.,:]|$)/iu.test(line)))issues.push({field:key,criterion:'Самостоятельная запись исходной посылки',observation:fields[key],question:'Оставьте само проверяемое утверждение без префикса «потому что». Объясняет ли оно связь обоих элементов?',sourceIds:['TOC.M.004','TOC.WP.003']});
 }
 if(profile==='CONFLICT'&&step==='cloud'&&fields.otherPositionStatus==='Гипотеза автора — требуется уточнение')issues.push({field:'otherPositionStatus',criterion:'Подтверждение позиции другой стороны',observation:fields.otherPositionStatus,question:'Как проверить потребность и предлагаемое действие с самой стороной? Сохраните статус гипотезы, пока проверки нет.',sourceIds:['TOCT.14']});
 if(profile==='LT_CLOUD'&&step==='cloud'&&fields.stabilization==='Требуется срочное реагирование')issues.push({field:'stabilization',criterion:'Разделение срочного реагирования и разбора',observation:fields.stabilization,question:'Кто уполномочен защитить результат сейчас и когда можно вернуться к разбору механизма повторения?',sourceIds:['TOCT.15']});
 if(profile==='DILEMMA')return {mode:'local',issues,note:'Приложение проверило только техническую полноту полей. Содержание оценивает помощник по загруженному ТЗ.'};
 return {mode:'local',issues,method:{version:TOC_VERSION,methodId:tocProfiles[profile].method,sourceIds:tocSourceIds(profile,step)},note:'Локально проверены заполнение, явные повторы, причинные связки внутри блоков и ваши ответы самопроверки по критериям Pack-TOC. Смысл, достоверность и логическая необходимость автоматически не доказаны. Отсутствие замечаний не означает освоения метода или соответствия DPF.'};
}
export function basisData(step:string,profile:string,signal:string,drafts:Array<{step:string;fields:Record<string,string>}>){
 const index=stepOrder.indexOf(step);
 return JSON.stringify({methodVersion:TOC_VERSION,profile,signal,drafts:drafts.filter(d=>stepOrder.indexOf(d.step)>=0&&stepOrder.indexOf(d.step)<=index).sort((a,b)=>a.step.localeCompare(b.step)).map(d=>({step:d.step,fields:Object.fromEntries(Object.entries(d.fields).filter(([k])=>!k.startsWith('__')).sort(([a],[b])=>a.localeCompare(b)))}))});
}
