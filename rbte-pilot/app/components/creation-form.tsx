"use client";
import { useActionState,useState,useEffect,useRef } from "react";
import { createSituationAction } from "@/app/actions/situations";
export function CreationForm({children}:{children:React.ReactNode}) {
 const [personal,setPersonal]=useState(true);
 const root=useRef<HTMLFormElement>(null);
 useEffect(()=>{const details=root.current?.querySelector<HTMLDetailsElement>('.creation-extra');if(details)details.open=!personal;},[personal]);
 const [state,action,pending]=useActionState(async (_previous: {error:string},form:FormData)=>{
  const result=await createSituationAction(form);
  return {error:result?.error ?? "Не удалось создать ситуацию"};
 },{error:""});
 return <form ref={root} data-personal={personal} onChange={e=>{const el=e.target;if(el instanceof HTMLSelectElement&&el.name==='profile')setPersonal(el.value==='DILEMMA');}} action={action} className="card p-6 space-y-5"><style>{`[data-personal="true"] .other-create-next,[data-personal="false"] .personal-create-next{display:none}`}</style><fieldset disabled={pending} className="space-y-5">{children}</fieldset><p role="alert">{state.error}</p></form>;
}
