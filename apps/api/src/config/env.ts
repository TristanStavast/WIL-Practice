import { z } from 'zod';

// Load .env into process.env using Node's built-in loader (no dotenv dep).
// In production the file is usually absent and config comes from real env
// vars, so a missing file is fine — swallow that case only.
try {
  process.loadEnvFile();
} catch {
  /* no .env file present — rely on the ambient environment */
}

/**
 * Environment is validated once, at boot. If anything is missing or malformed
 * the process exits immediately with a readable error instead of failing
 * mysteriously deep inside a request handler later.
 */
const EnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Secrets must be long enough to be meaningful. Refuse weak ones up front.
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),

  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),

  // Comma-separated list of allowed browser origins for CORS.
  CORS_ORIGINS: z.string().default('http://localhost:4200'),

  // Set true only behind HTTPS in production so refresh cookies get Secure.
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

function loadEnv() {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    // eslint-disable-next-line no-console
    console.error(`\nInvalid environment configuration:\n${issues}\n`);
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();
export type Env = typeof env;

export const corsOrigins = env.CORS_ORIGINS.split(',')
  .map((o) => o.trim())
  .filter(Boolean);

export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
