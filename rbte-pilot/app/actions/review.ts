'use server';
import { after } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/session';
import { beginReview,finishReview,readReview,ownedReviewInput } from '@/lib/review-store';
import { evaluateSituation,reviewConfig } from '@/lib/review-openai';
import { localReview } from '@/lib/review-local';
const safeMessages=['Ситуация недоступна','Записи изменились.','Достигнут лимит:','Подождите 90','Для оценки сократите','ИИ-оценка ещё'];
function errorText(error:unknown){const s=error instanceof Error?error.message:'';return safeMessages.some(p=>s.startsWith(p))?s:'Не удалось получить оценку. Данные сохранены; повторите позже.';}
export async function reviewStatus(id:string){
 const me=await requireUser();
 if(!z.string().uuid().safeParse(id).success)return {error:'Некорректный адрес ситуации'};
 try{return {view:await readReview(db,me.id,id)};}catch(error){return {error:errorText(error)};}
}
export async function startReview(id:string,fingerprint:string,consent:boolean){
 const me=await requireUser();
 if(consent!==true)return {error:'Подтвердите отправку сохранённых текстов в OpenAI.'};
 if(!z.string().uuid().safeParse(id).success||!/^[a-f0-9]{64}$/.test(fingerprint))return {error:'Обновите страницу ситуации.'};
 try {
  const config=reviewConfig();
  const job=await beginReview(db,me.id,id,fingerprint);
  if(job)after(async()=>{
   try {const report=await evaluateSituation(job.snapshot,config);await finishReview(db,me.id,id,job.runId,report);}
   catch {try{await finishReview(db,me.id,id,job.runId,null);}catch{/* Keep pending lease; UI expires it. Never log situation/key. */}}
  });
  return {view:await readReview(db,me.id,id)};
 }catch(error){return {error:errorText(error)};}
}

export async function localReviewStatus(id:string){
 const me=await requireUser();
 if(!z.string().uuid().safeParse(id).success)return {error:'Некорректный адрес ситуации'};
 try {const input=await ownedReviewInput(db,me.id,id);return {local:{fingerprint:input.fingerprint,report:localReview(input.snapshot)}};}
 catch(error){return {error:errorText(error)};}
}
