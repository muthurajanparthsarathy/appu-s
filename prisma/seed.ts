import 'dotenv/config';
import { PrismaClient } from '../app/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { categories, catalogProducts } from '../app/data/catalog';
import { DEFAULT_SERVICE_AREA, DEFAULT_SERVICE_PINCODES } from '../app/server/delivery';
import { hashPassword, PASSWORD_MIN } from '../app/server/password';

if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL to a new VeenaMart database first.');
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

// Additive and idempotent: inserts what is missing and never overwrites catalog, pincode or account edits.
async function main() {
  await db.$transaction(async tx => {
    for (const [position, category] of categories.entries()) await tx.category.upsert({ where: { slug: category.slug }, create: { ...category, position }, update: {} });
    for (const product of catalogProducts) await tx.product.upsert({ where: { slug: product.slug }, create: product, update: {} });
    // Fill in photos only where none is set yet, so images chosen later in the admin are never overwritten.
    for (const category of categories) if (category.imageUrl) await tx.category.updateMany({ where: { slug: category.slug, imageUrl: null }, data: { imageUrl: category.imageUrl } });
    for (const product of catalogProducts) if (product.imageUrl) await tx.product.updateMany({ where: { slug: product.slug, imageUrl: null }, data: { imageUrl: product.imageUrl } });
    await tx.serviceArea.createMany({ data: DEFAULT_SERVICE_PINCODES.map(pincode => ({ pincode, area: DEFAULT_SERVICE_AREA })), skipDuplicates: true });
  });
  console.log(`Catalog and ${DEFAULT_SERVICE_PINCODES.length} default delivery pincodes ensured. Existing records were preserved.`);

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? '';
  if (!email) return console.log('ADMIN_EMAIL not set: no admin account created.');
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== 'ADMIN') await db.user.update({ where: { email }, data: { role: 'ADMIN' } });
    return console.log(`Admin ${email} ensured (password unchanged).`);
  }
  if (password.length < PASSWORD_MIN) throw new Error(`Set ADMIN_PASSWORD (at least ${PASSWORD_MIN} characters) to create the admin account.`);
  await db.user.create({ data: { email, name: 'Admin', role: 'ADMIN', passwordHash: await hashPassword(password) } });
  console.log(`Admin ${email} created. Password is the ADMIN_PASSWORD value in .env.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
