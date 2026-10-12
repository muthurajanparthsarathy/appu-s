'use client';
import { useEffect, useState } from 'react';
import type { CartLine, Quote } from '@/app/lib/types';
// Asks the server to price the basket; prices shown are never computed from client data.
export function useQuote(lines: CartLine[], ready: boolean) {
  const [quote, setQuote] = useState<Quote | null>(null); const [error, setError] = useState(''); const [pending, setPending] = useState(true);
  useEffect(() => {
    if (!ready) return;
    if (!lines.length) { setQuote(null); setError(''); setPending(false); return; }
    const controller = new AbortController(); setPending(true); setError('');
    fetch('/api/cart/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: lines }), signal: controller.signal })
      .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error); return data as Quote; })
      .then(setQuote)
      .catch(error => { if (error.name !== 'AbortError') { setError(error.message || 'Unable to load basket.'); setQuote(null); } })
      .finally(() => { if (!controller.signal.aborted) setPending(false); });
    return () => controller.abort();
  }, [lines, ready]);
  return { quote, error, pending };
}
