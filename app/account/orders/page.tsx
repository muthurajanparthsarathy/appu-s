import Link from 'next/link';
import { PackageCheck } from 'lucide-react';
import { DatabaseRequired } from '@/app/components/DatabaseRequired';
import { formatDate } from '@/app/lib/format';
import { money, orderNumber } from '@/app/lib/money';
import { isDatabaseMode } from '@/app/server/config';
import { STATUS_LABEL } from '@/app/server/order-rules';
import { listOrdersForUser, releaseExpiredReservations } from '@/app/server/orders';
import { requireUser } from '@/app/server/session';
export const metadata = { title: 'My orders' };
export default async function OrdersPage() {
  if (!isDatabaseMode()) return <DatabaseRequired feature="Order history"/>;
  const user = await requireUser('/account/orders');
  await releaseExpiredReservations();
  const orders = await listOrdersForUser(user.id);
  return <main className="wrap account-page">
    <div className="breadcrumb"><Link href="/account">Account</Link> / Orders</div>
    <h1>My orders</h1>
    {orders.length ? <ul className="order-list">{orders.map(order => <li key={order.id}><Link href={`/account/orders/${order.id}`} className="order-row">
      <span className="order-icons" aria-hidden="true">{order.items.slice(0, 4).map(item => item.icon).join('')}</span>
      <span><strong>{orderNumber(order.number)}</strong><small>{formatDate(order.createdAt)} · {order.items.reduce((sum, item) => sum + item.quantity, 0)} items</small></span>
      <span className={`badge status-${order.status.toLowerCase()}`}>{STATUS_LABEL[order.status]}</span>
      <strong>{money(order.totalPaise)}</strong>
    </Link></li>)}</ul>
      : <div className="empty-state"><PackageCheck size={42}/><h2>No orders yet</h2><p>Your orders will appear here once you check out.</p><Link className="button" href="/shop">Start shopping</Link></div>}
  </main>;
}
