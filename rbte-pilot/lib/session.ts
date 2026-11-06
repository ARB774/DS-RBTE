import 'server-only';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { db } from './db';
import { type UserRole } from '@/db/schema';
import { SESSION_COOKIE,tokenSchema,type AuthUser } from './auth';
import { portalCall,identitySchema } from './portal-client';
import { portalUser } from './portal-user';
export const getCurrentSession=cache(async():Promise<{user:AuthUser|null}>=>{
 const parsed=tokenSchema.safeParse((await cookies()).get(SESSION_COOKIE)?.value);
 if(!parsed.success) return {user:null};
 try {
  const identity=identitySchema.parse(await portalCall({action:'validate',token:parsed.data}));
  return {user:await portalUser(db,identity)};
 } catch { return {user:null}; }
});
export async function requireUser(roles:UserRole[]=['PARTICIPANT']):Promise<AuthUser>{
 const {user}=await getCurrentSession();
 if(!user) redirect('/login');
 if(roles.length&&!roles.includes(user.role)) redirect('/dashboard');
 return user;
}
