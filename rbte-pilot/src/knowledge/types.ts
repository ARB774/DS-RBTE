import { z } from "zod";

export enum PackId {
  FPF = "FPF",
  PACK_TOC = "PACK_TOC",
  PACK_AL = "PACK_AL",
  PACK_ATB = "PACK_ATB",
}

export const packIdSchema = z.nativeEnum(PackId);

export enum Operation {
  SEARCH = "search",
  GET_BY_ID = "getById",
  GET_WP_SCHEMA = "getWpSchema",
  GET_DISTINCTIONS = "getDistinctions",
  GET_SOURCE_META = "getSourceMeta",
}

export const operationSchema = z.nativeEnum(Operation);

export enum EntityKind {
  D = "D",
  M = "M",
  WP = "WP",
  FM = "FM",
  SC = "SC",
  P = "P",
}

export const entityKindSchema = z.nativeEnum(EntityKind);

export type EntityStatus =
  | "draft"
  | "current"
  | "pilot"
  | "admissibleForDeclaredDPFUse"
  | "deprecated-interpretation"
  | "hypothesis";

export const entityStatusSchema = z.union([
  z.literal("draft"),
  z.literal("current"),
  z.literal("pilot"),
  z.literal("admissibleForDeclaredDPFUse"),
  z.literal("deprecated-interpretation"),
  z.literal("hypothesis"),
]);

export interface EntityMeta {
  pack: PackId;
  path: string;
  id: string;
  commit: string;
  status: EntityStatus;
}

export const entityMetaSchema = z
  .object({
    pack: packIdSchema,
    path: z.string().min(1),
    id: z.string().min(1),
    commit: z.string().min(7),
    status: entityStatusSchema,
  })
  .strict();

export interface SearchResult {
  entityId: string;
  title: string;
  summary: string;
  status: EntityStatus;
  pack: PackId;
  score: number;
}

export const searchResultSchema = z
  .object({
    entityId: z.string().min(1),
    title: z.string().min(1),
    summary: z.string().min(1),
    status: entityStatusSchema,
    pack: packIdSchema,
    score: z.number().min(0).max(1),
  })
  .strict();

export interface NormativeBlock {
  entityId: string;
  title: string;
  kind: EntityKind;
  status: EntityStatus;
  pack: PackId;
  content: string;
  links: Array<{
    targetId: string;
    relation: string;
  }>;
  meta: EntityMeta;
}

export const normativeBlockSchema = z
  .object({
    entityId: z.string().min(1),
    title: z.string().min(1),
    kind: entityKindSchema,
    status: entityStatusSchema,
    pack: packIdSchema,
    content: z.string().min(1),
    links: z.array(
      z
        .object({
          targetId: z.string().min(1),
          relation: z.string().min(1),
        })
        .strict(),
    ),
    meta: entityMetaSchema,
  })
  .strict();

export interface WpField {
  name: string;
  type: "string" | "text" | "enum" | "boolean" | "array" | "object";
  required: boolean;
  description: string;
  enumValues?: string[];
}

export interface WpRule {
  id: string;
  description: string;
  severity: "must" | "should" | "may";
}

export interface WpCheck {
  id: string;
  question: string;
  passCriteria: string;
}

export interface WpSchema {
  entityId: string;
  title: string;
  pack: PackId;
  definition: string;
  producedBy: string[];
  consumedBy: string[];
  fields: WpField[];
  rules: WpRule[];
  checks: WpCheck[];
  antiPatterns: string[];
}

export const wpSchemaSchema = z
  .object({
    entityId: z.string().min(1),
    title: z.string().min(1),
    pack: packIdSchema,
    definition: z.string().min(1),
    producedBy: z.array(z.string().min(1)),
    consumedBy: z.array(z.string().min(1)),
    fields: z.array(
      z
        .object({
          name: z.string().min(1),
          type: z.union([
            z.literal("string"),
            z.literal("text"),
            z.literal("enum"),
            z.literal("boolean"),
            z.literal("array"),
            z.literal("object"),
          ]),
          required: z.boolean(),
          description: z.string().min(1),
          enumValues: z.array(z.string().min(1)).optional(),
        })
        .strict(),
    ),
    rules: z.array(
      z
        .object({
          id: z.string().min(1),
          description: z.string().min(1),
          severity: z.union([
            z.literal("must"),
            z.literal("should"),
            z.literal("may"),
          ]),
        })
        .strict(),
    ),
    checks: z.array(
      z
        .object({
          id: z.string().min(1),
          question: z.string().min(1),
          passCriteria: z.string().min(1),
        })
        .strict(),
    ),
    antiPatterns: z.array(z.string().min(1)),
  })
  .strict();

