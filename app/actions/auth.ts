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
import { parseLoginIdentifier, parseRegistration, safeNextPath } from '@/app/server/validation';

const unavailable = { error: 'Accounts need database mode. See README → Database mode.' };
const wait = (seconds: number) => `Too many attempts. Please try again in ${Math.ceil(seconds / 60)} minute${seconds > 60 ? 's' : ''}.`;

export async function login(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseMode()) return unavailable;
  const identifier = parseLoginIdentifier(formData.get('identifier') ?? formData.get('email'));
  const password = String(formData.get('password') ?? '');
  if (!identifier || !password) return { error: 'Enter your email or 10-digit mobile number, and your password.' };
  const account = 'email' in identifier ? identifier.email : `mobile:${identifier.phone}`;
  const ip = clientIp(await headers());
  // The per-account bucket does not depend on the (spoofable) client address, so it caps guessing on one account.
  for (const [key, max] of [[`login:${ip}:${account}`, 8], [`login-ip:${ip}`, 40], [`login-acct:${account}`, 20]] as const) {
    const limit = await consumeRateLimit(key, max, 15 * 60);
    if (!limit.ok) return { error: wait(limit.retryAfterSeconds) };
  }
  const user = await db().user.findUnique({ where: 'email' in identifier ? { email: identifier.email } : { phone: identifier.phone }, select: { id: true, passwordHash: true } });
  const valid = user ? await verifyPassword(password, user.passwordHash) : await burnPasswordCheck(password);
  if (!user || !valid) return { error: 'Email/mobile number or password is incorrect.' };
  await createSession(user.id, formData.get('remember') === 'on');
  redirect(safeNextPath(formData.get('next')));
}

export async function register(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseMode()) return unavailable;
  const parsed = parseRegistration({ name: formData.get('name'), email: formData.get('email'), password: formData.get('password'), phone: formData.get('phone') });
  if (!parsed.ok) return { error: 'Please fix the highlighted details.', fieldErrors: parsed.errors };
  const limit = await consumeRateLimit(`register:${clientIp(await headers())}`, 5, 60 * 60);
  if (!limit.ok) return { error: wait(limit.retryAfterSeconds) };
  const { name, email, password, phone } = parsed.data;
  if (phone && await db().user.findUnique({ where: { phone }, select: { id: true } })) {
    return { error: 'An account with this mobile number already exists. Please sign in instead.', fieldErrors: { phone: 'Already registered.' } };
  }
  let userId: string;
  try {
    userId = (await db().user.create({ data: { name, email, phone, passwordHash: await hashPassword(password) }, select: { id: true } })).id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return { error: 'An account with this email or mobile number already exists. Please sign in instead.', fieldErrors: { email: 'Already registered?' } };
    throw error;
  }
  await createSession(userId);
  redirect(safeNextPath(formData.get('next')));
}

export async function logout() {
  if (isDatabaseMode()) await destroySession();
  redirect('/');
}
