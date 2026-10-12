import { isDatabaseMode } from '@/app/server/config';
import { json } from '@/app/server/request';

// Liveness plus database readiness: 503 when database mode is on but PostgreSQL is unreachable.
export async function GET() {
  const base = { service: 'veenamart', catalogSource: isDatabaseMode() ? 'database' : 'demo' };
  if (!isDatabaseMode()) return json({ status: 'ok', ...base, database: 'not-configured' });
  try {
    await (await import('@/app/server/db')).db().$queryRaw`SELECT 1`;
    return json({ status: 'ok', ...base, database: 'ok' });
  } catch { return json({ status: 'degraded', ...base, database: 'unavailable' }, 503); }
}
