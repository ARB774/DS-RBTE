import { steps,definitionFor } from "./steps";
import { checkStep } from "./workflow-check";
import type { Profile } from "./cloud-method";
import { type ReviewSnapshot } from './review-types';
export const METHOD_VERSION='pilot2-packtoc-836c4058-al-20261020';
// Explicit product adaptation of the versioned documents in knowledge/adult-learning.
// Presence is not semantic validity. No heuristic interprets free text as proof.
export const methodRules = [
 ['AL.P.002:4','Помощь без подмены действия','Сохранять первую версию тучи до содержательной помощи; давать вопросы, сохранять выбор за участником.'],
 ['AL.P.003:4','Обратная связь для следующей пробы','Связать наблюдение с критерием, назвать разрыв и следующий шаг; человек может принять, изменить или отклонить рекомендацию.'],
 ['AL.P.008:4','Границы вывода об эффекте','Различать наблюдение и причинность. Нужны исходная точка, сравнение и источники; альтернативные объяснения ограничивают вывод.'],
 ['AL.WP.005','Критерии и доказательства','Разделять выполнение, самостоятельную способность, перенос и эффект; учитывать помощь ИИ и право человека пересмотреть оценку.'],
] as const;
export type LocalIssue={fields:string[];source:string;question:string;impact:string};
export function localReview(snapshot:ReviewSnapshot){
 const f=snapshot.fields, has=(k:string)=>Boolean(f[k]?.trim());
 const issues:LocalIssue[]=[];
 function need(keys:string[],source:string,question:string,impact:string,any=false){
  if(any?keys.some(has):keys.every(has))return;
  issues.push({fields:keys.filter(k=>!has(k)),source,question,impact});
 }
 need(['creation.signal','creation.task'],'AL.WP.005','Какой эпизод разбираете и какое действие требуется?','Без контекста нельзя связать критерий с рабочей задачей.');
 const cloudKeys=['cloud.goal','cloud.needA','cloud.needB','cloud.actionA','cloud.actionB'];
 need(cloudKeys,'Методика тучи','Какие цель, потребности и действия нужно согласовать?','Пустое облако требует уточнения; в полной карте иммунитета D — желаемое действие по TOCT.16.');
 for(const step of Object.keys(steps)){
  const def=definitionFor(step,snapshot.profile);if(!def)continue;
  const fields=Object.fromEntries(def.fields.map(f=>[f.key,fv(step+'.'+f.key)]));
  if(!Object.values(fields).some(Boolean))continue;
  for(const issue of checkStep(step,snapshot.profile as Profile,fields).issues)issues.push({fields:[step+'.'+issue.field],source:issue.sourceIds?.join(', ')||'Pack-TOC',question:issue.question,impact:issue.criterion});
 }
 function fv(key:string){return f[key]||'';}
 need(['decision.reason'],'AL.WP.005','Почему выбран этот вариант или отказ?','Выбор требует собственного основания.');
 const choice=f['decision.choice'];
 const selected:Record<string,string>={'Вариант 1':'decision.optionA','Вариант 2':'decision.optionB','Дополнительный вариант':'decision.optionC'};
 if(!selected[choice]&&choice!=='Отказ от выбора')issues.push({fields:['decision.choice'],source:'AL.P.002:4',question:'Какое решение вы принимаете?',impact:'Система не выбирает решение за участника.'});
 if(selected[choice]){
  need([selected[choice]],'AL.WP.005','Что именно будете делать и за счёт чего ожидаете изменение?','Выбранный вариант должен быть описан.');
  need(['trial.hypothesis','trial.action','trial.supportIndicator','trial.weakenIndicator'],'AL.P.003:4','Что проверите, каким действием и какие наблюдения поддержат или ослабят предположение?','Без этих сведений трудно спланировать проверяемую следующую пробу.');
  need(['trial.status'],'AL.P.008:4','На какой стадии находится проба?','План и выполненное действие требуют разных оснований.');
 }
 if(['HIGH','CRITICAL'].includes(f['creation.sensitivity']))need(['trial.authority','trial.protection'],'AL.P.002:4','Кто уполномочен разрешить пробу и какие меры защиты предусмотрены?','При повышенном риске наличие текста не является допуском к действию.');
 const done=f['trial.status']==='Выполнена';
 if(done){
  need(['result.actual','result.observed','result.interpretation'],'AL.P.008:4','Что сделали, что наблюдали и какие есть альтернативные объяснения?','Отметка «Выполнена» сама по себе не подтверждает результат.');
  need(['result.next','result.reason'],'AL.P.003:4','Каков следующий шаг и почему?','Обратная связь должна вести к осмысленному следующему действию.');
 }
 const summary=[
  {title:'Проблема',fields:['creation.signal','creation.task']},
  {title:'Противоречие',fields:cloudKeys},
  {title:'Выбранное решение',fields:['decision.choice',...(selected[choice]?[selected[choice]]:[]),'decision.reason']},
  {title:'Рабочая проба',fields:['trial.status','trial.hypothesis','trial.action']},
  {title:'Результат',fields:done?['result.actual','result.observed','result.interpretation','result.effect','result.next']:[]},
 ].map(section=>({...section,values:section.fields.map(key=>({key,text:f[key]||'Не заполнено'}))}));
 return {version:METHOD_VERSION,issues,summary,done,notes:[
  'Локальная проверка проверяет наличие сведений. Она не устанавливает истинность, смысловую достаточность и причинность. Если ответ есть в другом поле, перенесите его или явно уточните соответствующее поле.',
  'Сравните результат с исходной точкой. Даже наблюдаемое улучшение не доказывает причинный эффект решения (AL.P.008).',
  'Уточните, что выполнено самостоятельно, а что с подсказкой или ИИ. Поддержанное выполнение не доказывает самостоятельное освоение (AL.WP.005).',
 ]};
}
export type LocalReview=ReturnType<typeof localReview>;
