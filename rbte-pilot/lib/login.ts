import { randomBytes } from 'node:crypto';
import { and,eq,lt,sql } from 'drizzle-orm';
import { users,sessions,loginAttempts } from '@/db/schema';
import { digest,verifyPassword } from './passwords';
export async function login(database:any,email:string,password:string,ip:string) {
 const now=new Date(),expiry=new Date(now.getTime()+15*60*1000);
 async function consume(scope:string,limit:number){
  const [row]=await database.insert(loginAttempts).values({id:digest(scope),count:1,expiresAt:expiry})
  .onConflictDoUpdate({target:loginAttempts.id,set:{
   count:sql`case when ${loginAttempts.expiresAt} < ${now} then 1 else ${loginAttempts.count}+1 end`,
   expiresAt:sql`case when ${loginAttempts.expiresAt} < ${now} then ${expiry} else ${loginAttempts.expiresAt} end`,
  }}).returning();
  return row.count<=limit;
 }
 const ipOk=await consume('ip:'+ip,30);
 const emailOk=await consume('email:'+email,5);
 if(!ipOk||!emailOk) return null;
 const [user]=await database.select().from(users).where(eq(users.email,email)).limit(1);
 const valid=await verifyPassword(password,user?.passwordHash ?? '');
 if(!valid||!user?.active) return null;
 const token=randomBytes(32).toString('base64url');
 const issued=await database.transaction(async(tx:any)=>{
  const [current]=await tx.select().from(users).where(eq(users.id,user.id)).for('update');
  if(!current?.active||current.passwordHash!==user.passwordHash) return false;
  await tx.insert(sessions).values({id:digest(token),userId:user.id,expiresAt:new Date(now.getTime()+8*3600*1000)});
  return true;
 });
 if(!issued) return null;
 // Bounded cleanup: expired rows only; no current sessions invalidated.
 await database.delete(sessions).where(lt(sessions.expiresAt,now));
 await database.delete(loginAttempts).where(lt(loginAttempts.expiresAt,new Date(now.getTime()-86400000)));
 return token;
}
