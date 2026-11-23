export const dilemmaSteps = [
 ['details','Описание ситуации'],['actions','Действия'],['cloud','Туча'],['logic','Проверка связей'],
 ['assumptions','Предположения'],['assumption-check','Решения для предположений'],['decision','Выбор решения'],
 ['trial','Проверка решения'],['result','Результат'],['practice','Самостоятельная практика']
] as const;
export function dilemmaTitle(step:string){const i=dilemmaSteps.findIndex(([key])=>key===step);return i<0?'Результат разбора':`${i+1} · ${dilemmaSteps[i][1]}`;}
