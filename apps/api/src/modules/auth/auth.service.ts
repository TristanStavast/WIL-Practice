import argon2 from 'argon2';
import { prisma } from '../../lib/prisma.js';
import { Conflict, Unauthorized } from '../../lib/errors.js';
import {
  generateRefreshToken,
  hashToken,
  refreshTokenExpiry,
  signAccessToken,
} from '../../lib/tokens.js';
import type { RegisterInput, LoginInput } from './auth.schemas.js';

// argon2id is the modern, memory-hard default. These params are a sensible
// balance for an interactive login; raise memoryCost for higher-value systems.
const ARGON_OPTS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
};

export interface AuthResult {
  accessToken: string;
  refreshToken: string; // raw value — caller sets it as an httpOnly cookie
  user: { id: string; email: string; name: string };
}

async function issueTokens(user: {
  id: string;
  email: string;
  name: string;
}): Promise<AuthResult> {
  const accessToken = signAccessToken({ sub: user.id, email: user.email });
  const { raw, hash } = generateRefreshToken();
  await prisma.refreshToken.create({
    data: { tokenHash: hash, userId: user.id, expiresAt: refreshTokenExpiry() },
  });
  return { accessToken, refreshToken: raw, user };
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (existing) throw Conflict('An account with that email already exists');

  const passwordHash = await argon2.hash(input.password, ARGON_OPTS);
  const user = await prisma.user.create({
    data: { email: input.email, name: input.name, passwordHash },
    select: { id: true, email: true, name: true },
  });
  return issueTokens(user);
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  // Always run a verification to keep timing roughly constant whether or not
  // the email exists — avoids leaking which emails are registered.
  const hash =
    user?.passwordHash ??
    '$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHRzb21lc2FsdA$3hb1pxR3uBfh5Vj4tF5sQF1mQ8m2qN0tqg4qZ1Yk5g';
  const ok = await argon2.verify(hash, input.password).catch(() => false);

  if (!user || !ok) throw Unauthorized('Invalid email or password');
  return issueTokens({ id: user.id, email: user.email, name: user.name });
}

/**
 * Rotation: the presented refresh token is revoked and a brand-new one issued.
 * If a revoked/expired token is presented we reject — this also detects token
 * theft (a stolen-then-rotated token will fail for the attacker or victim).
 */
export async function refresh(rawToken: string): Promise<AuthResult> {
  const tokenHash = hashToken(rawToken);
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!record || record.revokedAt || record.expiresAt < new Date()) {
    throw Unauthorized('Invalid or expired session');
  }

  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revokedAt: new Date() },
  });

  return issueTokens({
    id: record.user.id,
    email: record.user.email,
    name: record.user.name,
  });
}

export async function logout(rawToken: string | undefined): Promise<void> {
  if (!rawToken) return;
  const tokenHash = hashToken(rawToken);
  // Best-effort revoke; never error on logout.
  await prisma.refreshToken
    .updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    .catch(() => undefined);
}
