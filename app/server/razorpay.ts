import 'server-only';
import { orderNumber } from '@/app/lib/money';
import type { SessionUser } from '@/app/lib/types';
import { db } from './db';
import type { RazorpayConfig } from './config';

const API = 'https://api.razorpay.com/v1';

export type RazorpayCheckout = { keyId: string; razorpayOrderId: string; amountPaise: number; currency: 'INR'; orderId: string; description: string; prefill: { name: string; email: string; contact?: string } };

async function razorpayApi(config: RazorpayConfig, path: string, body?: unknown) {
  const response = await fetch(`${API}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Basic ${Buffer.from(`${config.keyId}:${config.keySecret}`).toString('base64')}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(10_000),
    cache: 'no-store'
  });
  if (!response.ok) throw new Error(`Razorpay ${path} failed with HTTP ${response.status}`);
  return response.json();
}

async function createRazorpayOrder(config: RazorpayConfig, order: { id: string; number: number; totalPaise: number }) {
  const data = await razorpayApi(config, '/orders', { amount: order.totalPaise, currency: 'INR', receipt: orderNumber(order.number), notes: { store_order_id: order.id } }) as { id?: unknown; amount?: unknown; currency?: unknown };
  if (typeof data.id !== 'string' || data.amount !== order.totalPaise || data.currency !== 'INR') throw new Error('Unexpected Razorpay order response');
  return data.id;
}

type RazorpayPayment = { id: string; order_id: string | null; amount: number; currency: string; status: string };

// A checkout signature proves the payment was authorised, not that money was captured. Fetch the payment and,
// if the account uses manual capture, capture exactly the order amount before the order is treated as paid.
export async function capturedPayment(config: RazorpayConfig, razorpayPaymentId: string, expected: { razorpayOrderId: string; amountPaise: number }): Promise<{ captured: boolean }> {
  let payment = await razorpayApi(config, `/payments/${encodeURIComponent(razorpayPaymentId)}`) as RazorpayPayment;
  if (payment.order_id !== expected.razorpayOrderId || payment.amount !== expected.amountPaise || payment.currency !== 'INR') throw new Error('Razorpay payment does not match the order');
  if (payment.status === 'authorized') payment = await razorpayApi(config, `/payments/${encodeURIComponent(razorpayPaymentId)}/capture`, { amount: expected.amountPaise, currency: 'INR' }) as RazorpayPayment;
  return { captured: payment.status === 'captured' };
}

// Creates the Razorpay order once per store order; repeated calls reuse it so retries never double-charge.
export async function startRazorpayCheckout(config: RazorpayConfig, order: { id: string; number: number; totalPaise: number; razorpayOrderId: string | null }, user: SessionUser): Promise<RazorpayCheckout> {
  let razorpayOrderId = order.razorpayOrderId;
  if (!razorpayOrderId) {
    const created = await createRazorpayOrder(config, order);
    const { count } = await db().order.updateMany({ where: { id: order.id, razorpayOrderId: null }, data: { razorpayOrderId: created } });
    razorpayOrderId = count === 1 ? created : (await db().order.findUniqueOrThrow({ where: { id: order.id }, select: { razorpayOrderId: true } })).razorpayOrderId!;
  }
  return {
    keyId: config.keyId, razorpayOrderId, amountPaise: order.totalPaise, currency: 'INR', orderId: order.id,
    description: `Order ${orderNumber(order.number)}`,
    prefill: { name: user.name, email: user.email, ...(user.phone ? { contact: user.phone } : {}) }
  };
}
