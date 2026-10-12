import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductForm } from '@/app/components/ProductForm';
import { ProductVisual } from '@/app/components/ProductCard';
import { getCategories } from '@/app/server/catalog';
import { db } from '@/app/server/db';
import { requireAdmin } from '@/app/server/session';
export const metadata = { title: 'Edit product' };
export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  await requireAdmin();
  const product = await db().product.findUnique({ where: { id: (await params).id } });
  if (!product) notFound();
  const sold = await db().orderItem.aggregate({ where: { productId: product.id, order: { status: { not: 'CANCELLED' } } }, _sum: { quantity: true } });
  return <>
    <div className="breadcrumb"><Link href="/admin/products">Products</Link> / {product.name}</div>
    {(await searchParams).saved && <div className="form-success banner" role="status">Product created.</div>}
    <div className="order-header"><div><h1>{product.name}</h1><p className="muted">{sold._sum.quantity ?? 0} packs sold (excluding cancelled orders) · {product.active ? <Link href={`/product/${product.slug}`}>View in store →</Link> : 'Hidden from store'}</p></div>
      <div className="admin-preview"><ProductVisual product={product}/></div></div>
    <section className="panel"><ProductForm product={product} categories={await getCategories()}/></section>
  </>;
}
