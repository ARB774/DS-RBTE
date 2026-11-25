import test from 'node:test';
import assert from 'node:assert/strict';
import { strFromU8,unzipSync } from 'fflate';
import { buildWordReport,wordReportContentDisposition,wordReportFileName } from '../lib/word-report';

test('Word report contains accepted situation content and hides service fields',async()=>{
 const buffer=await buildWordReport({title:'Запуск / нового продукта',profile:'DILEMMA',signal:'Команда выбирает способ разработки',task:'Выпустить продукт вовремя'},[
 {step:'actions',fields:{actionRows:JSON.stringify([{text:'Работать без ИИ',kind:'forced',selected:true},{text:'Использовать ИИ',kind:'preferred',selected:true}])}},
  {step:'cloud',fields:{goal:'Выпустить продукт вовремя',needA:'Сохранить безопасность разработки',needB:'Ускорить разработку',actionA:'Разрабатывать без ИИ',actionB:'Использовать ИИ'}},
  {step:'assumptions',fields:{ab:'Безопасность разработки обязательна'}},
  {step:'assumption-check',fields:{injections:JSON.stringify({ab:'Защитить бизнес скоростью выхода'}),routeVersion:'internal'}},
  {step:'decision',fields:{selected:'["ab"]',finalInjection:'Использовать ИИ в защищённом контуре',reason:'Сохраняет скорость и контроль',conditionB:'Сохранить безопасность бизнеса',ensureB:'Защищённый контур не передаёт код наружу',ensureC:'ИИ ускоряет подготовку и тестирование'}},
  {step:'result',fields:{outcome:'Сотрудники согласились с решением',next:'Продолжать применять D*',__check:'internal'}},
 ]);
 assert.equal(buffer.subarray(0,2).toString(),'PK');
 const files=unzipSync(new Uint8Array(buffer));
 const documentXml=strFromU8(files['word/document.xml']);
 assert.match(documentXml,/Итог ситуации/u);
 assert.match(documentXml,/Команда выбирает способ разработки/u);
 assert.match(documentXml,/Защитить бизнес скоростью выхода/u);
 assert.match(documentXml,/Сотрудники согласились с решением/u);
 assert.doesNotMatch(documentXml,/routeVersion|__check|internal/u);
 assert.doesNotMatch(documentXml,/w:pageBreakBefore/u);
 const diagrams=Object.entries(files).filter(([path])=>path.startsWith('word/media/')&&path.endsWith('.svg')).map(([,data])=>strFromU8(data));
 assert.equal(diagrams.length,2);
 assert.ok(diagrams.some(svg=>svg.includes('A · Общая цель')&&svg.includes('D′ · Предпочитаемое')&&svg.includes('конфликт')));
 assert.ok(diagrams.some(svg=>svg.includes('D* · Решение')&&svg.includes('B* · Новое условие')&&svg.includes('Почему D* приводит к B*')));
});

test('all cloud profiles embed their own labels and a usable image for saved drafts',async()=>{
 const labels={
  DILEMMA:'Вынужденное действие',
  CONFLICT:'Общая цель сторон',
  LT_CLOUD:'Условие под угрозой',
  IMMUNITY:'Значимая цель изменения',
 };
 for(const [profile,label] of Object.entries(labels)){
  const buffer=await buildWordReport({title:'Проверка Тучи',profile},[
   {step:'cloud',fields:{goal:'Сохранить сроки & точность',actionA:'Проверить записи'}},
  ]);
  const files=unzipSync(new Uint8Array(buffer));
  const images=Object.entries(files).filter(([path])=>path.startsWith('word/media/'));
  const svg=images.find(([path])=>path.endsWith('.svg'));
  const png=images.find(([path])=>path.endsWith('.png'));
  assert.ok(svg&&png,profile);
  const diagram=strFromU8(svg[1]).replace(/<\/tspan><tspan [^>]+>/gu,' ');
  assert.ok(diagram.includes(label),profile);
  assert.ok(diagram.includes('Сохранить сроки &amp; точность'));
  assert.ok(diagram.includes('Не заполнено'));
  const bytes=Buffer.from(png[1]);
  assert.equal(bytes.readUInt32BE(16),1000);
  assert.equal(bytes.readUInt32BE(20),520);
  assert.match(strFromU8(files['word/document.xml']),/Схема Тучи/u);
 }
});

test('Word report filename is safe and has a UTF-8 download header',()=>{
 const fileName=wordReportFileName('Запуск / продукта: версия 1');
 assert.equal(fileName,'Запуск продукта версия 1 — итог ситуации.docx');
 const header=wordReportContentDisposition(fileName);
 assert.match(header,/filename="rbte-report\.docx"/u);
 assert.match(header,/filename\*=UTF-8''/u);
 assert.ok(header.includes(encodeURIComponent(fileName)));
});

test('Word report numbers all active conflict steps in route order', async () => {
 const drafts: Parameters<typeof buildWordReport>[1] = [
  { step: 'trial', fields: { selectedAssumption: 'Проверить решение' } },
  { step: 'negative-branch', fields: { condition: 'Различаются версии чертежа' } },
  { step: 'decision', fields: { optionA: 'Сравнить версии чертежа' } },
  { step: 'assumption-check', fields: { support: 'Совпадение версий чертежа' } },
  { step: 'assumptions', fields: { bd: 'Чертёж подтверждён' } },
  { step: 'logic', fields: { bdReason: 'Версия указана в заказе' } },
  { step: 'cloud', fields: { goal: 'Согласовать решение по заказу' } },
  { step: 'result', fields: { observed: 'Архивная запись сохранена' } },
 ];
 const report = await buildWordReport({ title: 'Переделка деталей', profile: 'CONFLICT' }, drafts);
 const xml = strFromU8(unzipSync(report)['word/document.xml']);
 const headings = [...xml.matchAll(/<w:t[^>]*>([1-8] · [^<]+)<\/w:t>/gu)].map(match => match[1]);
 assert.deepEqual(headings, [
  '1 · Описание ситуации',
  '2 · Построение грозовой тучи',
  '3 · Проверка логики',
  '4 · Выявление исходных посылок',
  '5 · Проверка исходных посылок',
  '6 · Поиск и обоснование решения',
  '7 · Негативная ветвь решения',
  '8 · План проверки решения на практике',
 ]);
 assert.match(xml, /Архив результата и пересмотра/u);
 assert.match(xml, /Архивная запись сохранена/u);
});