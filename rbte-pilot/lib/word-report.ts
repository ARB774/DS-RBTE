import {
 AlignmentType,
 Document,
 HeadingLevel,
 ImageRun,
 Packer,
 Paragraph,
 TextRun,
} from 'docx';
import { actionRows } from './dilemma-actions';
import { dilemmaSteps,dilemmaTitle } from './dilemma-route';
import { profileLabels,type ProfileKey } from './profiles';
import { creationLabels } from './review-types';
import { definitionFor,readSelectedDecisionKeys,stepOrder } from './steps';
import { readInjections } from './workflow-check';

export type WordReportSituation={
 title:string;
 profile:string;
 signal?:string|null;
 task?:string|null;
 desiredChange?:string|null;
 experience?:string|null;
 authority?:string|null;
 sensitivity?:string|null;
 supportLevel?:string|null;
 createdAt?:Date|string|null;
};
export type WordReportDraft={step:string;fields:Record<string,string>};

const hiddenFields=new Set(['assumptionKeys','routeVersion','selected']);
const imageFallback=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64');

type DiagramNode={
 x:number;
 y:number;
 width:number;
 height:number;
 title:string;
 value:string;
 accent:string;
 square?:boolean;
};

function escapeXml(value:string){
 return value.replace(/&/gu,'&amp;').replace(/</gu,'&lt;').replace(/>/gu,'&gt;').replace(/"/gu,'&quot;').replace(/'/gu,'&apos;');
}

function wrapDiagramText(value:string,maxLength=29,maxLines=4){
 const words=value.replace(/\s+/gu,' ').trim().split(' ').filter(Boolean);
 const lines:string[]=[];
 for(const word of words){
  const current=lines.at(-1);
  if(!current)lines.push(word);
  else if(`${current} ${word}`.length<=maxLength)lines[lines.length-1]=`${current} ${word}`;
  else if(lines.length<maxLines)lines.push(word);
  else{
   lines[lines.length-1]=`${current.replace(/[.…]+$/u,'')}…`;
   break;
  }
 }
 return lines.length?lines:['—'];
}

function nodeSvg(node:DiagramNode){
 const lines=wrapDiagramText(node.value,node.width>=280?32:28);
 const bodyY=node.y+62-Math.max(0,lines.length-2)*9;
 const body=lines.map((line,index)=>`<tspan x="${node.x+node.width/2}" y="${bodyY+index*21}">${escapeXml(line)}</tspan>`).join('');
 return `<g><rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="${node.square?4:22}" fill="#ffffff" stroke="#cbd5e1" stroke-width="3"/><text x="${node.x+node.width/2}" y="${node.y+30}" text-anchor="middle" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="${node.accent}">${escapeXml(node.title)}</text><text text-anchor="middle" font-family="Arial, sans-serif" font-size="15" fill="#0f172a">${body}</text></g>`;
}

function diagramSvg(nodes:DiagramNode[],arrows:string[],extra=' ',height=520){
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="${height}" viewBox="0 0 1000 ${height}"><defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" fill="#1e293b"/></marker></defs><rect width="1000" height="${height}" fill="#ffffff"/><g fill="none" stroke="#1e293b" stroke-width="3" marker-end="url(#arrow)">${arrows.join('')}</g>${nodes.map(nodeSvg).join('')}${extra}</svg>`;
}

function cloudDiagram(fields:Record<string,string>){
 const values=['goal','needA','needB','actionA','actionB'].map(key=>fields[key]?.trim());
 if(values.some(value=>!value))return null;
 const nodes:DiagramNode[]=[
  {x:20,y:195,width:260,height:130,title:'A · Общая цель',value:fields.goal,accent:'#b91c1c'},
  {x:370,y:55,width:270,height:130,title:'B · Потребность',value:fields.needA,accent:'#047857'},
  {x:370,y:335,width:270,height:130,title:'C · Потребность',value:fields.needB,accent:'#047857'},
  {x:730,y:55,width:250,height:130,title:'D · Действие',value:fields.actionA,accent:'#1d4ed8'},
  {x:730,y:335,width:250,height:130,title:'D′ · Действие',value:fields.actionB,accent:'#1d4ed8'},
 ];
 const arrows=[
  '<path d="M730 120 L650 120"/>',
  '<path d="M370 120 L285 220"/>',
  '<path d="M730 400 L650 400"/>',
  '<path d="M370 400 L285 300"/>',
 ];
 const conflict='<path d="M855 198 l-15 25 24 9-23 26 24 9-15 25" fill="none" stroke="#dc2626" stroke-width="8"/><text x="880" y="250" font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="#dc2626">конфликт</text>';
 return diagramSvg(nodes,arrows,conflict);
}

function solutionDiagram(cloud:Record<string,string>,decision:Record<string,string>){
 const solution=decision.finalInjection?.trim();
 if(!solution||!cloud.goal?.trim()||!cloud.needA?.trim()||!cloud.needB?.trim())return null;
 const selected=readSelectedDecisionKeys(decision.selected);
 const replaceB=selected.includes('ab')&&Boolean(decision.conditionB?.trim());
 const replaceC=selected.includes('ac')&&Boolean(decision.conditionC?.trim());
 const b=replaceB?decision.conditionB:cloud.needA;
 const c=replaceC?decision.conditionC:cloud.needB;
 const bName=replaceB?'B* · Новое условие':'B · Потребность';
 const cName=replaceC?'C* · Новое условие':'C · Потребность';
 const nodes:DiagramNode[]=[
  {x:20,y:175,width:250,height:130,title:'A · Общая цель',value:cloud.goal,accent:'#b91c1c'},
  {x:345,y:35,width:270,height:130,title:bName,value:b,accent:'#047857'},
  {x:345,y:315,width:270,height:130,title:cName,value:c,accent:'#047857'},
  {x:710,y:175,width:270,height:130,title:'D* · Решение',value:solution,accent:'#7c3aed',square:true},
 ];
 const arrows=[
  '<path d="M710 215 L625 145"/>',
  '<path d="M710 265 L625 335"/>',
  '<path d="M345 100 L275 200"/>',
  '<path d="M345 380 L275 280"/>',
 ];
 const reasonBLines=wrapDiagramText(decision.ensureB?.trim()||'Причина не записана',48,3);
 const reasonCLines=wrapDiagramText(decision.ensureC?.trim()||'Причина не записана',48,3);
 const reasonText=(lines:string[],x:number)=>lines.map((line,index)=>`<tspan x="${x}" y="${548+index*20}">${escapeXml(line)}</tspan>`).join('');
 const reasons=`<g><rect x="20" y="480" width="465" height="120" rx="12" fill="#f8fafc" stroke="#cbd5e1"/><text x="35" y="510" font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="#334155">Почему D* приводит к ${escapeXml(replaceB?'B*':'B')}:</text><text font-family="Arial, sans-serif" font-size="14" fill="#0f172a">${reasonText(reasonBLines,35)}</text><rect x="515" y="480" width="465" height="120" rx="12" fill="#f8fafc" stroke="#cbd5e1"/><text x="530" y="510" font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="#334155">Почему D* приводит к ${escapeXml(replaceC?'C*':'C')}:</text><text font-family="Arial, sans-serif" font-size="14" fill="#0f172a">${reasonText(reasonCLines,530)}</text></g>`;
 return diagramSvg(nodes,arrows,reasons,610);
}

function diagramParagraph(svg:string,height:number){
 return new Paragraph({
  children:[new ImageRun({
   type:'svg',
   data:Buffer.from(svg,'utf8'),
   fallback:{type:'png',data:imageFallback},
   transformation:{width:650,height},
  })],
  alignment:AlignmentType.CENTER,
  spacing:{before:100,after:220},
  keepNext:true,
 });
}

function valueParagraphs(value:string){
 return value.split(/\r?\n/u).map(line=>new Paragraph({children:[new TextRun(line||' ')]}));
}

function fieldParagraphs(label:string,value:string){
 return [
  new Paragraph({children:[new TextRun({text:label,bold:true})],spacing:{before:140,after:40}}),
  ...valueParagraphs(value),
 ];
}

function displayValue(step:string,key:string,value:string){
 if(key==='actionRows')return actionRows(value).filter(row=>row.text.trim()).map(row=>{
  const kind=row.kind==='forced'?'вынужденное действие':row.kind==='preferred'?'предпочитаемое действие':'тип не указан';
  return `${row.text.trim()} — ${kind}${row.selected?' · выбрано':''}`;
 }).join('\n');
 if(step==='decision'&&key==='finalInjection')return value.trim();
 return value.trim();
}

function stepTitle(profile:string,step:string){
 if(step==='result')return 'Архив результата и пересмотра';
 if(profile==='DILEMMA')return dilemmaTitle(step);
 if(step==='details')return '1 · Описание ситуации';
 return definitionFor(step,profile)?.title||step;
}

function reportStepOrder(profile:string,drafts:WordReportDraft[]){
 const route=profile==='DILEMMA'?dilemmaSteps.map(([key])=>String(key)):stepOrder;
 return [...drafts].sort((a,b)=>{
  const ai=route.indexOf(a.step),bi=route.indexOf(b.step);
  return (ai<0?route.length:ai)-(bi<0?route.length:bi);
 });
}

function injectionParagraphs(draft:WordReportDraft,assumptions:Record<string,string>){
 const injections=readInjections(draft.fields.injections);
 return Object.entries(injections).flatMap(([key,injection])=>fieldParagraphs(assumptions[key]||key,injection));
}

export function wordReportFileName(title:string){
 const cleaned=title.normalize('NFKC').replace(/[<>:"/\\|?*\u0000-\u001f]/gu,' ').replace(/\s+/gu,' ').trim().slice(0,80)||'Ситуация';
 return `${cleaned} — итог ситуации.docx`;
}

export function wordReportContentDisposition(fileName:string){
 return `attachment; filename="rbte-report.docx"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export async function buildWordReport(situation:WordReportSituation,drafts:WordReportDraft[]){
 const generatedAt=new Intl.DateTimeFormat('ru-RU',{dateStyle:'long',timeZone:'Asia/Yekaterinburg'}).format(new Date());
 const profile=profileLabels[situation.profile as ProfileKey]||situation.profile;
 const children:Paragraph[]=[
  new Paragraph({text:'Итог ситуации',heading:HeadingLevel.TITLE,alignment:AlignmentType.CENTER}),
  new Paragraph({text:situation.title,heading:HeadingLevel.HEADING_1,alignment:AlignmentType.CENTER}),
  new Paragraph({children:[new TextRun({text:`Профиль: ${profile}`,italics:true})],alignment:AlignmentType.CENTER}),
  new Paragraph({children:[new TextRun({text:`Сформировано: ${generatedAt}`,italics:true})],alignment:AlignmentType.CENTER,spacing:{after:300}}),
  new Paragraph({text:stepTitle(situation.profile,'details'),heading:HeadingLevel.HEADING_1}),
 ];
 for(const key of ['signal','task','desiredChange','experience','authority'] as const){
  const value=String(situation[key]||'').trim();
  if(value)children.push(...fieldParagraphs(creationLabels[key],value));
 }
 const assumptionDraft=drafts.find(draft=>draft.step==='assumptions');
 const cloudDraft=drafts.find(draft=>draft.step==='cloud');
 const assumptions=assumptionDraft?.fields||{};
 for(const draft of reportStepOrder(situation.profile,drafts)){
  const definition=definitionFor(draft.step,situation.profile);
  if(!definition)continue;
  const content:Paragraph[]=[];
  if(situation.profile==='DILEMMA'&&draft.step==='cloud'){
   const svg=cloudDiagram(draft.fields);
   if(svg)content.push(diagramParagraph(svg,338));
  }
  if(situation.profile==='DILEMMA'&&draft.step==='decision'&&cloudDraft){
   const svg=solutionDiagram(cloudDraft.fields,draft.fields);
   if(svg)content.push(diagramParagraph(svg,397));
  }
  if(draft.step==='assumption-check')content.push(...injectionParagraphs(draft,assumptions));
  for(const field of definition.fields){
   if(hiddenFields.has(field.key)||field.key==='injections')continue;
   const value=displayValue(draft.step,field.key,draft.fields[field.key]||'');
   if(value)content.push(...fieldParagraphs(field.label,value));
  }
  if(content.length)children.push(new Paragraph({text:stepTitle(situation.profile,draft.step),heading:HeadingLevel.HEADING_1}),...content);
 }
 const document=new Document({
  creator:'RBTE Pilot',
  title:`Итог ситуации: ${situation.title}`,
  description:'Сохранённые результаты разбора рабочей ситуации',
  sections:[{properties:{page:{margin:{top:1000,right:1000,bottom:1000,left:1000}}},children}],
 });
 return Packer.toBuffer(document);
}
