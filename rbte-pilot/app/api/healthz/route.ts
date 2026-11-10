import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/db/schema';
export const dynamic='force-dynamic';
export async function GET(){
 try { await db.select({id:users.id}).from(users).limit(1); return NextResponse.json({status:'ok'},{headers:{'Cache-Control':'no-store'}}); }
 catch { return NextResponse.json({status:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}}); }
}
