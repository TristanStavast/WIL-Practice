import type { FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import { corsOrigins, isTest } from '../config/env.js';

/**
 * Cross-cutting security middleware, registered before any routes:
 *  - helmet: sensible security headers (HSTS, no-sniff, frameguard, etc.)
 *  - cors: only the configured browser origins, with credentials for cookies
 *  - cookie: parses/serialises the httpOnly refresh-token cookie
 *  - rateLimit: a global ceiling; auth routes tighten this further per-route
 */
export async function registerSecurity(app: FastifyInstance): Promise<void> {
  await app.register(helmet, {
    // The API is JSON-only and served cross-origin to the SPA; CSP here would
    // only constrain non-existent HTML responses, so we disable it.
    contentSecurityPolicy: false,
  });

  await app.register(cors, {
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });

  await app.register(cookie);

  await app.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: '1 minute',
    // Disabled under test so the suite isn't throttled.
    skipOnError: false,
    allowList: isTest ? () => true : undefined,
  });
}
