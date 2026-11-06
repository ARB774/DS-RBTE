"use server";

import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { UUID } from "@/lib/rbte";
import { valuePropositionProjects, valuePropositionTurns } from "@/db/schema";
import { generateValuePropositionMentorTurn } from "@/lib/value-proposition-mentor";

const projectSchema = z.object({
  name: z.string().trim().min(3).max(200),
  ownerRole: z.string().trim().max(200),
  confidentiality: z.string().trim().max(2000),
  systemBoundary: z.string().trim().max(4000),
  trainingResult: z.string().trim().min(10).max(4000),
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
    ...parsed.data,
    currentState: "S0",
    nextStep: "Согласовать допустимость проекта и границу клиентской системы.",
    openGap: "Не установлены результат, граница, доступ к данным и конфиденциальность.",
    stopOrReturnCondition: "Вернуться к S0 при противоречии границы или невозможности получить данные.",
  });
  await db.insert(valuePropositionTurns).values({
    id: UUID(),
    projectId: id,
    authorRole: "MENTOR",
    stage: "S0",
    content: "Начинаем со стадии S0. Уточните, какой наблюдаемый результат должен измениться у клиента, кто входит в клиентскую систему и какие данные доступны для проверки.",
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
    .where(eq(valuePropositionTurns.projectId, id));
  const mentorTurn = await generateValuePropositionMentorTurn({
    stage: project[0].currentState,
    project: project[0],
    history: previousTurns,
    answer: parsed.data.content,
  });
  await db.insert(valuePropositionTurns).values({
    id: UUID(),
    projectId: id,
    authorRole: "PARTICIPANT",
    stage: project[0].currentState,
    content: parsed.data.content,
  });
  await db.insert(valuePropositionTurns).values({
    id: UUID(),
    projectId: id,
    authorRole: "MENTOR",
    stage: project[0].currentState,
    content: `${mentorTurn.reflection}\n\nФакты: ${mentorTurn.facts.join("; ") || "пока не выделены"}\n\nЧто требует проверки: ${mentorTurn.gaps.join("; ") || "не выявлено"}\n\nСледующий вопрос: ${mentorTurn.question}`,
  });
  await db.update(valuePropositionProjects).set({
    openGap: "Проверить самостоятельную формулировку по критерию текущей стадии.",
    nextStep: `Ответить на следующий вопрос наставника на стадии ${project[0].currentState}.`,
    updatedAt: new Date(),
  }).where(eq(valuePropositionProjects.id, id));
  redirect(`/value-proposition/${id}`);
}
