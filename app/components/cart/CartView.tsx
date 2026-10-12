'use client';
import Link from 'next/link';
import { ArrowRight, ShoppingBag, Trash2 } from 'lucide-react';
import { useCart } from '@/app/components/CartProvider';
import { AddToCart } from '@/app/components/ShopControls';
import { ProductVisual } from '@/app/components/ProductCard';
import { money } from '@/app/lib/money';
import { FREE_DELIVERY_PAISE } from '@/app/server/pricing';
import { useQuote } from './useQuote';
export function CartView({ checkoutAvailable, signedIn }: { checkoutAvailable: boolean; signedIn: boolean }) {
  const { lines, ready, setQuantity } = useCart();
  const { quote, error, pending } = useQuote(lines, ready);
  if (!ready) return <main className="wrap loading">Loading your basket…</main>;
  if (!lines.length) return <main className="wrap empty-state"><ShoppingBag size={46}/><h1>A basket full of possibilities</h1><p>Add a little freshness to your day.</p><Link className="button" href="/shop">Start shopping <ArrowRight size={17}/></Link></main>;
  return <main className="wrap cart-page"><div className="section-title"><div><span className="eyebrow">YOUR DAILY GOODNESS</span><h1>My basket</h1></div><Link href="/shop">Continue shopping →</Link></div>
    {error && <div role="alert" className="error-message">{error}<p>Remove an unavailable item below, then add it again from the shop.</p>{lines.map(line => <button key={line.productId} onClick={() => setQuantity(line.productId,0)}>Remove {line.productId}</button>)}</div>}
    <div className="cart-layout" aria-busy={pending}><div>{quote?.items.map(({product,quantity,lineTotalPaise}) => <article className="cart-row" key={product.id}><Link href={`/product/${product.slug}`} className="cart-thumb" aria-label={product.name}><ProductVisual product={product}/></Link><div><Link href={`/product/${product.slug}`}><h3>{product.name}</h3></Link><small>{product.unit} · {money(product.pricePaise)} each</small><button className="remove" aria-label={`Remove ${product.name}`} onClick={() => setQuantity(product.id,0)}><Trash2 size={14}/> Remove</button></div><AddToCart product={product}/><strong>{money(lineTotalPaise)}</strong><span className="sr-only">{quantity} units</span></article>)}</div>
      <aside className="order-summary"><h2>Basket summary</h2>{pending ? <p role="status">Updating prices…</p> : quote ? <><p><span>Subtotal</span><strong>{money(quote.subtotalPaise)}</strong></p><p><span>Delivery</span><strong>{quote.deliveryPaise ? money(quote.deliveryPaise) : 'FREE'}</strong></p><p className="total"><span>Total</span><strong>{money(quote.totalPaise)}</strong></p>{quote.savingsPaise > 0 && <div className="savings">You’re saving {money(quote.savingsPaise)} on this basket.</div>}{quote.subtotalPaise < FREE_DELIVERY_PAISE && <small>Add {money(FREE_DELIVERY_PAISE-quote.subtotalPaise)} more for free delivery.</small>}</> : <p>Fix the items in your basket to calculate totals.</p>}
        {checkoutAvailable ? <Link className={`button checkout-button${!quote || pending ? ' disabled' : ''}`} aria-disabled={!quote || pending} href={signedIn ? '/checkout' : '/login?next=/checkout'}>{signedIn ? 'Proceed to checkout' : 'Sign in to checkout'} <ArrowRight size={16}/></Link>
          : <div className="checkout-note"><strong>Checkout needs database mode</strong><p>This is demo mode: your basket is saved on this device, but orders can’t be placed until the database is enabled.</p></div>}
      </aside></div></main>;
}