export interface DistinctionEntry {
  entityId: string;
  title: string;
  status: EntityStatus;
  pack: PackId;
  definition: string;
  contrastPairs: Array<{
    sideA: string;
    sideB: string;
  }>;
  whyImportant: string;
  related: string[];
  revisionCriterion?: string;
}

export interface CommonFailureMode {
  entityId: string;
  title: string;
  status: EntityStatus;
  pack: PackId;
  description: string;
  symptom: string;
  rootCause: string;
  mitigation: string;
}

export interface DistinctionsBundle {
  stepId: string;
  distinctions: DistinctionEntry[];
  commonFailureModes: CommonFailureMode[];
}

export const distinctionEntrySchema = z
  .object({
    entityId: z.string().min(1),
    title: z.string().min(1),
    status: entityStatusSchema,
    pack: packIdSchema,
    definition: z.string().min(1),
    contrastPairs: z.array(
      z
        .object({
          sideA: z.string().min(1),
          sideB: z.string().min(1),
        })
        .strict(),
    ),
    whyImportant: z.string().min(1),
    related: z.array(z.string().min(1)),
    revisionCriterion: z.string().min(1).optional(),
  })
  .strict();

export const commonFailureModeSchema = z
  .object({
    entityId: z.string().min(1),
    title: z.string().min(1),
    status: entityStatusSchema,
    pack: packIdSchema,
    description: z.string().min(1),
    symptom: z.string().min(1),
    rootCause: z.string().min(1),
    mitigation: z.string().min(1),
  })
  .strict();

export const distinctionsBundleSchema = z
  .object({
    stepId: z.string().min(1),
    distinctions: z.array(distinctionEntrySchema),
    commonFailureModes: z.array(commonFailureModeSchema),
  })
  .strict();

export interface NotFoundError {
  code: "NOT_FOUND";
  operation: Operation;
  entityId?: string;
  stepId?: string;
  reason: string;
}

export const notFoundErrorSchema = z
  .object({
    code: z.literal("NOT_FOUND"),
    operation: operationSchema,
    entityId: z.string().min(1).optional(),
    stepId: z.string().min(1).optional(),
    reason: z.string().min(1),
  })
  .strict();

export interface TermFilterViolation {
  entityId: string;
  pack: PackId;
  path: string;
  matchedPattern: string;
  lineSnippet: string;
}

export const termFilterViolationSchema = z
  .object({
    entityId: z.string().min(1),
    pack: packIdSchema,
    path: z.string().min(1),
    matchedPattern: z.string().min(1),
    lineSnippet: z.string().min(1),
  })
  .strict();

export const searchParamsSchema = z
  .object({
    profile: z.string().min(1),
    step: z.string().min(1),
    question: z.string().min(1),
  })
  .strict();

export type SearchParams = z.infer<typeof searchParamsSchema>;

export const getByIdParamsSchema = z
  .object({
    entityId: z.string().min(1),
  })
  .strict();

export type GetByIdParams = z.infer<typeof getByIdParamsSchema>;

export const getWpSchemaParamsSchema = z
  .object({
    entityId: z.string().regex(/^AL\.WP\.\d+$/, "entityId must match AL.WP.* pattern"),
  })
  .strict();

export type GetWpSchemaParams = z.infer<typeof getWpSchemaParamsSchema>;

export const getDistinctionsParamsSchema = z
  .object({
    stepId: z.string().min(1),
  })
  .strict();

export type GetDistinctionsParams = z.infer<typeof getDistinctionsParamsSchema>;

export const getSourceMetaParamsSchema = z
  .object({
    entityId: z.string().min(1),
  })
  .strict();

export type GetSourceMetaParams = z.infer<typeof getSourceMetaParamsSchema>;

export type KnowledgeResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: NotFoundError };
