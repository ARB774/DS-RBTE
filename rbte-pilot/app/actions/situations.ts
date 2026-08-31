"use server";

import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  situations,
  type SituationProfile,
  type SituationVisibility,
  revisions,
  type RevisionKind,
  type SensitivityLevel,
  type SupportLevel,
} from "@/db/schema";
import { requireUser } from "@/lib/session";
import { UUID } from "@/lib/rbte";

const newSituationSchema = z.object({
  title: z.string().min(5, "Название не менее 5 символов").max(160),
  profile: z.enum(["DILEMMA", "CONFLICT", "LT_CLOUD", "IMMUNITY"]),
  signal: z.string().min(10, "Опиши исходный сигнал — что конкретно произошло").max(2000),
  sensitivity: z.enum(["LOW", "STANDARD", "HIGH", "CRITICAL"]),
  task: z.string().max(2000).optional(),
  desiredChange: z.string().max(2000).optional(),
  experience: z.string().max(2000).optional(),
  authority: z.string().max(2000).optional(),
  supportLevel: z.enum(["NONE", "LOW", "MEDIUM", "HIGH"]),
  baselineAttempt: z.string().max(4000).optional(),
  baselineReason: z.string().max(2000).optional(),
});

export async function createSituationAction(formData: FormData = {} as any) {
  const me = await requireUser(["PARTICIPANT", "MENTOR", "FACILITATOR", "ADMIN"]);

  const raw: any = Object.fromEntries(formData);
  const parsed = newSituationSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const data = parsed.data;
  const situationId = UUID();
  const revisionId = UUID();

  await db.insert(situations).values({
    id: situationId,
    creatorId: me.id,
    title: data.title,
    profile: data.profile as SituationProfile,
    signal: data.signal,
    sensitivity: data.sensitivity as SensitivityLevel,
    task: data.task ?? null,
    desiredChange: data.desiredChange ?? null,
    experience: data.experience ?? null,
    authority: data.authority ?? null,
    supportLevel: data.supportLevel as SupportLevel,
    visibility: "PRIVATE" as SituationVisibility,
    aiAttemptBaseline: data.baselineAttempt ?? null,
    baselineReason: data.baselineReason ?? null,
    currentRevisionId: revisionId,
    locked: false,
  });

  await db.insert(revisions).values({
    id: revisionId,
    situationId,
    number: 1,
    parentId: null,
    kind: "STEP_41" as RevisionKind,
    snapshot: JSON.stringify({ step: "4.1", fields: data }),
    createdBy: me.id,
    comment: "Создание ситуации. Исходная самостоятельная попытка зафиксирована до содержательной помощи ИИ.",
  });

  redirect(`/situations/${situationId}/explore`);
}

export async function listMySituationsAction() {
  const me = await requireUser();
  const rows = await db
    .select()
    .from(situations)
    .where(eq(situations.creatorId, me.id))
    .orderBy(desc(situations.updatedAt));
  return rows;
}

export async function getSituationAction(id: string) {
  const me = await requireUser();
  const row = await db
    .select()
    .from(situations)
    .where(and(eq(situations.id, id), eq(situations.creatorId, me.id)))
    .limit(1);
  return row[0] ?? null;
}
