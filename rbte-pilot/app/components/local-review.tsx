'use client';
import Link from 'next/link';
import { useEffect,useState } from 'react';
import { localReviewStatus } from '@/app/actions/review';
import { type LocalReview,methodRules } from '@/lib/review-local';
import { fieldLabels } from '@/lib/review-types';
export function LocalReviewPanel({id}:{id:string}){
 const [data,setData]=useState<{report:LocalReview;fingerprint:string}|null>(null),[error,setError]=useState('');
 useEffect(()=>{let live=true;let timer:ReturnType<typeof setTimeout>;
  async function refresh(){try{const result=await localReviewStatus(id);if(!live)return;
   if(result.local){setData(result.local);setError('');}else {setData(null);setError(result.error||'Обновите страницу.');}
  }catch{if(live){setData(null);setError('Не удалось обновить итог. Обновите страницу.');}}
  if(live)timer=setTimeout(refresh,15000);}
  void refresh();return()=>{live=false;clearTimeout(timer);};
 },[id]);
 const link=(ref:string)=>{const [step,key]=ref.split('.');return '/situations/'+id+'/'+(step==='creation'?'details':step)+'#'+key;};
 return <section className="my-6 space-y-4" aria-label="Локальная проверка DPF">
  <h2 className="text-xl font-bold">Итог и самопроверка по материалам DPF</h2>
  <p>Эта проверка выполняется на сервере Pilot. Текст не отправляется в OpenAI.</p>
  {error&&<p role="alert">{error}</p>}
  {!data&&!error&&<p role="status">Проверяем сохранённые поля…</p>}
  {data&&<>
   <p>Версия правил: {data.report.version}. Это адаптация методики к полям Pilot.</p>
   <h3 className="font-bold">{data.report.issues.length?'Нужно уточнить сведения':'Обязательные по локальным правилам сведения присутствуют'}</h3>
   {data.report.issues.map((issue,i)=><div key={i} className="border rounded p-3 space-y-2">
    <p>{issue.impact}</p><p><strong>{issue.question}</strong></p>
    <ul>{issue.fields.map(ref=><li key={ref}><Link className="underline" href={link(ref)}>{fieldLabels[ref]}</Link></li>)}</ul><small>Основание: {issue.source}</small>
   </div>)}
   {data.report.issues.length===0&&<><p>Ниже — ваши сохранённые ответы, без смысловой оценки и дополнений ИИ.</p>
    {data.report.summary.map(s=><section key={s.title}><h3 className="font-bold">{s.title}</h3>
     {s.values.map(v=><p key={v.key} className="whitespace-pre-wrap"><strong>{fieldLabels[v.key]}: </strong>{v.text}</p>)}
     {s.title==='Результат'&&!data.report.done&&<p>Проба не отмечена выполненной. Эффект не установлен.</p>}
    </section>)}
   </>}
   <h3 className="font-bold">Вопросы для самостоятельной проверки выводов</h3>
   {data.report.notes.map(n=><p key={n}>{n}</p>)}
   <details><summary>Методические основания</summary>{methodRules.map(([id,title,text])=><p key={id}><strong>{id} — {title}. </strong>{text}</p>)}</details>
  </>}
 </section>;
}
