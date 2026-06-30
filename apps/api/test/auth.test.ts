import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { makeApp, resetDb, auth, registerUser } from './helpers.js';
import { prisma } from '../src/lib/prisma.js';

let app: FastifyInstance;

beforeEach(async () => {
  app = await makeApp();
  await resetDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('auth', () => {
  it('registers a user and returns an access token + refresh cookie', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'new@test.dev', name: 'New', password: 'longenough123' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().accessToken).toBeTruthy();
    expect(res.json().user.email).toBe('new@test.dev');
    // refresh token must be delivered as an httpOnly cookie, never in the body
    const cookie = res.headers['set-cookie'];
    expect(String(cookie)).toContain('devboard_rt=');
    expect(String(cookie)).toContain('HttpOnly');
    expect(res.json().refreshToken).toBeUndefined();
  });

  it('never stores the password in plaintext', async () => {
    await registerUser(app, { email: 'safe@test.dev', password: 'plaintextpw1' });
    const user = await prisma.user.findUnique({ where: { email: 'safe@test.dev' } });
    expect(user?.passwordHash).toBeTruthy();
    expect(user?.passwordHash).not.toContain('plaintextpw1');
    expect(user?.passwordHash.startsWith('$argon2id$')).toBe(true);
  });

  it('rejects weak passwords with a 400 validation error', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'weak@test.dev', name: 'Weak', password: 'short' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects duplicate email registration with 409', async () => {
    await registerUser(app, { email: 'dup@test.dev' });
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'dup@test.dev', name: 'Dup', password: 'longenough123' },
    });
    expect(res.statusCode).toBe(409);
  });

  it('logs in with correct credentials and rejects wrong ones identically', async () => {
    await registerUser(app, { email: 'login@test.dev', password: 'correcthorse1' });

    const good = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'login@test.dev', password: 'correcthorse1' },
    });
    expect(good.statusCode).toBe(200);

    const badPw = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'login@test.dev', password: 'wrongpassword' },
    });
    const noUser = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'ghost@test.dev', password: 'whatever12345' },
    });
    // Same response whether the email exists or not — no user enumeration.
    expect(badPw.statusCode).toBe(401);
    expect(noUser.statusCode).toBe(401);
    expect(badPw.json()).toEqual(noUser.json());
  });

  it('rotates refresh tokens and rejects a reused (revoked) one', async () => {
    const reg = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'rot@test.dev', name: 'Rot', password: 'longenough123' },
    });
    const firstCookie = String(reg.headers['set-cookie']);

    const refreshed = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      headers: { cookie: firstCookie.split(';')[0] },
    });
    expect(refreshed.statusCode).toBe(200);
    expect(refreshed.json().accessToken).toBeTruthy();

    // Reusing the now-rotated original token must fail.
    const reused = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      headers: { cookie: firstCookie.split(';')[0] },
    });
    expect(reused.statusCode).toBe(401);
  });

  it('rejects protected routes without a token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/me' });
    expect(res.statusCode).toBe(401);
  });

  it('returns the current user from /me with a valid token', async () => {
    const { token, email } = await registerUser(app, { email: 'me@test.dev' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: auth(token),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().user.email).toBe(email);
  });
});
