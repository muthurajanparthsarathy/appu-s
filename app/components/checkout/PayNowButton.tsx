'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { payWithRazorpay, type RazorpayCheckout } from './razorpay';

// Resumes payment for an order whose stock is still held.
export function PayNowButton({ orderId, label }: { orderId: string; label: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  return <span className="action-button">
    <button className="button" disabled={pending} onClick={async () => {
      setPending(true); setError('');
      try {
        const response = await fetch('/api/payments/razorpay/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId }) });
        const data = await response.json() as { razorpay?: RazorpayCheckout; error?: string };
        if (!response.ok || !data.razorpay) throw new Error(data.error ?? 'Could not start payment.');
        await payWithRazorpay(data.razorpay, {
          onVerified: () => { router.replace(`/account/orders/${orderId}?paid=1`); router.refresh(); },
          onDismiss: () => setPending(false),
          onError: message => { setError(message); setPending(false); }
        });
      } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not start payment.'); setPending(false); }
    }}>{pending ? 'Opening payment…' : label}</button>
    {error && <small className="field-error" role="alert">{error}</small>}
  </span>;
}
