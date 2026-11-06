import { dilemmaTitle } from './dilemma-route';
import { tocProfiles,tocSourceIds } from './pack-toc';
import type { Profile } from './cloud-method';
export type Field = { key: string; label: string; profiles?: string[]; required?: boolean; sourceIds?:string[]; hint?: string; options?: string[] };
export type StepDefinition = { title: string; fields: Field[]; note?: string };
const legacySteps: Record<string, StepDefinition> = {
 explore: { title: '4.2 · Исследование', fields: [
  {key:'observations',label:'Наблюдения и источники'}, {key:'explanations',label:'Объяснения и альтернативные объяснения'},
  {key:'unknown',label:'Что неизвестно и как проверить'}, {key:'goals',label:'Цели и потребности сторон'},
  {key:'actions',label:'Конфликтующие действия'}, {key:'beliefs',label:'Убеждения людей'},
  {key:'assumptions',label:'Предположения организации'}, {key:'method',label:'Допущения метода или проекта'},
  {key:'experience',label:'Прежний опыт'}, {key:'gap',label:'Разрыв между текущим и требуемым действием'},
  {key:'support',label:'Готовность и необходимая поддержка'}]},
 cloud: {title:'4.3 · Туча', fields:[
  {key:'goal',label:'Общая цель'},{key:'needA',label:'Потребность стороны А'},{key:'needB',label:'Потребность стороны Б'},
  {key:'actionA',label:'Действие А'},{key:'actionB',label:'Конфликтующее действие Б'},
  {key:'links',label:'Связи: потребность → действие; предположения и способы проверки'},
  {key:'weakest',label:'Какую связь проверить первой и почему'}]},
 decision: {title:'4.4 · Решение', fields:[
  {key:'optionA',label:'Вариант 1: действие и механизм изменений'},
  {key:'optionB',label:'Вариант 2: другой механизм изменений'},
  {key:'optionC',label:'Дополнительные варианты'},
  {key:'belief',label:'Какое убеждение или предположение преодолевается'},
  {key:'preserve',label:'Что необходимо сохранить'},{key:'risks',label:'Риски, неизвестное и меры защиты'},
  {key:'choice',label:'Выбор',options:['Не выбран','Вариант 1','Вариант 2','Дополнительный вариант','Отказ от выбора']},
  {key:'reason',label:'Обоснование выбора или отказа'}]},
 trial:{title:'4.5 · Рабочая проба',fields:[
  {key:'hypothesis',label:'Гипотеза: если действие X, то ожидаю Y, потому что Z'},
  {key:'action',label:'Действие: кто, что, где и когда'},
  {key:'authority',label:'Граница полномочий'},{key:'protection',label:'Допустимый риск и меры защиты'},
  {key:'supportIndicator',label:'Что поддержит гипотезу'},{key:'weakenIndicator',label:'Что ослабит гипотезу'},
  {key:'deadline',label:'Когда вернуться с результатом'},{key:'support',label:'Необходимые условия и поддержка'},
  {key:'transfer',label:'Чем рабочая проба отличается от учебного упражнения'},
  {key:'repeat',label:'Условия следующей или повторной пробы'},
  {key:'status',label:'Состояние',options:['Запланирована','Нужны полномочия','Есть препятствие','Выполнена']},
  {key:'obstacle',label:'Препятствие или причина невозможности'}]},
 result:{title:'4.6 · Результат',fields:[
  {key:'planned',label:'Запланированное действие'},{key:'actual',label:'Фактическое действие'},
  {key:'observed',label:'Наблюдения, факты и источники'},{key:'interpretation',label:'Интерпретация и альтернативы'},
  {key:'completion',label:'Прохождение: что выполнено'},
  {key:'method',label:'Способ: что изменилось в действиях'},
  {key:'transfer',label:'Перенос: применение в рабочей ситуации'},
  {key:'effect',label:'Эффект: изменения в работе и основания вывода'},
  {key:'next',label:'Следующий шаг',options:['Наблюдать','Изменить пробу','Вернуться к исследованию','Завершить']},
  {key:'reason',label:'Почему выбран этот следующий шаг'}]},
 feedback:{title:'4.7 · Подготовка обратной связи',
 note:'Это ваш закрытый план обратной связи. Сохранение не отправляет его другим людям. Совместный доступ в этой версии ещё не включён.',
 fields:[{key:'recipient',label:'Кому хотите предъявить результат'}, {key:'disclose',label:'Что готовы раскрыть'},
 {key:'exclude',label:'Что необходимо исключить'}, {key:'request',label:'Какую обратную связь хотите получить'},
 {key:'received',label:'Полученная обратная связь и её источник'}, {key:'next',label:'Что решено сделать дальше'}]},
};

