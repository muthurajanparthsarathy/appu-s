import Link from 'next/link';
import { DatabaseRequired } from '@/app/components/DatabaseRequired';
import { CheckoutForm } from '@/app/components/checkout/CheckoutForm';
import { AddressForm } from '@/app/components/AddressForm';
import { isDatabaseMode, razorpayConfig } from '@/app/server/config';
import { db } from '@/app/server/db';
import { availableSlots } from '@/app/server/delivery';
import { requireUser } from '@/app/server/session';
export const metadata = { title: 'Checkout' };
export default async function CheckoutPage() {
  if (!isDatabaseMode()) return <DatabaseRequired feature="Checkout"/>;
  const user = await requireUser('/checkout');
  const addresses = await db().address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] });
  const active = new Set((await db().serviceArea.findMany({ where: { pincode: { in: addresses.map(a => a.pincode) }, active: true }, select: { pincode: true } })).map(a => a.pincode));
  const slots = availableSlots().map(({ id, dayLabel, timeLabel }) => ({ id, dayLabel, timeLabel }));
  return <main className="wrap checkout-page">
    <div className="breadcrumb"><Link href="/cart">Basket</Link> / Checkout</div>
    <h1>Checkout</h1>
    {addresses.length ? <CheckoutForm
      addresses={addresses.map(a => ({ id: a.id, label: `${a.fullName} · ${a.line1}${a.line2 ? `, ${a.line2}` : ''}, ${a.city} ${a.pincode}`, phone: a.phone, serviceable: active.has(a.pincode), isDefault: a.isDefault }))}
      slots={slots} razorpayEnabled={Boolean(razorpayConfig())}/>
      : <section className="panel"><h2>Where should we deliver?</h2><p className="muted">Add your delivery address to continue. We currently deliver in Coimbatore.</p><AddressForm next="/checkout"/></section>}
  </main>;
}
