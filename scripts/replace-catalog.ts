// One-off: remove every product and category that is not in app/data/catalog.ts (the Appu's Mart catalogue),
// then run `npm run db:seed` to add the new ones. Order history is kept: order lines are snapshots, and the
// foreign key only unlinks them from the deleted product. Run: npx tsx scripts/replace-catalog.ts --confirm
import 'dotenv/config';
import { PrismaClient } from '../app/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { categories, catalogProducts } from '../app/data/catalog';

if (!process.argv.includes('--confirm')) {
  console.error('This permanently deletes products and categories that are not in app/data/catalog.ts. Re-run with --confirm.');
  process.exit(1);
}
if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL first.');
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const keepProducts = catalogProducts.map(p => p.slug);
  const keepCategories = categories.map(c => c.slug);
  const result = await db.$transaction(async tx => {
    const products = await tx.product.deleteMany({ where: { slug: { notIn: keepProducts } } });
    const leftovers = await tx.product.count({ where: { categorySlug: { notIn: keepCategories } } });
    if (leftovers) throw new Error(`${leftovers} kept products still use removed categories; fix app/data/catalog.ts first.`);
    const removedCategories = await tx.category.deleteMany({ where: { slug: { notIn: keepCategories } } });
    // Photos of removed products are no longer published; drop them from old order snapshots to avoid broken images.
    const snapshots = await tx.orderItem.updateMany({ where: { productId: null, imageUrl: { not: null } }, data: { imageUrl: null } });
    return { products: products.count, categories: removedCategories.count, snapshots: snapshots.count };
  });
  console.log(`Removed ${result.products} products and ${result.categories} categories; cleared ${result.snapshots} order-line photos. Now run: npm run db:seed`);
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
