'use client';
import { DilemmaCloud } from './dilemma-cloud';
import { dilemmaSteps,dilemmaTitle } from '@/lib/dilemma-route';
import { hasDilemmaSemanticReview } from '@/lib/dilemma-review';
import { ActionsTable } from './dilemma-actions';
import { cloudEntryFields } from '@/lib/cloud-entry';
import { TocGuide } from './toc-guide';
import { tocOrderText,tocSources } from '@/lib/pack-toc';
import Link from 'next/link';
import { useCallback,useEffect,useState,useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveDraft } from '@/app/actions/drafts';
import { reviewWorkflow } from '@/app/actions/workflow';
import { cloudGroups,nodeFields,profileQuestions,profileLinks,methodNotes,type Profile,type CloudNode } from '@/lib/cloud-method';
import { type StepDefinition,stepOrder,steps } from '@/lib/steps';
import { checkStep,type WorkflowCheck } from '@/lib/workflow-check';
import { CloudDiagram } from './cloud-diagram';
type History={number:number;createdAt:string;fields:Record<string,string>;comment:string};
export function WorkflowForm({id,step,profile,definition,initial,initialVersion,cloud,stale,history,material,actionChoices={}}:{actionChoices?:{D?:string;Dp?:string};id:string;step:string;profile:Profile;definition:StepDefinition;initial:Record<string,string>;initialVersion:number;cloud:Record<string,string>;stale:boolean;history:History[];material:{pdf:string;ppt:string;pages:string}}){
 const router=useRouter();
 const personal=profile==='DILEMMA';
 const personalCloud=profile==='DILEMMA'&&step==='cloud',personalActions=profile==='DILEMMA'&&step==='actions';
 const [sequenceComplete,setSequenceComplete]=useState(false);
 const [attempt,setAttempt]=useState(0),[submitted,setSubmitted]=useState(initial.__cloudReview==='submitted'||Boolean(initial.__check?.includes('"mode":"ai"'))),[reviewFailed,setReviewFailed]=useState(initial.__cloudReview==='submitted'&&initial.__draft!=='true'&&!initial.__check?.includes('"mode":"ai"'));
 const progress=useCallback((cursor:number,editing:CloudNode|null)=>{setFields(f=>{if(f.__cloudProgress===String(cursor)&&(f.__cloudEditing||'')===(editing||''))return f;return {...f,__cloudProgress:String(cursor),__cloudEditing:editing||''};});},[]);
 const entry=cloudEntryFields(step,initial);
 const legacyCloud=entry!==initial&&Object.values(nodeFields).some(key=>initial[key]);
 const defaults=()=>Object.fromEntries(definition.fields.map(f=>[f.key,f.options?.[0]??'']));
 const [fields,setFields]=useState<Record<string,string>>(()=>({...defaults(),...entry})),[version,setVersion]=useState(initialVersion),[dirty,setDirty]=useState(false),[pending,start]=useTransition(),[message,setMessage]=useState(personal&&initial.__draft==='true'?'Сохранён черновик.':personalCloud&&initial.__cloudReview==='submitted'&&!initial.__check?.includes('"mode":"ai"')?'Ответы сохранены. Проверка не завершена. Повторите проверку.':''),[active,setActive]=useState<CloudNode[]>([]),[consent,setConsent]=useState(false),[showHelp,setShowHelp]=useState(step!=='practice'&&step!=='cloud'),[report,setReport]=useState<WorkflowCheck|null>(()=>{try{const saved=entry.__check?JSON.parse(entry.__check):null;return personalCloud&&(entry.__draft==='true'||(saved?.mode!=='ai'&&entry.__cloudReview!=='submitted'))?null:saved;}catch{return null;}}),[outdated,setOutdated]=useState(stale);
 useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(dirty){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 useEffect(()=>{setOutdated(stale);},[stale]);
 useEffect(()=>{if(!personal)return;const guard=(event:MouseEvent)=>{const link=(event.target as Element)?.closest?.('a');if(!dirty||!link||link.target==='_blank'||event.ctrlKey||event.metaKey||link.getAttribute('href')?.startsWith('#'))return;if(!window.confirm('Есть несохранённые изменения. Уйти без сохранения?')){event.preventDefault();event.stopPropagation();}};document.addEventListener('click',guard,true);return()=>document.removeEventListener('click',guard,true);},[dirty,personal]);
 function change(key:string,value:string){setFields(f=>({...f,[key]:value}));setDirty(true);setOutdated(true);setReport(null);if(personalCloud){setSubmitted(false);setReviewFailed(false);setMessage(report?.semantic?'Изменено. Проверка Тучи устарела.':'Есть несохранённые ответы.');}}
 const groups=cloudGroups(profile),isCloud=step==='cloud'||step==='practice';
 const diagramFields=isCloud?fields:cloud;
 const formFields=definition.fields.filter(f=>!isCloud||!Object.values(nodeFields).includes(f.key));
 const route=personal?dilemmaSteps.map(([key])=>String(key)):stepOrder;
 const next=route[route.indexOf(step)+1],previous=route[route.indexOf(step)-1];
 const currentReport=report&&!dirty&&!outdated&&fields.__draft!=='true'?report:null;
 async function save(draftOnly=false){
  if(!draftOnly&&personalCloud&&!sequenceComplete){setAttempt(a=>a+1);setMessage('Подтвердите текущий ответ клавишей Enter.');return;}
  if(!draftOnly&&personalCloud){setSubmitted(true);setReviewFailed(false);}
  if(!draftOnly&&(personalCloud||personalActions)){const checked=checkStep(step,profile,fields);setReport(checked);if(checked.issues.length){setMessage(personalCloud?'Исправьте замечания в облаках: '+checked.issues.length+'.':checked.issues.map(i=>i.question).join(' '));return;}}
  try{const result=await saveDraft(id,step,version,fields,draftOnly);if(result.version!==undefined){if(draftOnly){setVersion(result.version);setDirty(false);setOutdated(true);setReport(null);setSubmitted(false);setReviewFailed(false);setMessage('Черновик сохранён.');router.refresh();return;}setVersion(result.version);setFields(f=>{const copy={...f};delete copy.__draft;return copy;});setDirty(false);setOutdated(false);setReport(personalCloud?(result.report||null):result.report||checkStep(step,profile,fields));if(personalCloud)setReviewFailed(Boolean(result.reviewError)||!result.report?.semantic);setMessage(personalCloud?(result.reviewError?'Ответы сохранены. Проверка не завершена. '+result.reviewError:result.report?.semantic?(result.report.issues.length?'Туча проверена. Исправьте замечания в облаках: '+result.report.issues.length+'.':'Туча проверена. Можно продолжить.'):'Ответы сохранены. Проверка не завершена. Повторите проверку.'):(personalActions?'Действия сохранены. Можно перейти к Туче.':'Сохранено. Выполнена локальная проверка текущего шага.'));
     if(!personalCloud&&consent&&(step!=='practice'||showHelp)){const checked=await reviewWorkflow(id,step,result.version,true);if(checked.version){setVersion(checked.version);setReport(checked.report||null);if(checked.assistance)setFields(f=>({...f,assistance:checked.assistance!}));setMessage('Сохранено. Содержательная проверка выполнена.');}else setMessage('Черновик сохранён. '+(checked.error||'Проверка ИИ недоступна.'));}
     router.refresh();}else setMessage(result.error||'Не удалось сохранить');}catch{setMessage('Связь прервалась. Текст остаётся в форме; скопируйте его перед обновлением.');}
 }
 return <><form className="space-y-5" onSubmit={e=>{e.preventDefault();start(()=>save());}}>
 {!personalCloud&&!personalActions&&<>{!personal&&<p className="text-sm">Порядок: {tocOrderText(profile)}.</p>}
 {!personal&&<TocGuide profile={profile} step={step}/>}
 {personal&&<details className="card p-4"><summary>Помощь по этому шагу</summary><p className="my-3">{methodNotes[step]}</p><a href={material.pdf} target="_blank" rel="noreferrer">Методика · PDF</a><TocGuide profile={profile} step={step}/></details>}
 {outdated&&version>0&&<p className="workflow-warning" role="status">Записи изменились. Сохраните шаг и повторите проверку связанных утверждений.</p>}
 {legacyCloud&&<aside className="card p-4"><p>Начните с пустой тучи. Прежние записи не подставляются в облака и остаются доступны ниже и в истории.</p><details className="mt-3"><summary>Прежние формулировки</summary>{Object.entries(nodeFields).map(([node,key])=><p key={key}><strong>{node==='Dp'?'D′':node}:</strong> {initial[key]||'—'}</p>)}</details></aside>}
 {isCloud&&<button type="button" className="btn btn-ghost" disabled={pending} onClick={()=>{setFields(defaults());setDirty(true);setOutdated(true);setReport(null);setMessage('Туча пуста. Впишите собственные формулировки и сохраните. Прежние сохранённые версии доступны в истории.');}}>Начать с пустой тучи</button>}
 {step==='cloud'&&<details className="card p-4"><summary>Вопросы для самостоятельного заполнения</summary><p className="my-3">{methodNotes[step]}</p>{groups.flat().map(node=><p key={node} className="my-2"><strong>{node==='Dp'?'D′':node}:</strong> {profileQuestions[profile][node]}</p>)}<p className="text-sm mt-3"><a href={material.pdf} target="_blank" rel="noreferrer">Теория PDF</a> · <a href={material.ppt}>Тетрадь PPTX</a></p></details>}
 {showHelp&&!personal&&<aside className="card p-4"><p>{methodNotes[step]}</p><p className="text-sm mt-2"><a href={material.pdf} target="_blank" rel="noreferrer">Теория PDF</a> · <a href={material.ppt}>Тетрадь PPTX</a> · {material.pages}</p></aside>}
 {step==='practice'&&!showHelp&&<p className="workflow-warning">Сначала сохраните самостоятельную версию новой тучи. Подсказки станут доступны после сохранения.</p>}
 </>}
 {personalCloud?<DilemmaCloud fields={fields} onChange={change} onProgress={progress} onComplete={setSequenceComplete} disabled={pending} attempt={attempt} references={actionChoices} issues={submitted&&!reviewFailed&&(!outdated||report?.mode==='local')?report?.issues:undefined}/>:personalActions?<ActionsTable value={fields.actionRows||''} onChange={v=>change('actionRows',v)} disabled={pending}/>:<CloudDiagram issues={personalCloud&&(!outdated||report?.mode==='local')?report?.issues:undefined} onSequenceComplete={setSequenceComplete} sequential={personalCloud} profile={profile} fields={diagramFields} onChange={isCloud?change:undefined} disabled={pending} active={active} onSelect={node=>{setActive([node]);if(!isCloud)document.getElementById(nodeFields[node])?.focus();}}/>}
 {!personalActions&&!isCloud&&cloud.goal===undefined&&<p className="workflow-warning">Исходная туча ещё не сохранена. <Link href={'/situations/'+id+'/cloud'}>Перейти к построению</Link></p>}
 {step==='decision'&&fields.choice!=='Отказ от выбора'&&<aside className="card p-4" style={{borderRadius:0}}><strong>{personal?'Предлагаемое решение':'Предлагаемая инъекция D*'}</strong><p className="whitespace-pre-wrap">{fields[fields.choice==='Вариант 2'?'optionB':fields.choice==='Дополнительный вариант'?'optionC':'optionA']||'Опишите вариант решения ниже.'}</p></aside>}
 {!personalCloud&&!personalActions&&formFields.length>0&&<fieldset disabled={pending} className="card p-6 space-y-5">
 {step==='practice'&&<p>Постройте тучу для другого эпизода. После сохранения объясните связи и проверьте исходную посылку.</p>}
 {formFields.map(field=>{
  const node=(Object.keys(nodeFields) as CloudNode[]).find(n=>nodeFields[n]===field.key);
  const link=step==='logic'?profileLinks(profile).find(l=>l.key===field.key||l.key+'Reason'===field.key):undefined;
  const issue=currentReport?.issues.find(i=>i.field===field.key);
  const prompt=isCloud&&node&&showHelp?profileQuestions[profile][node]:field.label;
  return <div className="field" key={field.key}>
   <label htmlFor={field.key}>{prompt}</label>
   {link&&<p className="text-sm text-slate-600 mb-2">{(link.from==='Dp'?'D′':link.from)+': '+(cloud[nodeFields[link.from]]||'…')} · {(link.to==='Dp'?'D′':link.to)+': '+(cloud[nodeFields[link.to]]||'…')}</p>}
   {field.options?<select id={field.key} name={field.key} value={fields[field.key]??field.options[0]} onChange={e=>change(field.key,e.target.value)} onFocus={()=>link&&setActive([link.from,link.to])}>{field.options.map(v=><option key={v}>{v}</option>)}</select>:<textarea id={field.key} name={field.key} rows={3} maxLength={4000} value={fields[field.key]||''} aria-invalid={Boolean(issue)} aria-describedby={issue?field.key+'-issue':undefined} onChange={e=>change(field.key,e.target.value)} onFocus={()=>setActive(node?[node]:link?[link.from,link.to]:[])}/>}
   {issue&&<p style={personal?{color:'#b91c1c'}:undefined} className="text-sm text-amber-800 mt-2" id={field.key+'-issue'}>{issue.question}</p>}
  </div>;
 })}
 </fieldset>}
 {personal&&!personalCloud&&!personalActions&&<label className="block text-sm"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> Дополнительно проверить смысл с ИИ при сохранении. Описание и записи текущего и предыдущих шагов будут отправлены в OpenAI вместе с методикой Pack-TOC.</label>}
 {personal?<div className="sticky bottom-0 bg-white border-t p-4 space-y-2" style={{zIndex:20}}>
 <div className="flex flex-wrap gap-3 items-center">
 <Link className="btn btn-ghost" href={'/situations/'+id+'/'+(previous||'details')}>← Назад</Link>
 <button type="button" className="btn btn-ghost" disabled={pending} onClick={()=>start(()=>save(true))}>Сохранить черновик</button>
 <button className="btn btn-primary" disabled={pending}>{pending?(personalCloud?'Проверяю Тучу…':'Сохранение…'):personalCloud&&reviewFailed?'Повторить проверку':'Сохранить шаг'}</button>
 {version>0&&!dirty&&!outdated&&currentReport?.issues.length===0&&(!personalCloud||(sequenceComplete&&hasDilemmaSemanticReview(currentReport)))?<Link className="btn btn-ghost" href={'/situations/'+id+'/'+(next||'summary')}>{next?'Далее: '+dilemmaSteps.find(([key])=>key===next)?.[1]+' →':'Завершить разбор →'}</Link>:<button type="button" className="btn btn-ghost" disabled>{next?'Далее: '+dilemmaSteps.find(([key])=>key===next)?.[1]:'Завершить разбор'}</button>}
 </div>
 <p role="status" aria-live="polite" style={{color:personalCloud?(reviewFailed?'#92400e':submitted&&report?.issues.length?'#b91c1c':hasDilemmaSemanticReview(currentReport)&&!currentReport?.issues.length?'#166534':'#334155'):message&&(currentReport?.issues.length||message.includes('не выполнена')||message.includes('не удалось')||message.includes('недоступна')||message.includes('Подтвердите'))?'#b91c1c':'#166534'}}>{pending?(personalCloud?'Проверяю Тучу…':'Проверка выполняется. Дождитесь результата.'):personalCloud?message:dirty?'Есть несохранённые изменения. '+(message||''):message}</p>
 {!personalCloud&&!pending&&(dirty||!version||outdated||Boolean(currentReport?.issues.length)||(personalCloud&&!hasDilemmaSemanticReview(currentReport)))&&<p className="text-sm">{currentReport?.issues.length?'Чтобы продолжить, исправьте замечания: '+currentReport.issues.length+'. Затем сохраните шаг повторно.':personalCloud&&!sequenceComplete?'Заполните облака по очереди. После каждого ответа нажмите Enter.':'Чтобы продолжить, сохраните шаг и завершите проверку.'}</p>}
 </div>:<><div className="flex flex-wrap gap-3"><button className="btn btn-primary" disabled={pending}>{pending?'Сохранение…':'Сохранить и проверить шаг'}</button>{next&&version>0&&!dirty&&!outdated&&currentReport?.issues.length===0&&<Link className="btn btn-ghost" href={'/situations/'+id+'/'+next}>{steps[next].title} →</Link>}</div><p role="status" aria-live="polite">{message}</p></>}

 </form>
 {!personalCloud&&!personalActions&&currentReport&&<section className="card p-5 my-5" aria-label="Обратная связь"><h3 className="font-bold">{currentReport.mode==='ai'?'Содержательная проверка ИИ':'Локальная проверка'}</h3><p className="text-sm my-2">{currentReport.note}</p>{currentReport.issues.length?<ul className="space-y-3">{currentReport.issues.map((issue,i)=><li key={i}><button className="text-left underline" onClick={()=>{const node=(Object.keys(nodeFields) as CloudNode[]).find(n=>nodeFields[n]===issue.field);setTimeout(()=>document.getElementById(issue.field)?.focus(),0);}}>{issue.criterion}</button><p className="text-sm">Наблюдение: {issue.observation}</p><p>{issue.question}</p>{issue.sourceIds?.length&&<p className="text-sm">Основание: {issue.sourceIds.map(id=>tocSources[id]?<a key={id} className="underline mr-2" href={tocSources[id].url} target="_blank" rel="noreferrer">{id}</a>:null)}</p>}</li>)}</ul>:<p>Замечаний этой проверкой не выявлено. Проверьте, отражает ли схема вашу ситуацию.</p>}</section>}
 {!personalCloud&&!personalActions&&<>{!personal&&<section className="card p-5 my-5 space-y-3"><h3 className="font-bold">Проверить смысл формулировок</h3><p className="text-sm">ИИ проверяет текущий шаг и задаёт наводящие вопросы. Вы можете изменить или обоснованно отклонить рекомендацию на шаге обратной связи.</p><label className="block text-sm"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> Разрешаю отправить описание ситуации, записи текущего и предыдущих шагов и выдержки методики Pack-TOC в OpenAI после сохранения шага или по кнопке «Проверить с ИИ».</label><button className="btn btn-ghost" disabled={pending||dirty||!version||!consent||(step==='practice'&&!showHelp)} onClick={()=>start(async()=>{const result=await reviewWorkflow(id,step,version,consent);if(result.version){setVersion(result.version);setReport(result.report||null);if(result.assistance)setFields(f=>({...f,assistance:result.assistance!}));setOutdated(false);setMessage('Обратная связь сохранена.');router.refresh();}else setMessage(result.error||'Не удалось проверить.');})}>Проверить с ИИ</button>{step==='practice'&&!showHelp&&<button className="btn btn-ghost" disabled={!version||dirty||pending} onClick={()=>{setShowHelp(true);change('assistance',fields.assistance==='Без содержательных подсказок'||!fields.assistance?'Подсказки сервиса':'Несколько видов помощи');}}>Первая версия сохранена — показать подсказки</button>}</section>}{personal&&step==='practice'&&!showHelp&&<button className="btn btn-ghost" disabled={!version||dirty||pending} onClick={()=>{setShowHelp(true);change('assistance','Подсказки сервиса');}}>Показать подсказки после первой версии</button>}
 <details className="card p-5 my-5"><summary>История версий этого шага ({history.length})</summary>{history.map(h=><article key={h.number} className="border-t mt-3 pt-3"><strong>Версия ситуации {h.number}</strong><p className="text-sm">{h.createdAt} · {h.comment}</p><dl>{Object.entries(h.fields).filter(([k,v])=>!k.startsWith('__')&&v).map(([k,v])=><div key={k}><dt className="font-semibold text-sm">{definition.fields.find(f=>f.key===k)?.label||k}</dt><dd className="whitespace-pre-wrap text-sm">{v}</dd></div>)}</dl></article>)}</details>
 </>}
 </>;
}
