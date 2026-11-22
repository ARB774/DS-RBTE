import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { answerDilemmaAssistantHelp } from '../lib/dilemma-assistant-help';

const methodSource={
 id:'DS-RBTE.DILEMMA.ASSISTANT-SPEC',repo:'ARB774/DS-RBTE',commit:'a'.repeat(40),path:'WP-45/spec.md',sha256:'b'.repeat(64),range:'full',
 text:'Справочный диалог отвечает на вопрос и не изменяет состояние шага.',url:'https://example.test/spec',stages:['DILEMMA.logic'],
 origin:'verified-cache' as const,fetchedAt:'2026-11-22',excerptSha256:'b'.repeat(64),
};
const input={step:'logic',stepTitle:'4 · Проверка связей',question:'Напомни правила этого шага',history:[],situation:{signal:'Выбор способа работы',task:'',desiredChange:''},currentFields:{ab:'Да',abReason:'Потому что…'}};

test('separate assistant window answers from MCP evidence without checking or changing the step',async()=>{
 let body:any;
 const result=await answerDilemmaAssistantHelp(input,{key:'fake',model:'fake',dilemmaModel:'gpt-5.6'},(async(_url,init)=>{
  body=JSON.parse(String(init?.body));
  return new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({answer:'Объясните каждую связь конструкцией «для того чтобы — необходимо — потому что».',sourceIds:[methodSource.id]})}]}]}));
 }) as typeof fetch,async()=>[methodSource as any]);
 assert.match(body.instructions,/отдельном справочном окне/);
 assert.match(body.instructions,/не является формальной проверкой/);
 assert.doesNotMatch(body.instructions,/проверен успешно|измени поле/);
 assert.deepEqual(body.reasoning,{effort:'none'});
 const sent=JSON.parse(body.input);
 assert.equal(sent.question,input.question);
 assert.equal(sent.currentFields.abReason,'Потому что…');
 assert.equal(sent.methodEvidence[0].id,methodSource.id);
 assert.deepEqual(result.sourceIds,[methodSource.id]);
});

test('assistant window rejects a source that was not read through MCP',async()=>{
 await assert.rejects(()=>answerDilemmaAssistantHelp(input,{key:'fake',model:'fake'},(async()=>new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({answer:'Ответ',sourceIds:['INVENTED']})}]}]}))) as typeof fetch,async()=>[methodSource as any]));
});

test('assistant window is an independent interface channel',async()=>{
 const [panel,form,details,action,spec]=await Promise.all([
  readFile(new URL('../app/components/assistant-help-panel.tsx',import.meta.url),'utf8'),
  readFile(new URL('../app/components/workflow-form.tsx',import.meta.url),'utf8'),
  readFile(new URL('../app/components/details-form.tsx',import.meta.url),'utf8'),
  readFile(new URL('../app/actions/dilemma-help.ts',import.meta.url),'utf8'),
  readFile(new URL('../../WP-45/ТЗ помощника по построению личной дилеммы.md',import.meta.url),'utf8'),
 ]);
 assert.match(form,/personal&&<AssistantHelpPanel/);
 assert.match(details,/initial\.profile==='DILEMMA'&&<AssistantHelpPanel/);
 assert.match(panel,/Напомнить правила этого шага/);
 assert.match(panel,/Справочный диалог не проверяет шаг и не изменяет поля/);
 assert.doesNotMatch(panel,/reviewWorkflow|saveDraft/);
 assert.doesNotMatch(action,/stepDrafts|persistDraft|recordWorkflowRevision|reviewLimits/);
 assert.match(spec,/### 6\.8\. Справочный диалог с помощником/);
 assert.match(spec,/не запускает и не завершает проверку шага/);
 assert.match(spec,/### Сценарий 16\. Справочный вопрос не меняет рабочий шаг/);
});
