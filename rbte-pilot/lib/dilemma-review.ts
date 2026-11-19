import type { WorkflowCheck } from './workflow-check';
import { TOC_COMMIT } from './pack-toc';
import type { MethodIssue } from './cloud-method';
export function mergeDilemmaIssues(...groups:MethodIssue[][]){
 const seen=new Set<string>();
 return groups.flat().filter(issue=>{const key=JSON.stringify([issue.field,issue.link,issue.criterion,issue.observation,issue.question]);if(seen.has(key))return false;seen.add(key);return true;});
}
export const dilemmaLinkKeys=['ab','bd','ac','cd','conflict','dc','db'] as const;
export type DilemmaLink=typeof dilemmaLinkKeys[number];
export type LinkReview={key:DilemmaLink;status:'ok'|'issue'|'uncertain';observation:string;question:string;sourceIds:string[]};
export const dilemmaLinkLabels:Record<DilemmaLink,string>={ab:'A–B · необходимость B для A',bd:'B–D · необходимость D для B',ac:'A–C · необходимость C для A',cd:'C–D′ · необходимость D′ для C',conflict:'D–D′ · несовместимость действий',dc:'D–C · угроза C со стороны D',db:'D′–B · угроза B со стороны D′'};
export const dilemmaLinkFields:Record<DilemmaLink,string[]>={ab:['goal','needA'],bd:['needA','actionA'],ac:['goal','needB'],cd:['needB','actionB'],conflict:['actionA','actionB'],dc:['actionA','needB'],db:['actionB','needA']};
export function hasDilemmaSemanticReview(report:WorkflowCheck|null){
 return report?.mode==='ai'&&report.semantic?.status==='completed'&&report.semantic.retrieval.transport==='mcp-stdio'&&report.semantic.retrieval.commit===TOC_COMMIT&&report.semantic.links.length===7&&dilemmaLinkKeys.every(key=>report.semantic!.links.some(l=>l.key===key))&&(report.issues.length>0||report.semantic.verification?.passes===2);
}
