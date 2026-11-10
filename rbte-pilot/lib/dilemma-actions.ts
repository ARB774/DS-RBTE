import type { MethodIssue } from './cloud-method';
export type ActionRow={text:string;kind:''|'forced'|'preferred';selected:boolean};
export function actionRows(value:string):ActionRow[]{
 try{const rows:unknown=JSON.parse(value);if(Array.isArray(rows)&&rows.length<=20&&rows.every(r=>r&&typeof r.text==='string'&&r.text.length<=500&&['','forced','preferred'].includes(r.kind)&&typeof r.selected==='boolean'))return rows;}catch{}
 return [];
}
export function checkActions(value:string):MethodIssue[]{
 const rows=actionRows(value),filled=rows.filter(r=>r.text.trim()),errors:string[]=[];
 if(filled.length<2)errors.push('Запишите как минимум два возможных действия.');
 if(filled.some(r=>!r.kind))errors.push('Для каждого записанного действия укажите: вынужденное или предпочитаемое.');
 if(rows.some(r=>r.selected&&!r.text.trim()))errors.push('Заполните текст выбранного действия или снимите выбор.');
 for(const [kind,label] of [['forced','вынужденное'],['preferred','предпочитаемое']] as const)if(filled.filter(r=>r.kind===kind&&r.selected).length!==1)errors.push('Выделите одно наиболее '+label+' действие в соответствующем столбце.');
 const selected=filled.filter(r=>r.selected);
 if(selected.length===2&&selected[0].text.trim().toLocaleLowerCase('ru')===selected[1].text.trim().toLocaleLowerCase('ru'))errors.push('Выберите два разных конфликтующих действия.');
 return errors.map(question=>({field:'actionRows',criterion:'Выбор действий D и D′',observation:'Таблица требует уточнения',question,sourceIds:['TOC.M.006']}));
}
