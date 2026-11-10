import 'server-only';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { db } from './db';
import { type UserRole } from '@/db/schema';
import { SESSION_COOKIE,type AuthUser } from './auth';
import { portalCall,identitySchema } from './portal-client';
import { portalUser } from './portal-user';
import { checkPortalSession,sessionDestination,type SessionCheck } from './session-check';
export const getCurrentSession=cache(async():Promise<SessionCheck>=>{
 return checkPortalSession((await cookies()).get(SESSION_COOKIE)?.value,
  async token=>identitySchema.parse(await portalCall({action:'validate',token})),
  async identity=>portalUser(db,identitySchema.parse(identity)));
});
export async function requireUser(roles:UserRole[]=['PARTICIPANT'],returnTo='/dashboard'):Promise<AuthUser>{
 const session=await getCurrentSession();
 const destination=sessionDestination(session,returnTo);
 if(destination) redirect(destination);
 const {user}=session;
 if(!user) redirect('/login');
 if(roles.length&&!roles.includes(user.role)) redirect('/dashboard');
 return user;
}
