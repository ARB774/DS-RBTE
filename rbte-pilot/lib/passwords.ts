import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';
export const digest=(token:string)=>createHash('sha256').update(token).digest('hex');
export function validPassword(value:unknown): value is string { return typeof value==='string' && value.length>=12 && value.length<=128; }
async function key(password:string,salt:string) {
 return await new Promise<Buffer>((resolve,reject)=>scrypt(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024},(error,key)=>error?reject(error):resolve(key)));
}
export async function hashPassword(password:string) {
 if(!validPassword(password)) throw new Error('Password must contain 12 to 128 characters');
 const salt=randomBytes(24).toString('hex');
 return 'scrypt1:'+salt+':'+(await key(password,salt)).toString('hex');
}
export async function verifyPassword(password:string,encoded:string) {
 const parts=encoded.split(':');
 const valid=parts.length===3 && parts[0]==='scrypt1' && /^[a-f0-9]{48}$/.test(parts[1]) && /^[a-f0-9]{128}$/.test(parts[2]);
 const salt=valid?parts[1]:'0'.repeat(48);
 const expected=Buffer.from(valid?parts[2]:'0'.repeat(128),'hex');
 const actual=await key(password,salt);
 return timingSafeEqual(actual,expected) && valid;
}
