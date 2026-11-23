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
 assert.ok(diagrams.some(svg=>svg.includes('A · Общая цель')&&svg.includes('D′ · Действие')&&svg.includes('конфликт')));
 assert.ok(diagrams.some(svg=>svg.includes('D* · Решение')&&svg.includes('B* · Новое условие')&&svg.includes('Почему D* приводит к B*')));
});

test('Word report filename is safe and has a UTF-8 download header',()=>{
 const fileName=wordReportFileName('Запуск / продукта: версия 1');
 assert.equal(fileName,'Запуск продукта версия 1 — итог ситуации.docx');
 const header=wordReportContentDisposition(fileName);
 assert.match(header,/filename="rbte-report\.docx"/u);
 assert.match(header,/filename\*=UTF-8''/u);
 assert.ok(header.includes(encodeURIComponent(fileName)));
});
