import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * Runs once before the whole suite. Deletes any leftover test database file,
 * then pushes the Prisma schema into a fresh test.db so tests run against a
 * real (but disposable) SQLite database that exactly matches the schema — no
 * mocking the data layer.
 *
 * We delete the file ourselves rather than using `prisma db push --force-reset`
 * so there's no destructive Prisma command to gate; recreating from an empty
 * file is non-destructive.
 */
export default function setup(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const dbPath = resolve(here, '..', 'prisma', 'test.db');
  for (const f of [dbPath, `${dbPath}-journal`]) {
    if (existsSync(f)) rmSync(f);
  }

  execSync('npx prisma db push --skip-generate', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
  });
}
