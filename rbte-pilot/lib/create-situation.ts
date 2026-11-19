import { eq } from 'drizzle-orm';
import { situations, revisions, type RevisionKind, type SituationProfile, type SensitivityLevel, type SupportLevel, type SituationVisibility } from '@/db/schema';
export async function persistSituation(database:any, me:{id:string}, data:any, situationId:string, revisionId:string) {
  await database.transaction(async (tx:any) => {
  await tx.insert(situations).values({
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
    currentRevisionId: null,
    locked: false,
  });

  await tx.insert(revisions).values({
    id: revisionId,
    situationId,
    number: 1,
    parentId: null,
    kind: "STEP_41" as RevisionKind,
    snapshot: { step: "4.1", fields: data },
    createdBy: me.id,
    comment: "Описание ситуации PILOT-2. Самостоятельная версия тучи фиксируется на следующем шаге.",
  });

  await tx.update(situations).set({ currentRevisionId: revisionId }).where(eq(situations.id, situationId));
  });
}
