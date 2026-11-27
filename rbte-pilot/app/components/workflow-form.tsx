'use client';
import { DilemmaCloud } from './dilemma-cloud';
import { dilemmaSteps,dilemmaTitle } from '@/lib/dilemma-route';
import { firstIncompleteLogicLink,logicLinkAnswered } from '@/lib/dilemma-navigation';
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
import { isCurrentDecisionReviewVersion,logicLinkKeys,personalDecisionConditionLabel,readSelectedDecisionKeys,type StepDefinition,stepOrder,steps } from '@/lib/steps';
import { allAssumptionInjectionsComplete,checkStep,readInjections,type WorkflowCheck } from '@/lib/workflow-check';
import { CloudDiagram } from './cloud-diagram';
import { SolutionDiagram } from './solution-diagram';
type History={number:number;createdAt:string;fields:Record<string,string>;comment:string};
type AssumptionChoice={key:string;label:string;value:string};
type InjectionChoice=AssumptionChoice&{injection:string};
export function WorkflowForm({id,step,profile,definition,initial,initialVersion,cloud,decision={},stale,history,material,actionChoices={},assumptionChoices=[],injectionChoices=[]}:{actionChoices?:{D?:string;Dp?:string};assumptionChoices?:AssumptionChoice[];injectionChoices?:InjectionChoice[];id:string;step:string;profile:Profile;definition:StepDefinition;initial:Record<string,string>;initialVersion:number;cloud:Record<string,string>;decision?:Record<string,string>;stale:boolean;history:History[];material:{pdf:string;ppt:string;pages:string}}){
 const router=useRouter();
 const personal=profile==='DILEMMA';
 const negativeBranch=step==='negative-branch';
 const optionByChoice:Record<string,string>={'Вариант 1':'optionA','Вариант 2':'optionB','Дополнительный вариант':'optionC'};
 const selectedSolution=(personal?decision.finalInjection:decision[optionByChoice[decision.choice]])?.trim();
 const conflictReviewRequired=profile==='CONFLICT';
 const conflictDecision=conflictReviewRequired&&step==='decision';
 const personalCloud=profile==='DILEMMA'&&step==='cloud',personalActions=profile==='DILEMMA'&&step==='actions',personalLogic=profile==='DILEMMA'&&step==='logic',personalAssumptions=profile==='DILEMMA'&&step==='assumptions',personalAssumptionCheck=profile==='DILEMMA'&&step==='assumption-check',personalDecision=profile==='DILEMMA'&&step==='decision',personalTrial=profile==='DILEMMA'&&step==='trial';
 const assistantReviewRequired=conflictReviewRequired||(personal&&!personalAssumptions&&!personalTrial);
 const [sequenceComplete,setSequenceComplete]=useState(false);
 const progress=useCallback((cursor:number,editing:CloudNode|null)=>{setFields(f=>{if(f.__cloudProgress===String(cursor)&&(f.__cloudEditing||'')===(editing||''))return f;return {...f,__cloudProgress:String(cursor),__cloudEditing:editing||''};});},[]);
 const entry=cloudEntryFields(step,initial);
 const legacyCloud=entry!==initial&&Object.values(nodeFields).some(key=>initial[key]);
 const defaults=()=>Object.fromEntries(definition.fields.map(f=>[f.key,f.options?.[0]??'']));
 const storedReport=(()=>{try{return entry.__check?JSON.parse(entry.__check) as WorkflowCheck:null;}catch{return null;}})();
 const obsoleteDecisionReview=personalDecision&&storedReport?.mode==='ai'&&!isCurrentDecisionReviewVersion(storedReport.method?.version);
 const initialReport=obsoleteDecisionReview?null:personalAssumptions||personalTrial?checkStep(step,profile,entry):personalAssumptionCheck&&storedReport?.mode!=='ai'?checkStep(step,profile,entry):storedReport;
 const initialReviewMissing=assistantReviewRequired&&initialVersion>0&&entry.__draft!=='true'&&initialReport?.mode!=='ai';
 const [attempt,setAttempt]=useState(0),[submitted,setSubmitted]=useState(initial.__cloudReview==='submitted'||initialReport?.mode==='ai'),[reviewFailed,setReviewFailed]=useState(initialReviewMissing);
 const [fields,setFields]=useState<Record<string,string>>(()=>seedCloudActions({...defaults(),...entry},actionChoices,personalCloud?initialVersion:1)),[version,setVersion]=useState(initialVersion),[dirty,setDirty]=useState(false),[pending,start]=useTransition(),[message,setMessage]=useState(personal&&initial.__draft==='true'?'Сохранён черновик.':initialReviewMissing?'Шаг сохранён. Проверка помощником не завершена. Повторите проверку.':''),[active,setActive]=useState<CloudNode[]>([]),[consent,setConsent]=useState(false),[showHelp]=useState(step!=='cloud'),[report,setReport]=useState<WorkflowCheck|null>(personalCloud&&(entry.__draft==='true'||(initialReport?.mode!=='ai'&&entry.__cloudReview!=='submitted'))?null:initialReport),[outdated,setOutdated]=useState(stale||initialReviewMissing);
 const [logicCursor,setLogicCursor]=useState(()=>{const first=firstIncompleteLogicLink(fields,logicLinkKeys);return first?logicLinkKeys.indexOf(first):0;});
 const [assumptionCursor,setAssumptionCursor]=useState(0);
 useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(dirty){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 useEffect(()=>{setOutdated(stale||initialReviewMissing);},[stale,initialReviewMissing]);
 useEffect(()=>{if(!personal)return;const guard=(event:MouseEvent)=>{const link=(event.target as Element)?.closest?.('a');if(!dirty||!link||link.target==='_blank'||event.ctrlKey||event.metaKey||link.getAttribute('href')?.startsWith('#'))return;if(pending){event.preventDefault();event.stopPropagation();return;}if(!window.confirm('Есть несохранённые изменения. Уйти без сохранения?')){event.preventDefault();event.stopPropagation();}};document.addEventListener('click',guard,true);return()=>document.removeEventListener('click',guard,true);},[dirty,personal,pending]);
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
 const groups=cloudGroups(profile),isCloud=step==='cloud';
 const diagramFields=isCloud?fields:cloud;
 const selectedDecisionKeys=readSelectedDecisionKeys(fields.selected).filter(key=>injectionChoices.some(choice=>choice.key===key));
 const solutionFields=personalDecision?fields:decision;
 const solutionSelectedKeys=readSelectedDecisionKeys(solutionFields.selected);
 const bChanged=solutionSelectedKeys.includes('ab'),cChanged=solutionSelectedKeys.includes('ac');
 const showSolution=personal&&['decision','trial'].includes(step)&&Boolean(solutionFields.finalInjection?.trim());
 const showDecisionEdit=personal&&!personalDecision&&step==='trial';
 const decisionIssues=showDecisionEdit?checkStep('decision','DILEMMA',solutionFields).issues:[];
 const formFields=definition.fields.filter(f=>(!isCloud||!Object.values(nodeFields).includes(f.key))&&!personalAssumptionCheck&&!(personalDecision&&f.key==='selected')&&!(personalDecision&&f.key==='conditionB'&&!selectedDecisionKeys.includes('ab'))&&!(personalDecision&&f.key==='conditionC'&&!selectedDecisionKeys.includes('ac')));
 const route=personal?dilemmaSteps.map(([key])=>String(key)):stepOrder;
 const next=route[route.indexOf(step)+1],previous=route[route.indexOf(step)-1];
 const reportUsesRemovedReason=conflictDecision&&report?.issues.some(issue=>issue.field==='reason');
 const currentReport=report&&!dirty&&!outdated&&!reportUsesRemovedReason&&fields.__draft!=='true'?report:null;
 const injections=readInjections(fields.injections);
 const completedInjectionCount=assumptionChoices.filter(choice=>Boolean(injections[choice.key])).length;
 let injectionDrafts:Record<string,string>={};try{const parsed:unknown=JSON.parse(fields.injections||'{}');if(parsed&&!Array.isArray(parsed)&&typeof parsed==='object')injectionDrafts=Object.fromEntries(Object.entries(parsed).filter((entry):entry is [string,string]=>typeof entry[1]==='string'));}catch{/* Invalid legacy data is shown as empty and replaced on edit. */}
 function changeInjection(key:string,value:string){
  const next={...injectionDrafts,[key]:value};
  if(!value)delete next[key];
  change('injections',JSON.stringify(next));
 }
 function toggleDecisionInjection(key:string){
  const next=selectedDecisionKeys.includes(key)?selectedDecisionKeys.filter(value=>value!==key):[...selectedDecisionKeys,key];
  const combined=injectionChoices.filter(choice=>next.includes(choice.key)).map(choice=>choice.injection).join('\n\n');
  setFields(f=>({...f,selected:JSON.stringify(next),finalInjection:combined}));setDirty(true);setOutdated(true);setReport(null);
 }
 const personalReviewReady=personalAssumptions||personalTrial?currentReport?.issues.length===0:personalAssumptionCheck?allAssumptionInjectionsComplete(fields)&&currentReport?.mode==='ai'&&currentReport.issues.length===0:currentReport?.mode==='ai'&&(!personalCloud||hasDilemmaSemanticReview(currentReport));
 const personalStepComplete=version>0&&!dirty&&!outdated&&currentReport?.issues.length===0&&personalReviewReady&&(!personalCloud||sequenceComplete);
 const activeLogicIssue=personalLogic?currentReport?.issues[0]:undefined;
 const issueLogicKey=activeLogicIssue&&logicLinkKeys.find(key=>activeLogicIssue.field===key||activeLogicIssue.field===key+'Reason');
 const incompleteLogicKey=personalLogic?firstIncompleteLogicLink(fields,logicLinkKeys):undefined;
 const activeLogicKey=issueLogicKey||(personalLogic&&dirty?logicLinkKeys[logicCursor]:undefined)||(incompleteLogicKey?logicLinkKeys[logicCursor]:undefined);
 const activeLogicIndex=activeLogicKey?logicLinkKeys.indexOf(activeLogicKey):-1;
 const activeAssumptionIssue=personalAssumptions?currentReport?.issues[0]:undefined;
 const issueAssumptionIndex=activeAssumptionIssue?formFields.findIndex(field=>field.key===activeAssumptionIssue.field):-1;
 const activeAssumptionIndex=issueAssumptionIndex>=0?issueAssumptionIndex:assumptionCursor;
 const trialFieldKeys=fields.stage==='Действие уже выполнено'?['stage']:fields.stage==='Готовлю ближайшее выполнение'?['stage','situationAction','expectation','riskLevel',...(fields.riskLevel==='Есть ограниченный риск'?['riskBoundary']:[])]:fields.stage==='Сначала нужно изменить условия'?['stage','conditionChange']:['stage'];
 const visibleFormFields=personalLogic?activeLogicIssue?formFields.filter(field=>field.key===activeLogicIssue.field):activeLogicKey?formFields.filter(field=>field.key===activeLogicKey||field.key===activeLogicKey+'Reason'):[]:personalAssumptions?formFields[activeAssumptionIndex]?[formFields[activeAssumptionIndex]]:[]:personalTrial?formFields.filter(field=>trialFieldKeys.includes(field.key)):formFields;
 const displayedIssues=(personalLogic||personalAssumptions||personalAssumptionCheck)&&currentReport?.issues.length?[currentReport.issues[0]]:currentReport?.issues||[];
 const currentLogicComplete=Boolean(activeLogicKey&&logicLinkAnswered(fields,activeLogicKey));
 const currentAssumptionComplete=Boolean(formFields[activeAssumptionIndex]&&fields[formFields[activeAssumptionIndex].key]?.trim());
 async function save(draftOnly=false,values=fields,preserveReport=false){
  const submittedValues=values;
  if(!draftOnly&&personalCloud&&!sequenceComplete){setAttempt(a=>a+1);setMessage('Подтвердите текущий ответ клавишей Enter.');return;}
  if(!draftOnly&&personalCloud){setSubmitted(true);setReviewFailed(false);}
  if(!draftOnly&&(personalCloud||personalActions||personalTrial)){const checked=checkStep(step,profile,values);if(!preserveReport||checked.issues.length)setReport(checked);if(checked.issues.length){setMessage(personalCloud?'Исправьте замечания в элементах Тучи: '+checked.issues.length+'.':checked.issues.map(i=>i.question).join(' '));return;}}
  if(!draftOnly&&personalAssumptionCheck){const checked=checkStep(step,profile,submittedValues);if(checked.issues.length){setMessage('Запишите инъекцию напротив каждого исходного убеждения.');return;}}
  try{
   const result=await saveDraft(id,step,version,submittedValues,draftOnly);
   if(result.version!==undefined){
    if(draftOnly){setVersion(result.version);setDirty(false);setOutdated(true);setReport(null);setSubmitted(false);setReviewFailed(false);setMessage('Черновик сохранён.');router.refresh();return;}
    const localReport=conflictReviewRequired?null:checkStep(step,profile,submittedValues);
    const reviewMissing=assistantReviewRequired&&(Boolean(result.reviewError)||result.report?.mode!=='ai');
    setVersion(result.version);
    setFields(()=>{const copy:Record<string,string>={...submittedValues,...(result.report?.acceptedRevisions||{})};delete copy.__draft;return copy;});
    setDirty(false);setOutdated(reviewMissing);
    setReport(personal?(personalAssumptions?localReport:result.report||localReport):result.report||localReport);
    if(personal)setReviewFailed(reviewMissing);
    if(personalAssumptions)setMessage('Исходные предположения сохранены без оспаривания. Можно продолжить.');
    else if(personalTrial)setMessage(submittedValues.stage==='Действие уже выполнено'?'Действие отмечено как выполненное. Переходите к разбору результата.':'Состояние решения сохранено. Можно продолжить.');
    else if(result.reviewError)setMessage('Шаг сохранён. Проверка помощником не завершена. '+result.reviewError);
    else if(personalAssumptionCheck&&result.report?.mode==='ai')setMessage(result.report.issues.length?'Помощник проверил инъекции. Исправьте замечания: '+result.report.issues.length+'.':'Помощник подтвердил: каждая инъекция опровергает соответствующее убеждение. Можно перейти к выбору.');
    else if(personal&&result.report?.mode==='ai')setMessage(result.report.issues.length?'Помощник задал один вопрос для уточнения.':'Проверка текущего шага завершена. Можно продолжить.');
    else if(conflictReviewRequired&&result.report?.mode==='ai')setMessage(result.report.issues.length?'Шаг сохранён. Помощник задал вопросы для уточнения.':'Шаг сохранён. Проверка помощником завершена.');
    else if(assistantReviewRequired)setMessage('Шаг сохранён. Проверка помощником не завершена. Повторите проверку.');
    else setMessage('Сохранено. Выполнена локальная проверка текущего шага.');
     if(!personal&&!conflictReviewRequired&&consent){const checked=await reviewWorkflow(id,step,result.version,true);if(checked.version){setVersion(checked.version);setReport(checked.report||null);setMessage('Сохранено. Содержательная проверка выполнена.');}else setMessage('Черновик сохранён. '+(checked.error||'Проверка ИИ недоступна.'));}
     router.refresh();}else setMessage(result.error||'Не удалось сохранить');}catch{setMessage('Связь прервалась. Текст остаётся в форме; скопируйте его перед обновлением.');}
 }
 return <><form className="space-y-5" onSubmit={e=>{e.preventDefault();start(()=>save());}}>
 {!personalCloud&&!personalActions&&<>{!personal&&<p className="text-sm">Порядок: {tocOrderText(profile)}.</p>}
 {!personal&&<TocGuide profile={profile} step={step}/>}
 {personal&&<details className="card p-4"><summary>Помощь по этому шагу</summary><p className="my-3">{personalTrial?'Если действие уже состоялось, можно завершить разбор. Если оно ещё впереди, запишите только ближайшую ситуацию и ожидаемые наблюдения.':methodNotes[step]}</p><a href={material.pdf} target="_blank" rel="noreferrer">Методика · PDF</a><TocGuide profile={profile} step={step}/></details>}
 {outdated&&version>0&&!personalAssumptionCheck&&!conflictReviewRequired&&<aside className="workflow-warning flex flex-wrap items-center justify-between gap-3" role="status"><span>{personalTrial?'Состояние изменилось. Сохраните его перед продолжением.':personalAssumptions?'Исходные предположения изменились. Сохраните их перед продолжением.':'Записи изменились. Сохраните их, чтобы помощник повторил проверку связанных утверждений.'}</span><button type="submit" className="btn btn-primary" disabled={pending}>{pending?(personalAssumptions||personalTrial?'Сохраняю…':'Помощник проверяет…'):personalAssumptions||personalTrial?'Сохранить изменения':'Сохранить изменения и повторить проверку'}</button></aside>}
  {legacyCloud&&<aside className="card p-4"><p>Начните с пустой Тучи. Прежние записи не подставляются в элементы Тучи и остаются доступны ниже и в истории.</p><details className="mt-3"><summary>Прежние формулировки</summary>{Object.entries(nodeFields).map(([node,key])=><p key={key}><strong>{node==='Dp'?'D′':node}:</strong> {initial[key]||'—'}</p>)}</details></aside>}
 {isCloud&&<button type="button" className="btn btn-ghost" disabled={pending} onClick={()=>{setFields(defaults());setDirty(true);setOutdated(true);setReport(null);setMessage('Туча пуста. Впишите собственные формулировки и сохраните. Прежние сохранённые версии доступны в истории.');}}>Начать с пустой тучи</button>}
 {step==='cloud'&&<details className="card p-4"><summary>Вопросы для самостоятельного заполнения</summary><p className="my-3">{methodNotes[step]}</p>{groups.flat().map(node=><p key={node} className="my-2"><strong>{node==='Dp'?'D′':node}:</strong> {profileQuestions[profile][node]}</p>)}<p className="text-sm mt-3"><a href={material.pdf} target="_blank" rel="noreferrer">Теория PDF</a> · <a href={material.ppt}>Тетрадь PPTX</a></p></details>}
 {showHelp&&!personal&&<aside className="card p-4"><p>{methodNotes[step]}</p><p className="text-sm mt-2"><a href={material.pdf} target="_blank" rel="noreferrer">Теория PDF</a> · <a href={material.ppt}>Тетрадь PPTX</a> · {material.pages}</p></aside>}
  </>}
 {personalTrial&&<section className="card p-5 space-y-2"><h3 className="font-bold">Выберите текущее состояние решения D*</h3><p>Если действие уже выполнено, отметьте это, сохраните шаг и переходите к разбору результата — дополнительных вопросов здесь не будет.</p><p className="text-sm text-slate-700">Для будущего действия достаточно коротко записать ситуацию и ожидаемые наблюдения. Граница остановки появится только при указанном существенном риске.</p></section>}
 {showDecisionEdit&&<aside className={decisionIssues.length?'workflow-warning':'card p-4'}><strong>Решение D* и необходимые условия</strong><p className="text-sm my-2">{decisionIssues.length?'Решение нужно дополнить: отдельно запишите актуальное условие B* или C* и причины связей с D*.':'Здесь можно изменить D*, актуальные условия и причины связей.'}</p><Link className="btn btn-ghost" href={'/situations/'+id+'/decision'}>Изменить B*, C* и решение D* →</Link></aside>}
 {showSolution?<SolutionDiagram goal={cloud.goal||''} conditionB={bChanged?solutionFields.conditionB||'':cloud.needA||''} conditionC={cChanged?solutionFields.conditionC||'':cloud.needB||''} solution={solutionFields.finalInjection||''} reasonB={solutionFields.ensureB||''} reasonC={solutionFields.ensureC||''} bChanged={bChanged} cChanged={cChanged}/>:personalCloud?<DilemmaCloud fields={fields} onChange={change} onReply={replyToIssue} onApplyRevision={applyIssueRevision} onProgress={progress} onComplete={setSequenceComplete} disabled={pending} reviewPending={pending} attempt={attempt} references={actionChoices} reviewReplies={fields.reviewReplies} reviewNote={report?.note} issues={submitted&&!reviewFailed&&report?report.issues:undefined}/>:personalActions?<ActionsTable value={fields.actionRows||''} onChange={v=>change('actionRows',v)} disabled={pending}/>:<CloudDiagram issues={personalCloud&&(!outdated||report?.mode==='local')?report?.issues:undefined} onSequenceComplete={setSequenceComplete} sequential={personalCloud} profile={profile} fields={diagramFields} onChange={isCloud?change:undefined} disabled={pending} active={active} onSelect={node=>{setActive([node]);if(!isCloud)document.getElementById(nodeFields[node])?.focus();}}/>}
 {!personalActions&&!isCloud&&cloud.goal===undefined&&<p className="workflow-warning">Исходная туча ещё не сохранена. <Link href={'/situations/'+id+'/cloud'}>Перейти к построению</Link></p>}
 {negativeBranch&&<section className="card p-4" aria-label="Причинная схема негативной ветви">
  <p className="text-sm mb-3">Читайте снизу вверх. Запишите возможное нежелательное последствие и условия, при которых оно может возникнуть.</p>
  <ol className="grid gap-2 text-center max-w-2xl mx-auto">
   <li className="border rounded p-2"><strong>Нежелательное последствие</strong><p>{fields.harm||'Что может пострадать?'}</p></li>
   <li aria-hidden="true">↑</li>
   <li className="border rounded p-2"><strong>Промежуточное следствие</strong><p>{fields.mechanism||'Как возникнет последствие?'}</p></li>
   <li aria-hidden="true">↑</li>
   <li className="border rounded p-2"><strong>Выбранное решение</strong><p>{selectedSolution||'Сначала выберите решение.'}</p><p className="text-sm">Условие: {fields.condition||'пока не указано'}</p></li>
  </ol>{fields.protection&&<p className="mt-3"><strong>Защитное изменение</strong> · {fields.protection}</p>}
 </section>}
 {step==='decision'&&!personalDecision&&fields.choice!=='Отказ от выбора'&&<aside className="card p-4" style={{borderRadius:0}}><strong>Предлагаемая инъекция D*</strong><p className="whitespace-pre-wrap">{fields[fields.choice==='Вариант 2'?'optionB':fields.choice==='Дополнительный вариант'?'optionC':'optionA']||'Опишите вариант решения ниже.'}</p></aside>}
 {personalLogic&&!activeLogicIssue&&!activeLogicKey&&<section className="card p-6 space-y-2"><strong>Ответы по всем семи связям заполнены.</strong><p className="text-sm text-slate-700">Повторно подтверждать ответы «Да» не нужно. Смысловая проверка завершится после ответа помощника; если он найдёт замечание, здесь появится только один вопрос.</p></section>}
 {personalAssumptionCheck&&<section className="card p-6 space-y-5" aria-label="Таблица исходных убеждений и инъекций"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold">Исходные убеждения и инъекции</h3><p className="text-sm text-slate-700">Запишите напротив каждого исходного убеждения инъекцию, которая делает его неверным или несущественным.</p></div><strong>{completedInjectionCount} из {assumptionChoices.length} заполнено</strong></div>{currentReport?.mode==='ai'&&currentReport.issues[0]&&<aside className="border border-red-300 bg-red-50 p-4 space-y-2" role="alert"><div className="flex flex-wrap justify-between gap-3"><strong>{currentReport.issues[0].criterion}</strong><span className="text-sm text-red-700">Замечание 1 из {currentReport.issues.length}</span></div><p className="text-sm">Проверяемая формулировка: {currentReport.issues[0].observation}</p><p className="text-red-800">{currentReport.issues[0].question}</p><p className="text-sm text-slate-700">Исправьте соответствующую инъекцию в таблице и повторите проверку.</p></aside>}{assumptionChoices.length?<div className="overflow-x-auto"><table className="w-full border-collapse"><thead><tr><th className="w-2/5 border p-3 text-left align-top">Исходное убеждение</th><th className="w-3/5 border p-3 text-left align-top">Инъекция, опровергающая убеждение</th></tr></thead><tbody>{assumptionChoices.map((choice,index)=><tr key={choice.key}><td className="border p-3 align-top"><span className="text-sm text-slate-600">{index+1}. {choice.label}</span><p className="mt-1 font-semibold whitespace-pre-wrap">{choice.value}</p></td><td className="border p-3 align-top"><label className="sr-only" htmlFor={'injection-'+choice.key}>Инъекция для убеждения «{choice.value}»</label><textarea id={'injection-'+choice.key} name={'injection-'+choice.key} rows={5} maxLength={4000} value={injectionDrafts[choice.key]||''} placeholder="Запишите инъекцию" style={{width:'100%',minHeight:'8rem',resize:'vertical',display:'block',boxSizing:'border-box'}} onChange={event=>changeInjection(choice.key,event.target.value)} disabled={pending}/></td></tr>)}</tbody></table></div>:<p className="text-red-700">Исходные убеждения не найдены. Вернитесь к предыдущему шагу.</p>}</section>}
 {personalDecision&&<section className="card p-6 space-y-4" aria-label="Решения-кандидаты"><div><h3 className="font-bold">Решения-кандидаты</h3><p className="text-sm text-slate-700">Выберите одно лучшее решение или несколько решений для комбинации.</p></div>{injectionChoices.length?<div className="grid gap-3">{injectionChoices.map(choice=><label key={choice.key} className="border rounded-lg p-4 flex gap-3 items-start"><input type="checkbox" checked={selectedDecisionKeys.includes(choice.key)} onChange={()=>toggleDecisionInjection(choice.key)} disabled={pending}/><span><span className="block text-sm text-slate-600">{choice.value}</span><strong className="block mt-1 whitespace-pre-wrap">{choice.injection}</strong></span></label>)}</div>:<p className="text-red-700">Сначала сформируйте решения для исходных предположений на предыдущем шаге.</p>}</section>}
 {!personalCloud&&!personalActions&&visibleFormFields.length>0&&<fieldset disabled={pending} className="card p-6 space-y-5">
 {personalLogic&&<div className="flex flex-wrap items-center justify-between gap-3"><strong>Связь {activeLogicIndex+1} из {logicLinkKeys.length}</strong>{currentReport?.issues.length?<span className="text-sm text-red-700">Замечание 1 из {currentReport.issues.length}</span>:<span className="text-sm text-slate-600">Один вопрос — один ответ</span>}</div>}
 {personalAssumptions&&<div className="space-y-2"><div className="flex flex-wrap items-center justify-between gap-3"><strong>Исходное предположение {activeAssumptionIndex+1} из {formFields.length}</strong>{currentReport?.issues.length?<span className="text-sm text-red-700">Замечание 1 из {currentReport.issues.length}</span>:<span className="text-sm text-slate-600">Одно предположение за раз</span>}</div><p className="text-sm text-slate-700">{formFields[activeAssumptionIndex]&&fields[formFields[activeAssumptionIndex].key]?.trim()?'Проверьте формулировку и уточните её при необходимости.':'Запишите исходное предположение для этой связи.'}</p></div>}
 {visibleFormFields.map(field=>{
  const node=(Object.keys(nodeFields) as CloudNode[]).find(n=>nodeFields[n]===field.key);
  const link=step==='logic'?profileLinks(profile).find(l=>l.key===field.key||l.key+'Reason'===field.key):undefined;
  const issue=displayedIssues.find(i=>i.field===field.key);
  const prompt=personalDecision&&(field.key==='ensureB'||field.key==='ensureC')?personalDecisionConditionLabel(field.key,selectedDecisionKeys):isCloud&&node&&showHelp?profileQuestions[profile][node]:field.label;
  return <div className="field" key={field.key}>
   <label htmlFor={field.key}>{prompt}{conflictDecision&&field.required&&(fields.choice!=='Отказ от выбора'||['choice','risks'].includes(field.key))&&<span className="ml-2 text-xs text-slate-600">Обязательно</span>}</label>
   {link&&<p className="text-sm text-slate-600 mb-2">{(link.from==='Dp'?'D′':link.from)+': '+(cloud[nodeFields[link.from]]||'…')} · {(link.to==='Dp'?'D′':link.to)+': '+(cloud[nodeFields[link.to]]||'…')}</p>}
   {issue&&!conflictDecision&&<div style={personal?{color:'#b91c1c'}:undefined} className="text-sm text-amber-800 my-3" id={field.key+'-issue'}><p>{issue.question}</p><p className="font-semibold mt-2">{field.options?'Выберите ответ в поле ниже.':'Введите уточнённый ответ в большое поле ниже.'}</p></div>}
   {field.options?<select id={field.key} name={field.key} value={fields[field.key]??field.options[0]} onChange={e=>change(field.key,e.target.value)} onFocus={()=>link&&setActive([link.from,link.to])}>{field.options.map(v=><option key={v}>{v}</option>)}</select>:<textarea id={field.key} name={field.key} rows={3} maxLength={4000} value={fields[field.key]||''} aria-invalid={Boolean(issue)} aria-describedby={issue&&!conflictDecision?field.key+'-issue':undefined} onChange={e=>change(field.key,e.target.value)} onFocus={()=>setActive(node?[node]:link?[link.from,link.to]:[])}/>}
  </div>;
 })}
 {personalLogic&&!activeLogicIssue&&<div className="flex flex-wrap items-center gap-3 border-t pt-4">
  <button type="button" className="btn btn-ghost" disabled={pending||activeLogicIndex===0} onClick={()=>setLogicCursor(index=>Math.max(0,index-1))}>← Предыдущая связь</button>
  {activeLogicIndex<logicLinkKeys.length-1?<button type="button" className="btn btn-primary" disabled={pending||!currentLogicComplete} onClick={()=>{setLogicCursor(index=>Math.min(logicLinkKeys.length-1,index+1));setMessage('Ответ записан в форме. Сохраните шаг после заполнения связей.');}}>К следующей связи →</button>:<p className="text-sm text-slate-700">{currentLogicComplete?'Сохраните шаг, чтобы проверить записанные ответы.':'Выберите ответ и запишите пояснение, затем сохраните шаг.'}</p>}
 </div>}
 {personalAssumptions&&!activeAssumptionIssue&&<div className="flex flex-wrap items-center gap-3 border-t pt-4">
  <button type="button" className="btn btn-ghost" disabled={pending||activeAssumptionIndex===0} onClick={()=>setAssumptionCursor(index=>Math.max(0,index-1))}>← Предыдущее предположение</button>
  {activeAssumptionIndex<formFields.length-1?<button type="button" className="btn btn-primary" disabled={pending||!currentAssumptionComplete} onClick={()=>{setAssumptionCursor(index=>Math.min(formFields.length-1,index+1));setMessage('Переходим к следующему предположению.');}}>Следующее предположение →</button>:<p className="text-sm text-slate-700">Все предположения просмотрены. Сохраните шаг.</p>}
 </div>}
 </fieldset>}
 {personal?<div className="sticky bottom-0 bg-white border-t p-4 space-y-2" style={{zIndex:20}}>
 <div className="flex flex-wrap gap-3 items-center">
 <Link className="btn btn-ghost" href={'/situations/'+id+'/'+(previous||'details')}>← {dilemmaSteps.find(([key])=>key===(previous||'details'))?.[1]||'Назад'}</Link>
 <button type="button" className="btn btn-ghost" disabled={pending} onClick={()=>start(()=>save(true))}>Сохранить черновик</button>
 <button className={personalStepComplete?'btn btn-ghost':'btn btn-primary'} disabled={pending||(personalAssumptionCheck&&!allAssumptionInjectionsComplete(fields))}>{pending?(personalAssumptions||personalTrial?'Сохраняю…':personalAssumptionCheck?'Помощник проверяет инъекции…':'Помощник проверяет…'):personalAssumptionCheck?'Сохранить и проверить':reviewFailed?'Повторить проверку':'Сохранить шаг'}</button>
 {next&&version>0&&!dirty&&!pending&&reviewFailed&&!personalStepComplete&&
  <Link className="btn btn-ghost" href={'/situations/'+id+'/'+next}>Открыть следующий шаг без проверки →</Link>}
 {personalStepComplete?<Link className="btn btn-primary ml-auto" href={'/situations/'+id+'/'+(next||'summary')}>{next?'Далее: '+dilemmaSteps.find(([key])=>key===next)?.[1]+' →':'Посмотреть текущий разбор →'}</Link>:<button type="button" className="btn btn-ghost ml-auto" disabled>{next?'Далее: '+dilemmaSteps.find(([key])=>key===next)?.[1]:'Посмотреть текущий разбор'}</button>}
 </div>
 <p role="status" aria-live="polite" style={{color:personalCloud?(reviewFailed?'#92400e':submitted&&report?.issues.length?'#b91c1c':hasDilemmaSemanticReview(currentReport)&&!currentReport?.issues.length?'#166534':'#334155'):message&&(currentReport?.issues.length||message.includes('не выполнена')||message.includes('не удалось')||message.includes('недоступна')||message.includes('Подтвердите'))?'#b91c1c':'#166534'}}>{pending?(personalCloud?'Проверяю Тучу…':personalAssumptions?'Сохраняю исходные предположения…':personalTrial?'Сохраняю состояние решения…':personalAssumptionCheck?'Помощник проверяет, опровергают ли инъекции убеждения…':'Проверка выполняется. Дождитесь результата.'):personalCloud?message:dirty?'Есть несохранённые изменения. '+(message||''):message}</p>
  {!personalCloud&&!personalAssumptionCheck&&!pending&&(dirty||!version||outdated||Boolean(currentReport?.issues.length)||(personalCloud&&!hasDilemmaSemanticReview(currentReport)))&&<p className="text-sm">{currentReport?.issues.length?'Чтобы продолжить, исправьте замечания: '+currentReport.issues.length+'. Затем сохраните шаг повторно.':personalTrial?'Чтобы продолжить, сохраните состояние решения.':personalCloud&&!sequenceComplete?'Заполните элементы Тучи по очереди. После каждого ответа нажмите Enter.':'Чтобы отметить шаг проверенным, завершите проверку помощником.'}</p>}
 </div>:<>{conflictReviewRequired&&<p id="conflict-review-data" className="text-sm">Кнопка «Сохранить и проверить с ИИ» отправляет в OpenAI описание ситуации, ответы текущего и предыдущих шагов и выдержки методики Pack-TOC.</p>}<div className="flex flex-wrap gap-3"><button className="btn btn-primary" aria-describedby={conflictReviewRequired?"conflict-review-data":undefined} disabled={pending}>{conflictReviewRequired?(pending?"Помощник проверяет…":"Сохранить и проверить с ИИ"):pending?'Сохранение…':'Сохранить и проверить шаг'}</button>{version>0&&!pending&&!dirty&&!outdated&&(!conflictReviewRequired||currentReport?.mode==='ai')&&currentReport?.issues.length===0&&<Link className="btn btn-ghost" href={'/situations/'+id+'/'+(next||'summary')}>{next?steps[next].title:'Итог ситуации'} →</Link>}</div><p role="status" aria-live="polite">{message}</p></>}

 </form>
 {personal&&!negativeBranch&&<AssistantHelpPanel id={id} step={step} fields={fields} issue={currentReport?.issues[0]}/>}
 {!personalCloud&&!personalAssumptions&&!personalAssumptionCheck&&!personalTrial&&currentReport&&<section className="card p-5 my-5" aria-label="Результат проверки"><h3 className="font-bold">{currentReport.mode==='ai'?(personal?'Проверка помощником':'Содержательная проверка ИИ'):'Локальная проверка'}</h3>{profile==='CONFLICT'&&step==='assumption-check'&&currentReport.assumptionState&&<p className="text-sm mt-2"><strong>Вывод помощника</strong> · {currentReport.assumptionState}</p>}<p className="text-sm my-2">{currentReport.note}</p>{currentReport.issues.length?<>{personalLogic&&<p className="text-sm mb-3">Показано одно замечание из {currentReport.issues.length}. После ответа и повторной проверки приложение перейдёт к следующему.</p>}<ul className="space-y-3">{displayedIssues.map((issue,i)=><li key={i}><button className="text-left underline" onClick={()=>{const node=(Object.keys(nodeFields) as CloudNode[]).find(n=>nodeFields[n]===issue.field);setTimeout(()=>document.getElementById(issue.field)?.focus(),0);}}>{conflictDecision?((!fields[issue.field]?.trim()||fields[issue.field]==='Не выбран'?'Заполните: ':'Уточните: ')+(definition.fields.find(field=>field.key===issue.field)?.label||issue.criterion)):issue.criterion}</button>{(!conflictDecision||fields[issue.field]?.trim())&&<p className="text-sm">Наблюдение: {issue.observation}</p>}<p>{issue.question}</p>{issue.sourceIds?.length&&<p className="text-sm">Основание: {issue.sourceIds.map(id=>tocSources[id]?<a key={id} className="underline mr-2" href={tocSources[id].url} target="_blank" rel="noreferrer">{id}</a>:null)}</p>}</li>)}</ul></>:<p>{currentReport.assumptionState||negativeBranch?'Уточняющих вопросов нет.':'Замечаний этой проверкой не выявлено. Проверьте, отражает ли схема вашу ситуацию.'}</p>}</section>}
 {!personalCloud&&!personalActions&&<>{!personal&&!conflictReviewRequired&&<section className="card p-5 my-5 space-y-3"><h3 className="font-bold">Проверить смысл формулировок</h3><p className="text-sm">ИИ проверяет текущий шаг и задаёт наводящие вопросы. Вы можете изменить ответ или обоснованно отклонить рекомендацию перед повторной проверкой.</p><label className="block text-sm"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> Разрешаю отправить описание ситуации, записи текущего и предыдущих шагов и выдержки методики Pack-TOC в OpenAI после сохранения шага или по кнопке «Проверить с ИИ».</label><button className="btn btn-ghost" disabled={pending||dirty||!version||!consent} onClick={()=>start(async()=>{const result=await reviewWorkflow(id,step,version,consent);if(result.version){setVersion(result.version);setReport(result.report||null);setOutdated(false);setMessage('Результат проверки сохранён.');router.refresh();}else setMessage(result.error||'Не удалось проверить.');})}>Проверить с ИИ</button></section>}
 <details className="card p-5 my-5"><summary>История версий этого шага ({history.length})</summary>{history.map(h=><article key={h.number} className="border-t mt-3 pt-3"><strong>Версия ситуации {h.number}</strong><p className="text-sm">{h.createdAt} · {h.comment}</p><dl>{Object.entries(h.fields).filter(([k,v])=>!k.startsWith('__')&&v).map(([k,v])=><div key={k}><dt className="font-semibold text-sm">{definition.fields.find(f=>f.key===k)?.label||k}</dt><dd className="whitespace-pre-wrap text-sm">{v}</dd></div>)}</dl></article>)}</details>
 </>}
 </>;
}
