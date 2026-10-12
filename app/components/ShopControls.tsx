'use client';
import { Minus, Plus, ShoppingCart } from 'lucide-react';
import { useCart } from './CartProvider';
import type { Product } from '@/app/lib/types';
export function AddToCart({ product }: { product: Product }) {
  const { lines, ready, setQuantity } = useCart();
  const quantity = lines.find(line => line.productId === product.id)?.quantity ?? 0;
  if (!product.stock) return <button className="add-button sold-out" disabled>Out of stock</button>;
  return quantity ? <div className="stepper"><button type="button" aria-label={`Remove one ${product.name}`} onClick={() => setQuantity(product.id,quantity-1)}><Minus size={16}/></button><span aria-live="polite">{quantity}</span><button type="button" aria-label={`Add one ${product.name}`} disabled={quantity >= Math.min(20,product.stock)} onClick={() => setQuantity(product.id,quantity+1)}><Plus size={16}/></button></div> : <button type="button" className="add-button" disabled={!ready} onClick={() => setQuantity(product.id,1)}><ShoppingCart size={16}/> Add to cart <Plus size={16}/></button>;
}
