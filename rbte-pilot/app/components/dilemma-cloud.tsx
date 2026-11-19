'use client';
import { useEffect,useId,useRef,useState } from 'react';
import { nodeFields,profileNodeName,type CloudNode,type MethodIssue } from '@/lib/cloud-method';
import { dilemmaCloudFlow,dilemmaCloudOrder,dilemmaCloudQuestions } from '@/lib/dilemma-cloud-flow';
import { dilemmaLinkFields,dilemmaLinkKeys,dilemmaLinkLabels,type DilemmaLink } from '@/lib/dilemma-review';
import { dilemmaIssueKey,readDilemmaReviewReplies } from '@/lib/dilemma-review-replies';
import { tocSources } from '@/lib/pack-toc';
type Props={fields:Record<string,string>;onChange:(key:string,value:string)=>void;onReply:(issue:MethodIssue,reply:string)=>void;onProgress:(cursor:number,editing:CloudNode|null)=>void;onComplete:(complete:boolean)=>void;disabled:boolean;reviewPending?:boolean;issues?:MethodIssue[];attempt:number;references?:{D?:string;Dp?:string};reviewReplies?:string;reviewNote?:string};
function ReviewPendingNotice(){
 const [seconds,setSeconds]=useState(0);
 useEffect(()=>{const started=Date.now();const timer=window.setInterval(()=>setSeconds(Math.floor((Date.now()-started)/1000)),1000);return()=>window.clearInterval(timer);},[]);
 return <div className="dilemma-review-pending" role="status" aria-live="polite"><span aria-hidden="true"/><div><strong>Помощник рассматривает ваш ответ…</strong><p>{seconds<15?'Сохраняю ответ и выполняю повторную проверку.':'Проверка продолжается. Обычно она занимает до 50 секунд.'}</p></div><time>{seconds} сек.</time></div>;
}
function ReplyEditor({issue,saved,onReply,disabled,pending}:{issue:MethodIssue;saved:string;onReply:(issue:MethodIssue,reply:string)=>void;disabled:boolean;pending:boolean}){
 const [value,setValue]=useState(saved);
 useEffect(()=>setValue(saved),[saved,issue]);
 const changed=value.trim()&&value.trim()!==saved;
 const id='reply-'+dilemmaIssueKey(issue);
 return <div className="dilemma-reply-editor">
  <label htmlFor={id}>{saved?'Ваш сохранённый ответ':'Ваш ответ помощнику'}</label>
  <textarea id={id} rows={3} maxLength={1200} disabled={disabled} value={value} onChange={event=>setValue(event.target.value)} placeholder="Поясните контекст, ответьте на вопрос или обоснуйте несогласие."/>
  <button type="button" disabled={disabled||!changed} onClick={()=>onReply(issue,value)}>{pending?'Помощник рассматривает ответ…':saved?'Обновить ответ и проверить снова':'Ответить помощнику'}</button>
  <small>Ответ сохранится в проекте и будет учтён при повторной проверке.</small>
 </div>;
}
export function DilemmaCloud({fields,onChange,onReply,onProgress,onComplete,disabled,reviewPending=false,issues=[],attempt,references={},reviewReplies='',reviewNote}:Props){
 const [flow,setFlow]=useState(()=>dilemmaCloudFlow(fields));
 const [empty,setEmpty]=useState<CloudNode|null>(null);
 const [selectedFeedback,setSelectedFeedback]=useState<{type:'node'|'link';key:string}|null>(null);
 const root=useRef<HTMLDivElement>(null);
 const marker=useId().replace(/:/g,'');
 const [lines,setLines]=useState<Array<{key:string;path:string}>>([]);
 const current=flow.editing||dilemmaCloudOrder[flow.cursor];
 const refs=useRef<Partial<Record<CloudNode,HTMLTextAreaElement|null>>>({});
 const allFilled=dilemmaCloudOrder.every(n=>fields[nodeFields[n]]?.trim());
 const selectedIssues=selectedFeedback?.type==='node'
  ?issues.filter(issue=>!issue.link&&issue.field===nodeFields[selectedFeedback.key as CloudNode])
  :selectedFeedback?.type==='link'?issues.filter(issue=>issue.link===selectedFeedback.key):[];
 const savedReplies=readDilemmaReviewReplies(reviewReplies);
 useEffect(()=>{onComplete(flow.cursor===5&&!flow.editing&&allFilled);onProgress(flow.cursor,flow.editing);},[flow.cursor,flow.editing,allFilled,onComplete,onProgress]);
 useEffect(()=>{if(current&&!disabled)refs.current[current]?.focus();},[current,disabled]);
 useEffect(()=>{if(attempt>0&&current){if(!fields[nodeFields[current]]?.trim())setEmpty(current);refs.current[current]?.focus();}},[attempt]);
 useEffect(()=>{
  if(!issues.length){setSelectedFeedback(null);return;}
  setSelectedFeedback(previous=>{
   if(previous?.type==='node'&&issues.some(issue=>!issue.link&&issue.field===nodeFields[previous.key as CloudNode]))return previous;
   if(previous?.type==='link'&&issues.some(issue=>issue.link===previous.key))return previous;
   const node=dilemmaCloudOrder.find(candidate=>issues.some(issue=>!issue.link&&issue.field===nodeFields[candidate]));
   if(node)return {type:'node',key:node};
   const link=dilemmaLinkKeys.find(candidate=>issues.some(issue=>issue.link===candidate));
   return link?{type:'link',key:link}:null;
  });
 },[issues]);
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
 function edit(node:CloudNode){if(disabled||flow.cursor!==5)return;setEmpty(null);setFlow({cursor:5,editing:node});}
 const issueCountLabel=(count:number)=>count===1?'1 замечание':count>1&&count<5?count+' замечания':count+' замечаний';
 return <div className="dilemma-review-layout" role="region" aria-label="Туча личной дилеммы">
 <div className="dilemma-cloud-scroll">
 <div className="dilemma-canvas" ref={root}>
 <svg className="dilemma-lines" aria-hidden="true"><defs>{['neutral','error'].map(c=><marker key={c} id={marker+c} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto-start-reverse"><path d="M0,0 L7,3.5 L0,7" fill={c==='error'?'#b91c1c':'#64748b'}/></marker>)}</defs>{lines.map(line=>{const invalid=issues.some(i=>i.link===line.key);if(['dc','db'].includes(line.key)&&!invalid)return null;return <path key={line.key} d={line.path} stroke={invalid?'#b91c1c':'#64748b'} strokeWidth={line.key==='conflict'?2.2:1.5} strokeDasharray={['dc','db'].includes(line.key)?'5 4':undefined} fill="none" markerEnd={'url(#'+marker+(invalid?'error':'neutral')+')'} markerStart={line.key==='conflict'?'url(#'+marker+(invalid?'error':'neutral')+')':undefined}/>;})}</svg>
 {dilemmaCloudOrder.map(node=>{
  const field=nodeFields[node],active=current===node;
  const own=issues.filter(i=>!i.link&&i.field===field);
  const related=issues.some(i=>i.link&&dilemmaLinkFields[i.link as DilemmaLink]?.includes(field));
  const invalid=own.length>0||related||empty===node;
  const question=dilemmaCloudQuestions[node];
  return <section key={node} data-node={node} className={'dilemma-bubble dilemma-'+node+(active?' is-current':'')+(invalid?' has-error':'')} aria-label={profileNodeName('DILEMMA',node)}>
   <div className="dilemma-bubble-heading"><label htmlFor={field}>{profileNodeName('DILEMMA',node)}</label>{own.length>0?<button type="button" className="dilemma-issue-badge" aria-pressed={selectedFeedback?.type==='node'&&selectedFeedback.key===node} onClick={()=>setSelectedFeedback({type:'node',key:node})}>{issueCountLabel(own.length)}</button>:flow.cursor===5&&!flow.editing&&<button type="button" disabled={disabled} onClick={()=>edit(node)}>Исправить</button>}</div>
   <div className="dilemma-bubble-content">
   {active&&<><p className="dilemma-question" id={field+'-question'}>{question}</p>{(node==='D'||node==='Dp')&&references[node]&&<details className="dilemma-reference"><summary>Выбрано на шаге «Действия»</summary><p>{references[node]}</p></details>}</>}
   <textarea ref={el=>{refs.current[node]=el;}} id={field} name={field} aria-label={profileNodeName('DILEMMA',node)} aria-invalid={invalid} aria-describedby={active?field+'-question':own.length?'dilemma-review-panel':undefined} readOnly={!active} tabIndex={active?0:-1} disabled={disabled} value={fields[field]||''} maxLength={4000} spellCheck onChange={event=>{if(active&&!disabled){setEmpty(null);onChange(field,event.target.value);}}} onKeyDown={event=>{if(event.key==='Enter'&&!event.nativeEvent.isComposing&&active){event.preventDefault();confirm(node);}}}/>
   {active&&<div className="dilemma-confirm"><small>Enter — подтвердить ответ</small><button type="button" disabled={disabled} onClick={()=>confirm(node)}>{flow.editing?'Готово':'Далее →'}</button></div>}
   {empty===node&&<p className="dilemma-error" role="alert">Введите ответ, затем нажмите Enter.</p>}
   </div>
  </section>;
 })}
 </div></div>
 {issues.length>0&&<aside className="dilemma-review-panel" id="dilemma-review-panel" aria-label="Замечания проверки">
  <header><h3>Замечания проверки</h3><span>{issues.length}</span></header>
  {reviewPending&&<ReviewPendingNotice/>}
  <p className="dilemma-review-help">Выберите элемент Тучи или связь. Исходные формулировки остаются на схеме.</p>
  {reviewNote&&<p className="dilemma-review-note">{reviewNote}</p>}
  <div className="dilemma-issue-groups">
   {dilemmaCloudOrder.map(node=>{const count=issues.filter(issue=>!issue.link&&issue.field===nodeFields[node]).length;return count?<button type="button" key={node} aria-pressed={selectedFeedback?.type==='node'&&selectedFeedback.key===node} onClick={()=>setSelectedFeedback({type:'node',key:node})}>{node==='Dp'?'D′':node} · {count}</button>:null;})}
   {dilemmaLinkKeys.map(link=>{const count=issues.filter(issue=>issue.link===link).length;return count?<button type="button" key={link} aria-pressed={selectedFeedback?.type==='link'&&selectedFeedback.key===link} onClick={()=>setSelectedFeedback({type:'link',key:link})}>{dilemmaLinkLabels[link]} · {count}</button>:null;})}
  </div>
  {selectedFeedback&&<section className="dilemma-selected-feedback">
   <h4>{selectedFeedback.type==='node'?'Элемент Тучи '+(selectedFeedback.key==='Dp'?'D′':selectedFeedback.key):dilemmaLinkLabels[selectedFeedback.key as DilemmaLink]}</h4>
   {selectedIssues.map((issue,index)=><article key={index}>
    <strong>{index+1}. {issue.criterion}</strong>
   <p>{issue.question}</p>
   <details><summary>Основание проверки</summary><p>{issue.observation}</p>{issue.sourceIds?.map(id=>tocSources[id]?<a href={tocSources[id].url} key={id} target="_blank" rel="noreferrer">{id} </a>:null)}</details>
    <ReplyEditor issue={issue} saved={savedReplies.find(reply=>reply.key===dilemmaIssueKey(issue))?.reply||''} onReply={onReply} disabled={disabled} pending={reviewPending}/>
   </article>)}
   {selectedFeedback.type==='node'&&<button type="button" className="dilemma-edit-from-review" disabled={disabled||flow.cursor!==5} onClick={()=>edit(selectedFeedback.key as CloudNode)}>Исправить формулировку</button>}
  </section>}
 </aside>}
 </div>;
}
