import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { GET as start } from '../app/auth/start/route';
import { GET as callback } from '../app/auth/callback/route';
import { SESSION_COOKIE } from '../lib/auth';

test('SSO retains a safe project destination across real cookie serialization without accepting invalid state', async () => {
  const target = '/value-proposition/12345678-1234-1234-1234-123456789abc';
  const response = await start(new NextRequest(`https://pilot.rbte.pro/auth/start?next=${encodeURIComponent(target)}`));
  const cookies = response.headers.getSetCookie().map(cookie => cookie.split(';')[0]).join('; ');
  const request = new NextRequest('https://pilot.rbte.pro/auth/callback?state=bad&code=bad', { headers: { cookie: cookies } });
  assert.equal(request.cookies.get('__Host-pilot_return')?.value, target);
  const denied = await callback(request);
  assert.equal(denied.headers.get('Location'), `https://pilot.rbte.pro/login?next=${encodeURIComponent(target)}`);
  assert.equal(denied.cookies.get(SESSION_COOKIE), undefined);
  assert.equal(denied.cookies.get('__Host-pilot_return')?.value, '');
  assert.ok(response.headers.getSetCookie().every(cookie => /HttpOnly/i.test(cookie) && /Secure/i.test(cookie) && /SameSite=lax/i.test(cookie)));
});

test('SSO never stores an off-site return destination', async () => {
  const response = await start(new NextRequest('https://pilot.rbte.pro/auth/start?next=https://evil.invalid'));
  assert.equal(response.cookies.get('__Host-pilot_return')?.value, '/dashboard');
});
