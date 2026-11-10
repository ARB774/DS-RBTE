'use client';
import { useEffect,useId,useRef,useState } from 'react';
import { nodeFields,profileNodeName,type CloudNode,type MethodIssue } from '@/lib/cloud-method';
import { dilemmaCloudFlow,dilemmaCloudOrder,dilemmaCloudQuestions } from '@/lib/dilemma-cloud-flow';
import { dilemmaLinkFields,type DilemmaLink } from '@/lib/dilemma-review';
import { tocSources } from '@/lib/pack-toc';
type Props={fields:Record<string,string>;onChange:(key:string,value:string)=>void;onProgress:(cursor:number,editing:CloudNode|null)=>void;onComplete:(complete:boolean)=>void;disabled:boolean;issues?:MethodIssue[];attempt:number;references?:{D?:string;Dp?:string}};
export function DilemmaCloud({fields,onChange,onProgress,onComplete,disabled,issues=[],attempt,references={}}:Props){
 const [flow,setFlow]=useState(()=>dilemmaCloudFlow(fields));
 const [empty,setEmpty]=useState<CloudNode|null>(null);
 const [expanded,setExpanded]=useState<CloudNode|null>(null);
 const root=useRef<HTMLDivElement>(null);
 const marker=useId().replace(/:/g,'');
 const [lines,setLines]=useState<Array<{key:string;path:string}>>([]);
 const current=flow.editing||dilemmaCloudOrder[flow.cursor];
 const refs=useRef<Partial<Record<CloudNode,HTMLTextAreaElement|null>>>({});
 const allFilled=dilemmaCloudOrder.every(n=>fields[nodeFields[n]]?.trim());
 useEffect(()=>{onComplete(flow.cursor===5&&!flow.editing&&allFilled);onProgress(flow.cursor,flow.editing);},[flow.cursor,flow.editing,allFilled,onComplete,onProgress]);
 useEffect(()=>{if(current&&!disabled)refs.current[current]?.focus();},[current,disabled]);
 useEffect(()=>{if(attempt>0&&current){if(!fields[nodeFields[current]]?.trim())setEmpty(current);refs.current[current]?.focus();}},[attempt]);
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
  setEmpty(null);setExpanded(null);setFlow(f=>f.editing?{cursor:5,editing:null}:{cursor:Math.min(5,f.cursor+1),editing:null});
 }
 function edit(node:CloudNode){if(disabled||flow.cursor!==5)return;setEmpty(null);setExpanded(null);setFlow({cursor:5,editing:node});}
 return <div className="dilemma-cloud-scroll" role="region" aria-label="Туча личной дилеммы">
 <div className="dilemma-canvas" ref={root}>
 <svg className="dilemma-lines" aria-hidden="true"><defs>{['neutral','error'].map(c=><marker key={c} id={marker+c} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto-start-reverse"><path d="M0,0 L7,3.5 L0,7" fill={c==='error'?'#b91c1c':'#64748b'}/></marker>)}</defs>{lines.map(line=>{const invalid=issues.some(i=>i.link===line.key);if(['dc','db'].includes(line.key)&&!invalid)return null;return <path key={line.key} d={line.path} stroke={invalid?'#b91c1c':'#64748b'} strokeWidth={line.key==='conflict'?2.2:1.5} strokeDasharray={['dc','db'].includes(line.key)?'5 4':undefined} fill="none" markerEnd={'url(#'+marker+(invalid?'error':'neutral')+')'} markerStart={line.key==='conflict'?'url(#'+marker+(invalid?'error':'neutral')+')':undefined}/>;})}</svg>
 {dilemmaCloudOrder.map(node=>{
  const field=nodeFields[node],active=current===node;
  const own=issues.filter(i=>i.field===field);
  const related=issues.some(i=>i.link&&dilemmaLinkFields[i.link as DilemmaLink]?.includes(field));
  const invalid=own.length>0||related||empty===node;
  const question=flow.editing===node&&own[0]?own[0].question:dilemmaCloudQuestions[node];
  return <section key={node} data-node={node} className={'dilemma-bubble dilemma-'+node+(active?' is-current':'')+(invalid?' has-error':'')} aria-label={profileNodeName('DILEMMA',node)}>
   <div className="dilemma-bubble-heading"><label htmlFor={field}>{profileNodeName('DILEMMA',node)}</label>{flow.cursor===5&&!flow.editing&&own.length===0&&<button type="button" disabled={disabled} onClick={()=>edit(node)}>Исправить</button>}</div>
   <div className="dilemma-bubble-content">
   {active&&<><p className="dilemma-question" id={field+'-question'}>{question}</p>{(node==='D'||node==='Dp')&&references[node]&&<details className="dilemma-reference"><summary>Выбрано на шаге «Действия»</summary><p>{references[node]}</p></details>}</>}
   <textarea ref={el=>{refs.current[node]=el;}} id={field} name={field} aria-label={profileNodeName('DILEMMA',node)} aria-invalid={invalid} aria-describedby={active?field+'-question':own.length?field+'-feedback':undefined} readOnly={!active} tabIndex={active?0:-1} disabled={disabled} value={fields[field]||''} maxLength={4000} spellCheck onChange={event=>{if(active&&!disabled){setEmpty(null);onChange(field,event.target.value);}}} onKeyDown={event=>{if(event.key==='Enter'&&!event.nativeEvent.isComposing&&active){event.preventDefault();confirm(node);}}}/>
   {active&&<div className="dilemma-confirm"><small>Enter — подтвердить ответ</small><button type="button" disabled={disabled} onClick={()=>confirm(node)}>{flow.editing?'Готово':'Далее →'}</button></div>}
   {empty===node&&<p className="dilemma-error" role="alert">Введите ответ, затем нажмите Enter.</p>}
   {!active&&own.length>0&&<div className="dilemma-feedback" id={field+'-feedback'} role="alert"><strong>{own[0].criterion}</strong><p>{own[0].question}</p>{own.length>1&&<small>Замечаний к этому облаку: {own.length}.</small>}<button type="button" disabled={disabled} onClick={()=>edit(node)}>Исправить</button><button type="button" aria-expanded={expanded===node} onClick={()=>setExpanded(expanded===node?null:node)}>Основание проверки</button></div>}
   {expanded===node&&<div className="dilemma-evidence">{own.map((issue,i)=><div key={i}><strong>{issue.criterion}</strong><p>{issue.observation}</p><p>{issue.question}</p>{issue.sourceIds?.map(id=>tocSources[id]?<a href={tocSources[id].url} key={id} target="_blank" rel="noreferrer">{id} </a>:null)}</div>)}</div>}
   </div>
  </section>;
 })}
 </div></div>;
}
