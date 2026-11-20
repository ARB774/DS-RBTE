import type { WorkflowCheck } from './workflow-check';
import type { MethodIssue } from './cloud-method';
import type { DilemmaReviewReply } from './dilemma-review-replies';
export function mergeDilemmaIssues(...groups:MethodIssue[][]){
 const seen=new Set<string>();
 return groups.flat().filter(issue=>{const key=JSON.stringify([issue.field,issue.link,issue.criterion,issue.observation,issue.question]);if(seen.has(key))return false;seen.add(key);return true;});
}
export const dilemmaLinkKeys=['ab','bd','ac','cd','conflict','dc','db'] as const;
export type DilemmaLink=typeof dilemmaLinkKeys[number];
export type LinkReview={key:DilemmaLink;status:'ok'|'issue'|'uncertain';observation:string;question:string;sourceIds:string[]};
export const dilemmaLinkLabels:Record<DilemmaLink,string>={ab:'A–B · необходимость B для A',bd:'B–D · необходимость D для B',ac:'A–C · необходимость C для A',cd:'C–D′ · необходимость D′ для C',conflict:'D–D′ · несовместимость действий',dc:'D–C · угроза C со стороны D',db:'D′–B · угроза B со стороны D′'};
export const dilemmaLinkFields:Record<DilemmaLink,string[]>={ab:['goal','needA'],bd:['needA','actionA'],ac:['goal','needB'],cd:['needB','actionB'],conflict:['actionA','actionB'],dc:['actionA','needB'],db:['actionB','needA']};
const dilemmaRevisionFields=['goal','needA','needB','actionA','actionB'] as const;
export function priorDilemmaReview(previous:Record<string,string>|undefined,current:Record<string,string>){
 if(!previous||!dilemmaRevisionFields.every(field=>previous[field]===current[field]))return undefined;
 try{const report=JSON.parse(previous.__check||'');return report?.mode==='ai'&&report?.semantic?.status==='completed'?previous.__check:undefined;}catch{return undefined;}
}
export function acceptedDilemmaRevisions(report:WorkflowCheck,replies:DilemmaReviewReply[]){
 const repliedFields=new Set(replies.map(reply=>reply.field));
 return Object.fromEntries(dilemmaRevisionFields.flatMap(field=>{
  const value=report.acceptedRevisions?.[field]?.trim();
  return value&&repliedFields.has(field)?[[field,value]]:[];
 }));
}
export function unresolvedDilemmaIssues(issues:MethodIssue[],accepted:Record<string,string>,fields:Record<string,string>){
 return issues.filter(issue=>{
  const value=accepted[issue.field]?.trim();
  return !(value&&fields[issue.field]?.trim()===value&&!issue.link);
 });
}
export function hasDilemmaSemanticReview(report:WorkflowCheck|null){
 const sourceIds=report?.semantic?.retrieval.sourceIds||[];
 return report?.mode==='ai'&&report.semantic?.status==='completed'&&report.semantic.retrieval.transport==='mcp-stdio'&&report.semantic.retrieval.server==='pilot-mentor-methods'&&report.semantic.retrieval.commit.length===40&&sourceIds.includes('DS-RBTE.ASSISTANT-SKILL')&&sourceIds.includes('DS-RBTE.DILEMMA.ASSISTANT-SPEC')&&report.semantic.links.length===7&&dilemmaLinkKeys.every(key=>report.semantic!.links.some(l=>l.key===key))&&(report.issues.length>0||report.semantic.verification?.passes===2);
}
