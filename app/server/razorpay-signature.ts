import { createHmac, timingSafeEqual } from 'node:crypto';

export const hmacSha256Hex = (secret: string, payload: string | Buffer) => createHmac('sha256', secret).update(payload).digest('hex');

function safeEqualHex(expectedHex: string, received: unknown) {
  if (typeof received !== 'string' || !/^[0-9a-f]+$/i.test(received)) return false;
  const a = Buffer.from(expectedHex, 'hex');
  const b = Buffer.from(received.toLowerCase(), 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

// Checkout handler signature: HMAC_SHA256(razorpay_order_id + "|" + razorpay_payment_id, key_secret).
export const verifyPaymentSignature = ({ razorpayOrderId, razorpayPaymentId, signature, keySecret }: { razorpayOrderId: string; razorpayPaymentId: string; signature: unknown; keySecret: string }) =>
  safeEqualHex(hmacSha256Hex(keySecret, `${razorpayOrderId}|${razorpayPaymentId}`), signature);

// Webhook signature: HMAC_SHA256(raw request body, webhook_secret) in X-Razorpay-Signature.
export const verifyWebhookSignature = (rawBody: string, signature: unknown, webhookSecret: string) =>
  safeEqualHex(hmacSha256Hex(webhookSecret, rawBody), signature);
