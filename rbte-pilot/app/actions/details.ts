'use server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/session';
import { persistDetails } from '@/lib/edit-details';
export async function saveDetails(id:string,version:string,fields:Record<string,string>){
 const me=await requireUser();
 if(!z.string().uuid().safeParse(id).success)return {error:'Некорректный адрес ситуации'};
 try{return {version:await persistDetails(db,me.id,id,version,fields)};}
 catch(error){return {error:error instanceof Error&&error.message.startsWith('Данные уже')?error.message:'Не удалось сохранить. Проверьте длину текстов и повторите.'};}
}
