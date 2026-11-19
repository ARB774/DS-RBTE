import { dilemmaSteps } from '@/lib/dilemma-route';
import { dilemmaReady } from '@/lib/dilemma-navigation';
import { actionRows } from '@/lib/dilemma-actions';
import { checkActions } from '@/lib/dilemma-actions';
import Link from 'next/link';
import { notFound,redirect } from 'next/navigation';
import { and,eq,desc } from 'drizzle-orm';
import { requireUser } from '@/lib/session';
import { db } from '@/lib/db';
import { situations,stepDrafts,revisions } from '@/db/schema';
import { steps,definitionFor } from '@/lib/steps';
import { WorkflowForm } from './workflow-form';
import { hashBasis,contextOf } from '@/lib/workflow-store';
import { materialsFor } from '@/lib/materials';
import { z } from 'zod';
export async function StepPage({id,step}:{id:string;step:string}) {
 const me=await requireUser();
 if(!z.string().uuid().safeParse(id).success)notFound();
 const [sit]=await db.select().from(situations).where(and(eq(situations.id,id),eq(situations.creatorId,me.id))).limit(1);
 if(!sit)notFound();
 if(step==='explore')redirect('/situations/'+id+'/cloud');
 const definition=definitionFor(step,sit.profile);if(!definition)notFound();
 const drafts=await db.select().from(stepDrafts).where(eq(stepDrafts.situationId,id));
 if(step==='cloud'&&sit.profile==='DILEMMA'&&!drafts.some(d=>d.step==='actions'&&d.fields.__draft!=='true'&&checkActions(d.fields.actionRows).length===0))redirect('/situations/'+id+'/actions');
 const draft=drafts.find(d=>d.step===step),cloud=drafts.find(d=>d.step==='cloud');
 const allHistory=await db.select().from(revisions).where(eq(revisions.situationId,id)).orderBy(desc(revisions.number));
 const history=allHistory.filter((r:any)=>r.snapshot?.pilotVersion===2&&r.snapshot.step===step).map((r:any)=>({number:r.number,createdAt:r.createdAt.toISOString(),fields:r.snapshot.fields,comment:r.comment||''}));
 const stale=Boolean(draft&&draft.fields.__basis!==hashBasis(step,sit.profile,contextOf(sit),drafts));
 return <main className="container-x py-10">
 <Link href="/dashboard">← Мои ситуации</Link><h1 className="text-2xl font-bold my-3">{sit.title}</h1>
 {sit.profile==='DILEMMA'?<details className="card p-4 my-4"><summary>Шаг {dilemmaSteps.findIndex(([key])=>key===step)+1} из 11 · {dilemmaSteps.find(([key])=>key===step)?.[1]} · Все шаги</summary><ol className="grid gap-2 mt-4">{dilemmaSteps.map(([key],i)=>{const d=drafts.find(d=>d.step===key);const fresh=d&&d.fields.__basis===hashBasis(key,sit.profile,contextOf(sit),drafts);return <li key={key}><Link aria-current={key===step?'step':undefined} className={key===step?'font-bold underline':''} href={'/situations/'+id+'/'+key}>{i+1} · {dilemmaSteps[i][1]}{key===step?' — текущий шаг':d?(dilemmaReady(key,d.fields,Boolean(fresh))?' — проверено':fresh?' — требует внимания':' — перепроверить'):''}</Link></li>;})}<li><Link href={'/situations/'+id+'/summary'}>Посмотреть разбор</Link></li></ol></details>:<nav aria-label="Шаги ситуации" className="flex flex-wrap gap-3 my-4"><Link href={'/situations/'+id+'/details'}>1 · Описание ситуации</Link>{Object.entries(steps).filter(([key])=>key!=='actions'||sit.profile==='DILEMMA').map(([key,value])=>{const d=drafts.find(d=>d.step===key);const changed=d&&d.fields.__basis!==hashBasis(key,sit.profile,contextOf(sit),drafts);return <Link key={key} aria-current={key===step?'step':undefined} className={key===step?'font-bold underline':''} href={'/situations/'+id+'/'+key}>{value.title}{changed?' · перепроверить':''}</Link>;})}<Link href={'/situations/'+id+'/summary'}>Итог ситуации</Link></nav>}
 {!(sit.profile==='DILEMMA'&&step==='cloud')&&<h2 className="text-xl font-bold mb-4">{definition.title}</h2>}
 <WorkflowForm key={id+step+sit.profile} id={id} step={step} profile={sit.profile} definition={definition} initial={draft?.fields||{}} initialVersion={draft?.version||0} cloud={cloud?.fields||{}} stale={stale} history={history} material={materialsFor(sit.profile,step)} actionChoices={sit.profile==='DILEMMA'?Object.fromEntries(actionRows(drafts.find(d=>d.step==='actions')?.fields.actionRows||'').filter(r=>r.selected).map(r=>[r.kind==='forced'?'D':'Dp',r.text])):undefined}/>
 </main>;
}
