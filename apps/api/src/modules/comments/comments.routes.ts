import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { requireMembership } from '../../lib/authz.js';
import { Forbidden, NotFound } from '../../lib/errors.js';

const createCommentSchema = z.object({
  body: z.string().min(1).max(5000).trim(),
});

const commentSelect = {
  id: true,
  body: true,
  createdAt: true,
  author: { select: { id: true, name: true } },
} as const;

async function assertIssueInProject(projectId: string, issueId: string) {
  const issue = await prisma.issue.findFirst({
    where: { id: issueId, projectId },
    select: { id: true },
  });
  if (!issue) throw NotFound('Issue not found');
}

// Mounted at /api/projects/:projectId/issues/:issueId/comments
export async function commentRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (req) => {
    const { projectId, issueId } = req.params as {
      projectId: string;
      issueId: string;
    };
    await requireMembership(req.user!.id, projectId);
    await assertIssueInProject(projectId, issueId);
    const comments = await prisma.comment.findMany({
      where: { issueId },
      orderBy: { createdAt: 'asc' },
      select: commentSelect,
    });
    return { comments };
  });

  app.post('/', async (req, reply) => {
    const { projectId, issueId } = req.params as {
      projectId: string;
      issueId: string;
    };
    await requireMembership(req.user!.id, projectId);
    await assertIssueInProject(projectId, issueId);
    const input = createCommentSchema.parse(req.body);
    const comment = await prisma.comment.create({
      data: { body: input.body, issueId, authorId: req.user!.id },
      select: commentSelect,
    });
    return reply.code(201).send({ comment });
  });

  app.delete('/:commentId', async (req, reply) => {
    const { projectId, issueId, commentId } = req.params as {
      projectId: string;
      issueId: string;
      commentId: string;
    };
    const membership = await requireMembership(req.user!.id, projectId);
    await assertIssueInProject(projectId, issueId);

    const comment = await prisma.comment.findFirst({
      where: { id: commentId, issueId },
      select: { id: true, authorId: true },
    });
    if (!comment) throw NotFound('Comment not found');

    // You can delete your own comment; a project OWNER can delete any.
    if (comment.authorId !== req.user!.id && membership.role !== 'OWNER') {
      throw Forbidden('You can only delete your own comments');
    }
    await prisma.comment.delete({ where: { id: commentId } });
    return reply.code(204).send();
  });
}
