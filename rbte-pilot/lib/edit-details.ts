import { and,eq,sql } from 'drizzle-orm';
import { situations } from '@/db/schema';
import { z } from 'zod';
export const detailSchema=z.object({
 title:z.string().trim().min(5).max(160),signal:z.string().trim().min(10).max(2000),task:z.string().max(2000),
 desiredChange:z.string().max(2000),experience:z.string().max(2000),authority:z.string().max(2000),
 profile:z.enum(['DILEMMA','CONFLICT','LT_CLOUD','IMMUNITY']),sensitivity:z.enum(['LOW','STANDARD','HIGH','CRITICAL']),
 supportLevel:z.enum(['NONE','LOW','MEDIUM','HIGH']),
}).strict();
export async function persistDetails(database:any,userId:string,id:string,version:string,raw:unknown){
 const fields=detailSchema.parse(raw);
 const date=z.string().datetime().parse(version);
 // PostgreSQL stores microseconds; JS Dates expose milliseconds. Compare at the
 // exposed precision and always advance by at least 1 ms to prevent lost updates.
 const rows=await database.update(situations).set({...fields,updatedAt:sql`greatest(now(), ${situations.updatedAt} + interval '1 millisecond')`})
 .where(and(eq(situations.id,id),eq(situations.creatorId,userId),eq(situations.locked,false),sql`date_trunc('milliseconds', ${situations.updatedAt}) = ${date}::timestamptz`)).returning({updatedAt:situations.updatedAt});
 if(!rows.length)throw new Error('Данные уже изменены или ситуация недоступна. Обновите страницу.');
 return rows[0].updatedAt.toISOString();
}
