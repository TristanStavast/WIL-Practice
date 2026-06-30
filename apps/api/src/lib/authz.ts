import type { Role } from '@prisma/client';
import { prisma } from './prisma.js';
import { Forbidden, NotFound } from './errors.js';

/**
 * The single choke point for project access control. Every project-scoped
 * route calls this before touching data, so authorization can't be forgotten
 * in one handler and present in another.
 *
 * Returns the caller's membership. Note we throw NotFound (not Forbidden) when
 * the user isn't a member, so we don't reveal that a project id exists to
 * someone with no access to it.
 */
export async function requireMembership(
  userId: string,
  projectId: string,
  minRole?: Role,
): Promise<{ role: Role }> {
  const membership = await prisma.membership.findUnique({
    where: { userId_projectId: { userId, projectId } },
    select: { role: true },
  });

  if (!membership) throw NotFound('Project not found');

  if (minRole === 'OWNER' && membership.role !== 'OWNER') {
    throw Forbidden('Only the project owner can perform this action');
  }

  return membership;
}
