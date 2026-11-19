import { tokenSchema, type AuthUser } from './auth';
import { PortalResponseError } from './portal-client';

export type SessionCheck = { user: AuthUser | null; status: 'authenticated' | 'anonymous' | 'unavailable' | 'forbidden' };

export function localDevelopmentIdentity(environment: Record<string, string | undefined>): { id: string; name: string } | null {
  if (environment.NODE_ENV !== 'development' || environment.PILOT_LOCAL_AUTH !== '1') return null;
  const id = environment.PILOT_LOCAL_USER_ID ?? '1';
  const name = (environment.PILOT_LOCAL_USER_NAME ?? 'Local participant').trim();
  if (!/^[1-9][0-9]{0,18}$/.test(id) || name.length === 0 || name.length > 255) return null;
  return { id, name };
}

export async function checkPortalSession(token: unknown, validate: (token: string) => Promise<unknown>, loadUser: (identity: unknown) => Promise<AuthUser | null>): Promise<SessionCheck> {
  const parsed = tokenSchema.safeParse(token);
  if (!parsed.success) return { user: null, status: 'anonymous' };
  let identity: unknown;
  try { identity = await validate(parsed.data); }
  catch (error) {
    if (!(error instanceof PortalResponseError && error.status === 401)) console.warn('pilot-session-unavailable', 'portal', error instanceof PortalResponseError ? `http-${error.status}` : 'transport-or-format');
    return { user: null, status: error instanceof PortalResponseError && error.status === 401 ? 'anonymous' : 'unavailable' };
  }
  try {
    const user = await loadUser(identity);
    return user ? { user, status: 'authenticated' } : { user: null, status: 'forbidden' };
  } catch { console.warn('pilot-session-unavailable', 'database'); return { user: null, status: 'unavailable' }; }
}

export function authReturnPath(value: unknown): string {
  if (value === '/') return value;
  if (typeof value !== 'string' || value.length > 300 || !/^\/(?:dashboard|value-proposition|situations)(?:\/[A-Za-z0-9_-]+)*$/.test(value)) return '/dashboard';
  return value;
}
export function sessionDestination(session: SessionCheck, returnTo: string): string | null {
  const next = encodeURIComponent(authReturnPath(returnTo));
  if (session.status === 'unavailable') return `/auth/unavailable?next=${next}`;
  if (session.status === 'forbidden') return '/auth/denied';
  if (!session.user) return `/login?next=${next}`;
  return null;
}
