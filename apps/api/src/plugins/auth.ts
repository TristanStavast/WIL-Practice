import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { verifyAccessToken } from '../lib/tokens.js';
import { Unauthorized } from '../lib/errors.js';

export interface AuthUser {
  id: string;
  email: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }
  interface FastifyInstance {
    /** preHandler that requires a valid access token; sets request.user. */
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

async function authPlugin(app: FastifyInstance): Promise<void> {
  app.decorate(
    'authenticate',
    async (req: FastifyRequest, _reply: FastifyReply): Promise<void> => {
      const header = req.headers.authorization;
      if (!header?.startsWith('Bearer ')) {
        throw Unauthorized('Missing bearer token');
      }
      const token = header.slice('Bearer '.length).trim();
      try {
        const payload = verifyAccessToken(token);
        req.user = { id: payload.sub, email: payload.email };
      } catch {
        // Don't distinguish expired vs malformed vs forged — all 401.
        throw Unauthorized('Invalid or expired token');
      }
    },
  );
}

export default fp(authPlugin, { name: 'auth' });
