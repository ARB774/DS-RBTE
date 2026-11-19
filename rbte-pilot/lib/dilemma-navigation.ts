import { checkStep } from './workflow-check';
import { hasDilemmaSemanticReview } from './dilemma-review';
import { dilemmaSteps } from './dilemma-route';
export { dilemmaSteps,dilemmaTitle } from './dilemma-route';
export function dilemmaReady(step:string,fields:Record<string,string>,fresh=true){
 if(!fresh||fields.__draft==='true')return false;
 try { const report=JSON.parse(fields.__check||'null');return report?.issues?.length===0&&checkStep(step,'DILEMMA',fields).issues.length===0&&(step!=='cloud'||hasDilemmaSemanticReview(report)); }catch{return false;}
}
export function dilemmaResume(drafts:Array<{step:string;fields:Record<string,string>;fresh?:boolean}>){return dilemmaSteps.slice(1).find(([key])=>!drafts.some(d=>d.step===key&&dilemmaReady(key,d.fields,d.fresh!==false)))?.[0]||'summary';}
