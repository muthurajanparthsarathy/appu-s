import 'server-only';

export const isDatabaseMode = () => process.env.CATALOG_SOURCE === 'database';

export const RESERVATION_MINUTES = 15;

export type RazorpayConfig = { keyId: string; keySecret: string; webhookSecret: string | null };

// Razorpay is enabled only when VeenaMart's own keys are configured. Live keys are refused outside production builds.
export function razorpayConfig(): RazorpayConfig | null {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) return null;
  if (keyId.startsWith('rzp_live_') && process.env.NODE_ENV !== 'production') {
    console.warn('Razorpay live keys ignored outside production. Use rzp_test_ keys for development.');
    return null;
  }
  return { keyId, keySecret, webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || null };
}
