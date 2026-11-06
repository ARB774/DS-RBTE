import { tocProfiles } from './pack-toc';
export type CloudNode = 'A'|'B'|'C'|'D'|'Dp';
export type Profile = 'DILEMMA'|'CONFLICT'|'LT_CLOUD'|'IMMUNITY';
export const nodeFields:Record<CloudNode,string>={A:'goal',B:'needA',C:'needB',D:'actionA',Dp:'actionB'};
export const nodeNames:Record<CloudNode,string>={A:'A · Общая цель',B:'B · Потребность',C:'C · Потребность',D:'D · Действие',Dp:'D′ · Действие'};
export const profileQuestions:Record<Profile,Record<CloudNode,string>>=Object.fromEntries(Object.entries(tocProfiles).map(([key,value])=>[key,value.questions])) as Record<Profile,Record<CloudNode,string>>;
export function cloudGroups(profile:Profile):CloudNode[][] {return tocProfiles[profile].order.map(node=>[node]);}
export function profileNodeName(profile:Profile,node:CloudNode){return tocProfiles[profile].labels[node];}
export const logicLinks=[
 {key:'ab',from:'A',to:'B',text:'Чтобы достичь A, необходимо B'},
 {key:'bd',from:'B',to:'D',text:'Чтобы обеспечить B, необходимо D'},
 {key:'ac',from:'A',to:'C',text:'Чтобы достичь A, необходимо C'},
 {key:'cd',from:'C',to:'Dp',text:'Чтобы обеспечить C, необходимо D′'},
 {key:'conflict',from:'D',to:'Dp',text:'D и D′ несовместимы в описанных условиях'},
 {key:'dc',from:'D',to:'C',text:'D ставит под угрозу C'},
 {key:'db',from:'Dp',to:'B',text:'D′ ставит под угрозу B'}
] as const;
export function profileLinks(profile:Profile){return logicLinks;}
export const assumptionLinks=['ab','ac','bd','cd','conflict'] as const;
export function activeAssumptions(profile:Profile){return profile==='IMMUNITY'?['cd']: [...assumptionLinks];}
export type MethodIssue={field:string;criterion:string;observation:string;question:string;sourceIds?:string[];link?:string};
const normalize=(s:string)=>s.toLocaleLowerCase('ru').replace(/[^\p{L}\p{N}]/gu,'');
export function checkCloud(profile:Profile,fields:Record<string,string>):MethodIssue[]{
 const issues:MethodIssue[]=[];
 const required=tocProfiles[profile].order;
 for(const node of required){const field=nodeFields[node],value=(fields[field]||'').trim();
  if(!value||/^(не знаю|нет|тест|потом|не понятно|непонятно|\.{2,}|…+)$/iu.test(value))issues.push({field,criterion:'Содержательная формулировка '+nodeNames[node],observation:value||'Облако пока пустое',question:profileQuestions[profile][node]});
 }
 for(const [need,action] of [['needA','actionA'],['needB','actionB']]){
  if(fields[need]?.trim()&&normalize(fields[need])===normalize(fields[action]||''))issues.push({field:need,criterion:'Потребность объясняет действие',observation:fields[need],question:'Вы повторили действие. Что важное оно позволяет обеспечить или сохранить?'});
 }
 if(fields.actionA?.trim()&&normalize(fields.actionA)===normalize(fields.actionB||''))issues.push({field:'actionB',criterion:'Различимость конфликтующих действий',observation:fields.actionB,question:'Оба действия записаны одинаково. Между какими действиями приходится выбирать?'});
 if(fields.goal?.trim()&&[fields.needA,fields.needB].some(v=>v&&normalize(v)===normalize(fields.goal)))issues.push({field:'goal',criterion:'Общая цель объединяет потребности',observation:fields.goal,question:'Цель повторяет одну потребность. Ради какого результата нужны обе потребности?'});
 for(const node of required){const field=nodeFields[node],value=fields[field]||'';
  if(/(?:потому\s+что|из-за|для\s+того\s+чтобы|\bчтобы\b)/iu.test(value)||/(?:^|\s)чтобы(?:\s|$)/iu.test(value))issues.push({field,criterion:'Внутри блока — одно утверждение',observation:value,question:'Как записать только действие, потребность или цель? Объяснение связи перенесите в исходные посылки.',sourceIds:['TOC.M.003']});
 }
 if(['бытьуспешным','бытьуспешными','развиваться','статьлучше'].includes(normalize(fields.goal||'')))issues.push({field:'goal',criterion:'Конкретная цель ситуации',observation:fields.goal,question:'Какой конкретный результат в этой ситуации важен и для B, и для C?',sourceIds:['TOC.FM.002']});
 return issues.map(issue=>({...issue,sourceIds:issue.sourceIds||['TOC.M.003',tocProfiles[profile].method]}));
}
export const methodNotes:Record<string,string>={
 cloud:'Схема изначально пустая. Впишите собственные формулировки прямо в облака, следуя порядку выбранного профиля. Потребность объясняет, что защищает действие; общая цель объединяет обе потребности.',
 logic:'Прочитайте каждую связь как утверждение необходимости. Согласие с предложением требует собственного основания. Неизвестное можно сохранить для уточнения.',
 assumptions:'Исходная посылка объясняет связь: «Чтобы обеспечить B, необходимо D, потому что…». Можно записать несколько посылок, каждую с новой строки.',
 'assumption-check':'Проверяйте границы применимости убеждения. Оно может оказаться полезным в одних условиях и ограничивающим в других.',
 decision:'Решение D* должно сохранять обе потребности. Объясните механизм: какое предположение изменяется и что это позволяет сделать.',
 trial:'Проба проверяет конкретную посылку или решение в ограниченном масштабе. Заранее выберите наблюдения за и против гипотезы.',
 result:'Отделяйте фактическое действие и наблюдение от объяснения. Заполненная форма и успешная учебная задача сами по себе не доказывают эффект в работе.',
 feedback:'Полезная обратная связь указывает конкретную запись, критерий и следующий шаг. Решение о правке остаётся за вами.',
 practice:'Выберите другой эпизод того же профиля и самостоятельно постройте новую тучу. После первой сохранённой версии можно запросить подсказки. Для другого профиля создайте отдельную ситуацию.'
};
