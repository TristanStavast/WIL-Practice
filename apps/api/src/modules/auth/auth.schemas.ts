import { z } from 'zod';

// Validation IS security here: these schemas are the trust boundary between
// the outside world and our handlers. Anything not described is stripped.
export const registerSchema = z.object({
  email: z.string().email().max(254).toLowerCase().trim(),
  name: z.string().min(1).max(80).trim(),
  password: z
    .string()
    .min(10, 'Password must be at least 10 characters')
    .max(128),
});

export const loginSchema = z.object({
  email: z.string().email().max(254).toLowerCase().trim(),
  password: z.string().min(1).max(128),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
