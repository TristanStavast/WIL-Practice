import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { requireMembership } from '../../lib/authz.js';
import { Conflict, NotFound } from '../../lib/errors.js';
import type {
  CreateProjectInput,
  UpdateProjectInput,
  AddMemberInput,
} from './projects.schemas.js';

export async function listProjectsForUser(userId: string) {
  return prisma.project.findMany({
    where: { memberships: { some: { userId } } },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      key: true,
      name: true,
      description: true,
      updatedAt: true,
      _count: { select: { issues: true, memberships: true } },
    },
  });
}

export async function createProject(userId: string, input: CreateProjectInput) {
  try {
    // Creating a project makes the creator its OWNER, atomically.
    return await prisma.project.create({
      data: {
        key: input.key,
        name: input.name,
        description: input.description,
        memberships: { create: { userId, role: 'OWNER' } },
      },
      select: { id: true, key: true, name: true, description: true },
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      throw Conflict(`Project key "${input.key}" is already taken`);
    }
    throw e;
  }
}

export async function getProject(userId: string, projectId: string) {
  await requireMembership(userId, projectId);
  return prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    select: {
      id: true,
      key: true,
      name: true,
      description: true,
      createdAt: true,
      memberships: {
        select: {
          role: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });
}

export async function updateProject(
  userId: string,
  projectId: string,
  input: UpdateProjectInput,
) {
  await requireMembership(userId, projectId, 'OWNER');
  return prisma.project.update({
    where: { id: projectId },
    data: input,
    select: { id: true, key: true, name: true, description: true },
  });
}

export async function deleteProject(userId: string, projectId: string) {
  await requireMembership(userId, projectId, 'OWNER');
  await prisma.project.delete({ where: { id: projectId } });
}

export async function addMember(
  userId: string,
  projectId: string,
  input: AddMemberInput,
) {
  await requireMembership(userId, projectId, 'OWNER');

  const target = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (!target) throw NotFound('No user with that email');

  try {
    await prisma.membership.create({
      data: { userId: target.id, projectId, role: input.role },
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      throw Conflict('That user is already a member');
    }
    throw e;
  }
  return getProject(userId, projectId);
}
