import 'server-only';
import { cache } from 'react';
import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import type { SessionUser } from '@/app/lib/types';
import { db } from './db';
import { isDatabaseMode } from './config';

const COOKIE = 'vm_session';
const SESSION_DAYS = 30;
// Without "remember this device" the cookie lasts until the browser closes, and the server session at most this long.
const SHORT_SESSION_HOURS = 12;
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const userSelect = { id: true, email: true, name: true, phone: true, role: true } as const;

export async function createSession(userId: string, remember = true) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + (remember ? SESSION_DAYS * 86_400_000 : SHORT_SESSION_HOURS * 3_600_000));
  await db().session.create({ data: { id: hashToken(token), userId, expiresAt } });
  await db().session.deleteMany({ where: { userId, expiresAt: { lt: new Date() } } });
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', ...(remember ? { expires: expiresAt } : {}) });
}

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  if (!isDatabaseMode()) return null;
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const session = await db().session.findUnique({ where: { id: hashToken(token) }, select: { expiresAt: true, user: { select: userSelect } } });
  return session && session.expiresAt > new Date() ? session.user : null;
});

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db().session.deleteMany({ where: { id: hashToken(token) } });
  jar.delete(COOKIE);
}

export async function requireUser(next: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

// Non-admins get a 404 so the admin area is not advertised.
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/admin');
  if (user.role !== 'ADMIN') notFound();
  return user;
}
