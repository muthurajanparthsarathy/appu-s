import Link from 'next/link';
import { DELIVERY_FEE_PAISE, FREE_DELIVERY_PAISE } from '@/app/server/pricing';
import { SLOT_CUTOFF_MINUTES, SLOT_DAYS, SLOT_WINDOWS } from '@/app/server/delivery';
import { RESERVATION_MINUTES } from '@/app/server/config';
import { money } from '@/app/lib/money';
export const metadata = { title: 'Delivery & cancellations' };
const hour = (h: number) => `${h % 12 || 12} ${h < 12 ? 'am' : 'pm'}`;
// Describes the rules the system actually enforces; keep in sync with delivery.ts, pricing.ts and order-rules.ts.
export default function DeliveryHelp() {
  return <main className="wrap prose-page">
    <div className="breadcrumb"><Link href="/">Home</Link> / Help</div>
    <h1>Delivery &amp; cancellations</h1>
    <h2>Where we deliver</h2>
    <p>We are starting in Coimbatore. Use “Deliver to” at the top of any page to check your pincode. Addresses outside our delivery area can’t be used at checkout yet.</p>
    <h2>Delivery charges</h2>
    <p>Delivery is {money(DELIVERY_FEE_PAISE)} for orders below {money(FREE_DELIVERY_PAISE)} and free from {money(FREE_DELIVERY_PAISE)}. Prices shown include taxes.</p>
    <h2>Delivery slots</h2>
    <p>Choose a slot at checkout: {SLOT_WINDOWS.map(w => `${hour(w.startHour)}–${hour(w.endHour)}`).join(', ')}, up to {SLOT_DAYS} days ahead. Slots close {SLOT_CUTOFF_MINUTES / 60} hours before they start so we have time to pack your order.</p>
    <h2>Paying</h2>
    <p>Pay cash (or UPI to the delivery partner) on delivery, or pay online when available. Online orders hold your items for {RESERVATION_MINUTES} minutes; if payment isn’t completed in time the order is cancelled automatically and nothing is charged.</p>
    <h2>Cancelling</h2>
    <p>You can cancel from <Link href="/account/orders">My orders</Link> until we start packing. Once an order is packing or on its way, please contact the store. If you paid online for an order that gets cancelled, it is marked for refund to your original payment method.</p>
  </main>;
}
