'use server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/session';
import { ownedWorkflow } from '@/lib/workflow-store';
import { definitionFor } from '@/lib/steps';
import { dilemmaTitle } from '@/lib/dilemma-route';
import { reviewConfig } from '@/lib/review-openai';
import { answerDilemmaAssistantHelp } from '@/lib/dilemma-assistant-help';

const message=z.object({role:z.enum(['user','assistant']),content:z.string().trim().min(1).max(5000)}).strict();
const issue=z.object({criterion:z.string().max(600),observation:z.string().max(600),question:z.string().max(600)}).strict();
const request=z.object({
 id:z.string().uuid(),step:z.string().min(1).max(80),question:z.string().trim().min(1).max(2000),
 history:z.array(message).max(8),currentFields:z.record(z.string(),z.string().max(8000)).refine(value=>Object.keys(value).length<=40),
 currentIssue:issue.optional(),
}).strict();

export async function askDilemmaAssistantHelp(input:unknown):Promise<{answer?:string;sourceIds?:string[];error?:string}>{
 const parsed=request.safeParse(input);if(!parsed.success)return {error:'Введите вопрос помощнику.'};
 const me=await requireUser();
 try{
  const {situation}=await ownedWorkflow(db,me.id,parsed.data.id);
  if(situation.profile!=='DILEMMA'||(parsed.data.step!=='details'&&!definitionFor(parsed.data.step,'DILEMMA')))throw new Error('Assistant help unavailable');
  const fields=Object.fromEntries(Object.entries(parsed.data.currentFields).filter(([key])=>!key.startsWith('__')));
  const answer=await answerDilemmaAssistantHelp({
   step:parsed.data.step,stepTitle:dilemmaTitle(parsed.data.step),question:parsed.data.question,history:parsed.data.history,
   situation:{signal:situation.signal||'',task:situation.task||'',desiredChange:situation.desiredChange||''},
   currentFields:fields,currentIssue:parsed.data.currentIssue,
  },reviewConfig());
  return answer;
 }catch(error){
  console.error('dilemma-assistant-help-failed',error instanceof Error?error.message:'Unknown error');
  return {error:'Помощник сейчас не смог ответить. Ваши записи и состояние шага не изменены; повторите позже.'};
 }
}
