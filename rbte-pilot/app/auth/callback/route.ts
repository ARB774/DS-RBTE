import { NextRequest,NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { portalCall,tokenPattern,grantSchema,identitySchema,PortalResponseError } from '@/lib/portal-client';
import { SESSION_COOKIE } from '@/lib/auth';
import { authReturnPath } from '@/lib/session-check';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest){
 const state=request.nextUrl.searchParams.get('state')??'',code=request.nextUrl.searchParams.get('code')??'';
 const expected=request.cookies.get('__Host-pilot_state')?.value??'',verifier=request.cookies.get('__Host-pilot_verifier')?.value??'';
 let token:string|null=null;
 let unavailable=false;
 const next=authReturnPath(request.cookies.get('__Host-pilot_return')?.value);
 if([state,expected,code,verifier].every(value=>tokenPattern.test(value))&&timingSafeEqual(Buffer.from(state),Buffer.from(expected))){
  try {
   token=grantSchema.parse(await portalCall({action:'exchange',code,verifier})).token;
   identitySchema.parse(await portalCall({action:'validate',token}));
  } catch(error) {token=null;unavailable=!(error instanceof PortalResponseError&&error.status===401);}
 }
 const response=NextResponse.redirect('https://pilot.rbte.pro'+(token?next:(unavailable?'/auth/unavailable':'/login')+'?next='+encodeURIComponent(next)));
 for(const name of ['__Host-pilot_state','__Host-pilot_verifier','__Host-pilot_return']) response.cookies.set(name,'',{secure:true,httpOnly:true,sameSite:'lax',path:'/',maxAge:0});
 if(token) response.cookies.set(SESSION_COOKIE,token,{secure:true,httpOnly:true,sameSite:'lax',path:'/',maxAge:8*3600});
 response.headers.set('Cache-Control','no-store');response.headers.set('Referrer-Policy','no-referrer');
 return response;
}