const text=(key:string,label:string,profiles?:string[]):Field=>({key,label,profiles,required:true});
const choice=(key:string,label:string,options:string[],profiles?:string[]):Field=>({key,label,options,profiles,required:true});
const regular=['DILEMMA','CONFLICT','LT_CLOUD'];
const verdict=['Не проверено','Да','Нужно уточнить','Не знаю'];
export const assumptionLabels:Record<string,string>={ab:'A–B: почему для A необходимо B?',ac:'A–C: почему для A необходимо C?',bd:'B–D: почему без D нельзя обеспечить B?',cd:'C–D′: почему для C вы предпринимаете D′?',conflict:'D–D′: почему эти действия несовместимы?'};
export const steps:Record<string,StepDefinition>={
 actions:{title:'Действия',fields:[text('actionRows','Возможные действия',['DILEMMA'])]},
 cloud:{title:'2 · Построение грозовой тучи',fields:[text('actionA','D · Действие'),text('actionB','D′ · Действие'),text('needA','B · Потребность'),text('needB','C · Потребность'),text('goal','A · Общая цель'),text('positionEvidence','Откуда известна позиция другой стороны? Что подтверждено, а что предполагается?',['CONFLICT']),text('recurrence','Как часто повторяется пожар? Какие эпизоды это подтверждают?',['LT_CLOUD'])]},
 logic:{title:'3 · Проверка логики',fields:profileLinksAll()},
 assumptions:{title:'4 · Выявление исходных посылок',fields:['ab','ac','bd','cd','conflict'].flatMap(key=>[text(key,assumptionLabels[key],undefined),text(key+'Source','На чём основаны посылки: наблюдения, правила, предположения?',undefined)])},
 'assumption-check':{title:'5 · Проверка исходных посылок',fields:[text('selected','Какую посылку и связь проверяете?'),text('support','Какие факты поддерживают посылку?'),text('counter','Какие есть исключения или противоречащие наблюдения?'),text('conditions','В каких условиях посылка верна, а в каких требует пересмотра?'),text('unknown','Что неизвестно и как это проверить?'),choice('state','Состояние посылки',['Не проверено','Есть основания','Есть основания сомневаться','Недостаточно данных']),text('behavior','Что вы замечаете в текущем поведении?',['IMMUNITY']),text('history','Когда возникло убеждение и применимо ли оно сейчас?',['IMMUNITY'])]},
 decision:{...legacySteps.decision,title:'6 · Поиск и обоснование решения',fields:[...legacySteps.decision.fields.map(f=>({...f,required:!['optionB','optionC'].includes(f.key)})),text('link','Какую связь и исходную посылку меняет решение?'),text('ensureB','D* обеспечит B, потому что…'),text('ensureC','D* обеспечит C, потому что…'),text('ensureA','Как сохранение B и C помогает достичь A?')]},
 trial:{...legacySteps.trial,title:'7 · План рабочей пробы',fields:[text('selectedAssumption','Какую посылку или решение проверяет проба?'),...legacySteps.trial.fields.map(f=>({...f,required:f.key!=='obstacle'})),text('partner','С кем обсудите достаточность и допустимость испытания?',['IMMUNITY'])]},
 result:{...legacySteps.result,title:'8 · Результат и пересмотр',fields:[...legacySteps.result.fields.map(f=>({...f,required:true,options:f.key==='next'?['Наблюдать','Повторить пробу','Изменить решение','Пересмотреть посылку','Вернуться к туче','Завершить']:f.options})),text('needB','Что произошло с потребностью B?'),text('needC','Что произошло с потребностью C?'),text('goal','Как изменилось достижение A?'),text('assumption','Что выяснилось о выбранной посылке?')]},
 feedback:{...legacySteps.feedback,title:'9 · Обратная связь',fields:[...legacySteps.feedback.fields,text('target','К какому облаку, связи, посылке или результату относится замечание?'),text('evidence','Какое наблюдение послужило основанием?'),text('criterion','Какой критерий применён и в чём затруднение?'),text('question','Какой вопрос или следующее действие предлагается?'),choice('response','Ваше решение',['Не выбрано','Принять','Изменить','Обоснованно отклонить']),text('reason','Почему выбрано это решение?')]},
 practice:{title:'10 · Самостоятельное построение новой тучи',fields:[text('episode','Другой эпизод: кто, что, когда, где?'),text('actionA','D · Действие'),text('actionB','D′ · Действие'),text('needA','B · Потребность'),text('needB','C · Потребность'),text('goal','A · Общая цель'),text('logic','Объясните необходимость связей и конфликт (для иммунитета — угрозу B со стороны D′)'),text('assumption','Выявите исходную посылку и предложите её проверку'),choice('assistance','Какую помощь использовали?',['Без содержательных подсказок','Подсказки сервиса','Партнёр или преподаватель','ИИ','Несколько видов помощи']),text('reflection','Что удалось объяснить самостоятельно, а что пока вызывает затруднения?')]}
};
function profileLinksAll():Field[]{
 const labels:Record<string,string>={ab:'Чтобы достичь A, необходимо B',bd:'Чтобы обеспечить B, необходимо D',ac:'Чтобы достичь A, необходимо C',cd:'Чтобы обеспечить C, необходимо D′',conflict:'D и D′ несовместимы в этих условиях',dc:'D ставит под угрозу C',db:'D′ ставит под угрозу B'};
 return Object.entries(labels).flatMap(([key,label])=>{const profiles=undefined;return [choice(key,label,verdict,profiles),text(key+'Reason','Обоснование: '+label,profiles)];});
}

