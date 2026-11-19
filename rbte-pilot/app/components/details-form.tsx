'use client';
import Link from 'next/link';
import { useState,useTransition } from 'react';
import { creationLabels } from '@/lib/review-types';
import { profileLabels } from '@/lib/profiles';
import { saveDetails } from '@/app/actions/details';
import { ReviewControl } from './review-control';
const options:Record<string,Record<string,string>>={profile:profileLabels,sensitivity:{LOW:'Низкий',STANDARD:'Стандарт',HIGH:'Высокий',CRITICAL:'Критичный'},supportLevel:{NONE:'Без поддержки',LOW:'Низкий',MEDIUM:'Средний',HIGH:'Высокий'}};
export function DetailsForm({id,initial,initialVersion}:{id:string;initial:Record<string,string>;initialVersion:string}){
 const [version,setVersion]=useState(initialVersion),[dirty,setDirty]=useState(false),[message,setMessage]=useState(''),[pending,start]=useTransition();
 return <><form onChange={()=>setDirty(true)} onSubmit={e=>{
  e.preventDefault();const fields=Object.fromEntries(new FormData(e.currentTarget)) as Record<string,string>;
  start(async()=>{try{const r=await saveDetails(id,version,fields);if(r.version){setVersion(r.version);setDirty(false);setMessage('Сохранено');}else setMessage(r.error??'Ошибка сохранения');}catch{setMessage('Связь прервалась. Скопируйте текст перед обновлением.');}});
 }} className="card p-6 space-y-5"><fieldset disabled={pending} className="space-y-5">
 {Object.entries(creationLabels).map(([key,label])=><div className="field" key={key}><label htmlFor={key}>{label}</label>{options[key]?<select name={key} id={key} defaultValue={initial[key]}>{Object.entries(options[key]).map(([value,text])=><option key={value} value={value}>{text}</option>)}</select>:<textarea rows={3} id={key} name={key} defaultValue={initial[key]} maxLength={key==='title'?160:key==='aiAttemptBaseline'?4000:2000}/>}</div>)}
 </fieldset><button disabled={pending} className="btn btn-primary">{pending?'Сохранение…':'Сохранить шаг'}</button><p role="status">{message}</p>{!dirty&&<Link className="btn btn-ghost" href={'/situations/'+id+(initial.profile==='DILEMMA'?'/actions':'/cloud')}>{initial.profile==='DILEMMA'?'Действия':'2 · Построение грозовой тучи'} →</Link>}</form>
 {initial.profile!=='DILEMMA'&&<ReviewControl key={version} id={id} compact disabled={dirty||pending}/>}</>;
}
