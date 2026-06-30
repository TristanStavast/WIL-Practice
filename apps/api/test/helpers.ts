import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

export async function makeApp(): Promise<FastifyInstance> {
  const app = await buildApp();
  await app.ready();
  return app;
}

/** Wipe all rows between tests for isolation (order respects FKs). */
export async function resetDb(): Promise<void> {
  await prisma.comment.deleteMany();
  await prisma.issue.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.project.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
}

interface RegisteredUser {
  token: string;
  userId: string;
  email: string;
}

let counter = 0;

/** Registers a fresh user via the real endpoint and returns their token. */
export async function registerUser(
  app: FastifyInstance,
  overrides: Partial<{ email: string; name: string; password: string }> = {},
): Promise<RegisteredUser> {
  counter += 1;
  const email = overrides.email ?? `user${counter}@test.dev`;
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: {
      email,
      name: overrides.name ?? `User ${counter}`,
      password: overrides.password ?? 'supersecret123',
    },
  });
  const body = res.json();
  return { token: body.accessToken, userId: body.user.id, email: body.user.email };
}

export const auth = (token: string) => ({ authorization: `Bearer ${token}` });
