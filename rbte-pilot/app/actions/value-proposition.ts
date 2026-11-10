"use server";

import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { UUID } from "@/lib/rbte";
import { valuePropositionProjects, valuePropositionTurns } from "@/db/schema";
import { runMentorTurn } from "@/lib/mentor-service";
import {
  stageOpening,
  valuePropositionRoute,
  valuePropositionStageSchema,
} from "@/lib/value-proposition-route";
import { parseValuePropositionDiagram } from "@/lib/value-proposition-visualization";
import { deliverSavedMentorTurn, readMentorNotice } from '@/lib/mentor-delivery';

const projectSchema = z.object({
  name: z.string().trim().min(3).max(200),
  ownerRole: z.string().trim().max(200),
  confidentiality: z.string().trim().max(2000),
  systemBoundary: z.string().trim().max(4000),
  trainingResult: z.string().trim().min(10).max(4000),
  startState: valuePropositionStageSchema.default("S0"),
  existingContext: z.string().trim().max(30000).default(""),
});

const turnSchema = z.object({ content: z.string().trim().min(1).max(8000) });

export async function createValuePropositionProjectAction(formData: FormData): Promise<void> {
  const me = await requireUser();
  const parsed = projectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error(parsed.error.issues.map((issue) => issue.message).join("; "));
  const id = UUID();
  await db.insert(valuePropositionProjects).values({
    id,
    ownerId: me.id,
    name: parsed.data.name,
    ownerRole: parsed.data.ownerRole,
    confidentiality: parsed.data.confidentiality,
    systemBoundary: parsed.data.systemBoundary,
    trainingResult: parsed.data.trainingResult,
    currentState: parsed.data.startState,
    nextStep: stageOpening(parsed.data.startState),
    openGap: parsed.data.existingContext
      ? "Восстановить последний принятый рабочий продукт и один открытый разрыв из контекста продолжения."
      : "Получить первую самостоятельную пробу по критерию этапа.",
    stopOrReturnCondition: "Вернуться к владельцу входа, если новая версия противоречит ранее принятому рабочему продукту.",
  });
  if (parsed.data.existingContext) {
    await db.insert(valuePropositionTurns).values({
      id: UUID(),
      projectId: id,
      authorRole: "CONTEXT",
      stage: parsed.data.startState,
      content: parsed.data.existingContext,
    });
  }
  await db.insert(valuePropositionTurns).values({
    id: UUID(),
    projectId: id,
    authorRole: "MENTOR",
    stage: parsed.data.startState,
    content: `${stageOpening(parsed.data.startState)}\n\n${parsed.data.existingContext
      ? "Контекст продолжения сохранён. Назовите только последнее принятое изменение или ответьте на оставшийся в нём вопрос — маршрут заново не начинаем."
      : "Сформулируйте первую самостоятельную попытку своими словами."}`,
  });
  redirect(`/value-proposition/${id}`);
}

export async function listValuePropositionProjectsAction() {
  const me = await requireUser();
  return db.select().from(valuePropositionProjects)
    .where(eq(valuePropositionProjects.ownerId, me.id))
    .orderBy(desc(valuePropositionProjects.updatedAt));
}

export async function getValuePropositionProjectAction(id: string) {
  const me = await requireUser();
  const project = await db.select().from(valuePropositionProjects)
    .where(and(eq(valuePropositionProjects.id, id), eq(valuePropositionProjects.ownerId, me.id)))
    .limit(1);
  if (!project[0]) return null;
  const turns = await db.select().from(valuePropositionTurns)
    .where(eq(valuePropositionTurns.projectId, id))
    .orderBy(asc(valuePropositionTurns.createdAt));
  return { project: project[0], turns };
}

