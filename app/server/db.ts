import 'server-only';
import { PrismaClient } from '@/app/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
const globalDb = globalThis as unknown as { veenaDb?: PrismaClient; veenaDbClass?: unknown };
export function db() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required in database mode');
  // The instance survives dev hot reloads; after `prisma generate` the class changes, so drop the stale client
  // (it would not know new columns) instead of requiring a dev-server restart.
  if (globalDb.veenaDb && globalDb.veenaDbClass !== PrismaClient) {
    void globalDb.veenaDb.$disconnect().catch(() => undefined);
    globalDb.veenaDb = undefined;
  }
  globalDb.veenaDbClass = PrismaClient;
  return globalDb.veenaDb ??= new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
}
