// Integration tests for accounts against the database in DATABASE_URL (run: npm run test:db).
import 'dotenv/config';
import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Prisma } from '../../app/generated/prisma/client';
import { db } from '../../app/server/db';

const skip = !process.env.DATABASE_URL && 'DATABASE_URL not set';
const run = randomUUID().slice(0, 8);

describe('accounts', { skip }, () => {
  const ids: string[] = [];
  after(async () => {
    await db().user.deleteMany({ where: { id: { in: ids } } });
    await db().$disconnect();
  });
  const create = async (name: string, phone: string | null) => {
    const user = await db().user.create({ data: { email: `test-${run}-${name}@veenamart.test`, name, phone, passwordHash: 'disabled' } });
    ids.push(user.id);
    return user;
  };

  test('a mobile number belongs to one account; accounts without one are unaffected', async () => {
    const phone = '9' + String(Math.floor(Math.random() * 1e9)).padStart(9, '0');
    const first = await create('first', phone);
    await assert.rejects(create('second', phone), (error: unknown) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002');
    assert.equal((await db().user.findUnique({ where: { phone } }))?.id, first.id, 'sign-in by mobile finds the owner');
    await create('no-phone-a', null);
    await create('no-phone-b', null);
  });
});
