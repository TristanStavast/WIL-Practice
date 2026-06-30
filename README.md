# DevBoard

A project & issue tracker — a small but production-shaped full-stack app.
Create projects, invite collaborators, track issues on a Kanban board, and
discuss them in comments. Built to demonstrate real authentication and
authorization rather than a toy CRUD demo.

```
Angular 19 (SPA)  ──►  Fastify + TypeScript API  ──►  Prisma  ──►  SQLite
```

## Why these choices

| Concern    | Choice                | Reason |
|------------|-----------------------|--------|
| Frontend   | Angular 19, standalone + signals | Modern, batteries-included SPA |
| Backend    | Fastify + TypeScript  | Fast, first-class TS, schema-based validation |
| ORM        | Prisma                | Type-safe queries, painless migrations |
| Database   | SQLite                | **Zero setup** — just a file. Swap to Postgres for prod by changing one line (see below) |
| Auth       | JWT access + rotating refresh tokens | Short-lived access tokens, refresh tokens revocable server-side |

## Prerequisites

- Node.js ≥ 20
- npm ≥ 10

## Quick start

```bash
# 1. Install all dependencies (root API workspace + Angular app)
npm install
npm --prefix apps/web install

# 2. Configure the API
cp apps/api/.env.example apps/api/.env
#    then edit apps/api/.env and set strong JWT secrets (≥ 32 chars each):
#    node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

# 3. Create the database and seed demo data
npm run db:setup --workspace apps/api

# 4. Run API + web together
npm run dev
```

- Web app: <http://localhost:4200>
- API:     <http://localhost:3000> (health check at `/health`)

The Angular dev server proxies `/api/*` to the API (see `apps/web/proxy.conf.json`),
so the browser treats everything as same-origin and the httpOnly refresh cookie
just works.

### Demo login

```
email:    demo@devboard.dev
password: demopassword123
```

(A second seeded user `sam@devboard.dev` shares the same password, so you can
test collaboration.)

## Security model

This project treats auth/authz as the headline feature:

- **Password hashing** with argon2id (memory-hard), never plaintext.
- **Access tokens** are short-lived JWTs, kept only in memory on the client
  (never `localStorage`) so XSS can't exfiltrate them.
- **Refresh tokens** are opaque random strings stored as an httpOnly,
  SameSite=strict cookie scoped to `/api/auth`. The server persists only a
  SHA-256 *hash*, and **rotates** the token on every refresh — a reused
  (already-rotated) token is rejected, which surfaces token theft.
- **Validation as a trust boundary**: every request body/query is parsed with
  a Zod schema before any handler logic runs.
- **Authorization choke point**: every project-scoped route goes through
  `requireMembership()`. Non-members get `404` (not `403`) so project
  existence isn't leaked.
- **No user enumeration**: login returns an identical response and runs an
  argon2 verification whether or not the email exists.
- **Defense in depth**: Helmet security headers, strict CORS allow-list,
  global + per-auth-route rate limiting, env validation on boot, and a central
  error handler that never leaks internals or stack traces.

## Tests

```bash
npm run test:api
```

Integration tests run the full Fastify app in-process against a disposable
SQLite database and cover the auth flow (hashing, rotation, no enumeration)
and authorization boundaries (non-members can't read/write a project,
collaborators can't delete it, assignees must be members, etc.).

## Going to production

The only database change required is in `apps/api/prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"   // was "sqlite"
  url      = env("DATABASE_URL")
}
```

Point `DATABASE_URL` at your Postgres instance, run `prisma migrate deploy`,
and set `NODE_ENV=production`, `COOKIE_SECURE=true` (behind HTTPS), and strong
secrets. No application code changes.

## Project layout

```
apps/
├── api/                     Fastify + Prisma backend
│   ├── prisma/              schema, migrations, seed
│   └── src/
│       ├── config/env.ts    validated environment
│       ├── lib/             prisma client, tokens, errors, authz
│       ├── plugins/         security (helmet/cors/rate-limit), auth decorator
│       ├── modules/         auth, projects, issues, comments (routes+service+schemas)
│       ├── app.ts           builds the app (testable)
│       └── server.ts        listens + graceful shutdown
└── web/                     Angular SPA
    └── src/app/
        ├── core/            models, auth service, HTTP interceptor, guard, API client
        └── pages/           login, register, projects, project-detail
```
