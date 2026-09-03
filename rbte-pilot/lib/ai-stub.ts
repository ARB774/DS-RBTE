import type { ProfileKey } from "./rbte";

export type AiMessage = {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  created_at: string;
  accepted?: "NONE" | "ACCEPTED" | "MODIFIED" | "REJECTED";
};

type StubQuestion = { q: string; kind: "clarify" | "observe" | "alternatives" | "evidence" | "safe" };

const byStep = {
  STEP_41: () => [
    { q: "Какую конкретную рабочую задачу ты решаешь в этой ситуации?", kind: "clarify" } as StubQuestion,
    { q: "Какой твой прежний опыт здесь — ресурс, а какой — фильтр, который мешает увидеть альтернативу?", kind: "observe" } as StubQuestion,
    { q: "Какая граница полномочий/риска — то, что ты точно не будешь делать без отдельного решения?", kind: "safe" } as StubQuestion,
  ],
  STEP_42: () => [
    { q: "Что здесь — наблюдение с источником, а что — твоё объяснение или конкурирующее объяснение?", kind: "observe" } as StubQuestion,
    { q: "Какое утверждение у тебя сейчас есть, и что бы ты мог бы сделать, чтобы его проверить?", kind: "evidence" } as StubQuestion,
    { q: "Если бы здесь есть люди (убеждения), компания (предположения) и метод/проект (допущения) — что к чему относится?", kind: "clarify" } as StubQuestion,
  ],
  STEP_43: () => [
    { q: "Какие две потребности стоят за каждой стороной конфликтующих действий?", kind: "clarify" } as StubQuestion,
    { q: "Для каждой связи (потребность → действие) напиши одно предположение и один вопрос проверки.", kind: "evidence" } as StubQuestion,
    { q: "Какая самая слабая связь в туче — та, которую первостепенно проверить?", kind: "alternatives" } as StubQuestion,
  ],
  STEP_44: () => [
    { q: "Приведи хотя бы один второй вариант решения, противоречащий первому по механизму.", kind: "alternatives" } as StubQuestion,
    { q: "Какое убеждение или предположение компании преодолевает каждый вариант?", kind: "clarify" } as StubQuestion,
    { q: "Для каждого варианта: каковы риски / неизвестные и что их уменьшит?", kind: "evidence" } as StubQuestion,
  ],
  STEP_45: () => [
    { q: "Какие признак поддержит гипотезу, а признак ослабит — сформулируй наблюдаемо и до пробы.", kind: "evidence" } as StubQuestion,
    { q: "Где граница полномочий: что ты точно не будешь делать в пробе без отдельного решения?", kind: "safe" } as StubQuestion,
    { q: "Чем следующая проба будет отличаться от учебного шага (чтобы засчитать перенос в работу?)", kind: "clarify" } as StubQuestion,
  ],
  STEP_46: () => [
    { q: "Раздели явно: запланированное действие, фактическое действие, наблюдение, твоя интерпретация.", kind: "observe" } as StubQuestion,
    { q: "По каждому из 4-х уровней (прохождение / способ / перенос / эффект) — что есть данные, а чего пока нет.", kind: "evidence" } as StubQuestion,
    { q: "Нужна ли повторная/следующая проба — в какое время или контекст?", kind: "alternatives" } as StubQuestion,
  ],
  STEP_47: () => [
    { q: "Какая редакцию и какие элементы ты точно не будешь раскрывать — почему?", kind: "safe" } as StubQuestion,
    { q: "Какой критерий качества (из шкалы RBTE) сейчас на первом месте для ведущего?", kind: "clarify" } as StubQuestion,
    { q: "Что конкретно ты хочешь получить от обратной связи следующим действием?", kind: "clarify" } as StubQuestion,
  ],
} as const;

export function maskRussianNamesFree(text: string): string {
  return text
    .replace(/[А-ЯЁ][а-яё]+ [А-ЯЁ]\.? ?[А-ЯЁ]\.?/g, "[имя участника]")
    .replace(/(ООО|ИП|ЗАО|ПАО|АО) "[^"]+"/g, "[название организации]");
}

export async function generateStubQuestions(step: keyof typeof byStep, _profile: ProfileKey, _draft: string | null): Promise<{ questions: string[]; disclaimer: string }> {
  const base = byStep[step]();
  const qs = base.map((b, i) => `${i + 1}. ${b.q}`);
  const disclaimer =
    "ИИ-провайдер = stub. Вопросы шаблонные и не заменяют твое собственного решения. Любую формулировку принимай, изменяй или отвергай явно.";
  return { questions: qs, disclaimer };
}

export type { StubQuestion };
