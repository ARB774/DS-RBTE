'use server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/session';
import { persistDraft } from '@/lib/drafts';
import { ownedWorkflow } from '@/lib/workflow-store';
import { reviewWorkflow } from './workflow';
export async function saveDraft(id: string, step: string, version: number, fields: Record<string,string>, draftOnly=false) {
 const me=await requireUser();
 if(typeof draftOnly!=='boolean')return {error:'Некорректный режим сохранения'};
 if (!z.string().uuid().safeParse(id).success) return {error:'Некорректный адрес ситуации'};
 try {
  const savedVersion=await persistDraft(db,me.id,id,step,version,fields,draftOnly);
  if(step==='cloud'){
   const {situation}=await ownedWorkflow(db,me.id,id);
   if(situation.profile==='DILEMMA'&&!draftOnly){
    const checked=await reviewWorkflow(id,step,savedVersion,true);
    return {version:checked.version??savedVersion,report:checked.report,reviewError:checked.error};
   }
  }
  return {version:savedVersion};
 }
 catch (error) {
  const message=error instanceof Error ? error.message : '';
  if (message.startsWith('Данные уже') || message==='Ситуация недоступна' || message.startsWith('Проверьте поля'))
   return {error:message};
  return {error:'Не удалось сохранить. Ваш текст остаётся в форме; повторите позже.'};
 }
}
