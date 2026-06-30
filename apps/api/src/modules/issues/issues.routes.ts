import type { FastifyInstance } from 'fastify';
import {
  createIssueSchema,
  updateIssueSchema,
  listIssuesQuerySchema,
} from './issues.schemas.js';
import * as svc from './issues.service.js';

// Mounted at /api/projects/:projectId/issues
export async function issueRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (req) => {
    const { projectId } = req.params as { projectId: string };
    const query = listIssuesQuerySchema.parse(req.query);
    return { issues: await svc.listIssues(req.user!.id, projectId, query) };
  });

  app.post('/', async (req, reply) => {
    const { projectId } = req.params as { projectId: string };
    const input = createIssueSchema.parse(req.body);
    const issue = await svc.createIssue(req.user!.id, projectId, input);
    return reply.code(201).send({ issue });
  });

  app.get('/:issueId', async (req) => {
    const { projectId, issueId } = req.params as {
      projectId: string;
      issueId: string;
    };
    return { issue: await svc.getIssue(req.user!.id, projectId, issueId) };
  });

  app.patch('/:issueId', async (req) => {
    const { projectId, issueId } = req.params as {
      projectId: string;
      issueId: string;
    };
    const input = updateIssueSchema.parse(req.body);
    return {
      issue: await svc.updateIssue(req.user!.id, projectId, issueId, input),
    };
  });

  app.delete('/:issueId', async (req, reply) => {
    const { projectId, issueId } = req.params as {
      projectId: string;
      issueId: string;
    };
    await svc.deleteIssue(req.user!.id, projectId, issueId);
    return reply.code(204).send();
  });
}
