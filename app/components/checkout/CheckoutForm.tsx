'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import { Banknote, CreditCard, MapPin, ShoppingBag, Timer } from 'lucide-react';
import { useCart } from '@/app/components/CartProvider';
import { useQuote } from '@/app/components/cart/useQuote';
import { money } from '@/app/lib/money';
import type { SlotOption } from '@/app/lib/types';
import { payWithRazorpay, type RazorpayCheckout } from './razorpay';

type AddressOption = { id: string; label: string; phone: string; serviceable: boolean; isDefault: boolean };

export function CheckoutForm({ addresses, slots, razorpayEnabled }: { addresses: AddressOption[]; slots: SlotOption[]; razorpayEnabled: boolean }) {
  const router = useRouter();
  const { lines, ready, clear } = useCart();
  const { quote, error: quoteError, pending: quotePending } = useQuote(lines, ready);
  const [addressId, setAddressId] = useState(addresses.find(a => a.serviceable)?.id ?? '');
  const [slotId, setSlotId] = useState(slots[0]?.id ?? '');
  const [method, setMethod] = useState<'COD' | 'RAZORPAY'>('COD');
  const [error, setError] = useState('');
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState<{ orderUrl: string; online: boolean } | null>(null);
  // One idempotency key per distinct submission: retries of the same basket reuse it, edits get a new one.
  const attempt = useRef<{ payload: string; key: string } | null>(null);
  const days = useMemo(() => [...new Set(slots.map(slot => slot.dayLabel))], [slots]);

  if (placed) return <div className="panel placed-state" role="status">
    <h2>{placed.online ? 'Complete your payment' : 'Order placed!'}</h2>
    <p>{placed.online ? 'Finish paying in the secure Razorpay window. Your items are held for 15 minutes.' : 'Taking you to your order…'}</p>
    {error && <div className="form-alert" role="alert">{error}</div>}
    <Link className="button" href={placed.orderUrl}>View my order</Link>
  </div>;
  if (!ready) return <p className="loading">Loading your basket…</p>;
  if (!lines.length) return <div className="empty-state"><ShoppingBag size={42}/><h2>Your basket is empty</h2><p>Add some groceries before checking out.</p><Link className="button" href="/shop">Start shopping</Link></div>;

  async function placeOrder() {
    setError('');
    const payload = JSON.stringify({ items: lines, addressId, slotId, paymentMethod: method });
    // getRandomValues (unlike randomUUID) also works on plain-http LAN addresses used for phone testing.
    if (attempt.current?.payload !== payload) attempt.current = { payload, key: Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('') };
    setPlacing(true);
    try {
      const response = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...JSON.parse(payload), idempotencyKey: attempt.current.key }) });
      const data = await response.json().catch(() => ({})) as { orderId?: string; razorpay?: RazorpayCheckout; error?: string };
      if (!response.ok || !data.orderId) {
        // Definite failures (4xx, or 502 = payment start failed and the attempt was cancelled) make the next click a new
        // attempt. Ambiguous ones (other 5xx, network errors) keep the key so a retry can never create a second order.
        if (response.status < 500 || response.status === 502) attempt.current = null;
        throw new Error(data.error ?? 'Could not place your order.');
      }
      // The order now holds the stock, so the device basket is emptied whichever payment path follows.
      clear();
      const orderUrl = `/account/orders/${data.orderId}`;
      setPlaced({ orderUrl, online: Boolean(data.razorpay) });
      if (!data.razorpay) return router.push(`${orderUrl}?placed=1`);
      await payWithRazorpay(data.razorpay, {
        onVerified: () => router.push(`${orderUrl}?paid=1`),
        onDismiss: () => router.push(orderUrl),
        onError: message => setError(message)
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not place your order.');
      setPlacing(false);
    }
  }

  const canPlace = Boolean(quote && !quotePending && addressId && slotId && !placing);
  return <div className="checkout-layout">
    <div className="checkout-steps">
      <section className="panel" aria-labelledby="address-heading">
        <h2 id="address-heading"><MapPin size={20}/> Delivery address</h2>
        <div className="choice-list" role="radiogroup" aria-labelledby="address-heading">
          {addresses.map(address => <label key={address.id} className={`choice${address.serviceable ? '' : ' unavailable'}`}>
            <input type="radio" name="address" value={address.id} checked={addressId === address.id} disabled={!address.serviceable} onChange={() => setAddressId(address.id)}/>
            <span><strong>{address.label}</strong><small>📞 {address.phone}{address.isDefault ? ' · Default' : ''}{address.serviceable ? '' : ' · We don’t deliver here yet'}</small></span>
          </label>)}
        </div>
        <Link href="/account/addresses?next=/checkout" className="text-link">+ Add another address</Link>
      </section>

      <section className="panel" aria-labelledby="slot-heading">
        <h2 id="slot-heading"><Timer size={20}/> Delivery slot</h2>
        {slots.length ? days.map(day => <fieldset key={day} className="slot-day"><legend>{day}</legend><div className="slot-grid">
          {slots.filter(slot => slot.dayLabel === day).map(slot => <label key={slot.id} className={`slot${slotId === slot.id ? ' selected' : ''}`}>
            <input type="radio" name="slot" value={slot.id} checked={slotId === slot.id} onChange={() => setSlotId(slot.id)}/>{slot.timeLabel}
          </label>)}
        </div></fieldset>) : <p className="field-error">No delivery slots are open right now. Please check back soon.</p>}
      </section>

      <section className="panel" aria-labelledby="payment-heading">
        <h2 id="payment-heading"><CreditCard size={20}/> Payment</h2>
        <div className="choice-list" role="radiogroup" aria-labelledby="payment-heading">
          <label className="choice"><input type="radio" name="payment" checked={method === 'COD'} onChange={() => setMethod('COD')}/><span><strong><Banknote size={16}/> Cash on delivery</strong><small>Pay in cash or UPI when your groceries arrive.</small></span></label>
          <label className={`choice${razorpayEnabled ? '' : ' unavailable'}`}><input type="radio" name="payment" checked={method === 'RAZORPAY'} disabled={!razorpayEnabled} onChange={() => setMethod('RAZORPAY')}/><span><strong><CreditCard size={16}/> UPI, cards &amp; netbanking</strong><small>{razorpayEnabled ? 'Secure online payment via Razorpay. Items are held for 15 minutes while you pay.' : 'Online payment is not available yet.'}</small></span></label>
        </div>
      </section>
    </div>

    <aside className="order-summary">
      <h2>Order summary</h2>
      {quoteError ? <p role="alert" className="field-error">{quoteError} <Link href="/cart">Review basket</Link></p> : quotePending || !quote ? <p role="status">Updating prices…</p> : <>
        <ul className="summary-items">{quote.items.map(item => <li key={item.product.id}><span>{item.product.icon} {item.product.name} × {item.quantity}</span><span>{money(item.lineTotalPaise)}</span></li>)}</ul>
        <p><span>Subtotal</span><strong>{money(quote.subtotalPaise)}</strong></p>
        <p><span>Delivery</span><strong>{quote.deliveryPaise ? money(quote.deliveryPaise) : 'FREE'}</strong></p>
        <p className="total"><span>Total</span><strong>{money(quote.totalPaise)}</strong></p>
        {quote.savingsPaise > 0 && <div className="savings">You’re saving {money(quote.savingsPaise)}.</div>}
      </>}
      {error && <div className="form-alert" role="alert">{error}</div>}
      <button type="button" className="button checkout-button" disabled={!canPlace} onClick={placeOrder}>{placing ? 'Placing your order…' : method === 'COD' ? 'Place order' : `Pay ${quote ? money(quote.totalPaise) : ''}`}</button>
      <small className="muted">Prices include taxes. Final amount is confirmed by our server when you place the order.</small>
    </aside>
  </div>;
}
