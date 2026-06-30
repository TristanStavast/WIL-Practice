import { z } from 'zod';

export const createProjectSchema = z.object({
  key: z
    .string()
    .min(2)
    .max(8)
    .regex(/^[A-Z][A-Z0-9]*$/, 'Key must be uppercase letters/digits, e.g. DEV')
    .trim(),
  name: z.string().min(1).max(120).trim(),
  description: z.string().max(2000).trim().optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(120).trim().optional(),
  description: z.string().max(2000).trim().nullable().optional(),
});

export const addMemberSchema = z.object({
  email: z.string().email().max(254).toLowerCase().trim(),
  role: z.enum(['OWNER', 'COLLABORATOR']).default('COLLABORATOR'),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
