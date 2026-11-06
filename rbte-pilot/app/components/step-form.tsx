'use client';
import { useState, useTransition } from 'react';
import { saveDraft } from '@/app/actions/drafts';
import type { StepDefinition } from '@/lib/steps';
import { ReviewControl } from './review-control';
export function StepForm({id,step,definition,initial,initialVersion}:{id:string;step:string;definition:StepDefinition;initial:Record<string,string>;initialVersion:number}) {
 const [version,setVersion]=useState(initialVersion);
 const [message,setMessage]=useState('');
 const [pending,start]=useTransition();
 const [dirty,setDirty]=useState(false);
 return <><form className="card p-6 space-y-5" onChange={()=>setDirty(true)} onSubmit={event=>{
  event.preventDefault();
  const data=Object.fromEntries(new FormData(event.currentTarget)) as Record<string,string>;
  start(async()=>{
   try {
    const result=await saveDraft(id,step,version,data);
    if(result.version!==undefined){setVersion(result.version);setMessage('Сохранено');setDirty(false);}
    else setMessage(result.error ?? 'Не удалось сохранить');
   } catch {setMessage('Связь прервалась или сеанс истёк. Скопируйте текст перед повторным входом.');}
  });
 }}>
 <fieldset disabled={pending} className="space-y-5">
 {definition.note && <p className="text-sm">{definition.note}</p>}
 {definition.fields.map(field=><div className="field" key={field.key}>
  <label htmlFor={field.key}>{field.label}</label>
  {field.options ? <select id={field.key} name={field.key} defaultValue={initial[field.key] ?? field.options[0]}>
   {field.options.map(value=><option key={value}>{value}</option>)}
  </select> : <textarea id={field.key} name={field.key} rows={3} maxLength={4000} defaultValue={initial[field.key] ?? ''}/>}
 </div>)}
 </fieldset>
 <button className="btn btn-primary" disabled={pending}>{pending?'Сохранение…':'Сохранить шаг'}</button>
 <p role="status" aria-live="polite">{message}</p>
 </form><ReviewControl key={version} id={id} compact disabled={dirty||pending}/></>;
}
