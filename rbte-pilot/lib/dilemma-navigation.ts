import { allAssumptionInjectionsComplete,checkStep } from './workflow-check';
import { hasDilemmaSemanticReview } from './dilemma-review';
import { dilemmaSteps } from './dilemma-route';
export { dilemmaSteps,dilemmaTitle } from './dilemma-route';
export function dilemmaReady(step:string,fields:Record<string,string>,fresh=true){
 if(!fresh||fields.__draft==='true')return false;
 if(step==='assumption-check'&&!allAssumptionInjectionsComplete(fields))return false;
 try { const report=JSON.parse(fields.__check||'null');return report?.issues?.length===0&&checkStep(step,'DILEMMA',fields).issues.length===0&&(step==='assumptions'||step==='trial'||report.mode==='ai')&&(step!=='cloud'||hasDilemmaSemanticReview(report)); }catch{return false;}
}
export function dilemmaResume(drafts:Array<{step:string;fields:Record<string,string>;fresh?:boolean}>){return dilemmaSteps.slice(1).find(([key])=>!drafts.some(d=>d.step===key&&dilemmaReady(key,d.fields,d.fresh!==false)))?.[0]||'summary';}
export function dilemmaStepStatus(step:string,fields:Record<string,string>,fresh:boolean){
 if(!fresh)return 'перепроверить';
 if(fields.__draft==='true')return 'черновик';
 try {
  const report=JSON.parse(fields.__check||'null');
  if(report?.issues?.length)return 'требует внимания';
  if(!dilemmaReady(step,fields))return 'проверка не завершена';
  return report?.mode==='ai'?'проверено помощником':'локально проверено';
 }catch{return 'проверка не завершена';}
}
export function logicLinkAnswered(fields:Record<string,string>,key:string){
 return ['Да','Нужно уточнить','Не знаю'].includes(fields[key])&&Boolean(fields[key+'Reason']?.trim());
}
export function firstIncompleteLogicLink<T extends string>(fields:Record<string,string>,links:readonly T[]):T|undefined{return links.find(key=>!logicLinkAnswered(fields,key));}
