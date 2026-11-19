export const dilemmaSteps = [
 ['details','Описание ситуации'],['actions','Действия'],['cloud','Туча'],['logic','Проверка связей'],
 ['assumptions','Предположения'],['assumption-check','Проверка предположений'],['decision','Решение'],
 ['trial','План проверки на практике'],['result','Результат'],['feedback','Обратная связь'],['practice','Самостоятельная практика']
] as const;
export function dilemmaTitle(step:string){const i=dilemmaSteps.findIndex(([key])=>key===step);return i<0?'Результат разбора':`${i+1} · ${dilemmaSteps[i][1]}`;}
