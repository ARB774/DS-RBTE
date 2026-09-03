"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users, type UserRole } from "@/db/schema";
import { lucia } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email("Введи корректный email").min(3),
  password: z.string().min(6, "Пароль не менее 6 символов"),
});

export async function loginAction(formData: FormData = {} as any) {
  const raw = Object.fromEntries(formData);
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Неверный ввод" };
  }
  const { email, password } = parsed.data;
  const list = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  const row = list[0];
  if (!row || !row.passwordHash) {
    return { ok: false, error: "Неверный email или пароль" };
  }
  const valid = await bcrypt.compare(password, row.passwordHash);
  if (!valid) {
    return { ok: false, error: "Неверный email или пароль" };
  }

  const session = await lucia.createSession(row.id, {});
  const sessionCookie = lucia.createSessionCookie(session.id);
  cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
  redirect("/dashboard");
}

export async function logoutAction() {
  const sessionId = cookies().get(lucia.sessionCookieName)?.value ?? null;
  if (sessionId) {
    try { await lucia.invalidateSession(sessionId); } catch {}
  }
  const blank = lucia.createBlankSessionCookie();
  cookies().set(blank.name, blank.value, blank.attributes);
  redirect("/");
}

export async function seedUsersAction(formData: FormData = {} as any) {
  let createdCount = 0;

  try {
    const password = await bcrypt.hash("rbte1234", 10);
    const demo = [
      { email: "participant@rbte.pro", name: "Анна Участник", role: "PARTICIPANT" as UserRole },
      { email: "facilitator@rbte.pro", name: "Илья Ведущий", role: "FACILITATOR" as UserRole },
      { email: "mentor@rbte.pro", name: "Ольга Наставник", role: "MENTOR" as UserRole },
      { email: "supporter@rbte.pro", name: "Максим Поддержка", role: "SUPPORTER" as UserRole },
      { email: "admin@rbte.pro", name: "Админ Пилота", role: "ADMIN" as UserRole },
    ];

    for (const d of demo) {
      const inserted = await db
        .insert(users)
        .values({
          email: d.email,
          name: d.name,
          role: d.role,
          passwordHash: password,
        })
        .onConflictDoNothing({ target: users.email })
        .returning({ id: users.id });

      if (inserted[0]) createdCount += 1;
    }
  } catch (error) {
    console.error("RBTE seed users failed", error);
    redirect("/login?seed=error");
  }

  const status = createdCount > 0 ? "created" : "exists";
  redirect(`/login?seed=${status}&count=${createdCount}`);
}
