'use client';
import Link from 'next/link';
import { useEffect,useState } from 'react';
import { useRouter } from 'next/navigation';
import { reviewStatus,startReview } from '@/app/actions/review';
import { fieldLabels,type ReviewView } from '@/lib/review-types';

export function ReviewControl({id,initial,compact=false,disabled=false}:{id:string;initial?:ReviewView;compact?:boolean;disabled?:boolean}){
 const [view,setView]=useState<ReviewView|undefined>(initial),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const router=useRouter();
 useEffect(()=>{
  if(compact)return;
  let live=true;let timer:ReturnType<typeof setTimeout>;
  async function refresh(){
   try {const result=await reviewStatus(id);if(!live)return;
    if(result.view){setView(result.view);timer=setTimeout(refresh,result.view.state==='pending'?2500:15000);}
    else setError(result.error??'Не удалось загрузить итог.');
   }catch{if(live)setError('Связь прервалась. Обновите страницу и проверьте вход.');}
  }
  void refresh();return()=>{live=false;clearTimeout(timer);};
 },[id,busy,compact]);
 const pending=busy||view?.state==='pending';
 async function run(){
  if(!view||disabled||pending)return;
  setBusy(true);setError('');
  try{const result=await startReview(id,view.fingerprint,consent);
   if(result.view){setView(result.view);if(compact)router.push('/situations/'+id+'/summary');}
   else setError(result.error??'Не удалось начать оценку.');
  }catch{setError('Связь прервалась. Откройте итог и проверьте состояние перед повтором.');}
  finally{setBusy(false);}
 }
 const report=view?.state==='ready'?view.report:null;
 const blocking=report?.gaps.filter(g=>g.importance==='blocking')??[];
 function fieldLink(ref:string){const [step,key]=ref.split('.');return '/situations/'+id+'/'+(step==='creation'?'details':step)+'#'+key;}
 if(compact)return <section className="my-6"><button type="button" className="btn btn-primary" disabled={disabled} onClick={()=>router.push('/situations/'+id+'/summary')}>Посмотреть итог ситуации</button><p>{disabled?'Сначала сохраните изменения.':'Локальная проверка и итог без отправки в OpenAI вместе с выдержками методики Pack-TOC.'}</p></section>;
 return <section className="my-6 border-t border-[#e5e7eb] pt-5 space-y-4" aria-label="Итог ситуации">
  {!compact&&<h2 className="text-xl font-bold">Дополнительный содержательный разбор ИИ</h2>}
  <p className="text-sm">По нажатию кнопки сохранённые тексты этой ситуации будут отправлены в OpenAI вместе с выдержками методики Pack-TOC для оценки. Удалите из них секреты и сведения, которые нельзя передавать. Итог доступен только вам.</p>
  <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} />Разрешаю отправить сохранённые тексты этой ситуации в OpenAI вместе с выдержками методики Pack-TOC.</label>
  <div className="flex gap-3 items-center flex-wrap">
   <button type="button" className="btn btn-primary" disabled={disabled||pending||!view||!consent} onClick={run}>{pending?'Проверяем содержание…':'Запросить разбор OpenAI'}</button>
   {compact&&<Link href={'/situations/'+id+'/summary'} className="underline">Открыть сохранённый итог</Link>}
  </div>
  {disabled&&<p role="status">Сначала сохраните изменения этого шага.</p>}
  {error&&<p role="alert">{error}</p>}
  {view?.state==='stale'&&<p role="status">Данные изменились. Прежняя оценка больше не актуальна. Нажмите кнопку для новой проверки.</p>}
  {view?.state==='error'&&<p role="status">Оценка не завершилась. Тексты сохранены. Можно повторить проверку позже; при повторных ошибках обратитесь к администратору.</p>}
  {pending&&<p role="status" aria-live="polite">Проверяем достаточность данных и логику решения. Обычно это занимает до двух минут. Можно оставить эту страницу открытой.</p>}
  {!compact&&report&&<div className="space-y-6">
   <p className="text-sm text-[#6b7280]">Оценка ИИ — помощь для самопроверки, а не подтверждение правильности решения. Проверено: {view?.updatedAt?new Date(view.updatedAt).toLocaleString('ru-RU'):''}.</p>
   {blocking.length>0?<h3 className="text-lg font-bold">Для итога не хватает важных данных</h3>:<h3 className="text-lg font-bold">Данных достаточно для предварительного итога</h3>}
   {report.gaps.map((gap,i)=><div key={i} className="space-y-2">
    <h4 className="font-semibold">{gap.importance==='blocking'?'Нужно уточнить':'Не блокирует итог'}</h4>
    <ul>{gap.fields.map(ref=><li key={ref}><Link className="underline" href={fieldLink(ref)}>{fieldLabels[ref]}</Link></li>)}</ul>
    <p>{gap.impact}</p><p><strong>Вопрос для самопроверки: </strong>{gap.question}</p>
   </div>)}
   {blocking.length>0?<p>Откройте поля по ссылкам, дополните данные, нажмите «Сохранить шаг» и вернитесь к кнопке «Запросить разбор OpenAI». Повторная проверка использует новые записи.</p>:<>
    {Object.entries({problem:'Проблема',contradiction:'Противоречие',decision:'Выбранное решение',trial:'Рабочая проба',result:'Результат'}).map(([key,label])=><section key={key}><h3 className="text-lg font-bold">{label}</h3><p className="whitespace-pre-wrap">{report.summary[key as keyof typeof report.summary]}</p></section>)}
    <section><h3 className="text-lg font-bold">Содержательная оценка решения</h3><p>{report.assessment.conclusion}</p>
    {(['strengths','risks','recommendations'] as const).map((key,i)=><div key={key} className="mt-4"><h4 className="font-semibold">{['Сильные стороны','Ограничения и риски','Что улучшить'][i]}</h4><ul className="list-disc pl-5">{report.assessment[key].map((text,n)=><li key={n}>{text}</li>)}</ul></div>)}</section>
   </>}
   {report.reused.length>0&&<details><summary>Сведения найдены в других полях</summary><ul>{report.reused.map((item,i)=><li key={i}>{fieldLabels[item.field]} — использовано поле «{fieldLabels[item.from]}».</li>)}</ul></details>}
  </div>}
 </section>;
}
