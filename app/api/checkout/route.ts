import { isDatabaseMode, razorpayConfig } from '@/app/server/config';
import { getCurrentUser } from '@/app/server/session';
import { consumeRateLimit } from '@/app/server/rate-limit';
import { isSameOrigin, json } from '@/app/server/request';
import { OrderError, cancelOrderAsAdmin, placeOrder, type CheckoutRequest } from '@/app/server/orders';
import { startRazorpayCheckout } from '@/app/server/razorpay';

export async function POST(request: Request) {
  if (!isDatabaseMode()) return json({ error: 'Checkout needs database mode.' }, 503);
  if (!isSameOrigin(request)) return json({ error: 'Cross-site request rejected.' }, 403);
  const user = await getCurrentUser();
  if (!user) return json({ error: 'Please sign in to place your order.' }, 401);
  const limit = await consumeRateLimit(`checkout:${user.id}`, 10, 60);
  if (!limit.ok) return json({ error: 'Too many checkout attempts. Please wait a minute.' }, 429);

  let body: CheckoutRequest;
  try {
    const raw = await request.text();
    if (raw.length > 12_000) return json({ error: 'Checkout payload is too large.' }, 413);
    body = JSON.parse(raw);
  } catch { return json({ error: 'Invalid checkout request.' }, 400); }

  const razorpay = razorpayConfig();
  let result;
  try { result = await placeOrder(user.id, body, { razorpayEnabled: Boolean(razorpay) }); }
  catch (error) {
    if (error instanceof OrderError) return json({ error: error.message }, error.status);
    console.error('Checkout failed', error);
    return json({ error: 'We could not place your order. Nothing was charged; please try again.' }, 500);
  }

  const { order } = result;
  // e.g. a retry after "payment could not be started" (which cancelled that attempt): never present it as placed.
  if (!result.created && order.status === 'CANCELLED') return json({ error: 'That checkout attempt was cancelled. Please place your order again.' }, 409);
  if (order.paymentMethod === 'COD' || order.status !== 'PENDING_PAYMENT' || !razorpay) return json({ orderId: order.id });
  try {
    return json({ orderId: order.id, razorpay: await startRazorpayCheckout(razorpay, order, user) });
  } catch (error) {
    console.error('Razorpay start failed', error);
    if (result.created) await cancelOrderAsAdmin(order.id, 'system', 'Online payment could not be started');
    return json({ error: 'Online payment could not be started. Nothing was charged — please try again or choose cash on delivery.' }, 502);
  }
}
