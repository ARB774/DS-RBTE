import { z } from "zod";

export const valuePropositionStages = [
  "S0",
  "S1",
  "S2",
  "S3",
  "S4",
  "S5",
  "S6.1",
  "S6.2",
  "S6.3",
  "S7",
  "S8",
  "S9",
  "S10",
  "S11",
] as const;

export const valuePropositionStageSchema = z.enum(valuePropositionStages);
export type ValuePropositionStage = z.infer<typeof valuePropositionStageSchema>;

export type ValuePropositionStageDefinition = {
  label: string;
  goal: string;
  workProduct: string;
  acceptance: string;
  diagram: string;
};

const stagesWithMandatoryDiagram = new Set<ValuePropositionStage>([
  "S4", "S5", "S6.1", "S6.2", "S6.3", "S7", "S8", "S9", "S10",
]);

export function valuePropositionStageRequiresDiagram(stage: ValuePropositionStage): boolean {
  return stagesWithMandatoryDiagram.has(stage);
}

export const valuePropositionRoute: Record<ValuePropositionStage, ValuePropositionStageDefinition> = {
  S0: {
    label: "Допустимый проект",
    goal: "Убедиться, что проект пригоден для тренировки и обеспечен доступом к данным.",
    workProduct: "Граница проекта",
    acceptance: "Согласованы результат, граница, доступ к данным, конфиденциальность и роль участника.",
    diagram: "Карта границы проекта",
  },
  S1: {
    label: "Исходная модель",
    goal: "Сделать исходное представление участника явным, чтобы затем увидеть изменение понимания.",
    workProduct: "Исходная модель участника",
    acceptance: "Участник сам описал компанию, ситуацию приобретения, предполагаемого клиента и проблему.",
    diagram: "Карта исходной модели",
  },
  S2: {
    label: "Поле разработки",
    goal: "Ограничить работу одним B2B-контуром и одной наблюдаемой проблемой организаций.",
    workProduct: "Ограниченное поле разработки",
    acceptance: "Выбран один B2B-контур и одна наблюдаемая проблема организаций.",
    diagram: "Карта поля разработки",
  },
  S3: {
    label: "Профиль клиента",
    goal: "Определить, какие организации действительно могут иметь общую проблему и где перенос выводов прекращается.",
    workProduct: "Проверяемый профиль потенциального клиента",
    acceptance: "Есть правила включения, исключения и недостатка сведений; факты, предположения и неизвестное разделены.",
    diagram: "Профиль потенциального клиента",
  },
  S4: {
    label: "Нежелательные явления",
    goal: "Выделить существенные наблюдаемые нежелательные результаты в системе клиента.",
    workProduct: "Согласованный набор НЖЯ",
    acceptance: "Собраны различающиеся наблюдения и приняты существенные НЖЯ без ранжирования по важности.",
    diagram: "Карта НЖЯ",
  },
  S5: {
    label: "Туча клиента",
    goal: "Восстановить конфликт клиента, который поддерживает нынешний способ приобретения, применения, отказа или замещения предложения.",
    workProduct: "Проверенная Туча",
    acceptance: "Сформулированы и проверены A, B, C, D и D′; действия принадлежат клиенту, несовместимость объяснена условиями.",
    diagram: "Туча",
  },
  "S6.1": {
    label: "Карта предположений",
    goal: "Сделать основания всех связей и конфликта явными и пригодными для проверки.",
    workProduct: "Полная карта предположений",
    acceptance: "Все прежние объяснения предъявлены; каждое принято, исправлено или исключено и привязано к точной связи.",
    diagram: "Корневая Туча с предположениями",
  },
  "S6.2": {
    label: "Проверка предположений",
    goal: "Проверить область, обоснованность и роль существенных предположений в сохранении конфликта.",
    workProduct: "Оспоренные предположения",
    acceptance: "Разделены обоснованность, область, свидетельства, исключения и роль в сохранении конфликта.",
    diagram: "Корневая Туча со статусами предположений",
  },
  "S6.3": {
    label: "Ограничивающие предположения",
    goal: "Выбрать предположения или условия, изменение которых позволит снять конфликт.",
    workProduct: "Набор ограничивающих предположений",
    acceptance: "Участник выбрал предположения для проверки в решении; неизвестное сохранено.",
    diagram: "Корневая Туча и выбранные ограничения",
  },
  S7: {
    label: "Кандидаты решения",
    goal: "Разработать содержательно разные способы снять ограничение и одновременно обеспечить B и C.",
    workProduct: "Кандидаты решения",
    acceptance: "Есть не менее двух разных изменений; выбранный кандидат показан отдельными ветвями к B и C с допущениями метода.",
    diagram: "Карта решения на основе Тучи",
  },
  S8: {
    label: "Проверка решения",
    goal: "Проверить положительный причинный механизм и негативные ветви, затем перевести решение в условия предложения.",
    workProduct: "Проверенная модель решения и проект предложения",
    acceptance: "Построены ДБР и негативные ветви; исправления возвращены в положительную модель; условия предложения конкретизированы.",
    diagram: "ДБР или активная негативная ветвь",
  },
  S9: {
    label: "Проверка на клиентах",
    goal: "Установить на представителях профиля, понятно ли предложение, создаёт ли оно ценность и что мешает следующему действию.",
    workProduct: "Данные проверки предложения",
    acceptance: "Собраны данные о понимании, ценности, препятствиях, действиях и риске; согласие не выдано за доказательство.",
    diagram: "Карта проверок и результатов",
  },
  S10: {
    label: "Граница обещания",
    goal: "Ограничить обещание тем, что поставщик способен устойчиво исполнить в проверенной области.",
    workProduct: "Граница действующего обещания",
    acceptance: "Подтверждены способности, владельцы, деньги, нагрузка, пробы, ранние сигналы и стоп-условия.",
    diagram: "Карта границы обещания",
  },
  S11: {
    label: "Итоговый отчёт",
    goal: "Собрать принятый результат и путь разработки без служебного диалога.",
    workProduct: "Отчёт о разработке предложения ценности",
    acceptance: "Отчёт содержит принятые продукты, основания, неизвестное, границы вывода и окончательную формулировку предложения.",
    diagram: "Карта пути разработки",
  },
};

export function nextValuePropositionStage(stage: ValuePropositionStage): ValuePropositionStage | null {
  const index = valuePropositionStages.indexOf(stage);
  return index >= 0 && index < valuePropositionStages.length - 1 ? valuePropositionStages[index + 1] : null;
}

export function resolveValuePropositionStage(
  current: ValuePropositionStage,
  proposed: ValuePropositionStage,
  readyForNextStage: boolean,
): ValuePropositionStage {
  if (proposed === current) return current;
  return readyForNextStage && proposed === nextValuePropositionStage(current) ? proposed : current;
}

export function stageOpening(stage: ValuePropositionStage): string {
  const item = valuePropositionRoute[stage];
  return `Сейчас работаем над «${item.workProduct}». Цель: ${item.goal} Результат шага: ${item.acceptance}`;
}
