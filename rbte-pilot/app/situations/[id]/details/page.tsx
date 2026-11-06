import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { getSituationAction } from '@/app/actions/situations';
import { creationLabels } from '@/lib/review-types';
import { DetailsForm } from '@/app/components/details-form';
export default async function Details({params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!z.string().uuid().safeParse(id).success)notFound();
 const situation=await getSituationAction(id);if(!situation)notFound();
 const values=situation as unknown as Record<string,unknown>;
 const initial=Object.fromEntries(Object.keys(creationLabels).map(key=>[key,String(values[key]??'')]));
 return <div className="container-x py-10 max-w-4xl"><Link href={situation.profile==='DILEMMA'?'/dashboard':'/situations/'+id+'/summary'}>{situation.profile==='DILEMMA'?'← Мои ситуации':'← Итог ситуации'}</Link><h1 className="text-2xl font-bold my-4">1 · Описание ситуации</h1><DetailsForm id={id} initial={initial} initialVersion={situation.updatedAt.toISOString()}/></div>;
}