const cloudCheck=(key:string,label:string,profiles?:string[])=>choice(key,label,['Не проверено','Да','Нужно уточнить'],profiles);
steps.cloud.fields.push(
 {...text('alternatives','Какие действия рассматривали? Отметьте вынужденные и предпочитаемые.',['DILEMMA']),required:false},
 choice('otherPositionStatus','Статус позиции другой стороны',['Не проверено','Подтверждено другой стороной','Гипотеза автора — требуется уточнение'],['CONFLICT']),
 choice('stabilization','Текущий эпизод',['Не проверено','Стабилизирован — разбираю механизм повторения','Требуется срочное реагирование'],['LT_CLOUD']),
 text('rule','Какое действующее правило или ограничение предписывает D′?',['LT_CLOUD']),
 text('knowledgeGap','Были ли знания и освоенный способ действия? Что именно известно?',['LT_CLOUD']),
 text('authorityGap','Хватало ли полномочий и ресурсов для необходимого действия?',['LT_CLOUD']),
 text('confidenceGap','Хватало ли уверенности? На чём основан этот вывод?',['LT_CLOUD']),
 cloudCheck('goalOwnership','Вы сами считаете B значимой целью и добровольно исследуете своё действие?',['IMMUNITY']),
 text('contextBarriers','Какие знания, умение, ресурсы, полномочия и организационные препятствия проверены до вывода об иммунитете?',['IMMUNITY']),
 cloudCheck('protectiveCommitmentConfirmed','Вы сами подтверждаете, что C описывает защищаемую приверженность, а не только страх?',['IMMUNITY']),
 cloudCheck('actionsCheck','D и D′ описывают конкретные действия в одном эпизоде, а фактическое действие отличается от требуемого или предпочитаемого?'),
 cloudCheck('needsCheck','B и C объясняют, что важного сохраняет каждое действие?'),
 cloudCheck('goalCheck','A — конкретная цель этой ситуации, для которой необходимы и B, и C?')
);
steps.cloud.fields=steps.cloud.fields.map(f=>f.key==='recurrence'?{...f,required:false}:f);
steps.decision.fields.push(text('systemChange','Какое правило, полномочие, сигнал или способность изменится для следующего случая?',['LT_CLOUD']),text('changeOwner','Кто отвечает за изменение и в каких границах оно действует?',['LT_CLOUD']),text('negativeBranch','Какие негативные последствия для C возможны и какие защитные условия нужны?',['LT_CLOUD']),text('partyContributions','Что делает каждая сторона и кто несёт затраты или риски решения?',['CONFLICT']));
steps.trial.fields.push(text('prediction','Какой конкретный прогноз из убеждения проверяется и какие наблюдения различат объяснения?',['IMMUNITY']),text('nextCaseCriteria','По каким признакам распознают следующий подобный случай и проверят защиту B и C?',['LT_CLOUD']));
steps.result.fields.push(text('recovery','Как будете распознавать возврат старого действия и восстанавливать новый способ?',['IMMUNITY']));
export const stepOrder=Object.keys(steps);
export function definitionFor(step:string,profile:string):StepDefinition|undefined{
 if(step==='actions'&&profile!=='DILEMMA')return undefined;
 const d=steps[step];if(!d||!Object.hasOwn(tocProfiles,profile))return undefined;
 const p=profile as Profile;
 return {...d,title:profile==='DILEMMA'?dilemmaTitle(step):d.title,fields:d.fields.filter(f=>(!f.profiles||f.profiles.includes(profile))&&!(step==='cloud'&&profile==='DILEMMA'&&!['actionA','actionB','needA','needB','goal'].includes(f.key))).map(f=>{
  const node=({goal:'A',needA:'B',needB:'C',actionA:'D',actionB:'Dp'} as const)[f.key as 'goal'];
  const optionalAssumption=step==='assumptions'&&((profile==='IMMUNITY'&&!f.key.startsWith('cd'))||(['DILEMMA','CONFLICT'].includes(profile)&&['ab','ac','abSource','acSource'].includes(f.key)));
  return {...f,label:node&&['cloud','practice'].includes(step)?tocProfiles[p].labels[node]:f.label,required:optionalAssumption?false:f.required,sourceIds:tocSourceIds(p,step)};
 })};
}
export const legacyExplore=legacySteps.explore;
export function parseStepFields(step: string, input: Record<string, unknown>, profile?:string): Record<string,string> {
 const definition = step==='explore'?legacyExplore:Object.hasOwn(steps, step) ? (profile?definitionFor(step,profile):steps[step]) : undefined;
 if (!definition) throw new Error('Неизвестный шаг');
 const result: Record<string,string> = {};
 for (const field of definition.fields) {
  const value=input[field.key] ?? field.options?.[0] ?? '';
  if (typeof value !== 'string' || value.length>4000 || (field.options && !field.options.includes(value)))
   throw new Error('Проверьте поля: не более 4000 символов в каждом');
  result[field.key]=value;
 }
 if (JSON.stringify(result).length>60000) throw new Error('Слишком большой объём данных');
 return result;
}
