import type { FastifyInstance } from 'fastify';
import {
  createProjectSchema,
  updateProjectSchema,
  addMemberSchema,
} from './projects.schemas.js';
import * as svc from './projects.service.js';

export async function projectRoutes(app: FastifyInstance): Promise<void> {
  // Every route in this module requires authentication.
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (req) => {
    return { projects: await svc.listProjectsForUser(req.user!.id) };
  });

  app.post('/', async (req, reply) => {
    const input = createProjectSchema.parse(req.body);
    const project = await svc.createProject(req.user!.id, input);
    return reply.code(201).send({ project });
  });

  app.get('/:projectId', async (req) => {
    const { projectId } = req.params as { projectId: string };
    return { project: await svc.getProject(req.user!.id, projectId) };
  });

  app.patch('/:projectId', async (req) => {
    const { projectId } = req.params as { projectId: string };
    const input = updateProjectSchema.parse(req.body);
    return { project: await svc.updateProject(req.user!.id, projectId, input) };
  });

  app.delete('/:projectId', async (req, reply) => {
    const { projectId } = req.params as { projectId: string };
    await svc.deleteProject(req.user!.id, projectId);
    return reply.code(204).send();
  });

  app.post('/:projectId/members', async (req, reply) => {
    const { projectId } = req.params as { projectId: string };
    const input = addMemberSchema.parse(req.body);
    const project = await svc.addMember(req.user!.id, projectId, input);
    return reply.code(201).send({ project });
  });
}
