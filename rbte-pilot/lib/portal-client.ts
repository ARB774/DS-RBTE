import { request } from 'node:http';
import { z } from 'zod';
const tokenPattern=/^[A-Za-z0-9_-]{43}$/;
export async function portalCall(data:Record<string,string>) {
 const key=process.env.PILOT_BRIDGE_KEY;
 if(!key||key.length<32) throw new Error('Portal bridge unavailable');
 const body=JSON.stringify(data);
 return new Promise<unknown>((resolve,reject)=>{
  const req=request({hostname:'127.0.0.1',port:8100,path:'/internal/pilot/',method:'POST',agent:false,
   headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body),'Host':'rbte.pro','X-Forwarded-Proto':'https','Authorization':'Bearer '+key}},res=>{
   if(res.statusCode!==200){res.resume();reject(new Error('Portal authorization denied'));return;}
   const chunks:Buffer[]=[];let size=0;
   res.on('data',(chunk:Buffer)=>{size+=chunk.length;if(size>16384){req.destroy(new Error('Portal response too large'));return;}chunks.push(chunk);});
   res.on('error',()=>reject(new Error('Portal response unavailable')));
   res.on('end',()=>{try{resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));}catch{reject(new Error('Invalid portal response'));}});
  });
  const deadline=setTimeout(()=>req.destroy(new Error('Portal timeout')),5000);
  req.on('close',()=>clearTimeout(deadline));
  req.on('error',()=>reject(new Error('Portal bridge unavailable')));
  req.end(body);
 });
}
export const identitySchema=z.object({id:z.string().regex(/^[1-9][0-9]{0,18}$/),name:z.string().max(255),role:z.literal('user')});
export const grantSchema=z.object({token:z.string().regex(tokenPattern)});
export { tokenPattern };
