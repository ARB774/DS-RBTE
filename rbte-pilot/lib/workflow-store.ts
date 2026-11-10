import { TOC_VERSION,tocSourceIds } from './pack-toc';
import { createHash } from 'node:crypto';
import { and,eq,desc } from 'drizzle-orm';
import { situations,stepDrafts,revisions } from '@/db/schema';
import { basisData } from './workflow-check';
export function contextOf(situation:Record<string,unknown>){return JSON.stringify(Object.fromEntries(['signal','task','desiredChange','authority','sensitivity','supportLevel','experience'].map(k=>[k,situation[k]??''])));}
export const hashBasis=(step:string,profile:string,signal:string,drafts:Array<{step:string;fields:Record<string,string>}>)=>createHash('sha256').update(basisData(step,profile,signal,drafts)).digest('hex');
export async function ownedWorkflow(database:any,userId:string,id:string){
 const [situation]=await database.select().from(situations).where(and(eq(situations.id,id),eq(situations.creatorId,userId))).limit(1);
 if(!situation||situation.locked)throw new Error('Ситуация недоступна');
 const drafts=await database.select().from(stepDrafts).where(eq(stepDrafts.situationId,id));
 return {situation,drafts};
}
// Serialize revision numbering on the situation row in the caller's transaction.
export async function recordWorkflowRevision(tx:any,owner:any,step:string,fields:Record<string,string>,comment:string){
 const [last]=await tx.select().from(revisions).where(eq(revisions.situationId,owner.id)).orderBy(desc(revisions.number)).limit(1);
 const kinds:Record<string,string>={cloud:'STEP_43',decision:'STEP_44',trial:'STEP_45',result:'STEP_46',feedback:'STEP_47'};
 const [revision]=await tx.insert(revisions).values({situationId:owner.id,number:(last?.number||0)+1,parentId:last?.id||null,kind:kinds[step]||'STEP_43',snapshot:{pilotVersion:2,step,profile:owner.profile,fields,methodVersion:TOC_VERSION,sourceIds:tocSourceIds(owner.profile,step)},createdBy:owner.creatorId,comment}).returning();
 await tx.update(situations).set({currentRevisionId:revision.id,updatedAt:new Date()}).where(eq(situations.id,owner.id));
}
