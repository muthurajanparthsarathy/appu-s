import { Prisma } from '@/app/generated/prisma/client';
import { razorpayConfig } from '@/app/server/config';
import { db } from '@/app/server/db';
import { json } from '@/app/server/request';
import { OrderError, recordRazorpayFailure, recordRazorpayPayment } from '@/app/server/orders';
import { verifyWebhookSignature } from '@/app/server/razorpay-signature';

type PaymentEntity = { id?: string; order_id?: string; amount?: number; currency?: string; error_description?: string };

// Server-to-server confirmation from Razorpay. Configure in the Razorpay dashboard with events
// payment.captured, order.paid and payment.failed, using RAZORPAY_WEBHOOK_SECRET.
export async function POST(request: Request) {
  const config = razorpayConfig();
  if (!config?.webhookSecret) return json({ error: 'Webhook not configured.' }, 503);
  const raw = await request.text();
  if (raw.length > 100_000) return json({ error: 'Payload too large.' }, 413);
  if (!verifyWebhookSignature(raw, request.headers.get('x-razorpay-signature'), config.webhookSecret)) return json({ error: 'Invalid signature.' }, 400);

  let event: { event?: string; payload?: { payment?: { entity?: PaymentEntity } } };
  try { event = JSON.parse(raw); } catch { return json({ error: 'Invalid JSON.' }, 400); }
  const eventId = request.headers.get('x-razorpay-event-id');
  if (!eventId || eventId.length > 100 || typeof event.event !== 'string') return json({ error: 'Missing event id.' }, 400);

  // Razorpay retries deliveries; the event id is stored only after successful processing so failures are retried.
  if (await db().paymentWebhookEvent.findUnique({ where: { id: eventId } })) return json({ status: 'duplicate' });
  const payment = event.payload?.payment?.entity;
  try {
    if ((event.event === 'payment.captured' || event.event === 'order.paid') && payment?.order_id && payment.id) {
      if (payment.currency !== 'INR') throw new OrderError('Unexpected currency', 409);
      await recordRazorpayPayment({ razorpayOrderId: payment.order_id, razorpayPaymentId: payment.id, amountPaise: payment.amount, actor: 'razorpay:webhook' });
    } else if (event.event === 'payment.failed' && payment?.order_id) {
      await recordRazorpayFailure(payment.order_id, payment.error_description ?? '', 'razorpay:webhook');
    }
  } catch (error) {
    // Unknown orders (e.g. another app sharing the account) and amount mismatches are acknowledged and logged, not retried forever.
    if (!(error instanceof OrderError)) throw error;
    console.warn(`Razorpay webhook ${eventId} not applied: ${error.message}`);
  }
  try { await db().paymentWebhookEvent.create({ data: { id: eventId, event: event.event } }); }
  catch (error) { if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) throw error; }
  return json({ status: 'ok' });
}
