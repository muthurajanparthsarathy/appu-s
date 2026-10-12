import Link from 'next/link';
import { money } from '@/app/lib/money';
import { db } from '@/app/server/db';
import { releaseExpiredReservations } from '@/app/server/orders';
import { istMidnightUtc } from '@/app/server/delivery';
import { requireAdmin } from '@/app/server/session';
export const metadata = { title: 'Dashboard' };
const LOW_STOCK = 5;
export default async function AdminDashboard() {
  await requireAdmin();
  await releaseExpiredReservations();
  const client = db();
  const today = new Date(istMidnightUtc(new Date()));
  const [toPack, outForDelivery, awaitingPayment, refundsDue, todayOrders, lowStock] = await Promise.all([
    client.order.count({ where: { status: { in: ['CONFIRMED', 'PACKING'] } } }),
    client.order.count({ where: { status: 'OUT_FOR_DELIVERY' } }),
    client.order.count({ where: { status: 'PENDING_PAYMENT' } }),
    client.order.count({ where: { paymentStatus: 'REFUND_DUE' } }),
    client.order.aggregate({ where: { createdAt: { gte: today }, status: { not: 'CANCELLED' } }, _count: true, _sum: { totalPaise: true } }),
    client.product.findMany({ where: { active: true, stock: { lte: LOW_STOCK } }, orderBy: { stock: 'asc' }, take: 10, select: { id: true, name: true, stock: true, unit: true } })
  ]);
  const tiles = [
    { label: 'To confirm & pack', value: toPack, href: '/admin/orders?status=CONFIRMED' },
    { label: 'Out for delivery', value: outForDelivery, href: '/admin/orders?status=OUT_FOR_DELIVERY' },
    { label: 'Awaiting payment', value: awaitingPayment, href: '/admin/orders?status=PENDING_PAYMENT' },
    { label: 'Refunds due', value: refundsDue, href: '/admin/orders?payment=REFUND_DUE' }
  ];
  return <>
    <h1>Dashboard</h1>
    <p className="muted">Today (IST): {todayOrders._count} order{todayOrders._count === 1 ? '' : 's'} · {money(todayOrders._sum.totalPaise ?? 0)}</p>
    <div className="stat-grid">{tiles.map(tile => <Link key={tile.label} href={tile.href} className="stat-tile"><strong>{tile.value}</strong><span>{tile.label}</span></Link>)}</div>
    <section className="panel"><h2>Low stock (≤ {LOW_STOCK})</h2>
      {lowStock.length ? <table className="admin-table"><thead><tr><th>Product</th><th>Pack</th><th>Stock</th></tr></thead><tbody>{lowStock.map(p => <tr key={p.id}><td><Link href={`/admin/products/${p.id}`}>{p.name}</Link></td><td>{p.unit}</td><td className={p.stock === 0 ? 'field-error' : ''}>{p.stock}</td></tr>)}</tbody></table> : <p className="muted">All active products have healthy stock.</p>}
    </section>
  </>;
}
