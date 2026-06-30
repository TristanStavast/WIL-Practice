import argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seeds a demo account and project so the app is usable immediately after
 * `npm run db:seed`. Idempotent — safe to run repeatedly.
 *
 *   Login:  demo@devboard.dev  /  demopassword123
 */
async function main() {
  const passwordHash = await argon2.hash('demopassword123', {
    type: argon2.argon2id,
  });

  const demo = await prisma.user.upsert({
    where: { email: 'demo@devboard.dev' },
    update: {},
    create: { email: 'demo@devboard.dev', name: 'Demo User', passwordHash },
  });

  const teammate = await prisma.user.upsert({
    where: { email: 'sam@devboard.dev' },
    update: {},
    create: { email: 'sam@devboard.dev', name: 'Sam Carter', passwordHash },
  });

  const existing = await prisma.project.findUnique({ where: { key: 'DEV' } });
  if (existing) {
    console.log('Seed already applied; demo project "DEV" exists.');
    return;
  }

  const project = await prisma.project.create({
    data: {
      key: 'DEV',
      name: 'DevBoard Core',
      description: 'The flagship demo project.',
      memberships: {
        create: [
          { userId: demo.id, role: 'OWNER' },
          { userId: teammate.id, role: 'COLLABORATOR' },
        ],
      },
    },
  });

  const issues = [
    { title: 'Set up CI pipeline', status: 'TODO', priority: 'HIGH', labels: 'infra' },
    { title: 'Design login screen', status: 'IN_PROGRESS', priority: 'MEDIUM', labels: 'ui,auth' },
    { title: 'Add password reset flow', status: 'BACKLOG', priority: 'LOW', labels: 'auth' },
    { title: 'Write API docs', status: 'DONE', priority: 'MEDIUM', labels: 'docs' },
  ] as const;

  let n = 0;
  for (const issue of issues) {
    n += 1;
    await prisma.issue.create({
      data: {
        projectId: project.id,
        number: n,
        title: issue.title,
        status: issue.status,
        priority: issue.priority,
        labels: issue.labels,
        reporterId: demo.id,
        assigneeId: n % 2 === 0 ? teammate.id : demo.id,
      },
    });
  }

  console.log('Seeded demo user, teammate, project DEV and 4 issues.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
