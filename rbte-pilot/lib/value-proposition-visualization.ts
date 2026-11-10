import { z } from "zod";

export const valuePropositionDiagramKindSchema = z.enum([
  "project-boundary",
  "initial-model",
  "client-profile",
  "undesirable-effects",
  "cloud",
  "current-reality-tree",
  "assumption-map",
  "solution-map",
  "future-reality-tree",
  "negative-branch",
  "validation-map",
  "promise-boundary",
  "development-report",
]);

export const valuePropositionNodeTypeSchema = z.enum([
  "goal",
  "need",
  "action",
  "statement",
  "ude",
  "assumption",
  "solution",
  "injection",
  "prediction",
  "risk",
  "evidence",
  "boundary",
  "and",
  "unknown",
]);

export const valuePropositionStatusSchema = z.enum([
  "accepted",
  "candidate",
  "checking",
  "hypothesis",
  "unknown",
  "rejected",
]);

export const valuePropositionEdgeKindSchema = z.enum([
  "cause",
  "necessity",
  "support",
  "conflict",
  "gap",
]);

export const valuePropositionDiagramSchema = z.object({
  version: z.number().int().min(1).max(10000),
  kind: valuePropositionDiagramKindSchema,
  title: z.string().min(1).max(180),
  purpose: z.string().min(1).max(500),
  activeElementId: z.string().max(40).nullable(),
  nodes: z.array(z.object({
    id: z.string().regex(/^[A-Za-zА-Яа-я0-9_.-]{1,40}$/),
    label: z.string().min(1).max(500),
    type: valuePropositionNodeTypeSchema,
    status: valuePropositionStatusSchema,
    rank: z.number().int().min(0).max(12),
    order: z.number().int().min(0).max(12),
  }).strict()).max(40),
  edges: z.array(z.object({
    id: z.string().regex(/^[A-Za-zА-Яа-я0-9_.-]{1,40}$/),
    from: z.string().min(1).max(40),
    to: z.string().min(1).max(40),
    kind: valuePropositionEdgeKindSchema,
    status: valuePropositionStatusSchema,
    label: z.string().max(160),
  }).strict()).max(80),
}).strict().superRefine((diagram, context) => {
  const nodeIds = new Set<string>();
  for (const node of diagram.nodes) {
    if (nodeIds.has(node.id)) context.addIssue({ code: "custom", message: `Повтор узла ${node.id}` });
    nodeIds.add(node.id);
  }
  const edgeIds = new Set<string>();
  for (const edge of diagram.edges) {
    if (edgeIds.has(edge.id)) context.addIssue({ code: "custom", message: `Повтор стрелки ${edge.id}` });
    edgeIds.add(edge.id);
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
      context.addIssue({ code: "custom", message: `Стрелка ${edge.id} ссылается на отсутствующий узел` });
    }
  }
  if (diagram.activeElementId && !nodeIds.has(diagram.activeElementId) && !edgeIds.has(diagram.activeElementId)) {
    context.addIssue({ code: "custom", message: "Активный элемент отсутствует в схеме" });
  }
});

export type ValuePropositionDiagram = z.infer<typeof valuePropositionDiagramSchema>;

// A learner's first formulation is evidence of an attempt, not an accepted UDE.
export function initialUndesirableEffectDraft(answer: string, previous: ValuePropositionDiagram | null): ValuePropositionDiagram | null {
  const label = answer.trim();
  if (previous?.kind === 'undesirable-effects' || !label || label.length > 500 || label.includes('?')) return null;
  return { version:1,kind:'undesirable-effects',title:'Кандидат НЖЯ',purpose:'Уточнить самостоятельную формулировку участника до принятия',activeElementId:'ude-candidate-1',
    nodes:[{id:'ude-candidate-1',label,type:'ude',status:'candidate',rank:0,order:0}],edges:[] };
}

export function parseValuePropositionDiagram(value: unknown): ValuePropositionDiagram | null {
  const parsed = valuePropositionDiagramSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export const valuePropositionDiagramJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["version", "kind", "title", "purpose", "activeElementId", "nodes", "edges"],
  properties: {
    version: { type: "integer", minimum: 1, maximum: 10000 },
    kind: { type: "string", enum: valuePropositionDiagramKindSchema.options },
    title: { type: "string" },
    purpose: { type: "string" },
    activeElementId: { anyOf: [{ type: "string" }, { type: "null" }] },
    nodes: {
      type: "array",
      maxItems: 40,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "label", "type", "status", "rank", "order"],
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          type: { type: "string", enum: valuePropositionNodeTypeSchema.options },
          status: { type: "string", enum: valuePropositionStatusSchema.options },
          rank: { type: "integer", minimum: 0, maximum: 12 },
          order: { type: "integer", minimum: 0, maximum: 12 },
        },
      },
    },
    edges: {
      type: "array",
      maxItems: 80,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "from", "to", "kind", "status", "label"],
        properties: {
          id: { type: "string" },
          from: { type: "string" },
          to: { type: "string" },
          kind: { type: "string", enum: valuePropositionEdgeKindSchema.options },
          status: { type: "string", enum: valuePropositionStatusSchema.options },
          label: { type: "string" },
        },
      },
    },
  },
} as const;
