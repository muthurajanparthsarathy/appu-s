'use client';
import { Minus, Plus, ShoppingCart } from 'lucide-react';
import { useCart } from './CartProvider';
import type { Product } from '@/app/lib/types';
import { useCartFeedback } from './CartFeedback';
export function AddToCart({ product }: { product: Product }) {
  const { lines, ready, setQuantity } = useCart();
  const announce = useCartFeedback();
  const quantity = lines.find(line => line.productId === product.id)?.quantity ?? 0;
  const add = (source: HTMLButtonElement) => {
    if (!ready || quantity >= Math.min(20, product.stock) || (!quantity && lines.length >= 50)) return;
    setQuantity(product.id, quantity + 1);
    announce(product, quantity + 1, source);
  };
  if (!product.stock) return <button className="add-button sold-out" disabled>Out of stock</button>;
  return quantity ? <div className="stepper cart-stepper"><button type="button" aria-label={`Remove one ${product.name}`} onClick={() => setQuantity(product.id,quantity-1)}><Minus size={16}/></button><span key={quantity} className="cart-quantity" aria-live="polite">{quantity}</span><button type="button" aria-label={`Add one ${product.name}`} disabled={!ready || quantity >= Math.min(20,product.stock)} onClick={event => add(event.currentTarget)}><Plus size={16}/></button></div> : <button type="button" className="add-button" disabled={!ready || lines.length >= 50} onClick={event => add(event.currentTarget)}><ShoppingCart size={16}/> Add to cart <Plus size={16}/></button>;
}
