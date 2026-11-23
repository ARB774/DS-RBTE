import { z } from 'zod';
import { and,eq } from 'drizzle-orm';
import { situations,stepDrafts } from '@/db/schema';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/session';
import { buildWordReport,wordReportContentDisposition,wordReportFileName } from '@/lib/word-report';

export const dynamic='force-dynamic';

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!z.string().uuid().safeParse(id).success)return new Response('Некорректный адрес ситуации',{status:404});
 const me=await requireUser();
 try{
  const [situation]=await db.select().from(situations).where(and(eq(situations.id,id),eq(situations.creatorId,me.id))).limit(1);
  if(!situation)return new Response('Ситуация недоступна',{status:404});
  const drafts=await db.select().from(stepDrafts).where(eq(stepDrafts.situationId,id));
  const buffer=await buildWordReport(situation,drafts);
  const fileName=wordReportFileName(situation.title);
  return new Response(new Uint8Array(buffer),{headers:{
   'Content-Type':'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
   'Content-Disposition':wordReportContentDisposition(fileName),
   'Cache-Control':'private, no-store',
  }});
 }catch(error){
  console.error('word-report-failed',error);
  return new Response('Не удалось сформировать отчёт Word',{status:500});
 }
}
