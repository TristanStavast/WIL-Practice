import Fastify, {
  type FastifyError,
  type FastifyInstance,
} from 'fastify';
import { ZodError } from 'zod';
import { isProd, isTest } from './config/env.js';
import { AppError } from './lib/errors.js';
import { registerSecurity } from './plugins/security.js';
import authPlugin from './plugins/auth.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { projectRoutes } from './modules/projects/projects.routes.js';
import { issueRoutes } from './modules/issues/issues.routes.js';
import { commentRoutes } from './modules/comments/comments.routes.js';

/**
 * Builds the Fastify instance without starting to listen. Keeping this
 * separate from server.ts means tests can spin up the full app in-process
 * with `app.inject(...)` — no real network, no port juggling.
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: isTest
      ? false
      : {
          level: isProd ? 'info' : 'debug',
          transport: isProd
            ? undefined
            : { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss' } },
          // Never log auth headers or cookies.
          redact: ['req.headers.authorization', 'req.headers.cookie'],
        },
    // Don't echo bad JSON etc. back with internals attached.
    disableRequestLogging: isTest,
  });

  await registerSecurity(app);
  await app.register(authPlugin);

  // Error/not-found handlers are registered BEFORE routes so the encapsulated
  // route contexts inherit them. (Fastify children capture the parent's
  // handlers at registration time — set them too late and routes silently
  // fall back to the default handler.)

  // One error handler to rule them all: maps known error shapes to clean JSON
  // and treats everything else as an opaque 500 (no stack traces to clients).
  app.setErrorHandler((error: FastifyError, req, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        },
      });
    }

    if (error instanceof AppError) {
      return reply
        .code(error.statusCode)
        .send({ error: { code: error.code, message: error.message } });
    }

    // Fastify's own validation / rate-limit / payload errors carry a statusCode.
    if (typeof error.statusCode === 'number' && error.statusCode < 500) {
      return reply.code(error.statusCode).send({
        error: { code: error.code ?? 'REQUEST_ERROR', message: error.message },
      });
    }

    req.log.error({ err: error }, 'Unhandled error');
    return reply
      .code(500)
      .send({ error: { code: 'INTERNAL', message: 'Something went wrong' } });
  });

  app.setNotFoundHandler((_req, reply) => {
    reply
      .code(404)
      .send({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });

  // Liveness probe — unauthenticated, cheap, used by orchestrators/load balancers.
  app.get('/health', async () => ({ status: 'ok', uptime: process.uptime() }));

  await app.register(
    async (api) => {
      await api.register(authRoutes, { prefix: '/auth' });
      await api.register(projectRoutes, { prefix: '/projects' });
      await api.register(issueRoutes, { prefix: '/projects/:projectId/issues' });
      await api.register(commentRoutes, {
        prefix: '/projects/:projectId/issues/:issueId/comments',
      });
    },
    { prefix: '/api' },
  );

  return app;
}
