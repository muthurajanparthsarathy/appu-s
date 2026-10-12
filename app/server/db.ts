import 'server-only';
import { PrismaClient } from '@/app/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
const globalDb = globalThis as unknown as { veenaDb?: PrismaClient };
export function db() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required in database mode');
  return globalDb.veenaDb ??= new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
}
