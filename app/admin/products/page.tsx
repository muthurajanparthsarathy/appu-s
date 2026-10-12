import Link from 'next/link';
import { Pagination } from '@/app/components/Pagination';
import { money } from '@/app/lib/money';
import { db } from '@/app/server/db';
import { requireAdmin } from '@/app/server/session';
export const metadata = { title: 'Products' };
const PAGE_SIZE = 40;
export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const q = params.q?.trim().slice(0, 100);
  const page = Math.max(1, Math.min(1000, Number(params.page) || 1));
  const where = q ? { OR: [{ name: { contains: q, mode: 'insensitive' as const } }, { brand: { contains: q, mode: 'insensitive' as const } }, { slug: { contains: q.toLowerCase() } }] } : {};
  const [total, products] = await Promise.all([
    db().product.count({ where }),
    db().product.findMany({ where, orderBy: { name: 'asc' }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { category: { select: { name: true } } } })
  ]);
  return <>
    <div className="order-header"><h1>Products</h1><Link className="button" href="/admin/products/new">+ New product</Link></div>
    <form className="filters" action="/admin/products"><input name="q" defaultValue={q} placeholder="Search name, brand or slug" aria-label="Search products"/><button className="button small">Search</button></form>
    <p className="muted">{total} product{total === 1 ? '' : 's'}</p>
    <div className="table-scroll"><table className="admin-table"><thead><tr><th></th><th>Product</th><th>Category</th><th>Price</th><th>MRP</th><th>Stock</th><th>Status</th></tr></thead><tbody>
      {products.map(p => <tr key={p.id}>
        <td aria-hidden="true">{p.icon}</td>
        <td><Link href={`/admin/products/${p.id}`}><strong>{p.name}</strong></Link><br/><small className="muted">{p.brand} · {p.unit}</small></td>
        <td>{p.category.name}</td>
        <td>{p.pricePaise ? money(p.pricePaise) : <span className="badge status-pending_payment">Needs price</span>}</td>
        <td>{p.mrpPaise ? money(p.mrpPaise) : '—'}</td>
        <td className={p.stock === 0 ? 'field-error' : p.stock <= 5 ? 'warn' : ''}>{p.stock}</td>
        <td>{p.active ? <span className="badge status-confirmed">Visible</span> : <span className="badge status-cancelled">Hidden</span>}{p.featured && <span className="badge">Featured</span>}{p.offer === 'BOGO' && <span className="badge">Buy 1 Get 1</span>}</td>
      </tr>)}
    </tbody></table></div>
    <Pagination basePath="/admin/products" params={{ q }} page={page} pageCount={Math.max(1, Math.ceil(total / PAGE_SIZE))}/>
  </>;
}
