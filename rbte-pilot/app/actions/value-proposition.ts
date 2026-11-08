"use server";

import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { UUID } from "@/lib/rbte";
import { valuePropositionProjects, valuePropositionTurns } from "@/db/schema";
import { generateValuePropositionMentorTurn } from "@/lib/value-proposition-mentor";
import {
  resolveValuePropositionStage,
  stageOpening,
  valuePropositionRoute,
  valuePropositionStageSchema,
} from "@/lib/value-proposition-route";
import { parseValuePropositionDiagram } from "@/lib/value-proposition-visualization";

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
  if (!parsed.success) throw new Error("Введите ответ участника.");
  const project = await db.select().from(valuePropositionProjects)
    .where(and(eq(valuePropositionProjects.id, id), eq(valuePropositionProjects.ownerId, me.id)))
    .limit(1);
  if (!project[0]) throw new Error("Проект не найден.");
  const previousTurns = await db.select({
    authorRole: valuePropositionTurns.authorRole,
    stage: valuePropositionTurns.stage,
    content: valuePropositionTurns.content,
  })
    .from(valuePropositionTurns)
    .where(eq(valuePropositionTurns.projectId, id))
    .orderBy(asc(valuePropositionTurns.createdAt));
  const currentStage = valuePropositionStageSchema.parse(project[0].currentState);
  const currentDiagram = parseValuePropositionDiagram(project[0].visualization);
  const mentorTurn = await generateValuePropositionMentorTurn({
    stage: currentStage,
    project: {
      name: project[0].name,
      ownerRole: project[0].ownerRole,
      systemBoundary: project[0].systemBoundary,
      trainingResult: project[0].trainingResult,
      openGap: project[0].openGap,
      nextStep: project[0].nextStep,
    },
    currentDiagram,
    history: previousTurns,
    answer: parsed.data.content,
  });
  const resolvedStage = resolveValuePropositionStage(
    currentStage,
    mentorTurn.proposedStage,
    mentorTurn.readyForNextStage,
  );
  await db.insert(valuePropositionTurns).values({
    id: UUID(),
    projectId: id,
    authorRole: "PARTICIPANT",
    stage: currentStage,
    content: parsed.data.content,
  });
  await db.insert(valuePropositionTurns).values({
    id: UUID(),
    projectId: id,
    authorRole: "MENTOR",
    stage: resolvedStage,
    content: `${mentorTurn.reflection}\n\nПоследнее принятое изменение: ${mentorTurn.acceptedUpdate}\n\nНаблюдаемые данные: ${mentorTurn.observations.join("; ") || "новых данных нет"}\n\nКритерий: ${mentorTurn.criterion}\n\nГлавный разрыв: ${mentorTurn.priorityGap}\n\nВаша следующая самостоятельная проба: ${mentorTurn.question}`,
  });
  await db.update(valuePropositionProjects).set({
    currentState: resolvedStage,
    openGap: mentorTurn.priorityGap,
    nextStep: mentorTurn.nextStep,
    assessment: mentorTurn.criterion,
    model: mentorTurn.learningAction,
    visualization: mentorTurn.diagram ?? currentDiagram ?? {},
    stopOrReturnCondition: resolvedStage === currentStage
      ? project[0].stopOrReturnCondition
      : `Вернуться к ${currentStage}, если вход этапа ${resolvedStage} противоречит принятому продукту «${valuePropositionRoute[currentStage].workProduct}».`,
    updatedAt: new Date(),
  }).where(eq(valuePropositionProjects.id, id));
  redirect(`/value-proposition/${id}`);
}
