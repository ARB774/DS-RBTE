import { NextRequest,NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { portalCall,tokenPattern,grantSchema,identitySchema } from '@/lib/portal-client';
import { SESSION_COOKIE } from '@/lib/auth';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest){
 const state=request.nextUrl.searchParams.get('state')??'',code=request.nextUrl.searchParams.get('code')??'';
 const expected=request.cookies.get('__Host-pilot_state')?.value??'',verifier=request.cookies.get('__Host-pilot_verifier')?.value??'';
 let token:string|null=null;
 if([state,expected,code,verifier].every(value=>tokenPattern.test(value))&&timingSafeEqual(Buffer.from(state),Buffer.from(expected))){
  try {
   token=grantSchema.parse(await portalCall({action:'exchange',code,verifier})).token;
   identitySchema.parse(await portalCall({action:'validate',token}));
  } catch {token=null;}
 }
 const response=NextResponse.redirect('https://pilot.rbte.pro'+(token?'/dashboard':'/login'));
 for(const name of ['__Host-pilot_state','__Host-pilot_verifier']) response.cookies.set(name,'',{secure:true,httpOnly:true,sameSite:'lax',path:'/',maxAge:0});
 if(token) response.cookies.set(SESSION_COOKIE,token,{secure:true,httpOnly:true,sameSite:'lax',path:'/',maxAge:8*3600});
 response.headers.set('Cache-Control','no-store');response.headers.set('Referrer-Policy','no-referrer');
 return response;
}
