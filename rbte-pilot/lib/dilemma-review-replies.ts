import type { MethodIssue } from './cloud-method';

export type DilemmaReviewReply={
 key:string;
 field:string;
 link?:string;
 criterion:string;
 question:string;
 reply:string;
};

const MAX_REPLIES=30;
const MAX_REPLY_LENGTH=1200;
const MAX_SERIALIZED_LENGTH=30000;

export function dilemmaIssueKey(issue:Pick<MethodIssue,'field'|'link'|'criterion'|'question'>){
 const value=[issue.field,issue.link||'',issue.criterion,issue.question].join('\u241f');
 let hash=2166136261;
 for(let index=0;index<value.length;index++){hash^=value.charCodeAt(index);hash=Math.imul(hash,16777619);}
 return (issue.link||issue.field)+'-'+(hash>>>0).toString(16);
}

function validReply(value:unknown):value is DilemmaReviewReply{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const item=value as Record<string,unknown>;
 return typeof item.key==='string'&&item.key.length<=120
  &&typeof item.field==='string'&&item.field.length<=80
  &&(item.link===undefined||typeof item.link==='string'&&item.link.length<=80)
  &&typeof item.criterion==='string'&&item.criterion.length<=400
  &&typeof item.question==='string'&&item.question.length<=700
  &&typeof item.reply==='string'&&item.reply.trim().length>0&&item.reply.length<=MAX_REPLY_LENGTH;
}

export function readDilemmaReviewReplies(value:unknown):DilemmaReviewReply[]{
 if(typeof value!=='string'||!value.trim())return [];
 try{
  const parsed=JSON.parse(value);
  if(!Array.isArray(parsed)||parsed.length>MAX_REPLIES||!parsed.every(validReply))return [];
  return parsed;
 }catch{return [];}
}

export function normalizeDilemmaReviewReplies(value:unknown){
 if(value===undefined||value==='')return '';
 if(typeof value!=='string'||value.length>MAX_SERIALIZED_LENGTH)throw new Error('Проверьте поля: ответ помощнику слишком длинный');
 const replies=readDilemmaReviewReplies(value);
 if(!replies.length)throw new Error('Проверьте поля: некорректный ответ помощнику');
 return JSON.stringify(replies);
}

export function upsertDilemmaReviewReply(value:string|undefined,issue:MethodIssue,reply:string){
 const text=reply.trim();
 if(!text||text.length>MAX_REPLY_LENGTH)throw new Error('Ответ помощнику должен содержать от 1 до 1200 символов');
 const key=dilemmaIssueKey(issue);
 const next: DilemmaReviewReply={key,field:issue.field,link:issue.link,criterion:issue.criterion,question:issue.question,reply:text};
 const previous=readDilemmaReviewReplies(value).filter(item=>item.key!==key);
 return JSON.stringify([...previous.slice(-(MAX_REPLIES-1)),next]);
}
