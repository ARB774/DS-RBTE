import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkPortalSession, sessionDestination, authReturnPath } from '../lib/session-check';
import { PortalResponseError } from '../lib/portal-client';
import type { AuthUser } from '../lib/auth';

const token = 'a'.repeat(43);
const user: AuthUser = { id: 'test', email: 'test@example.invalid', name: 'Test', role: 'PARTICIPANT' };
const next = '/value-proposition/12345678-1234-1234-1234-123456789abc';

test('only an explicit invalid session leads to login; bridge outages stay unauthenticated without logging out', async () => {
  for (const status of [403, 429, 500, 502, 503]) {
    const session = await checkPortalSession(token, async () => { throw new PortalResponseError(status); }, async () => user);
    assert.equal(session.status, 'unavailable');
    assert.equal(session.user, null);
    assert.match(sessionDestination(session, next)!, /^\/auth\/unavailable\?/);
  }
  const invalid = await checkPortalSession(token, async () => { throw new PortalResponseError(401); }, async () => user);
  assert.equal(invalid.status, 'anonymous');
  assert.match(sessionDestination(invalid, next)!, /^\/login\?/);
});

test('timeouts, malformed identity and database failures do not become an expired session', async () => {
  const network = await checkPortalSession(token, async () => { throw new Error('Portal timeout'); }, async () => user);
  assert.equal(network.status, 'unavailable');
  const database = await checkPortalSession(token, async () => ({}), async () => { throw new Error('Database unavailable'); });
  assert.equal(database.status, 'unavailable');
  assert.equal(database.user, null);
});

test('missing cookies never call the portal and revoked local access does not become authenticated', async () => {
  const missing = await checkPortalSession(undefined, async () => { throw new Error('Should not call portal'); }, async () => user);
  assert.equal(missing.status, 'anonymous');
  const revoked = await checkPortalSession(token, async () => ({}), async () => null);
  assert.equal(revoked.status, 'forbidden');
  assert.equal(sessionDestination(revoked, next), '/auth/denied');
  const valid = await checkPortalSession(token, async () => ({}), async () => user);
  assert.equal(valid.user, user);
  assert.equal(sessionDestination(valid, next), null);
});

test('return to the project is preserved while off-site and encoded redirect targets are refused', () => {
  assert.equal(authReturnPath(next), next);
  for (const unsafe of ['https://evil.invalid', '//evil.invalid', '/%2f%2fevil.invalid', '/dashboard/../admin', '/dashboard\\evil', '/login', '/auth/unavailable', '/dashboard?next=evil']) {
    assert.equal(authReturnPath(unsafe), '/dashboard');
  }
  assert.ok(sessionDestination({ user: null, status: 'unavailable' }, next)?.includes(encodeURIComponent(next)));
});
