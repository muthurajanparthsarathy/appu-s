'use server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Prisma } from '@/app/generated/prisma/client';
import type { ActionResult } from '@/app/lib/types';
import { isDatabaseMode } from '@/app/server/config';
import { db } from '@/app/server/db';
import { burnPasswordCheck, hashPassword, verifyPassword } from '@/app/server/password';
import { consumeRateLimit } from '@/app/server/rate-limit';
import { clientIp } from '@/app/server/request';
import { createSession, destroySession } from '@/app/server/session';
import { normalizeEmail, parseRegistration, safeNextPath } from '@/app/server/validation';

const unavailable = { error: 'Accounts need database mode. See README → Database mode.' };
const wait = (seconds: number) => `Too many attempts. Please try again in ${Math.ceil(seconds / 60)} minute${seconds > 60 ? 's' : ''}.`;

export async function login(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseMode()) return unavailable;
  const email = normalizeEmail(formData.get('email'));
  const password = String(formData.get('password') ?? '');
  if (!email || !password) return { error: 'Enter your email and password.' };
  const ip = clientIp(await headers());
  // The per-account bucket does not depend on the (spoofable) client address, so it caps guessing on one account.
  for (const [key, max] of [[`login:${ip}:${email}`, 8], [`login-ip:${ip}`, 40], [`login-acct:${email}`, 20]] as const) {
    const limit = await consumeRateLimit(key, max, 15 * 60);
    if (!limit.ok) return { error: wait(limit.retryAfterSeconds) };
  }
  const user = await db().user.findUnique({ where: { email }, select: { id: true, passwordHash: true } });
  const valid = user ? await verifyPassword(password, user.passwordHash) : await burnPasswordCheck(password);
  if (!user || !valid) return { error: 'Email or password is incorrect.' };
  await createSession(user.id);
  redirect(safeNextPath(formData.get('next')));
}

export async function register(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseMode()) return unavailable;
  const parsed = parseRegistration({ name: formData.get('name'), email: formData.get('email'), password: formData.get('password'), phone: formData.get('phone') });
  if (!parsed.ok) return { error: 'Please fix the highlighted details.', fieldErrors: parsed.errors };
  const limit = await consumeRateLimit(`register:${clientIp(await headers())}`, 5, 60 * 60);
  if (!limit.ok) return { error: wait(limit.retryAfterSeconds) };
  const { name, email, password, phone } = parsed.data;
  let userId: string;
  try {
    userId = (await db().user.create({ data: { name, email, phone, passwordHash: await hashPassword(password) }, select: { id: true } })).id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return { error: 'An account with this email already exists. Please sign in instead.', fieldErrors: { email: 'Already registered.' } };
    throw error;
  }
  await createSession(userId);
  redirect(safeNextPath(formData.get('next')));
}

export async function logout() {
  if (isDatabaseMode()) await destroySession();
  redirect('/');
}
