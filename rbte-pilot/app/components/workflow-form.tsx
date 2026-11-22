'use client';
import { DilemmaCloud } from './dilemma-cloud';
import { dilemmaSteps,dilemmaTitle } from '@/lib/dilemma-route';
import { firstIncompleteLogicLink } from '@/lib/dilemma-navigation';
import { hasDilemmaSemanticReview } from '@/lib/dilemma-review';
import { ActionsTable } from './dilemma-actions';
import { seedCloudActions } from '@/lib/dilemma-actions';
import { cloudEntryFields } from '@/lib/cloud-entry';
import { TocGuide } from './toc-guide';
import { tocOrderText,tocSources } from '@/lib/pack-toc';
import Link from 'next/link';
import { useCallback,useEffect,useState,useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveDraft } from '@/app/actions/drafts';
import { reviewWorkflow } from '@/app/actions/workflow';
import { AssistantHelpPanel } from './assistant-help-panel';
import { cloudGroups,nodeFields,profileQuestions,profileLinks,methodNotes,type Profile,type CloudNode,type MethodIssue } from '@/lib/cloud-method';
import { upsertDilemmaReviewReply } from '@/lib/dilemma-review-replies';
import { logicLinkKeys,type StepDefinition,stepOrder,steps } from '@/lib/steps';
import { allAssumptionInjectionsComplete,checkStep,readInjections,type WorkflowCheck } from '@/lib/workflow-check';
import { CloudDiagram } from './cloud-diagram';
type History={number:number;createdAt:string;fields:Record<string,string>;comment:string};
type AssumptionChoice={key:string;label:string;value:string};
type InjectionChoice=AssumptionChoice&{injection:string};
export function WorkflowForm({id,step,profile,definition,initial,initialVersion,cloud,stale,history,material,actionChoices={},assumptionChoices=[],injectionChoices=[]}:{actionChoices?:{D?:string;Dp?:string};assumptionChoices?:AssumptionChoice[];injectionChoices?:InjectionChoice[];id:string;step:string;profile:Profile;definition:StepDefinition;initial:Record<string,string>;initialVersion:number;cloud:Record<string,string>;stale:boolean;history:History[];material:{pdf:string;ppt:string;pages:string}}){
 const router=useRouter();
 const personal=profile==='DILEMMA';
 const personalCloud=profile==='DILEMMA'&&step==='cloud',personalActions=profile==='DILEMMA'&&step==='actions',personalLogic=profile==='DILEMMA'&&step==='logic',personalAssumptions=profile==='DILEMMA'&&step==='assumptions',personalAssumptionCheck=profile==='DILEMMA'&&step==='assumption-check',personalDecision=profile==='DILEMMA'&&step==='decision';
 const assistantReviewRequired=personal&&!personalAssumptions;
 const [sequenceComplete,setSequenceComplete]=useState(false);
 const progress=useCallback((cursor:number,editing:CloudNode|null)=>{setFields(f=>{if(f.__cloudProgress===String(cursor)&&(f.__cloudEditing||'')===(editing||''))return f;return {...f,__cloudProgress:String(cursor),__cloudEditing:editing||''};});},[]);
 const entry=cloudEntryFields(step,initial);
 const legacyCloud=entry!==initial&&Object.values(nodeFields).some(key=>initial[key]);
 const defaults=()=>Object.fromEntries(definition.fields.map(f=>[f.key,f.options?.[0]??'']));
 const storedReport=(()=>{try{return entry.__check?JSON.parse(entry.__check) as WorkflowCheck:null;}catch{return null;}})();
 const initialReport=personalAssumptions?checkStep(step,profile,entry):personalAssumptionCheck&&storedReport?.mode!=='ai'?checkStep(step,profile,entry):storedReport;
 const initialReviewMissing=assistantReviewRequired&&initialVersion>0&&entry.__draft!=='true'&&initialReport?.mode!=='ai';
 const [attempt,setAttempt]=useState(0),[submitted,setSubmitted]=useState(initial.__cloudReview==='submitted'||initialReport?.mode==='ai'),[reviewFailed,setReviewFailed]=useState(initialReviewMissing);
 const [fields,setFields]=useState<Record<string,string>>(()=>seedCloudActions({...defaults(),...entry},actionChoices,personalCloud?initialVersion:1)),[version,setVersion]=useState(initialVersion),[dirty,setDirty]=useState(false),[pending,start]=useTransition(),[message,setMessage]=useState(personal&&initial.__draft==='true'?'Сохранён черновик.':initialReviewMissing?'Шаг сохранён. Проверка помощником не завершена. Повторите проверку.':''),[active,setActive]=useState<CloudNode[]>([]),[consent,setConsent]=useState(false),[showHelp,setShowHelp]=useState(step!=='practice'&&step!=='cloud'),[report,setReport]=useState<WorkflowCheck|null>(personalCloud&&(entry.__draft==='true'||(initialReport?.mode!=='ai'&&entry.__cloudReview!=='submitted'))?null:initialReport),[outdated,setOutdated]=useState(stale||initialReviewMissing);
 const [logicCursor,setLogicCursor]=useState(()=>{const first=firstIncompleteLogicLink(fields,logicLinkKeys);return first?logicLinkKeys.indexOf(first):0;});
 const [assumptionCursor,setAssumptionCursor]=useState(0);
 useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(dirty){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 useEffect(()=>{setOutdated(stale||initialReviewMissing);},[stale,initialReviewMissing]);
 useEffect(()=>{if(!personal)return;const guard=(event:MouseEvent)=>{const link=(event.target as Element)?.closest?.('a');if(!dirty||!link||link.target==='_blank'||event.ctrlKey||event.metaKey||link.getAttribute('href')?.startsWith('#'))return;if(!window.confirm('Есть несохранённые изменения. Уйти без сохранения?')){event.preventDefault();event.stopPropagation();}};document.addEventListener('click',guard,true);return()=>document.removeEventListener('click',guard,true);},[dirty,personal]);
 function change(key:string,value:string){setFields(f=>({...f,[key]:value}));setDirty(true);setOutdated(true);setReport(null);if(personalLogic){const index=logicLinkKeys.findIndex(linkKey=>key===linkKey||key===linkKey+'Reason');if(index>=0)setLogicCursor(index);}if(personalAssumptions){const index=logicLinkKeys.indexOf(key as (typeof logicLinkKeys)[number]);if(index>=0)setAssumptionCursor(index);}if(personalCloud){setSubmitted(false);setReviewFailed(false);setMessage(report?.semantic?'Изменено. Проверка Тучи устарела.':'Есть несохранённые ответы.');}}
 function replyToIssue(issue:MethodIssue,reply:string){
  try{
   const values={...fields,reviewReplies:upsertDilemmaReviewReply(fields.reviewReplies,issue,reply)};
   setFields(values);setDirty(true);setOutdated(true);setMessage('Ответ отправляется помощнику…');
   start(()=>save(false,values,true));
  }catch(error){setMessage(error instanceof Error?error.message:'Не удалось сохранить ответ.');}
 }
 function applyIssueRevision(issue:MethodIssue,revision:string){
  try{
   const value=revision.trim();
   if(!Object.values(nodeFields).includes(issue.field)||!value)throw new Error('Введите новую формулировку элемента Тучи.');
   const values={...fields,[issue.field]:value,reviewReplies:upsertDilemmaReviewReply(fields.reviewReplies,issue,'Принята формулировка: '+value)};
   setFields(values);setDirty(true);setOutdated(true);setMessage('Новая формулировка перенесена в Тучу и отправляется на повторную проверку…');
   start(()=>save(false,values,true));
  }catch(error){setMessage(error instanceof Error?error.message:'Не удалось применить новую формулировку.');}
 }
 const groups=cloudGroups(profile),isCloud=step==='cloud'||step==='practice';
 const diagramFields=isCloud?fields:cloud;
 const formFields=definition.fields.filter(f=>(!isCloud||!Object.values(nodeFields).includes(f.key))&&!personalAssumptionCheck&&!(personalDecision&&f.key==='selected'));
 const route=personal?dilemmaSteps.map(([key])=>String(key)):stepOrder;
 const next=route[route.indexOf(step)+1],previous=route[route.indexOf(step)-1];
 const currentReport=report&&!dirty&&!outdated&&fields.__draft!=='true'?report:null;
 const injections=readInjections(fields.injections);
 const completedInjectionCount=assumptionChoices.filter(choice=>Boolean(injections[choice.key])).length;
 let injectionDrafts:Record<string,string>={};try{const parsed:unknown=JSON.parse(fields.injections||'{}');if(parsed&&!Array.isArray(parsed)&&typeof parsed==='object')injectionDrafts=Object.fromEntries(Object.entries(parsed).filter((entry):entry is [string,string]=>typeof entry[1]==='string'));}catch{/* Invalid legacy data is shown as empty and replaced on edit. */}
 function changeInjection(key:string,value:string){
  const next={...injectionDrafts,[key]:value};
  if(!value)delete next[key];
  change('injections',JSON.stringify(next));
 }
 let selectedDecisionKeys:string[]=[];try{const parsed:unknown=JSON.parse(fields.selected||'[]');if(Array.isArray(parsed))selectedDecisionKeys=parsed.filter((key):key is string=>typeof key==='string'&&injectionChoices.some(choice=>choice.key===key));}catch{/* Invalid legacy selection is shown as empty. */}
 function toggleDecisionInjection(key:string){
  const next=selectedDecisionKeys.includes(key)?selectedDecisionKeys.filter(value=>value!==key):[...selectedDecisionKeys,key];
  const combined=injectionChoices.filter(choice=>next.includes(choice.key)).map(choice=>choice.injection).join('\n\n');
  setFields(f=>({...f,selected:JSON.stringify(next),finalInjection:combined}));setDirty(true);setOutdated(true);setReport(null);
 }
 const personalReviewReady=personalAssumptions?currentReport?.issues.length===0:personalAssumptionCheck?allAssumptionInjectionsComplete(fields)&&currentReport?.mode==='ai'&&currentReport.issues.length===0:currentReport?.mode==='ai'&&(!personalCloud||hasDilemmaSemanticReview(currentReport));
 const personalStepComplete=version>0&&!dirty&&!outdated&&currentReport?.issues.length===0&&personalReviewReady&&(!personalCloud||sequenceComplete);
 const activeLogicIssue=personalLogic?currentReport?.issues[0]:undefined;
 const issueLogicKey=activeLogicIssue&&logicLinkKeys.find(key=>activeLogicIssue.field===key||activeLogicIssue.field===key+'Reason');
 const incompleteLogicKey=personalLogic?firstIncompleteLogicLink(fields,logicLinkKeys):undefined;
 const activeLogicKey=issueLogicKey||(personalLogic&&dirty?logicLinkKeys[logicCursor]:undefined)||(incompleteLogicKey?logicLinkKeys[logicCursor]:undefined);
 const activeLogicIndex=activeLogicKey?logicLinkKeys.indexOf(activeLogicKey):-1;
 const activeAssumptionIssue=personalAssumptions?currentReport?.issues[0]:undefined;
 const issueAssumptionIndex=activeAssumptionIssue?formFields.findIndex(field=>field.key===activeAssumptionIssue.field):-1;
 const activeAssumptionIndex=issueAssumptionIndex>=0?issueAssumptionIndex:assumptionCursor;
 const visibleFormFields=personalLogic?activeLogicIssue?formFields.filter(field=>field.key===activeLogicIssue.field):activeLogicKey?formFields.filter(field=>field.key===activeLogicKey||field.key===activeLogicKey+'Reason'):[]:personalAssumptions?formFields[activeAssumptionIndex]?[formFields[activeAssumptionIndex]]:[]:formFields;
 const displayedIssues=(personalLogic||personalAssumptions||personalAssumptionCheck)&&currentReport?.issues.length?[currentReport.issues[0]]:currentReport?.issues||[];
 const currentLogicComplete=Boolean(activeLogicKey&&fields[activeLogicKey]==='Да'&&fields[activeLogicKey+'Reason']?.trim());
 const currentAssumptionComplete=Boolean(formFields[activeAssumptionIndex]&&fields[formFields[activeAssumptionIndex].key]?.trim());
 async function save(draftOnly=false,values=fields,preserveReport=false){
  const submittedValues=values;
  if(!draftOnly&&personalCloud&&!sequenceComplete){setAttempt(a=>a+1);setMessage('Подтвердите текущий ответ клавишей Enter.');return;}
  if(!draftOnly&&personalCloud){setSubmitted(true);setReviewFailed(false);}
  if(!draftOnly&&(personalCloud||personalActions)){const checked=checkStep(step,profile,values);if(!preserveReport||checked.issues.length)setReport(checked);if(checked.issues.length){setMessage(personalCloud?'Исправьте замечания в элементах Тучи: '+checked.issues.length+'.':checked.issues.map(i=>i.question).join(' '));return;}}
  if(!draftOnly&&personalAssumptionCheck){const checked=checkStep(step,profile,submittedValues);if(checked.issues.length){setMessage('Запишите инъекцию напротив каждого исходного убеждения.');return;}}
  try{
   const result=await saveDraft(id,step,version,submittedValues,draftOnly);
   if(result.version!==undefined){
    if(draftOnly){setVersion(result.version);setDirty(false);setOutdated(true);setReport(null);setSubmitted(false);setReviewFailed(false);setMessage('Черновик сохранён.');router.refresh();return;}
    const localReport=checkStep(step,profile,submittedValues);
    const personalReviewMissing=assistantReviewRequired&&(Boolean(result.reviewError)||result.report?.mode!=='ai');
    setVersion(result.version);
    setFields(()=>{const copy:Record<string,string>={...submittedValues,...(result.report?.acceptedRevisions||{})};delete copy.__draft;return copy;});
    setDirty(false);setOutdated(personalReviewMissing);
    setReport(personal?(personalAssumptions?localReport:result.report||localReport):result.report||localReport);
    if(personal)setReviewFailed(personalReviewMissing);
    if(personalAssumptions)setMessage('Исходные предположения сохранены без оспаривания. Можно продолжить.');
    else if(result.reviewError)setMessage('Шаг сохранён. Проверка помощником не завершена. '+result.reviewError);
    else if(personalAssumptionCheck&&result.report?.mode==='ai')setMessage(result.report.issues.length?'Помощник проверил инъекции. Исправьте замечания: '+result.report.issues.length+'.':'Помощник подтвердил: каждая инъекция опровергает соответствующее убеждение. Можно перейти к выбору.');
    else if(personal&&result.report?.mode==='ai')setMessage(result.report.issues.length?'Помощник задал один вопрос для уточнения.':'Проверка текущего шага завершена. Можно продолжить.');
    else if(personal)setMessage('Шаг сохранён. Проверка помощником не завершена. Повторите проверку.');
    else setMessage('Сохранено. Выполнена локальная проверка текущего шага.');
     if(!personal&&consent&&(step!=='practice'||showHelp)){const checked=await reviewWorkflow(id,step,result.version,true);if(checked.version){setVersion(checked.version);setReport(checked.report||null);if(checked.assistance)setFields(f=>({...f,assistance:checked.assistance!}));setMessage('Сохранено. Содержательная проверка выполнена.');}else setMessage('Черновик сохранён. '+(checked.error||'Проверка ИИ недоступна.'));}
     router.refresh();}else setMessage(result.error||'Не удалось сохранить');}catch{setMessage('Связь прервалась. Текст остаётся в форме; скопируйте его перед обновлением.');}
 }
 return <><form className="space-y-5" onSubmit={e=>{e.preventDefault();start(()=>save());}}>
 {!personalCloud&&!personalActions&&<>{!personal&&<p className="text-sm">Порядок: {tocOrderText(profile)}.</p>}
 {!personal&&<TocGuide profile={profile} step={step}/>}
 {personal&&<details className="card p-4"><summary>Помощь по этому шагу</summary><p className="my-3">{methodNotes[step]}</p><a href={material.pdf} target="_blank" rel="noreferrer">Методика · PDF</a><TocGuide profile={profile} step={step}/></details>}
 {outdated&&version>0&&!personalAssumptionCheck&&<aside className="workflow-warning flex flex-wrap items-center justify-between gap-3" role="status"><span>{personalAssumptions?'Исходные предположения изменились. Сохраните их перед продолжением.':'Записи изменились. Сохраните их, чтобы помощник повторил проверку связанных утверждений.'}</span><button type="submit" className="btn btn-primary" disabled={pending}>{pending?(personalAssumptions?'Сохраняю…':'Помощник проверяет…'):personalAssumptions?'Сохранить изменения':'Сохранить изменения и повторить проверку'}</button></aside>}
  {legacyCloud&&<aside className="card p-4"><p>Начните с пустой Тучи. Прежние записи не подставляются в элементы Тучи и остаются доступны ниже и в истории.</p><details className="mt-3"><summary>Прежние формулировки</summary>{Object.entries(nodeFields).map(([node,key])=><p key={key}><strong>{node==='Dp'?'D′':node}:</strong> {initial[key]||'—'}</p>)}</details></aside>}
 {isCloud&&<button type="button" className="btn btn-ghost" disabled={pending} onClick={()=>{setFields(defaults());setDirty(true);setOutdated(true);setReport(null);setMessage('Туча пуста. Впишите собственные формулировки и сохраните. Прежние сохранённые версии доступны в истории.');}}>Начать с пустой тучи</button>}
 {step==='cloud'&&<details className="card p-4"><summary>Вопросы для самостоятельного заполнения</summary><p className="my-3">{methodNotes[step]}</p>{groups.flat().map(node=><p key={node} className="my-2"><strong>{node==='Dp'?'D′':node}:</strong> {profileQuestions[profile][node]}</p>)}<p className="text-sm mt-3"><a href={material.pdf} target="_blank" rel="noreferrer">Теория PDF</a> · <a href={material.ppt}>Тетрадь PPTX</a></p></details>}
 {showHelp&&!personal&&<aside className="card p-4"><p>{methodNotes[step]}</p><p className="text-sm mt-2"><a href={material.pdf} target="_blank" rel="noreferrer">Теория PDF</a> · <a href={material.ppt}>Тетрадь PPTX</a> · {material.pages}</p></aside>}
 {step==='practice'&&!showHelp&&<p className="workflow-warning">Сначала сохраните самостоятельную версию новой тучи. Подсказки станут доступны после сохранения.</p>}
 </>}
 {personalCloud?<DilemmaCloud fields={fields} onChange={change} onReply={replyToIssue} onApplyRevision={applyIssueRevision} onProgress={progress} onComplete={setSequenceComplete} disabled={pending} reviewPending={pending} attempt={attempt} references={actionChoices} reviewReplies={fields.reviewReplies} reviewNote={report?.note} issues={submitted&&!reviewFailed&&report?report.issues:undefined}/>:personalActions?<ActionsTable value={fields.actionRows||''} onChange={v=>change('actionRows',v)} disabled={pending}/>:<CloudDiagram issues={personalCloud&&(!outdated||report?.mode==='local')?report?.issues:undefined} onSequenceComplete={setSequenceComplete} sequential={personalCloud} profile={profile} fields={diagramFields} onChange={isCloud?change:undefined} disabled={pending} active={active} onSelect={node=>{setActive([node]);if(!isCloud)document.getElementById(nodeFields[node])?.focus();}}/>}
 {!personalActions&&!isCloud&&cloud.goal===undefined&&<p className="workflow-warning">Исходная туча ещё не сохранена. <Link href={'/situations/'+id+'/cloud'}>Перейти к построению</Link></p>}
 {step==='decision'&&!personalDecision&&fields.choice!=='Отказ от выбора'&&<aside className="card p-4" style={{borderRadius:0}}><strong>Предлагаемая инъекция D*</strong><p className="whitespace-pre-wrap">{fields[fields.choice==='Вариант 2'?'optionB':fields.choice==='Дополнительный вариант'?'optionC':'optionA']||'Опишите вариант решения ниже.'}</p></aside>}
 {personalLogic&&!activeLogicIssue&&!activeLogicKey&&<section className="card p-6 space-y-2"><strong>Ответы по всем семи связям заполнены.</strong><p className="text-sm text-slate-700">Повторно подтверждать ответы «Да» не нужно. Смысловая проверка завершится после ответа помощника; если он найдёт замечание, здесь появится только один вопрос.</p></section>}
 {personalAssumptionCheck&&<section className="card p-6 space-y-5" aria-label="Таблица исходных убеждений и инъекций"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold">Исходные убеждения и инъекции</h3><p className="text-sm text-slate-700">Запишите напротив каждого исходного убеждения инъекцию, которая делает его неверным или несущественным.</p></div><strong>{completedInjectionCount} из {assumptionChoices.length} заполнено</strong></div>{currentReport?.mode==='ai'&&currentReport.issues[0]&&<aside className="border border-red-300 bg-red-50 p-4 space-y-2" role="alert"><div className="flex flex-wrap justify-between gap-3"><strong>{currentReport.issues[0].criterion}</strong><span className="text-sm text-red-700">Замечание 1 из {currentReport.issues.length}</span></div><p className="text-sm">Проверяемая формулировка: {currentReport.issues[0].observation}</p><p className="text-red-800">{currentReport.issues[0].question}</p><p className="text-sm text-slate-700">Исправьте соответствующую инъекцию в таблице и повторите проверку.</p></aside>}{assumptionChoices.length?<div className="overflow-x-auto"><table className="w-full border-collapse"><thead><tr><th className="w-2/5 border p-3 text-left align-top">Исходное убеждение</th><th className="w-3/5 border p-3 text-left align-top">Инъекция, опровергающая убеждение</th></tr></thead><tbody>{assumptionChoices.map((choice,index)=><tr key={choice.key}><td className="border p-3 align-top"><span className="text-sm text-slate-600">{index+1}. {choice.label}</span><p className="mt-1 font-semibold whitespace-pre-wrap">{choice.value}</p></td><td className="border p-3 align-top"><label className="sr-only" htmlFor={'injection-'+choice.key}>Инъекция для убеждения «{choice.value}»</label><textarea id={'injection-'+choice.key} name={'injection-'+choice.key} rows={5} maxLength={4000} value={injectionDrafts[choice.key]||''} placeholder="Запишите инъекцию" style={{width:'100%',minHeight:'8rem',resize:'vertical',display:'block',boxSizing:'border-box'}} onChange={event=>changeInjection(choice.key,event.target.value)} disabled={pending}/></td></tr>)}</tbody></table></div>:<p className="text-red-700">Исходные убеждения не найдены. Вернитесь к предыдущему шагу.</p>}</section>}
 {personalDecision&&<section className="card p-6 space-y-4" aria-label="Решения-кандидаты"><div><h3 className="font-bold">Решения-кандидаты</h3><p className="text-sm text-slate-700">Выберите одно лучшее решение или несколько решений для комбинации.</p></div>{injectionChoices.length?<div className="grid gap-3">{injectionChoices.map(choice=><label key={choice.key} className="border rounded-lg p-4 flex gap-3 items-start"><input type="checkbox" checked={selectedDecisionKeys.includes(choice.key)} onChange={()=>toggleDecisionInjection(choice.key)} disabled={pending}/><span><span className="block text-sm text-slate-600">{choice.value}</span><strong className="block mt-1 whitespace-pre-wrap">{choice.injection}</strong></span></label>)}</div>:<p className="text-red-700">Сначала сформируйте решения для исходных предположений на предыдущем шаге.</p>}</section>}
 {!personalCloud&&!personalActions&&visibleFormFields.length>0&&<fieldset disabled={pending} className="card p-6 space-y-5">
 {step==='practice'&&<p>Постройте тучу для другого эпизода. После сохранения объясните связи и проверьте исходную посылку.</p>}
 {personalLogic&&<div className="flex flex-wrap items-center justify-between gap-3"><strong>Связь {activeLogicIndex+1} из {logicLinkKeys.length}</strong>{currentReport?.issues.length?<span className="text-sm text-red-700">Замечание 1 из {currentReport.issues.length}</span>:<span className="text-sm text-slate-600">Один вопрос — один ответ</span>}</div>}
 {personalAssumptions&&<div className="space-y-2"><div className="flex flex-wrap items-center justify-between gap-3"><strong>Исходное предположение {activeAssumptionIndex+1} из {formFields.length}</strong>{currentReport?.issues.length?<span className="text-sm text-red-700">Замечание 1 из {currentReport.issues.length}</span>:<span className="text-sm text-slate-600">Одно предположение за раз</span>}</div><p className="text-sm text-slate-700">Формулировка перенесена из проверки связи. Оставьте её как есть или уточните.</p></div>}
 {visibleFormFields.map(field=>{
  const node=(Object.keys(nodeFields) as CloudNode[]).find(n=>nodeFields[n]===field.key);
  const link=step==='logic'?profileLinks(profile).find(l=>l.key===field.key||l.key+'Reason'===field.key):undefined;
  const issue=displayedIssues.find(i=>i.field===field.key);
  const prompt=isCloud&&node&&showHelp?profileQuestions[profile][node]:field.label;
  return <div className="field" key={field.key}>
   <label htmlFor={field.key}>{prompt}</label>
   {link&&<p className="text-sm text-slate-600 mb-2">{(link.from==='Dp'?'D′':link.from)+': '+(cloud[nodeFields[link.from]]||'…')} · {(link.to==='Dp'?'D′':link.to)+': '+(cloud[nodeFields[link.to]]||'…')}</p>}
   {issue&&<div style={personal?{color:'#b91c1c'}:undefined} className="text-sm text-amber-800 my-3" id={field.key+'-issue'}><p>{issue.question}</p><p className="font-semibold mt-2">{field.options?'Выберите ответ в поле ниже.':'Введите уточнённый ответ в большое поле ниже.'}</p></div>}
   {field.options?<select id={field.key} name={field.key} value={fields[field.key]??field.options[0]} onChange={e=>change(field.key,e.target.value)} onFocus={()=>link&&setActive([link.from,link.to])}>{field.options.map(v=><option key={v}>{v}</option>)}</select>:<textarea id={field.key} name={field.key} rows={3} maxLength={4000} value={fields[field.key]||''} aria-invalid={Boolean(issue)} aria-describedby={issue?field.key+'-issue':undefined} onChange={e=>change(field.key,e.target.value)} onFocus={()=>setActive(node?[node]:link?[link.from,link.to]:[])}/>}
  </div>;
 })}
 {personalLogic&&!activeLogicIssue&&<div className="flex flex-wrap items-center gap-3 border-t pt-4">
  <button type="button" className="btn btn-ghost" disabled={pending||activeLogicIndex===0} onClick={()=>setLogicCursor(index=>Math.max(0,index-1))}>← Предыдущая связь</button>
  {activeLogicIndex<logicLinkKeys.length-1?<button type="button" className="btn btn-primary" disabled={pending||!currentLogicComplete} onClick={()=>{setLogicCursor(index=>Math.min(logicLinkKeys.length-1,index+1));setMessage('Связь принята. Переходим к следующей.');}}>Проверить связь и перейти дальше →</button>:<p className="text-sm text-slate-700">Все связи заполнены. Сохраните шаг, чтобы завершить проверку.</p>}
 </div>}
 {personalAssumptions&&!activeAssumptionIssue&&<div className="flex flex-wrap items-center gap-3 border-t pt-4">
  <button type="button" className="btn btn-ghost" disabled={pending||activeAssumptionIndex===0} onClick={()=>setAssumptionCursor(index=>Math.max(0,index-1))}>← Предыдущее предположение</button>
  {activeAssumptionIndex<formFields.length-1?<button type="button" className="btn btn-primary" disabled={pending||!currentAssumptionComplete} onClick={()=>{setAssumptionCursor(index=>Math.min(formFields.length-1,index+1));setMessage('Переходим к следующему предположению.');}}>Следующее предположение →</button>:<p className="text-sm text-slate-700">Все предположения просмотрены. Сохраните шаг.</p>}
 </div>}
 </fieldset>}
 {personal?<div className="sticky bottom-0 bg-white border-t p-4 space-y-2" style={{zIndex:20}}>
 <div className="flex flex-wrap gap-3 items-center">
 <Link className="btn btn-ghost" href={'/situations/'+id+'/'+(previous||'details')}>← Назад</Link>
 <button type="button" className="btn btn-ghost" disabled={pending} onClick={()=>start(()=>save(true))}>Сохранить черновик</button>
 <button className={personalStepComplete?'btn btn-ghost':'btn btn-primary'} disabled={pending||(personalAssumptionCheck&&!allAssumptionInjectionsComplete(fields))}>{pending?(personalAssumptions?'Сохраняю…':personalAssumptionCheck?'Помощник проверяет инъекции…':'Помощник проверяет…'):personalAssumptionCheck?'Сохранить и проверить':reviewFailed?'Повторить проверку':'Сохранить шаг'}</button>
 {personalStepComplete?<Link className="btn btn-primary ml-auto" href={'/situations/'+id+'/'+(next||'summary')}>{next?'Далее: '+dilemmaSteps.find(([key])=>key===next)?.[1]+' →':'Завершить разбор →'}</Link>:<button type="button" className="btn btn-ghost ml-auto" disabled>{next?'Далее: '+dilemmaSteps.find(([key])=>key===next)?.[1]:'Завершить разбор'}</button>}
 </div>
 <p role="status" aria-live="polite" style={{color:personalCloud?(reviewFailed?'#92400e':submitted&&report?.issues.length?'#b91c1c':hasDilemmaSemanticReview(currentReport)&&!currentReport?.issues.length?'#166534':'#334155'):message&&(currentReport?.issues.length||message.includes('не выполнена')||message.includes('не удалось')||message.includes('недоступна')||message.includes('Подтвердите'))?'#b91c1c':'#166534'}}>{pending?(personalCloud?'Проверяю Тучу…':personalAssumptions?'Сохраняю исходные предположения…':personalAssumptionCheck?'Помощник проверяет, опровергают ли инъекции убеждения…':'Проверка выполняется. Дождитесь результата.'):personalCloud?message:dirty?'Есть несохранённые изменения. '+(message||''):message}</p>
  {!personalCloud&&!personalAssumptionCheck&&!pending&&(dirty||!version||outdated||Boolean(currentReport?.issues.length)||(personalCloud&&!hasDilemmaSemanticReview(currentReport)))&&<p className="text-sm">{currentReport?.issues.length?'Чтобы продолжить, исправьте замечания: '+currentReport.issues.length+'. Затем сохраните шаг повторно.':personalCloud&&!sequenceComplete?'Заполните элементы Тучи по очереди. После каждого ответа нажмите Enter.':'Чтобы продолжить, сохраните шаг и завершите проверку.'}</p>}
 </div>:<><div className="flex flex-wrap gap-3"><button className="btn btn-primary" disabled={pending}>{pending?'Сохранение…':'Сохранить и проверить шаг'}</button>{next&&version>0&&!dirty&&!outdated&&currentReport?.issues.length===0&&<Link className="btn btn-ghost" href={'/situations/'+id+'/'+next}>{steps[next].title} →</Link>}</div><p role="status" aria-live="polite">{message}</p></>}

 </form>
 {personal&&<AssistantHelpPanel id={id} step={step} fields={fields} issue={currentReport?.issues[0]}/>}
 {!personalCloud&&!personalAssumptions&&!personalAssumptionCheck&&currentReport&&<section className="card p-5 my-5" aria-label="Обратная связь"><h3 className="font-bold">{currentReport.mode==='ai'?(personal?'Проверка помощником':'Содержательная проверка ИИ'):'Локальная проверка'}</h3><p className="text-sm my-2">{currentReport.note}</p>{currentReport.issues.length?<>{personalLogic&&<p className="text-sm mb-3">Показано одно замечание из {currentReport.issues.length}. После ответа и повторной проверки приложение перейдёт к следующему.</p>}<ul className="space-y-3">{displayedIssues.map((issue,i)=><li key={i}><button className="text-left underline" onClick={()=>{const node=(Object.keys(nodeFields) as CloudNode[]).find(n=>nodeFields[n]===issue.field);setTimeout(()=>document.getElementById(issue.field)?.focus(),0);}}>{issue.criterion}</button><p className="text-sm">Наблюдение: {issue.observation}</p><p>{issue.question}</p>{issue.sourceIds?.length&&<p className="text-sm">Основание: {issue.sourceIds.map(id=>tocSources[id]?<a key={id} className="underline mr-2" href={tocSources[id].url} target="_blank" rel="noreferrer">{id}</a>:null)}</p>}</li>)}</ul></>:<p>Замечаний этой проверкой не выявлено. Проверьте, отражает ли схема вашу ситуацию.</p>}</section>}
 {!personalCloud&&!personalActions&&<>{!personal&&<section className="card p-5 my-5 space-y-3"><h3 className="font-bold">Проверить смысл формулировок</h3><p className="text-sm">ИИ проверяет текущий шаг и задаёт наводящие вопросы. Вы можете изменить или обоснованно отклонить рекомендацию на шаге обратной связи.</p><label className="block text-sm"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> Разрешаю отправить описание ситуации, записи текущего и предыдущих шагов и выдержки методики Pack-TOC в OpenAI после сохранения шага или по кнопке «Проверить с ИИ».</label><button className="btn btn-ghost" disabled={pending||dirty||!version||!consent||(step==='practice'&&!showHelp)} onClick={()=>start(async()=>{const result=await reviewWorkflow(id,step,version,consent);if(result.version){setVersion(result.version);setReport(result.report||null);if(result.assistance)setFields(f=>({...f,assistance:result.assistance!}));setOutdated(false);setMessage('Обратная связь сохранена.');router.refresh();}else setMessage(result.error||'Не удалось проверить.');})}>Проверить с ИИ</button>{step==='practice'&&!showHelp&&<button className="btn btn-ghost" disabled={!version||dirty||pending} onClick={()=>{setShowHelp(true);change('assistance',fields.assistance==='Без содержательных подсказок'||!fields.assistance?'Подсказки сервиса':'Несколько видов помощи');}}>Первая версия сохранена — показать подсказки</button>}</section>}{personal&&step==='practice'&&!showHelp&&<button className="btn btn-ghost" disabled={!version||dirty||pending} onClick={()=>{setShowHelp(true);change('assistance','Подсказки сервиса');}}>Показать подсказки после первой версии</button>}
 <details className="card p-5 my-5"><summary>История версий этого шага ({history.length})</summary>{history.map(h=><article key={h.number} className="border-t mt-3 pt-3"><strong>Версия ситуации {h.number}</strong><p className="text-sm">{h.createdAt} · {h.comment}</p><dl>{Object.entries(h.fields).filter(([k,v])=>!k.startsWith('__')&&v).map(([k,v])=><div key={k}><dt className="font-semibold text-sm">{definition.fields.find(f=>f.key===k)?.label||k}</dt><dd className="whitespace-pre-wrap text-sm">{v}</dd></div>)}</dl></article>)}</details>
 </>}
 </>;
}