export async function addValuePropositionTurnAction(id: string, formData: FormData): Promise<void> {
  const me = await requireUser();
  const parsed = turnSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/value-proposition/${id}?notice=invalid-message`);
  const project = await db.select().from(valuePropositionProjects)
    .where(and(eq(valuePropositionProjects.id, id), eq(valuePropositionProjects.ownerId, me.id)))
    .limit(1);
  if (!project[0]) throw new Error("Проект не найден.");
  const previousTurns = await db.select({
    id: valuePropositionTurns.id,
    authorRole: valuePropositionTurns.authorRole,
    stage: valuePropositionTurns.stage,
    content: valuePropositionTurns.content,
  })
    .from(valuePropositionTurns)
    .where(eq(valuePropositionTurns.projectId, id))
    .orderBy(asc(valuePropositionTurns.createdAt));
  const currentStage = valuePropositionStageSchema.parse(project[0].currentState);
  const currentDiagram = parseValuePropositionDiagram(project[0].visualization);
  let participantId = z.string().uuid().safeParse(formData.get('submissionId')).success ? String(formData.get('submissionId')) : UUID();
  let answer = parsed.data.content;
  let intent = String(formData.get('intent') || '');
  let dataMode = String(formData.get('dataMode') || '');
  const retryId = z.string().uuid().safeParse(formData.get('retryErrorId'));
  if (retryId.success) {
    const latest = await db.select({ id: valuePropositionTurns.id }).from(valuePropositionTurns).where(eq(valuePropositionTurns.projectId, id)).orderBy(desc(valuePropositionTurns.createdAt)).limit(1);
    if (latest[0]?.id !== retryId.data) redirect(`/value-proposition/${id}`);
    const errors = await db.select().from(valuePropositionTurns).where(and(eq(valuePropositionTurns.id, retryId.data), eq(valuePropositionTurns.projectId, id), eq(valuePropositionTurns.authorRole, 'SERVICE'))).limit(1);
    const notice = errors[0] && readMentorNotice(errors[0].content);
    if (!notice) redirect(`/value-proposition/${id}`);
    const originals = await db.select().from(valuePropositionTurns).where(and(eq(valuePropositionTurns.id, notice.participantId), eq(valuePropositionTurns.projectId, id), eq(valuePropositionTurns.authorRole, 'PARTICIPANT'))).limit(1);
    if (!originals[0] || originals[0].stage !== currentStage) redirect(`/value-proposition/${id}`);
    participantId = originals[0].id;
    answer = originals[0].content;
    intent = notice.intent;
    dataMode = notice.dataMode;
  }
  const participantTime = new Date(Math.max(Date.now(), project[0].updatedAt.getTime() + 1));
  const reservedAt = new Date(participantTime.getTime() + 1);
  let duplicate = false;
  let stale = false;
  const delivered = await deliverSavedMentorTurn({
    saveParticipant: async () => {
      await db.transaction(async tx => {
        const locked = await tx.select({ updatedAt: valuePropositionProjects.updatedAt }).from(valuePropositionProjects).where(eq(valuePropositionProjects.id, id)).for('update');
        stale = !locked[0] || locked[0].updatedAt.getTime() !== project[0].updatedAt.getTime();
        if (!retryId.success) {
          const inserted = await tx.insert(valuePropositionTurns).values({ id: participantId, projectId: id, authorRole: 'PARTICIPANT', stage: currentStage, content: answer, createdAt: participantTime }).onConflictDoNothing().returning({ id: valuePropositionTurns.id });
          if (!inserted.length) { duplicate = true; return; }
        }
        if (!stale) await tx.update(valuePropositionProjects).set({ updatedAt: reservedAt }).where(and(eq(valuePropositionProjects.id, id), eq(valuePropositionProjects.ownerId, me.id)));
      });
      if (duplicate) redirect(`/value-proposition/${id}`);
    },
    generate: () => { if (stale) throw new Error('Project changed concurrently'); return runMentorTurn({
    stage: currentStage,
    project: {
      name: project[0].name,
      ownerRole: project[0].ownerRole,
      systemBoundary: project[0].systemBoundary,
      trainingResult: project[0].trainingResult,
      openGap: project[0].openGap,
      nextStep: project[0].nextStep,
      confidentiality: project[0].confidentiality,
    },
    currentDiagram,
    history: previousTurns.filter(t => t.authorRole !== 'SERVICE' && t.id !== participantId).map(({ id: _turnId, ...turn }) => turn),
    answer,
    intent,
    dataMode,
    evidence: project[0].evidence,
  }); },
  saveReply: async mentorTurn => {
  const resolvedStage = mentorTurn.stage;
  const mentorMessageId = UUID();
  const turnCreatedAt = new Date(Math.max(Date.now(), reservedAt.getTime() + 1));
  if (mentorTurn.diagram) mentorTurn.state.artifacts.push({ turnId: mentorMessageId, diagram: mentorTurn.diagram });
  await db.transaction(async tx => {
  const locked = await tx.select({ updatedAt: valuePropositionProjects.updatedAt }).from(valuePropositionProjects)
    .where(and(eq(valuePropositionProjects.id, id), eq(valuePropositionProjects.ownerId, me.id))).for('update');
  if (!locked[0] || locked[0].updatedAt.getTime() !== reservedAt.getTime()) throw new Error('Проект изменился в другом окне.');
  const updated = await tx.update(valuePropositionProjects).set({
    currentState: resolvedStage,
    openGap: mentorTurn.openGap,
    nextStep: mentorTurn.nextStep,
    assessment: mentorTurn.criterion,
    model: mentorTurn.learningAction,
    evidence: mentorTurn.state,
    sources: mentorTurn.sources,
    visualization: mentorTurn.diagram ?? currentDiagram ?? {},
    stopOrReturnCondition: resolvedStage === currentStage
      ? project[0].stopOrReturnCondition
      : `Вернуться к ${currentStage}, если вход этапа ${resolvedStage} противоречит принятому продукту «${valuePropositionRoute[currentStage].workProduct}».`,
    updatedAt: new Date(turnCreatedAt.getTime() + 1),
  }).where(and(eq(valuePropositionProjects.id, id), eq(valuePropositionProjects.ownerId, me.id))).returning({ id: valuePropositionProjects.id });
  if (!updated.length) throw new Error('Проект изменился в другом окне. Обновите страницу перед отправкой.');
  await tx.insert(valuePropositionTurns).values({
    id: mentorMessageId,
    projectId: id,
    authorRole: "MENTOR",
    stage: resolvedStage,
    content: mentorTurn.content,
    createdAt: new Date(turnCreatedAt.getTime() + 1),
  });
  });
  },
  saveFailure: async () => {
    await db.insert(valuePropositionTurns).values({ id: UUID(), projectId: id, authorRole: 'SERVICE', stage: currentStage,
      content: JSON.stringify({ message: 'Ваш ответ сохранён. Ответ наставника пока не удалось обработать. Рабочий продукт и этап не изменены. Можно повторить обработку без повторного ввода.', participantId, intent, dataMode }),
      createdAt: new Date(Math.max(Date.now(), reservedAt.getTime() + 2)),
    });
  },
  });
  redirect(`/value-proposition/${id}${delivered ? '' : '?notice=mentor-failed'}`);
}
