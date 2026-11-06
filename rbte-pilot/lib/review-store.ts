import { randomUUID } from 'node:crypto';
import { and,eq } from 'drizzle-orm';
import { situations,stepDrafts,situationReviews,reviewLimits,users } from '@/db/schema';
import { reviewInput } from './review-input';
import { checkedReport,type ReviewReport,type ReviewView } from './review-types';

export async function ownedReviewInput(database:any,userId:string,id:string){
 const [situation]=await database.select().from(situations).where(and(eq(situations.id,id),eq(situations.creatorId,userId))).limit(1);
 if(!situation||situation.locked)throw new Error('Ситуация недоступна');
 const drafts=await database.select().from(stepDrafts).where(eq(stepDrafts.situationId,id));
 return reviewInput(situation,drafts);
}
export async function readReview(database:any,userId:string,id:string):Promise<ReviewView>{
 const input=await ownedReviewInput(database,userId,id);
 const [row]=await database.select().from(situationReviews).where(and(eq(situationReviews.situationId,id),eq(situationReviews.userId,userId))).limit(1);
 if(!row)return {fingerprint:input.fingerprint,state:'none',report:null,updatedAt:null};
 const base={fingerprint:input.fingerprint,report:null,updatedAt:row.updatedAt.toISOString()};
 if(row.fingerprint!==input.fingerprint)return {...base,state:'stale'};
 if(row.state==='pending')return {...base,state:row.expiresAt.getTime()>Date.now()?'pending':'error'};
 if(row.state==='ready'){
  try{return {...base,state:'ready',report:checkedReport(row.report,input.snapshot)};}
  catch{return {...base,state:'error'};}
 }
 return {...base,state:'error'};
}
// User row serializes requests across tabs/processes before spending any provider tokens.
export async function beginReview(database:any,userId:string,id:string,fingerprint:string){
 return database.transaction(async(tx:any)=>{
  await tx.select({id:users.id}).from(users).where(eq(users.id,userId)).for('update');
  const input=await ownedReviewInput(tx,userId,id);
  if(input.fingerprint!==fingerprint)throw new Error('Записи изменились. Обновите итог и нажмите кнопку ещё раз.');
  const [prior]=await tx.select().from(situationReviews).where(and(eq(situationReviews.situationId,id),eq(situationReviews.userId,userId))).limit(1);
  const now=new Date();
  if(prior?.fingerprint===fingerprint&&(prior.state==='ready'||prior.state==='pending'&&prior.expiresAt>now))return null;
  const [limit]=await tx.select().from(reviewLimits).where(eq(reviewLimits.userId,userId)).limit(1);
  const day=now.toISOString().slice(0,10),count=limit?.day===day?limit.count:0;
  if(count>=20)throw new Error('Достигнут лимит: 20 новых оценок за сутки UTC. Сохранённые итоги доступны.');
  if(limit&&now.getTime()-limit.lastAt.getTime()<90000)throw new Error('Подождите 90 секунд между новыми оценками.');
  await tx.insert(reviewLimits).values({userId,day,count:count+1,lastAt:now}).onConflictDoUpdate({target:reviewLimits.userId,set:{day,count:count+1,lastAt:now}});
  const runId=randomUUID(),values={userId,runId,fingerprint,state:'pending',report:null,updatedAt:now,expiresAt:new Date(now.getTime()+120000)};
  await tx.insert(situationReviews).values({situationId:id,...values}).onConflictDoUpdate({target:situationReviews.situationId,set:values});
  return {...input,runId};
 });
}
export async function finishReview(database:any,userId:string,id:string,runId:string,report:ReviewReport|null){
 await database.update(situationReviews).set({state:report?'ready':'error',report,updatedAt:new Date()})
 .where(and(eq(situationReviews.situationId,id),eq(situationReviews.userId,userId),eq(situationReviews.runId,runId),eq(situationReviews.state,'pending')));
}
