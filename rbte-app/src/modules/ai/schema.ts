import { z } from "zod";

export const knowledgeReferenceSchema = z
  .object({
    sourceId: z.string().min(1),
    path: z.string().min(1),
    commit: z.string().min(7),
    fragmentId: z.string().min(1).optional(),
  })
  .strict();

export const aiResponseSchema = z
  .object({
    question: z.string().min(1),
    observations: z.array(z.string().min(1)),
    candidateStatements: z.array(
      z
        .object({
          text: z.string().min(1),
          statementType: z.literal("hypothesis"),
        })
        .strict(),
    ),
    suggestedChanges: z.array(
      z
        .object({
          targetKind: z.string().min(1),
          targetRef: z.string().min(1).optional(),
          operation: z.enum(["create", "replace", "append", "remove"]),
          payload: z.record(z.string(), z.unknown()),
        })
        .strict(),
    ),
    checks: z.array(z.string().min(1)),
    supportOptions: z.array(z.string().min(1)),
    warnings: z.array(z.string().min(1)),
    knowledgeRefs: z.array(knowledgeReferenceSchema),
  })
  .strict();
