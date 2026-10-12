import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { cancelMyOrder } from '@/app/actions/account';
import { ActionButton } from '@/app/components/forms';
import { OrderBody, TrackingSteps } from '@/app/components/OrderDetails';
import { PayNowButton } from '@/app/components/checkout/PayNowButton';
import { DatabaseRequired } from '@/app/components/DatabaseRequired';
import { formatDateTime, formatTime } from '@/app/lib/format';
import { money, orderNumber } from '@/app/lib/money';
import { isDatabaseMode, razorpayConfig } from '@/app/server/config';
import { CUSTOMER_CANCELLABLE, STATUS_LABEL } from '@/app/server/order-rules';
import { getOrderForUser, releaseExpiredReservations } from '@/app/server/orders';
import { requireUser } from '@/app/server/session';
export const metadata = { title: 'Order details' };
export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ placed?: string; paid?: string }> }) {
  if (!isDatabaseMode()) return <DatabaseRequired feature="Order tracking"/>;
  const { id } = await params;
  const user = await requireUser(`/account/orders/${id}`);
  await releaseExpiredReservations();
  const order = await getOrderForUser(user.id, id);
  if (!order) notFound();
  const flags = await searchParams;
  const awaitingPayment = order.status === 'PENDING_PAYMENT';
  return <main className="wrap account-page">
    <div className="breadcrumb"><Link href="/account">Account</Link> / <Link href="/account/orders">Orders</Link> / {orderNumber(order.number)}</div>
    {flags.placed && order.status === 'CONFIRMED' && <div className="form-success banner" role="status"><CheckCircle2/> Thank you! Your order is confirmed. We’ll deliver it in your chosen slot.</div>}
    {flags.paid && order.paymentStatus === 'PAID' && <div className="form-success banner" role="status"><CheckCircle2/> Payment received. Your order is confirmed.</div>}
    <div className="order-header">
      <div><span className="eyebrow">ORDER {orderNumber(order.number)}</span><h1>{STATUS_LABEL[order.status]}</h1><p className="muted">Placed {formatDateTime(order.createdAt)} · {money(order.totalPaise)}</p></div>
      <div className="order-actions">
        {awaitingPayment && razorpayConfig() && <PayNowButton orderId={order.id} label={`Pay ${money(order.totalPaise)}`}/>}
        {CUSTOMER_CANCELLABLE.includes(order.status) && <ActionButton action={cancelMyOrder.bind(null, order.id)} label="Cancel order" pendingLabel="Cancelling…" className="button secondary" confirmText="Cancel this order? Items will be released back to the store."/>}
      </div>
    </div>
    {awaitingPayment && order.reservedUntil && <div className="form-alert banner">Complete payment by {formatTime(order.reservedUntil)} to keep these items. Unpaid orders are cancelled automatically and nothing is charged.</div>}
    <TrackingSteps order={order}/>
    <OrderBody order={order}/>
  </main>;
}
