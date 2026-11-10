import { test } from "node:test";
import assert from "node:assert/strict";
import {
  nextValuePropositionStage,
  resolveValuePropositionStage,
  valuePropositionFormulationRepairProtocol,
  valuePropositionRoute,
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
    ["S5", /D и D′ — реально выполняемые действия/],
    ["S6.1", /X \+ P → Y/],
    ["S6.2", /область применимости/],
    ["S6.3", /не самое сомнительное/],
    ["S7", /кто и что будет делать иначе/],
    ["S8", /Отрицательное последствие является следствием/],
    ["S9", /Похвала, общее согласие/],
    ["S10", /контролируемое действие поставщика/],
    ["S11", /не стенограмма/],
  ];
  for (const [stage, pattern] of expected) assert.match(valuePropositionStageFormulationGuidance[stage], pattern);
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
