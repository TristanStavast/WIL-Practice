import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { makeApp, resetDb, auth, registerUser } from './helpers.js';
import { prisma } from '../src/lib/prisma.js';

let app: FastifyInstance;

beforeEach(async () => {
  app = await makeApp();
  await resetDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function createProject(token: string, key = 'PROJ') {
  const res = await app.inject({
    method: 'POST',
    url: '/api/projects',
    headers: auth(token),
    payload: { key, name: `${key} project` },
  });
  return res.json().project;
}

describe('project authorization', () => {
  it('creator becomes OWNER and sees the project in their list', async () => {
    const { token } = await registerUser(app);
    const project = await createProject(token);
    const list = await app.inject({
      method: 'GET',
      url: '/api/projects',
      headers: auth(token),
    });
    expect(list.json().projects).toHaveLength(1);
    expect(list.json().projects[0].id).toBe(project.id);
  });

  it('a non-member gets 404 (not 403) — project existence is not leaked', async () => {
    const owner = await registerUser(app, { email: 'owner@test.dev' });
    const outsider = await registerUser(app, { email: 'outsider@test.dev' });
    const project = await createProject(owner.token);

    const res = await app.inject({
      method: 'GET',
      url: `/api/projects/${project.id}`,
      headers: auth(outsider.token),
    });
    expect(res.statusCode).toBe(404);
  });

  it('a non-member cannot create issues in the project', async () => {
    const owner = await registerUser(app, { email: 'o2@test.dev' });
    const outsider = await registerUser(app, { email: 'out2@test.dev' });
    const project = await createProject(owner.token);

    const res = await app.inject({
      method: 'POST',
      url: `/api/projects/${project.id}/issues`,
      headers: auth(outsider.token),
      payload: { title: 'sneaky issue' },
    });
    expect(res.statusCode).toBe(404);
    expect(await prisma.issue.count()).toBe(0);
  });

  it('a COLLABORATOR cannot delete the project but an OWNER can', async () => {
    const owner = await registerUser(app, { email: 'o3@test.dev' });
    const collab = await registerUser(app, { email: 'c3@test.dev' });
    const project = await createProject(owner.token);

    // Owner adds the collaborator.
    await app.inject({
      method: 'POST',
      url: `/api/projects/${project.id}/members`,
      headers: auth(owner.token),
      payload: { email: 'c3@test.dev', role: 'COLLABORATOR' },
    });

    const collabDelete = await app.inject({
      method: 'DELETE',
      url: `/api/projects/${project.id}`,
      headers: auth(collab.token),
    });
    expect(collabDelete.statusCode).toBe(403);

    const ownerDelete = await app.inject({
      method: 'DELETE',
      url: `/api/projects/${project.id}`,
      headers: auth(owner.token),
    });
    expect(ownerDelete.statusCode).toBe(204);
  });

  it('a collaborator can read and create issues once added', async () => {
    const owner = await registerUser(app, { email: 'o4@test.dev' });
    const collab = await registerUser(app, { email: 'c4@test.dev' });
    const project = await createProject(owner.token);
    await app.inject({
      method: 'POST',
      url: `/api/projects/${project.id}/members`,
      headers: auth(owner.token),
      payload: { email: 'c4@test.dev' },
    });

    const created = await app.inject({
      method: 'POST',
      url: `/api/projects/${project.id}/issues`,
      headers: auth(collab.token),
      payload: { title: 'collab issue', labels: ['x'] },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().issue.number).toBe(1);
    expect(created.json().issue.labels).toEqual(['x']);
  });

  it('issue numbers increment per-project independently', async () => {
    const { token } = await registerUser(app);
    const a = await createProject(token, 'AAA');
    const b = await createProject(token, 'BBB');

    const mk = (pid: string, title: string) =>
      app.inject({
        method: 'POST',
        url: `/api/projects/${pid}/issues`,
        headers: auth(token),
        payload: { title },
      });

    expect((await mk(a.id, 'a1')).json().issue.number).toBe(1);
    expect((await mk(a.id, 'a2')).json().issue.number).toBe(2);
    expect((await mk(b.id, 'b1')).json().issue.number).toBe(1);
  });

  it('rejects an assignee who is not a project member', async () => {
    const owner = await registerUser(app, { email: 'o5@test.dev' });
    const stranger = await registerUser(app, { email: 's5@test.dev' });
    const project = await createProject(owner.token);

    const res = await app.inject({
      method: 'POST',
      url: `/api/projects/${project.id}/issues`,
      headers: auth(owner.token),
      payload: { title: 'assign to stranger', assigneeId: stranger.userId },
    });
    expect(res.statusCode).toBe(400);
  });
});
