import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/db/schema';
import { mentorDocumentationVersion, rbteApplicationVersion } from '@/lib/value-proposition-evidence';
export const dynamic='force-dynamic';
export async function GET(){
 const versions={app:rbteApplicationVersion,mentorDocs:mentorDocumentationVersion.dsRbte,packToc:mentorDocumentationVersion.packToc};
 try { await db.select({id:users.id}).from(users).limit(1); return NextResponse.json({status:'ok',versions},{headers:{'Cache-Control':'no-store'}}); }
 catch { return NextResponse.json({status:'unavailable',versions},{status:503,headers:{'Cache-Control':'no-store'}}); }
}
