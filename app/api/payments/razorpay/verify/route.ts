import { razorpayConfig } from '@/app/server/config';
import { getCurrentUser } from '@/app/server/session';
import { isSameOrigin, json } from '@/app/server/request';
import { OrderError, getOrderForUser, recordRazorpayPayment } from '@/app/server/orders';
import { capturedPayment } from '@/app/server/razorpay';
import { verifyPaymentSignature } from '@/app/server/razorpay-signature';

// Called by the browser after Razorpay Checkout succeeds. The signature proves Razorpay issued this payment for our
// Razorpay order, and the payment is confirmed as captured with Razorpay before the order is marked paid.
// The browser's word alone never marks an order paid; the signed webhook is the other (independent) path.
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: 'Cross-site request rejected.' }, 403);
  const config = razorpayConfig();
  if (!config) return json({ error: 'Online payment is not available.' }, 503);
  const user = await getCurrentUser();
  if (!user) return json({ error: 'Please sign in again.' }, 401);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const orderId = body?.orderId, razorpayOrderId = body?.razorpay_order_id, razorpayPaymentId = body?.razorpay_payment_id;
  if (typeof orderId !== 'string' || typeof razorpayOrderId !== 'string' || typeof razorpayPaymentId !== 'string' || !/^pay_[A-Za-z0-9]{1,40}$/.test(razorpayPaymentId)) return json({ error: 'Invalid payment confirmation.' }, 400);

  const order = await getOrderForUser(user.id, orderId);
  if (!order || order.razorpayOrderId !== razorpayOrderId) return json({ error: 'Payment does not match this order.' }, 400);
  if (!verifyPaymentSignature({ razorpayOrderId, razorpayPaymentId, signature: body?.razorpay_signature, keySecret: config.keySecret })) return json({ error: 'Payment signature could not be verified.' }, 400);
  try {
    const { captured } = await capturedPayment(config, razorpayPaymentId, { razorpayOrderId, amountPaise: order.totalPaise });
    if (!captured) return json({ orderId: order.id, pending: true, message: 'Your payment is being confirmed by the bank. This page will update shortly.' }, 202);
    const updated = await recordRazorpayPayment({ razorpayOrderId, razorpayPaymentId, actor: 'razorpay:checkout' });
    return json({ orderId: updated.id, status: updated.status, paymentStatus: updated.paymentStatus });
  } catch (error) {
    if (error instanceof OrderError) return json({ error: error.message }, error.status);
    console.error('Razorpay verification failed', error);
    return json({ error: 'We could not confirm your payment yet. If money was deducted, your order updates automatically once Razorpay confirms it.' }, 502);
  }
}
