import { NextResponse } from 'next/server';
import { randomBytes,createHash } from 'node:crypto';
export const dynamic='force-dynamic';
export async function GET(){
 const state=randomBytes(32).toString('base64url'),verifier=randomBytes(32).toString('base64url');
 const url=new URL('https://rbte.pro/sso/pilot/');
 url.searchParams.set('state',state);url.searchParams.set('code_challenge',createHash('sha256').update(verifier).digest('hex'));
 const response=NextResponse.redirect(url);
 for(const [name,value] of [['__Host-pilot_state',state],['__Host-pilot_verifier',verifier]]){
  response.cookies.set(name,value,{secure:true,httpOnly:true,sameSite:'lax',path:'/',maxAge:180});
 }
 response.headers.set('Cache-Control','no-store');response.headers.set('Referrer-Policy','no-referrer');
 return response;
}
