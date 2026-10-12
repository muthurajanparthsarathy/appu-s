'use client';

import Link from 'next/link';
import { Check, ShoppingBag, X } from 'lucide-react';
import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { Product } from '@/app/lib/types';

type FeedbackProduct = Pick<Product, 'name' | 'imageUrl' | 'unit'>;
type Feedback = { id: number; product: FeedbackProduct; quantity: number; style: CSSProperties; floatingTarget: boolean; flying: boolean };
const Context = createContext<(product: FeedbackProduct, quantity: number, source: HTMLElement) => void>(() => {});
// Keep in sync with the cart-flight animation duration in globals.css (the basket bounces when the item lands).
const FLIGHT_MS = 600;

/** Visual feedback is independent of basket persistence and never delays a cart update. */
export function CartFeedbackProvider({ children }: { children: ReactNode }) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const sequence = useRef(0);
  const targetAnimation = useRef<Animation | null>(null);
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => () => { clearTimers(); targetAnimation.current?.cancel(); }, []);

  const announce = (product: FeedbackProduct, quantity: number, source: HTMLElement) => {
    clearTimers();
    targetAnimation.current?.cancel();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const visible = (element: Element) => {
      const r = element.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= window.innerHeight && r.left >= 0 && r.right <= window.innerWidth;
    };
    const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-cart-target]'));
    // Prefer the bottom basket on mobile, where the header can scroll out of view.
    const target = targets.reverse().find(visible);
    const bounds = target?.getBoundingClientRect();
    const image = source.closest('.product-card, .product-detail, .cart-row')?.querySelector('.product-visual');
    const origin = image && visible(image) ? image.getBoundingClientRect() : source.getBoundingClientRect();
    const x = origin.left + origin.width / 2 - 28;
    const y = origin.top + origin.height / 2 - 28;
    const endX = bounds ? bounds.left + bounds.width / 2 - 28 : window.innerWidth - 76;
    const endY = bounds ? bounds.top + bounds.height / 2 - 28 : 22;
    const id = ++sequence.current;
    const style = { left: x, top: y, '--cart-x': `${endX-x}px`, '--cart-y': `${endY-y}px` } as CSSProperties;
    setFeedback({ id, product, quantity, style, floatingTarget: !target, flying: !reduced });
    timers.current.push(setTimeout(() => {
      setFeedback(current => current?.id === id ? { ...current, flying: false } : current);
      if (!reduced && target?.isConnected) {
        targetAnimation.current = target.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.23) rotate(-9deg)' }, { transform: 'scale(.94) rotate(5deg)' }, { transform: 'scale(1)' }], { duration: 430, easing: 'ease-out' });
      }
    }, reduced ? 0 : FLIGHT_MS));
    timers.current.push(setTimeout(() => setFeedback(current => current?.id === id ? null : current), 3600));
  };

  return <Context.Provider value={announce}>{children}
    {feedback?.flying && <div key={feedback.id} className="cart-flyer" style={feedback.style} aria-hidden="true">{feedback.product.imageUrl ? <img src={feedback.product.imageUrl} alt=""/> : <ShoppingBag size={28}/>}</div>}
    {feedback?.flying && feedback.floatingTarget && <Link href="/cart" className="cart-flight-target" aria-label="View basket"><ShoppingBag size={24}/></Link>}
    <div className="cart-feedback-live" role="status" aria-live="polite" aria-atomic="true">{feedback && <span key={feedback.id}>{feedback.product.name} added to basket. Quantity {feedback.quantity}.</span>}</div>
    {feedback && <div className="cart-notice" key={`notice-${feedback.id}`}>
      <span className="cart-notice-check"><Check size={18}/></span>
      <div><strong>Added to basket</strong><p>{feedback.product.name} <span>· {feedback.product.unit}</span></p></div>
      <Link href="/cart" onClick={() => { clearTimers(); setFeedback(null); }}>View basket →</Link>
      <button type="button" aria-label="Dismiss basket confirmation" onClick={() => { clearTimers(); setFeedback(null); }}><X size={16}/></button>
    </div>}
  </Context.Provider>;
}

export const useCartFeedback = () => useContext(Context);
