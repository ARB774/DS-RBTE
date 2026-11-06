import { users } from '../db/schema';
export async function portalUser(database:any,identity:{id:string,name:string}) {
 const [user]=await database.insert(users).values({
  portalId:identity.id,email:'portal-'+identity.id+'@sso.rbte.invalid',
  name:identity.name,passwordHash:'!',active:true,
 }).onConflictDoUpdate({target:users.portalId,set:{name:identity.name}}).returning();
 if(!user.active) return null;
 return {id:user.id,email:user.email,name:user.name,role:'PARTICIPANT' as const};
}
