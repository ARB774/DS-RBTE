'use server';
import { z } from 'zod';
import { and,eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { stepDrafts,users,reviewLimits } from '@/db/schema';
import { requireUser } from '@/lib/session';
import { ownedWorkflow,hashBasis,recordWorkflowRevision,contextOf } from '@/lib/workflow-store';
import { definitionFor } from '@/lib/steps';
import { checkStep, type WorkflowCheck } from '@/lib/workflow-check';
import { evaluateWorkflow } from '@/lib/workflow-ai';
import { evaluateDilemmaCloud } from '@/lib/dilemma-review-ai';
import { mergeDilemmaIssues } from '@/lib/dilemma-review';
import { reviewConfig } from '@/lib/review-openai';
export async function reviewWorkflow(id:string,step:string,version:number,consent:boolean):Promise<{version?:number;report?:WorkflowCheck;assistance?:string;error?:string}>{
 const me=await requireUser();
 if(!z.string().uuid().safeParse(id).success||!Number.isSafeInteger(version)||consent!==true)return {error:'Подтвердите проверку сохранённых данных через OpenAI.'};
 try{
  const config=reviewConfig();
  const job=await db.transaction(async tx=>{
   await tx.select({id:users.id}).from(users).where(eq(users.id,me.id)).for('update');
   const {situation,drafts}=await ownedWorkflow(tx,me.id,id);
   const draft=drafts.find((d:any)=>d.step===step);
   if(!definitionFor(step,situation.profile)||!draft||draft.version!==version)throw new Error('Записи изменились. Сохраните шаг и повторите проверку.');
   const now=new Date(),day=now.toISOString().slice(0,10);
   const [limit]=await tx.select().from(reviewLimits).where(eq(reviewLimits.userId,me.id)).limit(1);
   const count=limit?.day===day?limit.count:0;
   if(count>=20)throw new Error('Достигнут лимит: 20 проверок за сутки UTC.');
   const cooldown=situation.profile==='DILEMMA'&&step==='cloud'?3000:90000;
   if(limit&&now.getTime()-limit.lastAt.getTime()<cooldown)throw new Error('Подождите '+Math.ceil((cooldown-(now.getTime()-limit.lastAt.getTime()))/1000)+' секунд перед повторной проверкой ИИ.');
   await tx.insert(reviewLimits).values({userId:me.id,day,count:count+1,lastAt:now}).onConflictDoUpdate({target:reviewLimits.userId,set:{day,count:count+1,lastAt:now}});
   return {situation,drafts,draft,basis:hashBasis(step,situation.profile,contextOf(situation),drafts)};
  });
  const report=job.situation.profile==='DILEMMA'&&step==='cloud'?await evaluateDilemmaCloud(job.situation,job.drafts,config):await evaluateWorkflow(step,job.situation,job.drafts,config);
  const result=await db.transaction(async tx=>{
   // Lock owner first, matching saveDraft, so a concurrent save cannot race the check.
   const {situations}=await import('@/db/schema');
   await tx.select({id:situations.id}).from(situations).where(and(eq(situations.id,id),eq(situations.creatorId,me.id))).for('update');
   const current=await ownedWorkflow(tx,me.id,id);
   const draft=current.drafts.find((d:any)=>d.step===step);
   if(!draft||draft.version!==version||hashBasis(step,current.situation.profile,contextOf(current.situation),current.drafts)!==job.basis)throw new Error('Записи изменились. Сохраните шаг и повторите проверку.');
   const local=checkStep(step,current.situation.profile,draft.fields);
   const fields:Record<string,string>={...draft.fields,__check:JSON.stringify({...report,issues:current.situation.profile==='DILEMMA'&&step==='cloud'?mergeDilemmaIssues(local.issues,report.issues):[...local.issues,...report.issues]})};
   if(step==='practice')fields.assistance=fields.assistance==='Без содержательных подсказок'?'ИИ':fields.assistance==='ИИ'?'ИИ':'Несколько видов помощи';
   fields.__basis=hashBasis(step,current.situation.profile,contextOf(current.situation),[...current.drafts.filter((d:any)=>d.step!==step),{step,fields}]);
   const [saved]=await tx.update(stepDrafts).set({fields,version:version+1,updatedAt:new Date()}).where(and(eq(stepDrafts.situationId,id),eq(stepDrafts.step,step),eq(stepDrafts.version,version))).returning();
   if(!saved)throw new Error('Записи изменились. Повторите проверку.');
   await recordWorkflowRevision(tx,current.situation,step,fields,'Обратная связь ИИ по текущему шагу');
   return {version:saved.version,report:JSON.parse(fields.__check),assistance:step==='practice'?fields.assistance:undefined};
  });
  return result;
 }catch(error){const message=error instanceof Error?error.message:'';return {error:/^(Записи изменились|Достигнут лимит|Подождите \d+|ИИ-оценка ещё|Ситуация недоступна|Для проверки сократите|Поиск Pack-TOC через MCP)/.test(message)?message:'Смысловая проверка не выполнена. Черновик сохранён; проверьте подключение и повторите позже.'};}
}
