'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE,tokenSchema } from '@/lib/auth';
import { portalCall } from '@/lib/portal-client';
export async function loginAction(_previous:{error:string},_form:FormData){
 return {error:'Вход доступен через портал rbte.pro.'};
}
export async function logoutAction(){
 const jar=await cookies(),token=tokenSchema.safeParse(jar.get(SESSION_COOKIE)?.value);
 if(token.success) {try {await portalCall({action:'revoke',token:token.data});} catch {}}
 jar.set(SESSION_COOKIE,'',{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:0});
 redirect('/login');
}
