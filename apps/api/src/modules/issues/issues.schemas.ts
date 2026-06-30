import { z } from 'zod';

const STATUSES = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'] as const;
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

export const createIssueSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(10000).trim().optional(),
  status: z.enum(STATUSES).default('BACKLOG'),
  priority: z.enum(PRIORITIES).default('MEDIUM'),
  labels: z.array(z.string().min(1).max(30).trim()).max(10).default([]),
  assigneeId: z.string().cuid().nullable().optional(),
});

export const updateIssueSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(10000).trim().nullable().optional(),
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  labels: z.array(z.string().min(1).max(30).trim()).max(10).optional(),
  assigneeId: z.string().cuid().nullable().optional(),
});

export const listIssuesQuerySchema = z.object({
  status: z.enum(STATUSES).optional(),
  assigneeId: z.string().cuid().optional(),
});

export type CreateIssueInput = z.infer<typeof createIssueSchema>;
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>;
export type ListIssuesQuery = z.infer<typeof listIssuesQuerySchema>;
