import { randomUUID } from "crypto";

export const UUID = () => randomUUID();

export const nowIso = () => new Date().toISOString();

export const profileLabels = {
  DILEMMA: "Личная дилемма",
  CONFLICT: "Конфликт сторон",
  LT_CLOUD: "Туча лейтенанта",
  IMMUNITY: "Иммунитет к изменениям",
} as const;

export type ProfileKey = keyof typeof profileLabels;

export const roleLabels = {
  PARTICIPANT: "Участник",
  FACILITATOR: "Ведущий курса",
  SUPPORTER: "Поддерживающее лицо",
  MENTOR: "Наставник",
  ADMIN: "Администратор пилота",
} as const;

export const stepRoute = {
  STEP_41: { n: "4.1", t: "Создание ситуации", url: "/situations/new" },
  STEP_42: { n: "4.2", t: "Исследование", url: "/situations/[id]/explore" },
  STEP_43: { n: "4.3", t: "Туча", url: "/situations/[id]/cloud" },
  STEP_44: { n: "4.4", t: "Решение", url: "/situations/[id]/decision" },
  STEP_45: { n: "4.5", t: "Рабочая проба", url: "/situations/[id]/trial" },
  STEP_46: { n: "4.6", t: "Возврат с результатом", url: "/situations/[id]/result" },
  STEP_47: { n: "4.7", t: "Предъявление и обратная связь", url: "/situations/[id]/feedback" },
} as const;

export type StepKind = keyof typeof stepRoute;

export const fourLevelLabels = {
  NOT_PRESENTED: "Не представлено",
  PARTIAL: "Представлено частично",
  SUFFICIENT: "Достаточно для рабочей пробы",
  CONVINCING: "Убедительно подтверждено",
} as const;

export type FourLevel = keyof typeof fourLevelLabels;
