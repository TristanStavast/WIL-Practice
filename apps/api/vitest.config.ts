import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // These win over .env because loadEnvFile() never overrides existing vars.
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'file:./test.db',
      JWT_ACCESS_SECRET: 'test-access-secret-at-least-32-characters-long',
      JWT_REFRESH_SECRET: 'test-refresh-secret-at-least-32-characters-long',
      CORS_ORIGINS: 'http://localhost:4200',
      COOKIE_SECURE: 'false',
    },
    include: ['test/**/*.test.ts'],
    globalSetup: ['test/global-setup.ts'],
    // Each test file gets its own process so the shared DB isn't raced across
    // files; within a file we reset state in beforeEach.
    fileParallelism: false,
    hookTimeout: 30000,
  },
});
