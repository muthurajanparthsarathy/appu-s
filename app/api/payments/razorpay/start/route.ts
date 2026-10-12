import { razorpayConfig } from '@/app/server/config';
import { getCurrentUser } from '@/app/server/session';
import { isSameOrigin, json } from '@/app/server/request';
import { getOrderForUser, releaseExpiredReservations } from '@/app/server/orders';
import { startRazorpayCheckout } from '@/app/server/razorpay';

// Retry payment for an order still holding stock (e.g. the customer closed the Razorpay window).
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: 'Cross-site request rejected.' }, 403);
  const config = razorpayConfig();
  if (!config) return json({ error: 'Online payment is not available.' }, 503);
  const user = await getCurrentUser();
  if (!user) return json({ error: 'Please sign in again.' }, 401);
  const body = await request.json().catch(() => null) as { orderId?: unknown } | null;
  if (typeof body?.orderId !== 'string') return json({ error: 'Invalid request.' }, 400);
  await releaseExpiredReservations();
  const order = await getOrderForUser(user.id, body.orderId);
  if (!order || order.status !== 'PENDING_PAYMENT' || order.paymentMethod !== 'RAZORPAY') return json({ error: 'This order is no longer awaiting payment.' }, 409);
  try { return json({ razorpay: await startRazorpayCheckout(config, order, user) }); }
  catch (error) { console.error('Razorpay restart failed', error); return json({ error: 'Online payment could not be started. Please try again shortly.' }, 502); }
}
