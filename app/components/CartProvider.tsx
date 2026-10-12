'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { CartLine } from '@/app/lib/types';
import { CartFeedbackProvider } from './CartFeedback';
type CartContextType = { lines: CartLine[]; ready: boolean; setQuantity: (id: string, quantity: number) => void; clear: () => void; count: number };
const CartContext = createContext<CartContextType | null>(null);
const STORAGE_KEY = 'veenamart.cart.v1';

function readStoredCart(): CartLine[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    if (!Array.isArray(stored)) return [];
    const seen = new Set<string>();
    return stored.filter((row): row is CartLine => {
      if (!row || typeof row.productId !== 'string' || row.productId.length > 100 || !Number.isInteger(row.quantity) || row.quantity < 1 || row.quantity > 20 || seen.has(row.productId)) return false;
      seen.add(row.productId); return true;
    }).slice(0, 50);
  } catch { return []; /* Private browsing or invalid local storage: start an empty cart. */ }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setLines(readStoredCart());
    setReady(true);
    // Keep baskets in other tabs in step (e.g. after checkout clears the cart).
    const sync = (event: StorageEvent) => { if (event.key === STORAGE_KEY) setLines(readStoredCart()); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  useEffect(() => { if (ready) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(lines)); } catch { /* Cart still works for this tab. */ } } }, [lines, ready]);
  const setQuantity = (id: string, quantity: number) => setLines(current => {
    const index = current.findIndex(line => line.productId === id);
    const normalized = Math.max(0, Math.min(20, Math.floor(quantity)));
    if (!normalized) return current.filter(line => line.productId !== id);
    if (index >= 0) return current.map(line => line.productId === id ? { ...line, quantity: normalized } : line);
    return current.length < 50 ? [...current, { productId: id, quantity: normalized }] : current;
  });
  const clear = () => setLines([]);
  return <CartContext.Provider value={{ lines, ready, setQuantity, clear, count: lines.reduce((sum, line) => sum + line.quantity, 0) }}><CartFeedbackProvider>{children}</CartFeedbackProvider></CartContext.Provider>;
}
export function useCart() { const context = useContext(CartContext); if (!context) throw new Error('Missing CartProvider'); return context; }
