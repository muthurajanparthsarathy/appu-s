import 'server-only';
import { db } from './db';

// Fixed-window counter stored in PostgreSQL so limits hold across server instances.
// Timestamps are compared in UTC to match how Prisma stores DateTime columns.
export async function consumeRateLimit(key: string, limit: number, windowSeconds: number) {
  const [row] = await db().$queryRaw<{ count: number; resetAt: Date }[]>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt")
    VALUES (${key}, 1, (now() AT TIME ZONE 'UTC') + ${windowSeconds}::int * interval '1 second')
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."resetAt" <= (now() AT TIME ZONE 'UTC') THEN 1 ELSE "RateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimit"."resetAt" <= (now() AT TIME ZONE 'UTC') THEN (now() AT TIME ZONE 'UTC') + ${windowSeconds}::int * interval '1 second' ELSE "RateLimit"."resetAt" END
    RETURNING "count", "resetAt"`;
  if (Math.random() < 0.01) await db().rateLimit.deleteMany({ where: { resetAt: { lt: new Date(Date.now() - 86_400_000) } } });
  const retryAfterSeconds = Math.max(1, Math.ceil((new Date(row.resetAt).getTime() - Date.now()) / 1000));
  return { ok: row.count <= limit, retryAfterSeconds };
}
