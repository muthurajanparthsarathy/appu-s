import { timingSafeEqual } from 'node:crypto';
import { isDatabaseMode } from '@/app/server/config';
import { json } from '@/app/server/request';
import { releaseExpiredReservations } from '@/app/server/orders';

// Expired holds are also released lazily during checkout and order views; schedule this every few minutes in production.
export async function GET(request: Request) {
  const secret = Buffer.from(process.env.CRON_SECRET ?? '');
  const given = Buffer.from(request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '');
  // Byte lengths (not string lengths) must match before timingSafeEqual, which throws on unequal buffers.
  if (!secret.length || given.length !== secret.length || !timingSafeEqual(given, secret)) return json({ error: 'Unauthorized' }, 401);
  if (!isDatabaseMode()) return json({ released: 0 });
  return json({ released: await releaseExpiredReservations() });
}
