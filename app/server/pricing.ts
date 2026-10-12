import type { CartLine, Product, Quote } from '@/app/lib/types';
export const FREE_DELIVERY_PAISE = 49900;
export const DELIVERY_FEE_PAISE = 3500;
export function parseCart(value: unknown): CartLine[] {
  if (!Array.isArray(value) || value.length > 50) throw new Error('Cart must contain at most 50 items.');
  const ids = new Set<string>();
  return value.map(row => {
    if (!row || typeof row !== 'object' || typeof row.productId !== 'string' || row.productId.length > 100 || !Number.isInteger(row.quantity) || row.quantity < 1 || row.quantity > 20) throw new Error('Each quantity must be a whole number from 1 to 20.');
    if (ids.has(row.productId)) throw new Error('Duplicate product in cart.');
    ids.add(row.productId);
    return { productId: row.productId, quantity: row.quantity };
  });
}
export function calculateQuote(lines: CartLine[], products: Product[]): Quote {
  const items = lines.map(line => {
    const product = products.find(p => p.id === line.productId);
    if (!product) throw new Error('A product is no longer available. Remove it from your cart.');
    if (product.stock < line.quantity) throw new Error(`Only ${product.stock} units of ${product.name} available.`);
    return { product, quantity: line.quantity, lineTotalPaise: product.pricePaise * line.quantity };
  });
  const subtotalPaise = items.reduce((sum,i) => sum+i.lineTotalPaise,0);
  const deliveryPaise = items.length && subtotalPaise < FREE_DELIVERY_PAISE ? DELIVERY_FEE_PAISE : 0;
  return { items, subtotalPaise, deliveryPaise, totalPaise: subtotalPaise+deliveryPaise, savingsPaise: items.reduce((sum,i) => sum+Math.max(0,i.product.mrpPaise-i.product.pricePaise)*i.quantity,0) };
}
