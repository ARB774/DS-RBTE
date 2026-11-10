import { test } from "node:test";
import assert from "node:assert/strict";
import {
  nextValuePropositionStage,
  resolveValuePropositionStage,
  validateValuePropositionS5Progress,
  valuePropositionFormulationRepairProtocol,
  valuePropositionRoute,
  valuePropositionS5ExpectedBlock,
  valuePropositionS2Guidance,
  valuePropositionStageFormulationGuidance,
  valuePropositionStageRequiresDiagram,
  valuePropositionStages,
} from "../lib/value-proposition-route";
import {
  parseValuePropositionDiagram,
  valuePropositionDiagramSchema,
} from "../lib/value-proposition-visualization";

test("маршрут предложения ценности включает отчёт S11 и не позволяет перепрыгивать этапы", () => {
  assert.equal(valuePropositionStages[0], "S0");
  assert.equal(valuePropositionStages.at(-1), "S11");
  assert.equal(nextValuePropositionStage("S6.1"), "S6.2");
  assert.equal(resolveValuePropositionStage("S7", "S8", true), "S8");
  assert.equal(resolveValuePropositionStage("S7", "S9", true), "S7");
  assert.equal(resolveValuePropositionStage("S7", "S8", false), "S7");
  assert.match(valuePropositionRoute.S8.acceptance, /ДБР/);
  assert.equal(valuePropositionStageRequiresDiagram("S3"), false);
  assert.equal(valuePropositionStageRequiresDiagram("S4"), true);
  assert.equal(valuePropositionStageRequiresDiagram("S10"), true);
  assert.equal(valuePropositionStageRequiresDiagram("S11"), false);
});

test("S2 отделяет продукт от поля и обучает формулировать проблему клиента", () => {
  assert.match(valuePropositionRoute.S2.label, /Продукт и поле/);
  assert.match(valuePropositionRoute.S2.acceptance, /компоненты отделены от клиентского поля/);
  assert.match(valuePropositionS2Guidance, /явно зафиксируй.*продукт/s);
  assert.match(valuePropositionS2Guidance, /Компоненты продукта, каналы и инструменты не становятся\s+отдельными полями/);
  assert.match(valuePropositionS2Guidance, /что нежелательного\s+происходит с организацией/);
  assert.match(valuePropositionS2Guidance, /окончательный выбор участнику/);
  assert.match(valuePropositionS2Guidance, /если критерий S2 выполнен, не\s+оставляй прежний разрыв/);
});

test("каждый этап имеет собственную помощь при ошибке формулировки", () => {
  assert.match(valuePropositionFormulationRepairProtocol, /одним главным дефектом/);
  assert.match(valuePropositionFormulationRepairProtocol, /две-три версии/);
  assert.match(valuePropositionFormulationRepairProtocol, /окончательное содержание и выбор остаются за ним/);
  assert.deepEqual(Object.keys(valuePropositionStageFormulationGuidance), [...valuePropositionStages]);

  const expected: Array<[keyof typeof valuePropositionStageFormulationGuidance, RegExp]> = [
    ["S0", /результат тренировки/],
    ["S1", /исходную модель в собственных словах/],
    ["S2", /продукт поставщика от поля разработки/],
    ["S3", /правила включения, исключения/],
    ["S4", /одно наблюдаемое текущее состояние/],
    ["S5", /B → D → C → D′ → A/],
    ["S6.1", /X \+ P → Y/],
    ["S6.2", /область применимости/],
    ["S6.3", /не самое сомнительное/],
    ["S7", /кто и что будет делать\s+иначе/],
    ["S8", /Отрицательное последствие является следствием/],
    ["S9", /Похвала, общее согласие/],
    ["S10", /контролируемое действие\s+поставщика/],
    ["S11", /не стенограмма/],
  ];
  for (const [stage, pattern] of expected) assert.match(valuePropositionStageFormulationGuidance[stage].replace(/\s+/g, ' '), pattern);
});

const s5Nodes = [
  { id: "B", label: "Необходимое условие B", type: "need", rank: 2, order: 1 },
  { id: "D", label: "Действие D", type: "action", rank: 1, order: 1 },
  { id: "C", label: "Необходимое условие C", type: "need", rank: 2, order: 2 },
  { id: "Dprime", label: "Действие D′", type: "action", rank: 1, order: 2 },
  { id: "A", label: "Общая цель A", type: "goal", rank: 3, order: 1 },
] as const;

function s5Cloud(accepted: string[], activeElementId: string | null) {
  return valuePropositionDiagramSchema.parse({
    version: 1,
    kind: "cloud",
    title: "Туча клиента",
    purpose: "Восстановить конфликт клиента.",
    activeElementId,
    nodes: s5Nodes.map((node) => ({
      ...node,
      status: accepted.includes(node.id) ? "accepted" : "unknown",
    })),
    edges: [],
  });
}

