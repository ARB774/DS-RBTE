import { nodeFields,type CloudNode } from './cloud-method';
export const dilemmaCloudOrder:CloudNode[]=['D','Dp','C','B','A'];
export const dilemmaCloudQuestions:Record<CloudNode,string>={
 D:'Какое действие вы чувствуете себя вынужденным совершить в этой ситуации?',
 Dp:'Какое действие вы предпочли бы совершить вместо этого?',
 C:'Что важного вы хотите обеспечить или сохранить, выбирая предпочитаемое действие?',
 B:'Что важного вы пытаетесь обеспечить или сохранить вынужденным действием?',
 A:'Ради какой общей цели вам необходимо сохранить обе потребности — B и C?'
};
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
