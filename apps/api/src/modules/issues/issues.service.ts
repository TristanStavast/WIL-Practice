import { prisma } from '../../lib/prisma.js';
import { requireMembership } from '../../lib/authz.js';
import { BadRequest, NotFound } from '../../lib/errors.js';
import type {
  CreateIssueInput,
  UpdateIssueInput,
  ListIssuesQuery,
} from './issues.schemas.js';

const issueSelect = {
  id: true,
  number: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  labels: true,
  createdAt: true,
  updatedAt: true,
  reporter: { select: { id: true, name: true } },
  assignee: { select: { id: true, name: true } },
} as const;

const serialize = <T extends { labels: string }>(issue: T) => ({
  ...issue,
  labels: issue.labels ? issue.labels.split(';').filter(Boolean) : [],
});

// Confirm a proposed assignee is actually a member of the project; you can't
// assign issues to people who can't see the project.
async function assertAssigneeIsMember(
  projectId: string,
  assigneeId: string | null | undefined,
) {
  if (!assigneeId) return;
  const member = await prisma.membership.findUnique({
    where: { userId_projectId: { userId: assigneeId, projectId } },
    select: { id: true },
  });
  if (!member) throw BadRequest('Assignee must be a member of the project');
}

export async function listIssues(
  userId: string,
  projectId: string,
  query: ListIssuesQuery,
) {
  await requireMembership(userId, projectId);
  const issues = await prisma.issue.findMany({
    where: { projectId, status: query.status, assigneeId: query.assigneeId },
    orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    select: issueSelect,
  });
  return issues.map(serialize);
}

export async function createIssue(
  userId: string,
  projectId: string,
  input: CreateIssueInput,
) {
  await requireMembership(userId, projectId);
  await assertAssigneeIsMember(projectId, input.assigneeId);

  // Allocate the next per-project issue number inside a transaction so two
  // concurrent creates can't collide on the [projectId, number] unique index.
  return prisma.$transaction(async (tx) => {
    const last = await tx.issue.findFirst({
      where: { projectId },
      orderBy: { number: 'desc' },
      select: { number: true },
    });
    const number = last?.number ?? 0;
    const created = await tx.issue.create({
      data: {
        projectId,
        number,
        title: input.title,
        description: input.description,
        status: input.status,
        priority: input.priority,
        labels: input.labels.join(','),
        reporterId: userId,
        assigneeId: input.assigneeId ?? null,
      },
      select: issueSelect,
    });
    return serialize(created);
  });
}

async function getOwnedIssue(projectId: string, issueId: string) {
  const issue = await prisma.issue.findFirst({
    where: { id: issueId, projectId },
    select: issueSelect,
  });
  if (!issue) throw NotFound('Issue not found');
  return issue;
}

export async function getIssue(
  userId: string,
  projectId: string,
  issueId: string,
) {
  await requireMembership(userId, projectId);
  return serialize(await getOwnedIssue(projectId, issueId));
}

export async function updateIssue(
  userId: string,
  projectId: string,
  issueId: string,
  input: UpdateIssueInput,
) {
  await requireMembership(userId, projectId);
  await getOwnedIssue(projectId, issueId); // 404 if it isn't in this project
  await assertAssigneeIsMember(projectId, input.assigneeId);

  const updated = await prisma.issue.update({
    where: { id: issueId },
    data: {
      ...input,
      labels: input.labels ? input.labels.join(',') : undefined,
    },
    select: issueSelect,
  });
  return serialize(updated);
}

export async function deleteIssue(
  userId: string,
  projectId: string,
  issueId: string,
) {
  await requireMembership(userId, projectId);
  await getOwnedIssue(projectId, issueId);
  await prisma.issue.delete({ where: { id: issueId } });
}
