import Link from 'next/link';
import { OrderStatus, PaymentStatus } from '@/app/generated/prisma/enums';
import { Pagination } from '@/app/components/Pagination';
import { formatDateTime } from '@/app/lib/format';
import { money, orderNumber } from '@/app/lib/money';
import { db } from '@/app/server/db';
import { requireAdmin } from '@/app/server/session';
import { formatSlot } from '@/app/server/delivery';
import { STATUS_LABEL, paymentLabel } from '@/app/server/order-rules';
import { releaseExpiredReservations } from '@/app/server/orders';
export const metadata = { title: 'Orders' };
const PAGE_SIZE = 30;
export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string; payment?: string; page?: string; q?: string }> }) {
  await requireAdmin();
  await releaseExpiredReservations();
  const params = await searchParams;
  const status = Object.values(OrderStatus).find(s => s === params.status);
  const payment = Object.values(PaymentStatus).find(s => s === params.payment);
  const number = Number(params.q?.trim().replace(/^(AM|VM)/i, ''));
  const page = Math.max(1, Math.min(1000, Number(params.page) || 1));
  const where = { ...(status ? { status } : {}), ...(payment ? { paymentStatus: payment } : {}), ...(Number.isInteger(number) && number > 0 ? { number } : {}) };
  const [total, orders] = await Promise.all([
    db().order.count({ where }),
    db().order.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { user: { select: { name: true } } } })
  ]);
  return <>
    <h1>Orders</h1>
    <form className="filters" action="/admin/orders">
      <input name="q" defaultValue={params.q} placeholder="Order no. e.g. AM100001" aria-label="Order number"/>
      <select name="status" defaultValue={status ?? ''} aria-label="Status"><option value="">All statuses</option>{Object.values(OrderStatus).map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select>
      <select name="payment" defaultValue={payment ?? ''} aria-label="Payment"><option value="">All payments</option>{Object.values(PaymentStatus).map(s => <option key={s} value={s}>{s.replace('_', ' ').toLowerCase()}</option>)}</select>
      <button className="button small">Filter</button>
    </form>
    <p className="muted">{total} order{total === 1 ? '' : 's'}</p>
    {orders.length ? <div className="table-scroll"><table className="admin-table"><thead><tr><th>Order</th><th>Placed</th><th>Customer</th><th>Slot</th><th>Status</th><th>Payment</th><th>Total</th></tr></thead><tbody>
      {orders.map(order => <tr key={order.id}>
        <td><Link href={`/admin/orders/${order.id}`}><strong>{orderNumber(order.number)}</strong></Link></td>
        <td>{formatDateTime(order.createdAt)}</td>
        <td>{order.user.name}<br/><small className="muted">{order.pincode}</small></td>
        <td>{formatSlot(order.slotStart, order.slotEnd)}</td>
        <td><span className={`badge status-${order.status.toLowerCase()}`}>{STATUS_LABEL[order.status]}</span></td>
        <td>{paymentLabel(order.paymentMethod, order.paymentStatus, order.status)}</td>
        <td>{money(order.totalPaise)}</td>
      </tr>)}
    </tbody></table></div> : <p>No orders match.</p>}
    <Pagination basePath="/admin/orders" params={{ status, payment, q: params.q }} page={page} pageCount={Math.max(1, Math.ceil(total / PAGE_SIZE))}/>
  </>;
}