test("S5 определяет очередной блок только в порядке B → D → C → D′ → A", () => {
  assert.equal(valuePropositionS5ExpectedBlock(null), "B");
  assert.equal(valuePropositionS5ExpectedBlock(s5Cloud([], "B")), "B");
  assert.equal(valuePropositionS5ExpectedBlock(s5Cloud(["B"], "D")), "D");
  assert.equal(valuePropositionS5ExpectedBlock(s5Cloud(["B", "D"], "C")), "C");
  assert.equal(valuePropositionS5ExpectedBlock(s5Cloud(["B", "D", "C"], "Dprime")), "Dprime");
  assert.equal(valuePropositionS5ExpectedBlock(s5Cloud(["B", "D", "C", "Dprime"], "A")), "A");
  assert.equal(valuePropositionS5ExpectedBlock(s5Cloud(["B", "D", "C", "Dprime", "A"], null)), "verification");
});

test("S5 запрещает начинать с действий и принимать несколько блоков за ход", () => {
  const initial = s5Cloud([], "B");
  const validB = validateValuePropositionS5Progress({
    currentDiagram: initial,
    nextDiagram: s5Cloud(["B"], "D"),
    activeBlock: "D",
    question: "Что клиентская организация обычно делает, чтобы обеспечить B?",
    enteringS5: false,
  });
  assert.deepEqual(validB, []);

  const actionBeforeNeed = validateValuePropositionS5Progress({
    currentDiagram: initial,
    nextDiagram: s5Cloud(["D"], "B"),
    activeBlock: "B",
    question: "Какое необходимое условие ставит под угрозу выбранное НЖЯ?",
    enteringS5: false,
  });
  assert.ok(actionBeforeNeed.some((error) => /D принят раньше/.test(error)));

  const skippedBlock = validateValuePropositionS5Progress({
    currentDiagram: initial,
    nextDiagram: s5Cloud(["B", "D"], "C"),
    activeBlock: "C",
    question: "Какое другое необходимое условие организация должна обеспечить?",
    enteringS5: false,
  });
  assert.ok(skippedBlock.some((error) => /больше одного блока/.test(error)));

  const repairedLegacyOrder = validateValuePropositionS5Progress({
    currentDiagram: s5Cloud(["D"], "B"),
    nextDiagram: initial,
    activeBlock: "B",
    question: "Какое необходимое условие ставит под угрозу выбранное НЖЯ?",
    enteringS5: false,
  });
  assert.deepEqual(repairedLegacyOrder, []);
});

test("вход в S5 открывает B и не принимает его из ответа на S4", () => {
  assert.deepEqual(validateValuePropositionS5Progress({
    currentDiagram: null,
    nextDiagram: s5Cloud([], "B"),
    activeBlock: "B",
    question: "Какое необходимое условие для важного результата ставит под угрозу выбранное НЖЯ?",
    enteringS5: true,
  }), []);

  const prematureAcceptance = validateValuePropositionS5Progress({
    currentDiagram: null,
    nextDiagram: s5Cloud(["B"], "D"),
    activeBlock: "D",
    question: "Что клиентская организация обычно делает, чтобы обеспечить B?",
    enteringS5: true,
  });
  assert.ok(prematureAcceptance.some((error) => /ответа на предыдущий этап/.test(error)));
});

const negativeBranch = {
  version: 3,
  kind: "negative-branch",
  title: "Негативная ветвь",
  purpose: "Проверить путь от решения к предполагаемому нежелательному последствию.",
  activeElementId: "e2",
  nodes: [
    { id: "solution", label: "Выбранное решение", type: "solution", status: "accepted", rank: 0, order: 0 },
    { id: "condition", label: "Условие риска", type: "assumption", status: "checking", rank: 0, order: 1 },
    { id: "and1", label: "И", type: "and", status: "accepted", rank: 1, order: 1 },
    { id: "effect", label: "Промежуточное следствие", type: "prediction", status: "hypothesis", rank: 2, order: 1 },
    { id: "risk", label: "Предполагаемое нежелательное явление", type: "risk", status: "hypothesis", rank: 3, order: 1 },
  ],
  edges: [
    { id: "e1", from: "solution", to: "and1", kind: "cause", status: "accepted", label: "" },
    { id: "e2", from: "condition", to: "and1", kind: "cause", status: "checking", label: "совместно" },
    { id: "e3", from: "and1", to: "effect", kind: "cause", status: "hypothesis", label: "" },
    { id: "e4", from: "effect", to: "risk", kind: "cause", status: "hypothesis", label: "" },
  ],
} as const;

test("структурированная негативная ветвь сохраняет направление снизу вверх", () => {
  const parsed = valuePropositionDiagramSchema.parse(negativeBranch);
  for (const edge of parsed.edges) {
    const from = parsed.nodes.find((node) => node.id === edge.from)!;
    const to = parsed.nodes.find((node) => node.id === edge.to)!;
    assert.ok(to.rank >= from.rank);
  }
  assert.equal(parseValuePropositionDiagram(parsed)?.activeElementId, "e2");
});

test("схема отвергает стрелки и активные элементы, которых нет на рисунке", () => {
  assert.equal(parseValuePropositionDiagram({ ...negativeBranch, edges: [{ ...negativeBranch.edges[0], to: "missing" }] }), null);
  assert.equal(parseValuePropositionDiagram({ ...negativeBranch, activeElementId: "missing" }), null);
});
