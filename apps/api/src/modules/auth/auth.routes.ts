import type { FastifyInstance, FastifyReply } from 'fastify';
import { env, isProd } from '../../config/env.js';
import { REFRESH_COOKIE_NAME } from '../../lib/tokens.js';
import { Unauthorized } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { registerSchema, loginSchema } from './auth.schemas.js';
import * as authService from './auth.service.js';

function setRefreshCookie(reply: FastifyReply, token: string): void {
  reply.setCookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true, // not readable by JS — mitigates XSS token theft
    sameSite: 'strict', // mitigates CSRF
    secure: env.COOKIE_SECURE || isProd,
    path: '/api/auth', // only sent to the auth endpoints that need it
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60,
  });
}

function clearRefreshCookie(reply: FastifyReply): void {
  reply.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // Tight rate limit specifically on credential endpoints to blunt brute force.
  const authLimit = {
    rateLimit: { max: 10, timeWindow: '1 minute' },
  };

  app.post('/register', { config: authLimit }, async (req, reply) => {
    const input = registerSchema.parse(req.body);
    const result = await authService.register(input);
    setRefreshCookie(reply, result.refreshToken);
    return reply
      .code(201)
      .send({ accessToken: result.accessToken, user: result.user });
  });

  app.post('/login', { config: authLimit }, async (req, reply) => {
    const input = loginSchema.parse(req.body);
    const result = await authService.login(input);
    setRefreshCookie(reply, result.refreshToken);
    return reply.send({ accessToken: result.accessToken, user: result.user });
  });

  app.post('/refresh', { config: authLimit }, async (req, reply) => {
    const raw = req.cookies[REFRESH_COOKIE_NAME];
    if (!raw) throw Unauthorized('No session');
    const result = await authService.refresh(raw);
    setRefreshCookie(reply, result.refreshToken);
    return reply.send({ accessToken: result.accessToken, user: result.user });
  });

  app.post('/logout', async (req, reply) => {
    await authService.logout(req.cookies[REFRESH_COOKIE_NAME]);
    clearRefreshCookie(reply);
    return reply.code(204).send();
  });

  // Who am I — handy for the SPA to rehydrate the session on load.
  app.get('/me', { preHandler: app.authenticate }, async (req) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    if (!user) throw Unauthorized();
    return { user };
  });
}
