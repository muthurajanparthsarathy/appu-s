import 'server-only';
import { categories, products } from '@/app/data/catalog';
import type { Category, Product, ProductPage } from '@/app/lib/types';
import { isDatabaseMode } from './config';

export type CatalogQuery = { category?: string; q?: string; sort?: string; offers?: boolean; featured?: boolean };
export const PAGE_SIZE = 24;

// Only these fields leave the server; internal columns (active, timestamps) stay out of client payloads.
export const productSelect = { id: true, slug: true, name: true, categorySlug: true, brand: true, unit: true, pricePaise: true, mrpPaise: true, stock: true, icon: true, imageUrl: true, offer: true, description: true, featured: true } as const;

const database = async () => (await import('./db')).db();
const search = (q?: string) => q?.trim().slice(0, 100) || undefined;

export async function getCategories(): Promise<Category[]> {
  if (!isDatabaseMode()) return categories;
  return (await database()).category.findMany({ orderBy: { position: 'asc' }, select: { slug: true, name: true, icon: true, imageUrl: true } });
}

async function databaseWhere(query: CatalogQuery) {
  const client = await database();
  const q = search(query.q);
  return {
    active: true,
    ...(query.category ? { categorySlug: query.category } : {}),
    ...(query.featured ? { featured: true } : {}),
    ...(query.offers ? { mrpPaise: { gt: client.product.fields.pricePaise } } : {}),
    ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' as const } }, { brand: { contains: q, mode: 'insensitive' as const } }] } : {})
  };
}

const databaseOrder = (sort?: string) => sort === 'price-asc' ? [{ pricePaise: 'asc' as const }, { name: 'asc' as const }] : sort === 'price-desc' ? [{ pricePaise: 'desc' as const }, { name: 'asc' as const }] : [{ featured: 'desc' as const }, { name: 'asc' as const }];

function demoFilter(query: CatalogQuery) {
  const q = search(query.q)?.toLowerCase();
  let result = products.filter(p => (!query.category || p.categorySlug === query.category) && (!query.featured || p.featured) && (!q || `${p.name} ${p.brand}`.toLowerCase().includes(q)) && (!query.offers || p.mrpPaise > p.pricePaise));
  if (query.sort === 'price-asc') result = result.toSorted((a, b) => a.pricePaise - b.pricePaise);
  if (query.sort === 'price-desc') result = result.toSorted((a, b) => b.pricePaise - a.pricePaise);
  return result;
}

// Small unpaginated lists (home rows, related products).
export async function getProducts(query: CatalogQuery = {}, limit = 24): Promise<Product[]> {
  if (!isDatabaseMode()) return demoFilter(query).slice(0, limit);
  return (await database()).product.findMany({ where: await databaseWhere(query), orderBy: databaseOrder(query.sort), take: limit, select: productSelect });
}

export async function getProductPage(query: CatalogQuery, requestedPage: unknown): Promise<ProductPage> {
  const parsed = Number(requestedPage);
  const page = Number.isInteger(parsed) && parsed > 0 && parsed <= 1000 ? parsed : 1;
  if (!isDatabaseMode()) {
    const all = demoFilter(query);
    return { products: all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), total: all.length, page, pageCount: Math.max(1, Math.ceil(all.length / PAGE_SIZE)) };
  }
  const client = await database();
  const where = await databaseWhere(query);
  const [total, rows] = await Promise.all([
    client.product.count({ where }),
    client.product.findMany({ where, orderBy: databaseOrder(query.sort), skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, select: productSelect })
  ]);
  return { products: rows, total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getProduct(slug: string): Promise<Product | null> {
  if (!isDatabaseMode()) return products.find(p => p.slug === slug) ?? null;
  return (await database()).product.findFirst({ where: { slug, active: true }, select: productSelect });
}

export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (!isDatabaseMode()) return products.filter(p => ids.includes(p.id));
  return (await database()).product.findMany({ where: { id: { in: ids }, active: true }, select: productSelect });
}
