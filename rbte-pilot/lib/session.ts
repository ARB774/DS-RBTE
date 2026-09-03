import { cookies } from "next/headers";
import { cache } from "react";
import { lucia, type AuthUser } from "./auth";
import type { Session } from "lucia";
import { UserRole } from "@/db/schema";
import { redirect } from "next/navigation";

export const getCurrentSession = cache(
  async (): Promise<
    | { user: AuthUser; session: Session } | { user: null; session: null }
  > => {
    const sessionId = cookies().get(lucia.sessionCookieName)?.value ?? null;
    if (!sessionId) {
      return { user: null, session: null };
    }

    const result = await lucia.validateSession(sessionId);
    try {
      if (result.session && result.session.fresh) {
        const sessionCookie = lucia.createSessionCookie(result.session.id);
        cookies().set(
          sessionCookie.name,
          sessionCookie.value,
          sessionCookie.attributes
        );
      }
      if (!result.session) {
        const sessionCookie = lucia.createBlankSessionCookie();
        cookies().set(
          sessionCookie.name,
          sessionCookie.value,
          sessionCookie.attributes
        );
      }
    } catch {}
    return result as any;
  }
);

export async function requireUser(
  allowedRoles: UserRole[] = [
    "PARTICIPANT",
    "FACILITATOR",
    "ADMIN",
    "MENTOR",
    "SUPPORTER",
  ]
): Promise<AuthUser> {
  const sess = await getCurrentSession();
  if (!sess.user) {
    redirect("/login");
  }
  if (allowedRoles.length && !allowedRoles.includes(sess.user.role)) {
    redirect("/dashboard");
  }
  return sess.user;
}
