'use client';
import { useState } from 'react';
import { askDilemmaAssistantHelp } from '@/app/actions/dilemma-help';

type Message={role:'user'|'assistant';content:string;sourceIds?:string[]};
type Issue={criterion:string;observation:string;question:string};
export function AssistantHelpPanel({id,step,fields,issue}:{id:string;step:string;fields:Record<string,string>;issue?:Issue}){
 const [open,setOpen]=useState(false),[question,setQuestion]=useState(''),[messages,setMessages]=useState<Message[]>([]),[pending,setPending]=useState(false),[error,setError]=useState('');
 const quick=['Напомнить правила этого шага','Что сейчас нужно сделать?'];
 if(issue)quick.splice(1,0,'Объяснить текущее замечание');
 async function send(value=question){
  const text=value.trim();if(!text||pending)return;
  const user:Message={role:'user',content:text};setMessages(current=>[...current,user]);setQuestion('');setError('');setPending(true);
  const currentFields=Object.fromEntries(Object.entries(fields).filter(([key,value])=>!key.startsWith('__')&&value).slice(0,40).map(([key,value])=>[key,value.slice(0,8000)]));
  try{
   const result=await askDilemmaAssistantHelp({id,step,question:text,history:messages.slice(-8).map(({role,content})=>({role,content})),currentFields,currentIssue:issue});
   if(result.answer)setMessages(current=>[...current,{role:'assistant',content:result.answer!,sourceIds:result.sourceIds}]);
   else setError(result.error||'Помощник не ответил. Повторите позже.');
  }catch{setError('Связь с помощником прервалась. Состояние шага не изменено.');}
  finally{setPending(false);}
 }
 return <>
  <button type="button" className="btn btn-primary fixed right-5 bottom-5 shadow-lg" style={{zIndex:45}} aria-expanded={open} aria-controls="assistant-help-panel" onClick={()=>setOpen(value=>!value)}>Помощник</button>
  {open&&<aside id="assistant-help-panel" aria-label="Справочный диалог с помощником" className="fixed right-0 top-0 bottom-0 w-full sm:w-[430px] bg-white border-l shadow-2xl flex flex-col" style={{zIndex:50}}>
   <header className="p-4 border-b flex items-start justify-between gap-4"><div><h2 className="font-bold text-lg">Помощник</h2><p className="text-sm text-slate-600">Можно спросить о правилах и текущем шаге.</p></div><button type="button" className="btn btn-ghost" aria-label="Закрыть помощника" onClick={()=>setOpen(false)}>×</button></header>
   <div className="p-4 border-b flex flex-wrap gap-2">{quick.map(value=><button type="button" key={value} className="btn btn-ghost text-sm" disabled={pending} onClick={()=>send(value)}>{value}</button>)}</div>
   <div className="flex-1 overflow-y-auto p-4 space-y-4" aria-live="polite">
    {!messages.length&&<p className="text-sm text-slate-600">Задайте вопрос. Этот разговор не запускает проверку и не меняет ваши записи.</p>}
    {messages.map((message,index)=><article key={index} className={message.role==='user'?'ml-8 rounded-lg bg-indigo-50 p-3':'mr-8 rounded-lg bg-slate-100 p-3'}><strong className="block text-sm mb-1">{message.role==='user'?'Вы':'Помощник'}</strong><p className="whitespace-pre-wrap">{message.content}</p>{message.sourceIds?.length?<p className="text-xs text-slate-600 mt-2">Основание: {message.sourceIds.join(', ')}</p>:null}</article>)}
    {pending&&<p className="text-sm text-slate-600">Помощник отвечает…</p>}{error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
   </div>
   <div className="p-4 border-t space-y-2"><label className="sr-only" htmlFor="assistant-help-question">Ваш вопрос помощнику</label><textarea id="assistant-help-question" rows={4} maxLength={2000} value={question} placeholder="Напишите вопрос помощнику" onChange={event=>setQuestion(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();void send();}}} disabled={pending}/><div className="flex justify-between gap-3 items-center"><span className="text-xs text-slate-600">Ctrl+Enter — отправить</span><button type="button" className="btn btn-primary" disabled={pending||!question.trim()} onClick={()=>send()}>Отправить</button></div><p className="text-xs text-slate-600">Справочный диалог не проверяет шаг и не изменяет поля.</p></div>
  </aside>}
 </>;
}
