'use client';
import { useEffect,useId,useRef,useState } from 'react';
import { dilemmaLinkFields,type DilemmaLink } from '@/lib/dilemma-review';
import { tocSources } from '@/lib/pack-toc';
import type { MethodIssue } from '@/lib/cloud-method';
import { profileQuestions,nodeFields,profileNodeName,cloudGroups,type CloudNode,type Profile } from '@/lib/cloud-method';
export function CloudDiagram({fields,profile,active=[],onSelect,onChange,disabled=false,sequential=false,onSequenceComplete,issues=[]}:{issues?:MethodIssue[];onSequenceComplete?:(complete:boolean)=>void;sequential?:boolean;fields:Record<string,string>;profile:Profile;active?:CloudNode[];onSelect?:(node:CloudNode)=>void;onChange?:(field:string,value:string)=>void;disabled?:boolean}){
 const order=cloudGroups(profile).flat();
 const [cursor,setCursor]=useState(()=>{const missing=order.findIndex(n=>!fields[nodeFields[n]]?.trim());return missing<0?order.length:missing;});
 useEffect(()=>{if(sequential)onSequenceComplete?.(cursor===order.length);},[sequential,cursor,order.length,onSequenceComplete]);
 const [editing,setEditing]=useState<CloudNode|null>(null);
 const root=useRef<HTMLDivElement>(null);
 const markerId=useId().replace(/:/g,'');
 const [geometry,setGeometry]=useState<{edges:string[];conflict:string}>({edges:[],conflict:''});
 useEffect(()=>{
  const container=root.current;if(!container)return;
  const update=()=>{
   const origin=container.getBoundingClientRect();
   const boxes=Object.fromEntries(Array.from(container.querySelectorAll<HTMLElement>('[data-cloud-node]')).map(element=>{const r=element.getBoundingClientRect();return [element.dataset.cloudNode,{left:r.left-origin.left,right:r.right-origin.left,top:r.top-origin.top,bottom:r.bottom-origin.top,cx:(r.left+r.right)/2-origin.left,cy:(r.top+r.bottom)/2-origin.top}];}));
   const {A,B,C,D,Dp}=boxes;if(!A||!B||!C||!D||!Dp)return;
   const edges=[`M${B.left-3} ${B.cy} L${A.right+7} ${A.cy-18}`,`M${C.left-3} ${C.cy} L${A.right+7} ${A.cy+18}`,`M${D.left-3} ${D.cy} L${B.right+7} ${B.cy}`,`M${Dp.left-3} ${Dp.cy} L${C.right+7} ${C.cy}`];
   const start=D.bottom+5,end=Dp.top-5,part=(end-start)/4,x=(D.cx+Dp.cx)/2;
   setGeometry({edges,conflict:`M${x} ${start} L${x-9} ${start+part} L${x+9} ${start+2*part} L${x-9} ${start+3*part} L${x} ${end}`});
  };
  const observer=new ResizeObserver(update);observer.observe(container);container.querySelectorAll('[data-cloud-node]').forEach(element=>observer.observe(element));update();return()=>observer.disconnect();
 },[profile]);
 const invalid=(node:CloudNode)=>issues.some(i=>i.field===nodeFields[node]||(i.link&&dilemmaLinkFields[i.link as DilemmaLink]?.includes(nodeFields[node])));
 const nodes:CloudNode[]=onChange?cloudGroups(profile).flat():['A','B','C','D','Dp'];
 return <div ref={root} className="cloud-diagram" role="group" aria-label="Схема грозовой тучи">
 <svg className="cloud-lines" aria-hidden="true"><defs><marker id={markerId+'-arrow'} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="#111827"/></marker><marker id={markerId+'-conflict'} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto-start-reverse"><path d="M0,0 L6,3 L0,6" fill="#dc2626"/></marker></defs><g stroke="#111827" strokeWidth="1.5" fill="none" markerEnd={'url(#'+markerId+'-arrow)'}>{geometry.edges.map((path,i)=><path key={i} d={path}/>)}</g><path d={geometry.conflict} stroke="#dc2626" strokeWidth="2.5" fill="none" markerStart={'url(#'+markerId+'-conflict)'} markerEnd={'url(#'+markerId+'-conflict)'}/></svg>
 {nodes.map(node=>onChange?<div key={node} data-cloud-node={node} style={invalid(node)?{borderColor:'#b91c1c'}:undefined} className={'cloud-node cloud-editable cloud-'+node+(active.includes(node)?' cloud-active':'')}><label htmlFor={nodeFields[node]}>{profileNodeName(profile,node)}</label>{sequential&&(order[cursor]===node||editing===node)&&<p className="text-sm">{profileQuestions[profile][node]}<br/><small>Введите ответ и нажмите Enter.</small></p>}{sequential&&cursor===order.length&&editing!==node&&<button type="button" disabled={disabled} className="text-sm underline" onClick={()=>{setEditing(node);setTimeout(()=>document.getElementById(nodeFields[node])?.focus(),0);}}>Исправить</button>}{sequential&&editing===node&&<button type="button" className="text-sm underline" onClick={()=>setEditing(null)}>Готово</button>}<textarea aria-invalid={invalid(node)} aria-describedby={issues.some(i=>i.field===nodeFields[node])?nodeFields[node]+'-feedback':undefined} readOnly={sequential&&order[cursor]!==node&&editing!==node} onKeyDown={event=>{if(sequential&&event.key==='Enter'&&!event.nativeEvent.isComposing){event.preventDefault();if(editing===node){setEditing(null);return;}if(order[cursor]===node&&fields[nodeFields[node]]?.trim()){const next=cursor+1;setCursor(next);if(order[next])setTimeout(()=>document.getElementById(nodeFields[order[next]])?.focus(),0);}}}} id={nodeFields[node]} name={nodeFields[node]} aria-label={profileNodeName(profile,node)} value={fields[nodeFields[node]]||''} maxLength={4000} rows={4} disabled={disabled} onFocus={()=>onSelect?.(node)} onChange={event=>{if(!sequential||order[cursor]===node||editing===node)onChange(nodeFields[node],event.target.value);}}/>{issues.some(i=>i.field===nodeFields[node])&&<div id={nodeFields[node]+'-feedback'} style={{color:'#b91c1c',textAlign:'left'}} role="alert">{issues.filter(i=>i.field===nodeFields[node]).map((issue,index)=><div key={index} className="text-sm mt-3"><strong style={{color:'#b91c1c'}}>{issue.criterion}</strong><p>{issue.question}</p><details><summary>Почему это важно · Pack-TOC</summary><p>{issue.observation}</p>{issue.sourceIds?.map(id=>tocSources[id]?<a className="underline mr-2" key={id} href={tocSources[id].url} target="_blank" rel="noreferrer">{id}</a>:null)}</details></div>)}</div>}</div>:<button type="button" key={node} data-cloud-node={node} onClick={()=>onSelect?.(node)}  className={'cloud-node cloud-'+node+(active.includes(node)?' cloud-active':'')} aria-label={profileNodeName(profile,node)+': '+(fields[nodeFields[node]]||'не заполнено')}><strong>{profileNodeName(profile,node)}</strong><span>{fields[nodeFields[node]]||''}</span></button>)}

 </div>;
}
