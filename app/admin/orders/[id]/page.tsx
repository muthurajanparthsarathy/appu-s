import Link from 'next/link';
import { notFound } from 'next/navigation';
import { advanceOrderAction, cancelOrderAction, refundOrderAction } from '@/app/actions/admin';
import { ActionButton, ActionForm, Field } from '@/app/components/forms';
import { OrderBody, TrackingSteps } from '@/app/components/OrderDetails';
import { formatDateTime } from '@/app/lib/format';
import { orderNumber } from '@/app/lib/money';
import { db } from '@/app/server/db';
import { requireAdmin } from '@/app/server/session';
import { ADMIN_CANCELLABLE, NEXT_STATUS, STATUS_LABEL } from '@/app/server/order-rules';
export const metadata = { title: 'Order' };
export default async function AdminOrder({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const order = await db().order.findUnique({ where: { id }, include: { items: true, events: { orderBy: { createdAt: 'asc' } }, user: { select: { name: true, email: true, phone: true } } } });
  if (!order) notFound();
  const next = NEXT_STATUS[order.status];
  return <>
    <div className="breadcrumb"><Link href="/admin/orders">Orders</Link> / {orderNumber(order.number)}</div>
    <div className="order-header">
      <div><span className="eyebrow">ORDER {orderNumber(order.number)} · {formatDateTime(order.createdAt)}</span><h1>{STATUS_LABEL[order.status]}</h1>
        <p className="muted">{order.user.name} · {order.user.email}{order.user.phone ? ` · ${order.user.phone}` : ''}</p></div>
      <div className="order-actions">
        {next && <ActionButton action={advanceOrderAction.bind(null, order.id)} label={`Mark as ${STATUS_LABEL[next].toLowerCase()}`} pendingLabel="Updating…" className="button" confirmText={next === 'DELIVERED' && order.paymentMethod === 'COD' ? 'Mark delivered and record the cash as collected?' : undefined}/>}
      </div>
    </div>
    <TrackingSteps order={order}/>
    <div className="admin-actions">
      {ADMIN_CANCELLABLE.includes(order.status) && <section className="panel"><h2>Cancel order</h2><p className="muted">Stock is returned to inventory. Paid online orders are marked “refund due”.</p>
        <ActionForm action={cancelOrderAction.bind(null, order.id)} submitLabel="Cancel order" pendingLabel="Cancelling…" submitClassName="button danger"><Field name="reason" label="Reason shown to the customer" required maxLength={200} placeholder="e.g. Item damaged in packing"/></ActionForm></section>}
      {order.paymentStatus === 'REFUND_DUE' && <section className="panel"><h2>Record refund</h2><p className="muted">Issue the refund in the Razorpay dashboard first, then record it here.</p>
        <ActionForm action={refundOrderAction.bind(null, order.id)} submitLabel="Mark refunded"><Field name="reference" label="Refund reference" maxLength={100} placeholder="rfnd_…"/></ActionForm></section>}
    </div>
    <OrderBody order={order} showActors/>
  </>;
}
