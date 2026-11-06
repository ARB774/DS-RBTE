import { db } from '@/lib/db';
import { stepDrafts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { definitionFor } from '@/lib/steps';
import { dilemmaReady,dilemmaResume } from '@/lib/dilemma-navigation';
import { hashBasis,contextOf } from '@/lib/workflow-store';
import { actionRows } from '@/lib/dilemma-actions';
import { LocalReviewPanel } from '@/app/components/local-review';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSituationAction } from '@/app/actions/situations';
import { ReviewControl } from '@/app/components/review-control';
import { dilemmaSteps } from '@/lib/dilemma-route';
import { steps } from '@/lib/steps';
import { z } from 'zod';
export default async function Summary({params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!z.string().uuid().safeParse(id).success)notFound();
 const situation=await getSituationAction(id);if(!situation)notFound();
 const drafts=situation.profile==='DILEMMA'?await db.select().from(stepDrafts).where(eq(stepDrafts.situationId,id)):[];
 const progress=drafts.map(d=>({...d,fresh:d.fields.__basis===hashBasis(d.step,situation.profile,contextOf(situation),drafts)}));
 const resume=dilemmaResume(progress);
 return <div className="container-x py-10 max-w-4xl"><Link href="/dashboard">← Мои ситуации</Link>
  <h1 className="text-2xl font-bold my-4">{situation.title}</h1>
  {situation.profile==='DILEMMA'&&<h2 className="text-xl font-bold mb-4">Результат разбора</h2>}
  <nav className="flex flex-wrap gap-3">{situation.profile==='DILEMMA'?dilemmaSteps.map(([key,label],i)=><Link key={key} href={'/situations/'+id+'/'+key}>{i+1} · {label}</Link>):<><Link href={'/situations/'+id+'/details'}>1 · Описание ситуации</Link>{Object.entries(steps).filter(([key])=>key!='actions'||situation.profile==='DILEMMA').map(([key,step])=><Link key={key} href={'/situations/'+id+'/'+key}>{step.title}</Link>)}</>}</nav>
  {situation.profile==='DILEMMA'?<>
  <p className="my-4">{resume==='summary'?'Все шаги заполнены и проверены.':'Разбор можно продолжить. Сохранённые записи приведены ниже.'}</p>
  {resume!=='summary'&&<Link className="btn btn-primary" href={'/situations/'+id+'/'+resume}>Продолжить разбор →</Link>}
  {dilemmaSteps.slice(1).map(([key,label],i)=>{const d=progress.find(d=>d.step===key);return <details key={key} className="card p-4 my-3"><summary>{i+2} · {label} — {!d?'не заполнено':dilemmaReady(key,d.fields,d.fresh)?'проверено':d.fresh?'требует внимания':'перепроверить'}</summary><Link className="underline block my-3" href={'/situations/'+id+'/'+key}>Открыть шаг</Link>{definitionFor(key,'DILEMMA')?.fields.map(f=><div className="my-3" key={f.key}><strong>{f.label}</strong><p className="whitespace-pre-wrap">{f.key==='actionRows'?actionRows(d?.fields.actionRows||'').filter(r=>r.text.trim()).map(r=>r.text+' — '+(r.kind==='forced'?'вынужденное':r.kind==='preferred'?'предпочитаемое':'тип не выбран')+(r.selected?' · главное':'')).join('\n'):d?.fields[f.key]||'Не заполнено'}</p></div>)}</details>;})}
  </>:<><LocalReviewPanel id={id}/><ReviewControl id={id}/></>}
 </div>;
}
