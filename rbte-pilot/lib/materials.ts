import type { Profile } from './cloud-method';
const files:Record<Profile,{pdf:string;ppt:string;pages:string}>={
 DILEMMA:{pdf:'dilemma.pdf',ppt:'dilemma.pptx',pages:'Тетрадь: слайды 4–8'},
 CONFLICT:{pdf:'conflict.pdf',ppt:'conflict.pptx',pages:'Тетрадь: слайды 3–6. В сервисе B/D — другая сторона, C/D′ — вы.'},
 LT_CLOUD:{pdf:'fire.pdf',ppt:'fire.pptx',pages:'Тетрадь: слайды 3–7'},
 IMMUNITY:{pdf:'immunity.pdf',ppt:'immunity.pptx',pages:'Тетрадь: слайды 3–10'}
};
export function materialsFor(profile:Profile,step:string){const f=files[profile];return {...f,pdf:'/materials/'+f.pdf+(profile==='IMMUNITY'?'#page='+(({cloud:5,logic:7,assumptions:7,'assumption-check':12,trial:13,result:13} as Record<string,number>)[step]||1):'#page=1'),ppt:'/materials/'+f.ppt};}
