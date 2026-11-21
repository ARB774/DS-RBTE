'use client';
import { useEffect,useId,useRef,useState } from 'react';
import { nodeFields,profileNodeName,type CloudNode,type MethodIssue } from '@/lib/cloud-method';
import { dilemmaCloudFlow,dilemmaCloudOrder,dilemmaCloudQuestions } from '@/lib/dilemma-cloud-flow';
import { dilemmaLinkFields,dilemmaLinkKeys,dilemmaLinkLabels,type DilemmaLink } from '@/lib/dilemma-review';
import { dilemmaIssueKey,readDilemmaReviewReplies } from '@/lib/dilemma-review-replies';
import { tocSources } from '@/lib/pack-toc';
type Props={fields:Record<string,string>;onChange:(key:string,value:string)=>void;onReply:(issue:MethodIssue,reply:string)=>void;onApplyRevision:(issue:MethodIssue,revision:string)=>void;onProgress:(cursor:number,editing:CloudNode|null)=>void;onComplete:(complete:boolean)=>void;disabled:boolean;reviewPending?:boolean;issues?:MethodIssue[];attempt:number;references?:{D?:string;Dp?:string};reviewReplies?:string;reviewNote?:string};
type FeedbackItem={type:'node'|'link';key:string;label:string;issue:MethodIssue};
function orderFeedback(issues:MethodIssue[]):FeedbackItem[]{
 return [
  ...dilemmaCloudOrder.flatMap(node=>issues.filter(issue=>!issue.link&&issue.field===nodeFields[node]).map(issue=>({type:'node' as const,key:node,label:'Элемент Тучи '+(node==='Dp'?'D′':node),issue}))),
  ...dilemmaLinkKeys.flatMap(link=>issues.filter(issue=>issue.link===link).map(issue=>({type:'link' as const,key:link,label:dilemmaLinkLabels[link],issue}))),
 ];
}
function ReviewPendingNotice(){
 const [seconds,setSeconds]=useState(0);
 useEffect(()=>{const started=Date.now();const timer=window.setInterval(()=>setSeconds(Math.floor((Date.now()-started)/1000)),1000);return()=>window.clearInterval(timer);},[]);
 return <div className="dilemma-review-pending" role="status" aria-live="polite"><span aria-hidden="true"/><div><strong>Помощник рассматривает ваш ответ…</strong><p>{seconds<15?'Сохраняю ответ и выполняю повторную проверку.':'Проверка продолжается. Обычно она занимает до 50 секунд.'}</p></div><time>{seconds} сек.</time></div>;
}
function ReplyEditor({issue,saved,currentValue,applyLabel,onReply,onApplyRevision,disabled,pending}:{issue:MethodIssue;saved:string;currentValue?:string;applyLabel?:string;onReply:(issue:MethodIssue,reply:string)=>void;onApplyRevision?:(issue:MethodIssue,revision:string)=>void;disabled:boolean;pending:boolean}){
 const [value,setValue]=useState(saved);
 useEffect(()=>setValue(saved),[saved,issue]);
 const changed=value.trim()&&value.trim()!==saved;
 const canApply=Boolean(onApplyRevision&&issue.proposedValue?.trim()&&issue.proposedValue.trim()!==(currentValue||'').trim());
 const id='reply-'+dilemmaIssueKey(issue);
 return <div className="dilemma-reply-editor">
  <label htmlFor={id}>{saved?'Ваш сохранённый ответ':'Ваш ответ помощнику'}</label>
  {issue.proposedValue&&<div className="dilemma-proposed-revision"><strong>Предложенная формулировка {applyLabel}</strong><p>{issue.proposedValue}</p></div>}
  <textarea id={id} rows={3} maxLength={1200} disabled={disabled} value={value} onChange={event=>setValue(event.target.value)} placeholder="Поясните контекст, ответьте на вопрос или обоснуйте несогласие."/>
  <div className="dilemma-reply-actions"><button type="button" disabled={disabled||!changed} onClick={()=>onReply(issue,value)}>{pending?'Помощник рассматривает ответ…':saved?'Обновить ответ и проверить снова':'Ответить помощнику'}</button>{onApplyRevision&&applyLabel&&issue.proposedValue&&<button type="button" className="dilemma-apply-revision" disabled={disabled||!canApply} onClick={()=>onApplyRevision(issue,issue.proposedValue!)}>Принять предложенную формулировку {applyLabel}</button>}</div>
  <small>Ответ сохранится в проекте и будет учтён при повторной проверке.</small>
  {issue.proposedValue&&<small>Туча изменится только после вашего явного принятия предложения.</small>}
 </div>;
}
export function DilemmaCloud({fields,onChange,onReply,onApplyRevision,onProgress,onComplete,disabled,reviewPending=false,issues=[],attempt,references={},reviewReplies='',reviewNote}:Props){
 const [flow,setFlow]=useState(()=>dilemmaCloudFlow(fields));
 const [empty,setEmpty]=useState<CloudNode|null>(null);
 const savedReplies=readDilemmaReviewReplies(reviewReplies);
 const orderedFeedback=orderFeedback(issues);
 const initialFeedback=orderedFeedback.find(item=>!savedReplies.some(reply=>reply.key===dilemmaIssueKey(item.issue)))||orderedFeedback[0];
 const [selectedIssueKey,setSelectedIssueKey]=useState<string|null>(initialFeedback?dilemmaIssueKey(initialFeedback.issue):null);
 const issueSignature=orderedFeedback.map(item=>dilemmaIssueKey(item.issue)).join('|');
 const root=useRef<HTMLDivElement>(null);
 const marker=useId().replace(/:/g,'');
 const [lines,setLines]=useState<Array<{key:string;path:string}>>([]);
 const current=flow.editing||dilemmaCloudOrder[flow.cursor];
 const refs=useRef<Partial<Record<CloudNode,HTMLTextAreaElement|null>>>({});
 const allFilled=dilemmaCloudOrder.every(n=>fields[nodeFields[n]]?.trim());
 useEffect(()=>{onComplete(flow.cursor===5&&!flow.editing&&allFilled);onProgress(flow.cursor,flow.editing);},[flow.cursor,flow.editing,allFilled,onComplete,onProgress]);
 useEffect(()=>{if(current&&!disabled&&!issues.length)refs.current[current]?.focus();},[current,disabled,issues.length]);
 useEffect(()=>{if(attempt>0&&current){if(!fields[nodeFields[current]]?.trim())setEmpty(current);refs.current[current]?.focus();}},[attempt]);
 useEffect(()=>{setSelectedIssueKey(previous=>orderedFeedback.some(item=>dilemmaIssueKey(item.issue)===previous)?previous:orderedFeedback[0]?dilemmaIssueKey(orderedFeedback[0].issue):null);},[issueSignature]);
 useEffect(()=>{
  const element=root.current;if(!element)return;
  const update=()=>{const r=element.getBoundingClientRect();const box=(n:CloudNode)=>{const b=element.querySelector<HTMLElement>('[data-node="'+n+'"]')!.getBoundingClientRect();return {l:b.left-r.left,rr:b.right-r.left,t:b.top-r.top,b:b.bottom-r.top,x:(b.left+b.right)/2-r.left,y:(b.top+b.bottom)/2-r.top};};const A=box('A'),B=box('B'),C=box('C'),D=box('D'),Dp=box('Dp');
   const x=D.x,y1=D.b+5,y2=Dp.t-5,h=(y2-y1)/4;
   setLines([{key:'ab',path:`M${B.l-2},${B.y} L${A.rr+5},${A.y-30}`},{key:'ac',path:`M${C.l-2},${C.y} L${A.rr+5},${A.y+30}`},{key:'bd',path:`M${D.l-2},${D.y} L${B.rr+5},${B.y}`},{key:'cd',path:`M${Dp.l-2},${Dp.y} L${C.rr+5},${C.y}`},{key:'conflict',path:`M${x},${y1} L${x-7},${y1+h} L${x+7},${y1+2*h} L${x-7},${y1+3*h} L${x},${y2}`},{key:'dc',path:`M${D.l-2},${D.y+65} L${C.rr+5},${C.y-65}`},{key:'db',path:`M${Dp.l-2},${Dp.y-65} L${B.rr+5},${B.y+65}`}]);
  };const observer=new ResizeObserver(update);observer.observe(element);update();return()=>observer.disconnect();
 },[]);
 function confirm(node:CloudNode){
  if(disabled||node!==current)return;
  if(!fields[nodeFields[node]]?.trim()){setEmpty(node);return;}
  setEmpty(null);setFlow(f=>f.editing?{cursor:5,editing:null}:{cursor:Math.min(5,f.cursor+1),editing:null});
 }
 function edit(node:CloudNode){if(disabled||flow.cursor!==5)return;setEmpty(null);setFlow({cursor:5,editing:node});setTimeout(()=>refs.current[node]?.focus(),0);}
 const issueCountLabel=(count:number)=>count===1?'1 замечание':count>1&&count<5?count+' замечания':count+' замечаний';
 const selectedIndex=Math.max(0,orderedFeedback.findIndex(item=>dilemmaIssueKey(item.issue)===selectedIssueKey));
 const selectedFeedback=orderedFeedback[selectedIndex];
 function selectNodeIssue(node:CloudNode){const item=orderedFeedback.find(candidate=>candidate.type==='node'&&candidate.key===node);if(item)setSelectedIssueKey(dilemmaIssueKey(item.issue));}
 function answerAndAdvance(issue:MethodIssue,reply:string){const index=orderedFeedback.findIndex(item=>dilemmaIssueKey(item.issue)===dilemmaIssueKey(issue));const next=orderedFeedback[index+1]||orderedFeedback[0];if(next)setSelectedIssueKey(dilemmaIssueKey(next.issue));onReply(issue,reply);}
 const nodeIssueCount=issues.filter(issue=>!issue.link).length;
 const linkIssueCount=issues.length-nodeIssueCount;
 return <div className="dilemma-review-layout" role="region" aria-label="Туча личной дилеммы">
 <section className="dilemma-cloud-window" aria-label="Окно Тучи"><header><h3>Туча</h3></header><div className="dilemma-cloud-scroll">
 <div className="dilemma-canvas" ref={root}>
 <svg className="dilemma-lines" aria-hidden="true"><defs>{['neutral','error'].map(c=><marker key={c} id={marker+c} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto-start-reverse"><path d="M0,0 L7,3.5 L0,7" fill={c==='error'?'#b91c1c':'#64748b'}/></marker>)}</defs>{lines.map(line=>{const invalid=issues.some(i=>i.link===line.key);if(['dc','db'].includes(line.key)&&!invalid)return null;return <path key={line.key} d={line.path} stroke={invalid?'#b91c1c':'#64748b'} strokeWidth={line.key==='conflict'?2.2:1.5} strokeDasharray={['dc','db'].includes(line.key)?'5 4':undefined} fill="none" markerEnd={'url(#'+marker+(invalid?'error':'neutral')+')'} markerStart={line.key==='conflict'?'url(#'+marker+(invalid?'error':'neutral')+')':undefined}/>;})}</svg>
 {dilemmaCloudOrder.map(node=>{
  const field=nodeFields[node],active=current===node;
  const own=issues.filter(i=>!i.link&&i.field===field);
  const related=issues.some(i=>i.link&&dilemmaLinkFields[i.link as DilemmaLink]?.includes(field));
  const invalid=own.length>0||related||empty===node;
  const question=dilemmaCloudQuestions[node];
  return <section key={node} data-node={node} className={'dilemma-bubble dilemma-'+node+(active?' is-current':'')+(invalid?' has-error':'')} aria-label={profileNodeName('DILEMMA',node)}>
   <div className="dilemma-bubble-heading"><label htmlFor={field}>{profileNodeName('DILEMMA',node)}</label>{own.length>0?<button type="button" className="dilemma-issue-badge" aria-pressed={selectedFeedback?.type==='node'&&selectedFeedback.key===node} onClick={()=>selectNodeIssue(node)}>{issueCountLabel(own.length)}</button>:flow.cursor===5&&!flow.editing&&<button type="button" disabled={disabled} onClick={()=>edit(node)}>Исправить</button>}</div>
   <div className="dilemma-bubble-content">
   {active&&<><p className="dilemma-question" id={field+'-question'}>{question}</p>{(node==='D'||node==='Dp')&&references[node]&&<details className="dilemma-reference"><summary>Выбрано на шаге «Действия»</summary><p>{references[node]}</p></details>}</>}
   <textarea ref={el=>{refs.current[node]=el;}} id={field} name={field} aria-label={profileNodeName('DILEMMA',node)} aria-invalid={invalid} aria-describedby={active?field+'-question':own.length?'dilemma-review-panel':undefined} readOnly={!active} tabIndex={active?0:-1} disabled={disabled} value={fields[field]||''} maxLength={4000} spellCheck onChange={event=>{if(active&&!disabled){setEmpty(null);onChange(field,event.target.value);}}} onKeyDown={event=>{if(event.key==='Enter'&&!event.nativeEvent.isComposing&&active){event.preventDefault();confirm(node);}}}/>
   {active&&<div className="dilemma-confirm"><small>Enter — подтвердить ответ</small><button type="button" disabled={disabled} onClick={()=>confirm(node)}>{flow.editing?'Готово':'Далее →'}</button></div>}
   {empty===node&&<p className="dilemma-error" role="alert">Введите ответ, затем нажмите Enter.</p>}
   </div>
  </section>;
 })}
 </div></div></section>
 {selectedFeedback&&<aside className="dilemma-review-panel" id="dilemma-review-panel" aria-label="Окно общения по замечаниям">
  <header><div><h3>Замечание {selectedIndex+1} из {issues.length}</h3><p className="dilemma-review-breakdown">К элементам: {nodeIssueCount} · к связям: {linkIssueCount} · всего: {issues.length}</p></div><span>{issues.length}</span></header>
  {reviewPending&&<ReviewPendingNotice/>}
  <section className="dilemma-current-feedback">
   <h4>{selectedFeedback.label}</h4>
   <strong>{selectedFeedback.issue.criterion}</strong>
   <p className="dilemma-feedback-question">{selectedFeedback.issue.question}</p>
   <div className="dilemma-feedback-basis"><strong>Основание проверки</strong><p>{selectedFeedback.issue.observation}</p>{selectedFeedback.issue.sourceIds?.map(id=>tocSources[id]?<a href={tocSources[id].url} key={id} target="_blank" rel="noreferrer">{id} </a>:null)}</div>
   <ReplyEditor issue={selectedFeedback.issue} saved={savedReplies.find(reply=>reply.key===dilemmaIssueKey(selectedFeedback.issue))?.reply||''} currentValue={selectedFeedback.type==='node'?fields[selectedFeedback.issue.field]:undefined} applyLabel={selectedFeedback.type==='node'?(selectedFeedback.key==='Dp'?'D′':selectedFeedback.key):undefined} onReply={answerAndAdvance} onApplyRevision={selectedFeedback.type==='node'?onApplyRevision:undefined} disabled={disabled} pending={reviewPending}/>
   {selectedFeedback.type==='node'&&<button type="button" className="dilemma-edit-from-review" disabled={disabled||flow.cursor!==5} onClick={()=>edit(selectedFeedback.key as CloudNode)}>Исправить формулировку</button>}
  </section>
  <nav className="dilemma-review-navigation" aria-label="Переход между замечаниями"><button type="button" disabled={reviewPending||orderedFeedback.length<2} onClick={()=>setSelectedIssueKey(dilemmaIssueKey(orderedFeedback[(selectedIndex-1+orderedFeedback.length)%orderedFeedback.length].issue))}>← Предыдущее</button><span>{selectedIndex+1} / {issues.length}</span><button type="button" disabled={reviewPending||orderedFeedback.length<2} onClick={()=>setSelectedIssueKey(dilemmaIssueKey(orderedFeedback[(selectedIndex+1)%orderedFeedback.length].issue))}>Следующее →</button></nav>
  {reviewNote&&<div className="dilemma-review-note"><strong>Как помощник учёл предыдущие ответы</strong><p>{reviewNote}</p></div>}
 </aside>}
 </div>;
}
