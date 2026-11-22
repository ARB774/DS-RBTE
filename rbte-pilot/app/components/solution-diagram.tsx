'use client';
import { useEffect,useId,useRef,useState } from 'react';

type Box={left:number;right:number;top:number;bottom:number;cx:number;cy:number};

export function SolutionDiagram({goal,conditionB,conditionC,solution,reasonB,reasonC,bChanged,cChanged}:{goal:string;conditionB:string;conditionC:string;solution:string;reasonB:string;reasonC:string;bChanged:boolean;cChanged:boolean}){
 const root=useRef<HTMLDivElement>(null);
 const markerId=useId().replace(/:/g,'');
 const [edges,setEdges]=useState<string[]>([]);
 useEffect(()=>{
  const container=root.current;if(!container)return;
  const update=()=>{
   const origin=container.getBoundingClientRect();
   const boxes=Object.fromEntries(Array.from(container.querySelectorAll<HTMLElement>('[data-solution-node]')).map(element=>{const r=element.getBoundingClientRect();return [element.dataset.solutionNode,{left:r.left-origin.left,right:r.right-origin.left,top:r.top-origin.top,bottom:r.bottom-origin.top,cx:(r.left+r.right)/2-origin.left,cy:(r.top+r.bottom)/2-origin.top} as Box];})) as Record<string,Box>;
   const {A,B,C,Dstar}=boxes;if(!A||!B||!C||!Dstar)return;
   setEdges([
    `M${B.left-3} ${B.cy} L${A.right+7} ${A.cy-18}`,
    `M${C.left-3} ${C.cy} L${A.right+7} ${A.cy+18}`,
    `M${Dstar.left-3} ${Dstar.cy-28} L${B.right+7} ${B.cy}`,
    `M${Dstar.left-3} ${Dstar.cy+28} L${C.right+7} ${C.cy}`,
   ]);
  };
  const observer=new ResizeObserver(update);observer.observe(container);container.querySelectorAll('[data-solution-node]').forEach(element=>observer.observe(element));update();return()=>observer.disconnect();
 },[goal,conditionB,conditionC,solution]);
 const bName=bChanged?'B*':'B',cName=cChanged?'C*':'C';
 return <section className="solution-view card p-6 space-y-5" aria-label="Схема решения D*">
  <div><h3 className="font-bold">Схема выбранного решения</h3><p className="text-sm text-slate-700">Показаны актуальные необходимые условия и причины, по которым решение D* должно их обеспечить.</p></div>
  <div ref={root} className="cloud-diagram solution-diagram" role="group" aria-label="D* приводит к необходимым условиям, а они — к общей цели">
   <svg className="cloud-lines" aria-hidden="true"><defs><marker id={markerId+'-arrow'} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="#111827"/></marker></defs><g stroke="#111827" strokeWidth="1.5" fill="none" markerEnd={'url(#'+markerId+'-arrow)'}>{edges.map((path,index)=><path key={index} d={path}/>)}</g></svg>
   <div data-solution-node="A" className="cloud-node cloud-A"><strong>A · Общая цель</strong><span>{goal||'Общая цель пока не записана'}</span></div>
   <div data-solution-node="B" className="cloud-node cloud-B"><strong>{bName} · Необходимое условие</strong><span>{conditionB||`${bName} пока не сформулировано`}</span></div>
   <div data-solution-node="C" className="cloud-node cloud-C"><strong>{cName} · Необходимое условие</strong><span>{conditionC||`${cName} пока не сформулировано`}</span></div>
   <div data-solution-node="Dstar" className="cloud-node solution-Dstar"><strong>D* · Решение</strong><span>{solution||'Решение пока не выбрано'}</span></div>
  </div>
  <div className="solution-reasons" aria-label="Причины действия решения">
   <div><strong>D* → {bName}</strong><p>{reasonB||`Причина, по которой D* приводит к ${bName}, пока не записана.`}</p></div>
   <div><strong>D* → {cName}</strong><p>{reasonC||`Причина, по которой D* приводит к ${cName}, пока не записана.`}</p></div>
  </div>
 </section>;
}
