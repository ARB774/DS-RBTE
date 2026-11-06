export const profileLabels={DILEMMA:'Личная дилемма',CONFLICT:'Конфликт сторон',LT_CLOUD:'Тушение пожара',IMMUNITY:'Иммунитет к изменениям'} as const;
export type ProfileKey=keyof typeof profileLabels;
