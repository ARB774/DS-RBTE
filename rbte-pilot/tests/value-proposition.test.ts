import { test } from "node:test";
import assert from "node:assert/strict";
import {
  nextValuePropositionStage,
  resolveValuePropositionStage,
  valuePropositionRoute,
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
