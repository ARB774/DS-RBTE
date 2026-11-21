import { nodeFields,type CloudNode } from './cloud-method';
export const dilemmaCloudOrder:CloudNode[]=['D','Dp','C','B','A'];
export const dilemmaCloudQuestions:Record<CloudNode,string>=Object.fromEntries(
 dilemmaCloudOrder.map(node=>[node,`Введите свою формулировку элемента ${node==='Dp'?'D′':node}. После сохранения помощник проверит её по ТЗ.`])
) as Record<CloudNode,string>;
export function dilemmaCloudFlow(fields:Record<string,unknown>){
 const filled=(node:CloudNode)=>typeof fields[nodeFields[node]]==='string'&&Boolean((fields[nodeFields[node]] as string).trim());
 const missing=dilemmaCloudOrder.findIndex(n=>!filled(n));
 const firstMissing=missing<0?5:missing;
 const value=fields.__cloudProgress;
 const requested=typeof value==='string'&&/^[0-5]$/.test(value)?Number(value):firstMissing;
 const editing=fields.__cloudEditing;
 const validEditing=requested===5&&typeof editing==='string'&&dilemmaCloudOrder.includes(editing as CloudNode)&&dilemmaCloudOrder.every(n=>n===editing||filled(n));
 return {cursor:validEditing?5:Math.min(requested,firstMissing),editing:validEditing?editing as CloudNode:null};
}
export function confirmedCloud(fields:Record<string,unknown>){const flow=dilemmaCloudFlow(fields);return flow.cursor===5&&!flow.editing;}
