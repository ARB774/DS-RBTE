import { and, eq } from 'drizzle-orm';
import { situations, stepDrafts } from '@/db/schema';
import { parseStepFields } from './steps';
import { recordWorkflowRevision } from './workflow-store';
import { checkStep } from './workflow-check';
import { hashBasis,contextOf } from './workflow-store';
import { dilemmaCloudFlow } from './dilemma-cloud-flow';
import { MANUAL_CLOUD_VERSION } from './cloud-entry';
// The caller must derive userId from authenticated portal identity.
export async function persistDraft(database: any, userId: string, situationId: string, step: string, version: number, input: Record<string,unknown>, draftOnly=false) {
 if (!Number.isSafeInteger(version) || version<0) throw new Error('Некорректная версия');

 return database.transaction(async (tx:any) => {
  const [owner]=await tx.select().from(situations).where(and(eq(situations.id,situationId),eq(situations.creatorId,userId))).limit(1).for('update');
  if (!owner || owner.locked) throw new Error('Ситуация недоступна');
  const fields=parseStepFields(step,input,owner.profile);
  if(step==='cloud'||step==='practice')fields.__cloudEntry=MANUAL_CLOUD_VERSION;
  const drafts=await tx.select().from(stepDrafts).where(eq(stepDrafts.situationId,situationId));
  if(owner.profile==='DILEMMA'&&['actions','cloud'].includes(step)){
   if(step==='cloud'&&!drafts.some((d:any)=>d.step==='actions'&&d.fields.__draft!=='true'&&checkStep('actions',owner.profile,d.fields).issues.length===0))throw new Error('Проверьте поля: сначала заполните и сохраните Действия.');
   const errors=draftOnly?[]:checkStep(step,owner.profile,fields).issues;
   if(errors.length)throw new Error('Проверьте поля: '+errors.map(i=>i.question).join(' '));
  }
  if(owner.profile==='DILEMMA'&&step==='cloud'){
   const flow=dilemmaCloudFlow({...fields,__cloudProgress:input.__cloudProgress,__cloudEditing:input.__cloudEditing});
   fields.__cloudProgress=String(flow.cursor);fields.__cloudEditing=flow.editing||'';
   if(!draftOnly){if(flow.cursor!==5||flow.editing)throw new Error('Проверьте поля: подтвердите ответы клавишей Enter.');fields.__cloudReview='submitted';}
  }
  if(draftOnly&&owner.profile==='DILEMMA')fields.__draft='true';
  const previous=drafts.find((draft:any)=>draft.step===step);
  if(previous&&!previous.fields.__basis)await recordWorkflowRevision(tx,owner,step,previous.fields,'Архив полей первой версии перед переходом на PILOT-2');
  const basis=hashBasis(step,owner.profile,contextOf(owner),[...drafts.filter((d:any)=>d.step!==step),{step,fields}]);
  if(step!=='explore'){fields.__check=JSON.stringify(checkStep(step,owner.profile,fields));fields.__basis=basis;}
  let updated;
  if (version===0) updated=await tx.insert(stepDrafts).values({situationId,step,fields,version:1})
   .onConflictDoNothing().returning();
  else updated=await tx.update(stepDrafts).set({fields,version:version+1,updatedAt:new Date()})
   .where(and(eq(stepDrafts.situationId,situationId),eq(stepDrafts.step,step),eq(stepDrafts.version,version))).returning();
  if (!updated.length) throw new Error('Данные уже изменены в другой вкладке. Скопируйте свой текст и обновите страницу.');
  await recordWorkflowRevision(tx,owner,step,fields,'Сохранение шага PILOT-2');
  return updated[0].version as number;
 });
}
