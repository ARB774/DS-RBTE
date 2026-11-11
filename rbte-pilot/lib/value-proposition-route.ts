import { z } from "zod";
import type { ValuePropositionDiagram } from "@/lib/value-proposition-visualization";

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

export const valuePropositionS5Blocks = ["B", "D", "C", "Dprime", "A"] as const;
export const valuePropositionS5ActiveBlockSchema = z.enum([
  ...valuePropositionS5Blocks,
  "verification",
]);
export type ValuePropositionS5ActiveBlock = z.infer<typeof valuePropositionS5ActiveBlockSchema>;

export const valuePropositionS5NodeIds: Record<(typeof valuePropositionS5Blocks)[number], string> = {
  B: "B",
  D: "D",
  C: "C",
  Dprime: "Dprime",
  A: "A",
};

const valuePropositionS5NodeTypes = {
  B: "need",
  D: "action",
  C: "need",
  Dprime: "action",
  A: "goal",
} as const;

function valuePropositionS5Node(
  diagram: ValuePropositionDiagram | null,
  block: (typeof valuePropositionS5Blocks)[number],
) {
  return diagram?.kind === "cloud"
    ? diagram.nodes.find((node) => node.id === valuePropositionS5NodeIds[block])
    : undefined;
}

export function valuePropositionS5AcceptedPrefixLength(diagram: ValuePropositionDiagram | null): number {
  let accepted = 0;
  for (const block of valuePropositionS5Blocks) {
    if (valuePropositionS5Node(diagram, block)?.status !== "accepted") break;
    accepted += 1;
  }
  return accepted;
}

export function valuePropositionS5ExpectedBlock(
  diagram: ValuePropositionDiagram | null,
): ValuePropositionS5ActiveBlock {
  return valuePropositionS5Blocks[valuePropositionS5AcceptedPrefixLength(diagram)] ?? "verification";
}

function valuePropositionS5QuestionMatchesBlock(
  block: ValuePropositionS5ActiveBlock,
  question: string,
): boolean {
  if (block === "verification") return true;
  const normalized = question.toLocaleLowerCase("ru-RU");
  if (block === "B" || block === "C") {
    return /необходим[а-яё]*\s+услов/.test(normalized);
  }
  if (block === "D" || block === "Dprime") {
    return /(что|какое)[\s\S]{0,180}(дела|действ|поступ|выбира|приобрета|применя|отверга|замен)/.test(normalized);
  }
  return /общ[а-яё]*\s+цел|цель/.test(normalized);
}

function normalizeS5Meaning(text: string): string {
  return text.toLocaleLowerCase("ru-RU").replace(/ё/g, "е").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function valuePropositionS5NeedIssue(
  label: string,
  undesirableEffects: string[] = [],
): string | null {
  const normalized = normalizeS5Meaning(label);
  if (!normalized || normalized === "не сформулировано") return "необходимое условие не сформулировано";
  const repeated = undesirableEffects.find(effect => normalizeS5Meaning(effect) === normalized);
  if (repeated) return `формулировка повторяет выбранное НЖЯ «${repeated}», а должна описывать положительное необходимое условие, которому это НЖЯ угрожает`;
  if (/^(?:не|нет|мало|низк\p{L}*|отсутств\p{L}*|недостат\p{L}*|дефицит\p{L}*)\b/u.test(normalized)) {
    return "формулировка описывает нежелательное состояние, а должна описывать положительное необходимое условие";
  }
  return null;
}

export function validateValuePropositionS5Progress(input: {
  currentDiagram: ValuePropositionDiagram | null;
  nextDiagram: ValuePropositionDiagram | null;
  activeBlock: ValuePropositionS5ActiveBlock | null;
  question: string;
  enteringS5: boolean;
  undesirableEffects?: string[];
}): string[] {
  const errors: string[] = [];
  const next = input.nextDiagram;
  if (!next || next.kind !== "cloud") return ["на S5 отсутствует актуальная Туча"];

  for (const block of valuePropositionS5Blocks) {
    const node = valuePropositionS5Node(next, block);
    if (!node) {
      errors.push(`отсутствует канонический блок ${block}`);
      continue;
    }
    if (node.type !== valuePropositionS5NodeTypes[block]) {
      errors.push(`блок ${block} имеет неверный тип`);
    }
    if ((block === "B" || block === "C") && node.status === "accepted") {
      const issue = valuePropositionS5NeedIssue(node.label, input.undesirableEffects);
      if (issue) errors.push(`блок ${block}: ${issue}`);
    }
  }

  let unfinishedSeen = false;
  for (const block of valuePropositionS5Blocks) {
    const accepted = valuePropositionS5Node(next, block)?.status === "accepted";
    if (!accepted) unfinishedSeen = true;
    else if (unfinishedSeen && valuePropositionS5Node(input.currentDiagram, block)?.status !== 'accepted') errors.push(`блок ${block} принят раньше предыдущего блока`);
  }

  const currentPrefix = input.enteringS5
    ? 0
    : valuePropositionS5AcceptedPrefixLength(input.currentDiagram);
  const nextPrefix = valuePropositionS5AcceptedPrefixLength(next);
  if (input.enteringS5 && nextPrefix !== 0) {
    errors.push("при входе в S5 нельзя принимать B из ответа на предыдущий этап");
  } else {
    if (nextPrefix < currentPrefix) errors.push("снят ранее принятый блок Тучи");
    if (nextPrefix > currentPrefix + 1) errors.push("за один ход принято больше одного блока Тучи");
  }

  const expected = valuePropositionS5ExpectedBlock(next);
  if (input.activeBlock !== expected) {
    errors.push(`активным должен быть блок ${expected}`);
  }
  if (expected !== "verification" && next.activeElementId !== valuePropositionS5NodeIds[expected]) {
    errors.push(`на рисунке должен быть выделен блок ${expected}`);
  }
  if (!valuePropositionS5QuestionMatchesBlock(expected, input.question)) {
    errors.push(`следующий вопрос не соответствует блоку ${expected}`);
  }
  return errors;
}

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
    label: "Продукт и поле разработки",
    goal: "Зафиксировать предлагаемый рынку продукт без искусственного сужения и ограничить исследование одним B2B-контуром и одной наблюдаемой проблемой организаций.",
    workProduct: "Зафиксированный продукт и ограниченное поле разработки",
    acceptance: "Продукт и его компоненты отделены от клиентского поля; выбран один B2B-контур и одна наблюдаемая проблема организации, а предполагаемые причины сохранены отдельно.",
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
