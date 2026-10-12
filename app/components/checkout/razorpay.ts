'use client';
// Thin wrapper around Razorpay Checkout (https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/).
export type RazorpayCheckout = { keyId: string; razorpayOrderId: string; amountPaise: number; currency: 'INR'; orderId: string; description: string; prefill: { name: string; email: string; contact?: string } };
type RazorpaySuccess = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
type RazorpayInstance = { open: () => void; on: (event: 'payment.failed', handler: (response: { error?: { description?: string } }) => void) => void };
declare global { interface Window { Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance } }

let loader: Promise<void> | null = null;
function loadScript() {
  if (window.Razorpay) return Promise.resolve();
  loader ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => { loader = null; reject(new Error('Could not load Razorpay. Check your connection and try again.')); };
    document.body.appendChild(script);
  });
  return loader;
}

// Opens the payment window. Success is confirmed by our server (signature check) before the order is shown as paid.
export async function payWithRazorpay(options: RazorpayCheckout, events: { onVerified: () => void; onDismiss: () => void; onError: (message: string) => void }) {
  await loadScript();
  const razorpay = new window.Razorpay!({
    key: options.keyId, order_id: options.razorpayOrderId, amount: options.amountPaise, currency: options.currency,
    name: 'Appu’s Mart', description: options.description, prefill: options.prefill, theme: { color: '#185a39' },
    handler: async (response: RazorpaySuccess) => {
      try {
        const result = await fetch('/api/payments/razorpay/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: options.orderId, ...response }) });
        if (!result.ok) throw new Error((await result.json().catch(() => ({}))).error ?? 'Payment could not be verified.');
        events.onVerified();
      } catch (error) { events.onError(`${error instanceof Error ? error.message : 'Payment could not be verified.'} If money was deducted, it will be matched automatically or refunded.`); }
    },
    modal: { ondismiss: events.onDismiss, confirm_close: true }
  });
  razorpay.on('payment.failed', response => events.onError(response.error?.description ?? 'Payment failed. You can retry.'));
  razorpay.open();
}
