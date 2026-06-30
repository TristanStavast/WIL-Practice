import { PrismaClient } from '@prisma/client';
import { isProd, isTest } from '../config/env.js';

// A single shared client. `tsx watch` can re-evaluate modules on reload, so we
// stash the instance on globalThis in dev to avoid exhausting the connection
// pool with a new client per reload.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProd || isTest ? ['warn', 'error'] : ['query', 'warn', 'error'],
  });

if (!isProd) globalForPrisma.prisma = prisma;
