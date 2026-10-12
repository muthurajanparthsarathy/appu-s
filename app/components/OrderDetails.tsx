import Link from 'next/link';
import { Check } from 'lucide-react';
import type { Order, OrderEvent, OrderItem } from '@/app/generated/prisma/client';
import { formatDateTime } from '@/app/lib/format';
import { money } from '@/app/lib/money';
import { formatSlot } from '@/app/server/delivery';
import { STATUS_LABEL, TRACKING_STEPS, paymentLabel } from '@/app/server/order-rules';
import { ProductVisual } from './ProductCard';

type Address = { fullName: string; phone: string; line1: string; line2?: string | null; landmark?: string | null; city: string; pincode: string };
export type FullOrder = Order & { items: OrderItem[]; events: OrderEvent[] };

export function TrackingSteps({ order }: { order: Order }) {
  if (order.status === 'CANCELLED' || order.status === 'PENDING_PAYMENT') return null;
  const reached = TRACKING_STEPS.indexOf(order.status);
  return <ol className="tracking" aria-label="Order progress">{TRACKING_STEPS.map((step, index) => <li key={step} className={index <= reached ? 'done' : ''} aria-current={index === reached ? 'step' : undefined}>
    <span>{index <= reached ? <Check size={14}/> : index + 1}</span>{STATUS_LABEL[step]}
  </li>)}</ol>;
}

export function OrderBody({ order, showActors = false }: { order: FullOrder; showActors?: boolean }) {
  const address = order.addressSnapshot as Address;
  return <div className="order-detail-grid">
    <section className="panel">
      <h2>Items</h2>
      <ul className="order-items">{order.items.map(item => <li key={item.id}>
        <span className="cart-thumb"><ProductVisual product={{ name: item.productName, imageUrl: item.imageUrl }}/></span>
        <span><Link href={`/product/${item.productSlug}`}>{item.productName}</Link><small>{item.unit} · {money(item.unitPricePaise)} × {item.quantity}{item.quantity > item.paidQuantity && <> · <b className="free-note">{item.quantity - item.paidQuantity} free</b></>}</small></span>
        <strong>{money(item.lineTotalPaise)}</strong>
      </li>)}</ul>
      <div className="order-totals">
        <p><span>Subtotal</span><strong>{money(order.subtotalPaise)}</strong></p>
        <p><span>Delivery</span><strong>{order.deliveryPaise ? money(order.deliveryPaise) : 'FREE'}</strong></p>
        <p className="total"><span>Total</span><strong>{money(order.totalPaise)}</strong></p>
        {order.savingsPaise > 0 && <small className="muted">You saved {money(order.savingsPaise)} on MRP.</small>}
      </div>
    </section>
    <section className="panel">
      <h2>Delivery</h2>
      <p className="address-block"><strong>{address.fullName}</strong><br/>{address.line1}{address.line2 ? <><br/>{address.line2}</> : null}{address.landmark ? <><br/>Near {address.landmark}</> : null}<br/>{address.city} {address.pincode}<br/>📞 {address.phone}</p>
      <p><strong>Slot:</strong> {formatSlot(order.slotStart, order.slotEnd)}</p>
      <h2>Payment</h2>
      <p>{order.paymentMethod === 'COD' ? 'Cash on delivery' : 'Online (Razorpay)'} · <strong>{paymentLabel(order.paymentMethod, order.paymentStatus, order.status)}</strong></p>
      {order.cancelReason && <p className="muted">Cancellation reason: {order.cancelReason}</p>}
      <h2>History</h2>
      <ol className="event-log">{order.events.map(event => <li key={event.id}><time>{formatDateTime(event.createdAt)}</time> {event.note}{showActors && <small> · {event.actor}</small>}</li>)}</ol>
    </section>
  </div>;
}
