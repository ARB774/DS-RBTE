import { and,eq,gt } from 'drizzle-orm';
import { users,sessions } from '@/db/schema';
import { digest } from './passwords';
export async function sessionUser(database:any,token:string){
 if(!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
 const [row]=await database.select({id:users.id,email:users.email,name:users.name}).from(sessions)
 .innerJoin(users,eq(sessions.userId,users.id))
 .where(and(eq(sessions.id,digest(token)),gt(sessions.expiresAt,new Date()),eq(users.active,true))).limit(1);
 return row?{...row,role:'PARTICIPANT' as const}:null;
}
