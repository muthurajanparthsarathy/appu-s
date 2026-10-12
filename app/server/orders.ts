import 'server-only';
import { createHash } from 'node:crypto';
import { Prisma } from '@/app/generated/prisma/client';
import type { OrderStatus } from '@/app/generated/prisma/enums';
import type { CartLine } from '@/app/lib/types';
import { db } from './db';
import { productSelect } from './catalog';
import { calculateQuote, parseCart } from './pricing';
import { findSlot } from './delivery';
import { RESERVATION_MINUTES } from './config';
import { ADMIN_CANCELLABLE, CUSTOMER_CANCELLABLE, NEXT_STATUS, STATUS_LABEL, paymentStatusAfterAdvance, paymentStatusAfterCancel } from './order-rules';

export class OrderError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

type Tx = Prisma.TransactionClient;
type Item = { productId: string | null; quantity: number };
const TX_OPTIONS = { maxWait: 10_000, timeout: 20_000 };
const withItems = { items: true } as const;
export const EXPIRED_REASON = 'Online payment was not completed in time';

export type CheckoutRequest = { items: unknown; addressId: unknown; slotId: unknown; paymentMethod: unknown; idempotencyKey: unknown };

const sortLines = (lines: CartLine[]) => lines.toSorted((a, b) => a.productId < b.productId ? -1 : a.productId > b.productId ? 1 : 0);

// Places an order with server-side prices. Stock is decremented atomically inside the transaction:
// COD orders are confirmed immediately; Razorpay orders hold stock for RESERVATION_MINUTES awaiting payment.
// Repeating a request with the same idempotency key returns the original order instead of creating another.
export async function placeOrder(userId: string, body: CheckoutRequest, options: { razorpayEnabled: boolean; now?: Date }) {
  const now = options.now ?? new Date();
  let lines: CartLine[];
  try { lines = parseCart(body.items); } catch (error) { throw new OrderError(error instanceof Error ? error.message : 'Invalid basket.'); }
  if (!lines.length) throw new OrderError('Your basket is empty.');
  const method = body.paymentMethod;
  if (method !== 'COD' && method !== 'RAZORPAY') throw new OrderError('Choose a payment method.');
  if (method === 'RAZORPAY' && !options.razorpayEnabled) throw new OrderError('Online payment is not available right now. Please choose cash on delivery.');
  if (typeof body.idempotencyKey !== 'string' || !/^[A-Za-z0-9-]{16,64}$/.test(body.idempotencyKey)) throw new OrderError('Missing checkout token. Refresh the page and try again.');
  const idempotencyKey = body.idempotencyKey;
  const requestHash = createHash('sha256').update(JSON.stringify({ lines: sortLines(lines), addressId: body.addressId, slotId: body.slotId, method })).digest('hex');

  const client = db();
  const replay = (order: { requestHash: string }) => {
    if (order.requestHash !== requestHash) throw new OrderError('This checkout was already submitted with different details. Refresh the page and try again.', 409);
  };
  const existing = await client.order.findUnique({ where: { userId_idempotencyKey: { userId, idempotencyKey } }, include: withItems });
  if (existing) { replay(existing); return { order: existing, created: false }; }

  const address = typeof body.addressId === 'string' ? await client.address.findFirst({ where: { id: body.addressId, userId } }) : null;
  if (!address) throw new OrderError('Choose a delivery address.');
  const area = await client.serviceArea.findUnique({ where: { pincode: address.pincode } });
  if (!area?.active) throw new OrderError(`We don’t deliver to ${address.pincode} yet. Please choose another address.`);
  const slot = findSlot(body.slotId, now);
  if (!slot) throw new OrderError('That delivery slot is no longer available. Please pick another slot.');

  await releaseExpiredReservations(now);
  try {
    const order = await client.$transaction(async tx => {
      const sorted = sortLines(lines);
      const products = await tx.product.findMany({ where: { id: { in: sorted.map(line => line.productId) }, active: true }, select: productSelect });
      let quote;
      try { quote = calculateQuote(lines, products); } catch (error) { throw new OrderError(error instanceof Error ? error.message : 'Your basket changed.', 409); }
      // Conditional decrement in a stable order: concurrent checkouts can never oversell or deadlock.
      for (const line of sorted) {
        const { count } = await tx.product.updateMany({ where: { id: line.productId, active: true, stock: { gte: line.quantity } }, data: { stock: { decrement: line.quantity } } });
        if (count !== 1) throw new OrderError(`${products.find(p => p.id === line.productId)?.name ?? 'An item'} just sold out or has fewer units left. Please update your basket.`, 409);
      }
      const status: OrderStatus = method === 'COD' ? 'CONFIRMED' : 'PENDING_PAYMENT';
      return tx.order.create({
        data: {
          userId, status, paymentMethod: method, paymentStatus: 'PENDING',
          subtotalPaise: quote.subtotalPaise, deliveryPaise: quote.deliveryPaise, totalPaise: quote.totalPaise, savingsPaise: quote.savingsPaise,
          addressSnapshot: { fullName: address.fullName, phone: address.phone, line1: address.line1, line2: address.line2, landmark: address.landmark, city: address.city, pincode: address.pincode },
          pincode: address.pincode, slotStart: slot.start, slotEnd: slot.end, idempotencyKey, requestHash,
          reservedUntil: method === 'RAZORPAY' ? new Date(now.getTime() + RESERVATION_MINUTES * 60_000) : null,
          items: { create: quote.items.map(({ product, quantity, paidQuantity, lineTotalPaise }) => ({ productId: product.id, productName: product.name, productSlug: product.slug, unit: product.unit, icon: product.icon, imageUrl: product.imageUrl, unitPricePaise: product.pricePaise, mrpPaise: product.mrpPaise, quantity, paidQuantity, lineTotalPaise })) },
          events: { create: { status, paymentStatus: 'PENDING', actor: 'customer', note: method === 'COD' ? 'Order placed · cash on delivery' : `Order placed · items held for ${RESERVATION_MINUTES} minutes awaiting online payment` } }
        },
        include: withItems
      });
    }, TX_OPTIONS);
    return { order, created: true };
  } catch (error) {
    // A concurrent duplicate of this request may have won (unique-key violation, or it took the last stock first):
    // answer with that order rather than an error.
    const raced = await client.order.findUnique({ where: { userId_idempotencyKey: { userId, idempotencyKey } }, include: withItems });
    if (raced) { replay(raced); return { order: raced, created: false }; }
    throw error;
  }
}

// Rows are always locked in productId order (same as placeOrder) so concurrent transactions cannot deadlock.
const byProduct = <T extends Item>(items: T[]) => items.toSorted((a, b) => (a.productId ?? '') < (b.productId ?? '') ? -1 : (a.productId ?? '') > (b.productId ?? '') ? 1 : 0);

async function restock(tx: Tx, items: Item[]) {
  for (const item of byProduct(items)) if (item.productId) await tx.product.updateMany({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
}

async function cancelOrder(orderId: string, options: { allowedFrom: OrderStatus[]; reason: string; actor: string; userId?: string; expiredBefore?: Date }) {
  return db().$transaction(async tx => {
    const order = await tx.order.findFirst({ where: { id: orderId, ...(options.userId ? { userId: options.userId } : {}) }, include: withItems });
    if (!order || !options.allowedFrom.includes(order.status)) return false;
    const paymentStatus = paymentStatusAfterCancel(order.paymentStatus);
    // Guarded on the state we read, so a concurrent payment/fulfilment update wins cleanly instead of being overwritten.
    const { count } = await tx.order.updateMany({
      where: { id: order.id, status: order.status, paymentStatus: order.paymentStatus, ...(options.expiredBefore ? { reservedUntil: { lt: options.expiredBefore } } : {}) },
      data: { status: 'CANCELLED', paymentStatus, cancelReason: options.reason, reservedUntil: null }
    });
    if (count !== 1) return false;
    await restock(tx, order.items);
    await tx.orderEvent.create({ data: { orderId: order.id, status: 'CANCELLED', paymentStatus, note: options.reason, actor: options.actor } });
    return true;
  }, TX_OPTIONS);
}

export async function releaseExpiredReservations(now = new Date()) {
  const expired = await db().order.findMany({ where: { status: 'PENDING_PAYMENT', reservedUntil: { lt: now } }, select: { id: true }, take: 100 });
  let released = 0;
  for (const { id } of expired) if (await cancelOrder(id, { allowedFrom: ['PENDING_PAYMENT'], reason: EXPIRED_REASON, actor: 'system', expiredBefore: now })) released++;
  return released;
}

export const cancelOrderAsCustomer = (userId: string, orderId: string) =>
  cancelOrder(orderId, { allowedFrom: CUSTOMER_CANCELLABLE, reason: 'Cancelled by customer', actor: 'customer', userId });

export const cancelOrderAsAdmin = (orderId: string, actor: string, reason: string) =>
  cancelOrder(orderId, { allowedFrom: ADMIN_CANCELLABLE, reason, actor });

export async function advanceOrder(orderId: string, actor: string) {
  return db().$transaction(async tx => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    const next = order ? NEXT_STATUS[order.status] : undefined;
    if (!order || !next) return false;
    const paymentStatus = paymentStatusAfterAdvance(order.paymentMethod, next, order.paymentStatus);
    const { count } = await tx.order.updateMany({ where: { id: orderId, status: order.status, paymentStatus: order.paymentStatus }, data: { status: next, paymentStatus } });
    if (count !== 1) return false;
    await tx.orderEvent.create({ data: { orderId, status: next, paymentStatus, actor, note: paymentStatus !== order.paymentStatus ? `${STATUS_LABEL[next]} · cash collected` : STATUS_LABEL[next] } });
    return true;
  }, TX_OPTIONS);
}

export async function markRefunded(orderId: string, actor: string, reference: string) {
  return db().$transaction(async tx => {
    const { count } = await tx.order.updateMany({ where: { id: orderId, paymentStatus: 'REFUND_DUE' }, data: { paymentStatus: 'REFUNDED' } });
    if (count === 1) await tx.orderEvent.create({ data: { orderId, paymentStatus: 'REFUNDED', actor, note: reference ? `Refund issued · ${reference}` : 'Refund issued' } });
    return count === 1;
  }, TX_OPTIONS);
}

class CannotRevive extends Error {}
class SettledElsewhere extends Error {}

// Payment that lands after the stock hold lapsed: re-reserve if the order expired, its delivery slot is still ahead
// and items are in stock; otherwise keep it cancelled and flag the payment for refund. Never silently drops a payment.
async function settleLatePayment(orderId: string, razorpayPaymentId: string, actor: string) {
  const client = db();
  try {
    await client.$transaction(async tx => {
      const order = await tx.order.findUnique({ where: { id: orderId }, include: withItems });
      if (!order || order.status !== 'CANCELLED' || (order.paymentStatus !== 'PENDING' && order.paymentStatus !== 'FAILED')) return;
      if (order.cancelReason !== EXPIRED_REASON || order.slotStart <= new Date()) throw new CannotRevive();
      for (const item of byProduct(order.items)) {
        if (!item.productId) throw new CannotRevive();
        const { count } = await tx.product.updateMany({ where: { id: item.productId, active: true, stock: { gte: item.quantity } }, data: { stock: { decrement: item.quantity } } });
        if (count !== 1) throw new CannotRevive();
      }
      const { count } = await tx.order.updateMany({ where: { id: orderId, status: 'CANCELLED', paymentStatus: order.paymentStatus }, data: { status: 'CONFIRMED', paymentStatus: 'PAID', razorpayPaymentId, cancelReason: null } });
      if (count !== 1) throw new SettledElsewhere(); // a concurrent verify/webhook settled it first; roll back our re-reservation
      await tx.orderEvent.create({ data: { orderId, status: 'CONFIRMED', paymentStatus: 'PAID', actor, note: `Payment received after the hold expired (${razorpayPaymentId}); items were re-reserved` } });
    }, TX_OPTIONS);
  } catch (error) {
    if (error instanceof SettledElsewhere) return;
    if (!(error instanceof CannotRevive)) throw error;
    const { count } = await client.order.updateMany({ where: { id: orderId, status: 'CANCELLED', paymentStatus: { in: ['PENDING', 'FAILED'] } }, data: { paymentStatus: 'REFUND_DUE', razorpayPaymentId } });
    if (count === 1) await client.orderEvent.create({ data: { orderId, paymentStatus: 'REFUND_DUE', actor, note: `Payment received for a cancelled order (${razorpayPaymentId}) — refund due` } });
  }
}

// Idempotent: safe to call from both the browser verification step and the webhook, in any order.
export async function recordRazorpayPayment({ razorpayOrderId, razorpayPaymentId, amountPaise, actor }: { razorpayOrderId: string; razorpayPaymentId: string; amountPaise?: number; actor: string }) {
  const client = db();
  const order = await client.order.findUnique({ where: { razorpayOrderId } });
  if (!order) throw new OrderError('This payment does not match any order.', 404);
  if (order.paymentStatus === 'PAID' || order.paymentStatus === 'REFUND_DUE' || order.paymentStatus === 'REFUNDED') return order;
  if (amountPaise !== undefined && amountPaise !== order.totalPaise) {
    await client.orderEvent.create({ data: { orderId: order.id, actor, note: `Payment ${razorpayPaymentId} amount ${amountPaise} paise does not match order total — needs review` } });
    throw new OrderError('Payment amount does not match the order.', 409);
  }
  const confirmed = await client.$transaction(async tx => {
    const { count } = await tx.order.updateMany({ where: { id: order.id, status: 'PENDING_PAYMENT' }, data: { status: 'CONFIRMED', paymentStatus: 'PAID', razorpayPaymentId, reservedUntil: null } });
    if (count === 1) await tx.orderEvent.create({ data: { orderId: order.id, status: 'CONFIRMED', paymentStatus: 'PAID', actor, note: `Payment received (${razorpayPaymentId})` } });
    return count === 1;
  }, TX_OPTIONS);
  if (!confirmed) await settleLatePayment(order.id, razorpayPaymentId, actor);
  return client.order.findUniqueOrThrow({ where: { id: order.id } });
}

export async function recordRazorpayFailure(razorpayOrderId: string, description: string, actor: string) {
  const order = await db().order.findUnique({ where: { razorpayOrderId } });
  if (!order || order.status !== 'PENDING_PAYMENT') return;
  const { count } = await db().order.updateMany({ where: { id: order.id, status: 'PENDING_PAYMENT', paymentStatus: 'PENDING' }, data: { paymentStatus: 'FAILED' } });
  await db().orderEvent.create({ data: { orderId: order.id, ...(count === 1 ? { paymentStatus: 'FAILED' as const } : {}), actor, note: `Payment attempt failed${description ? `: ${description.slice(0, 160)}` : ''}` } });
}

export const getOrderForUser = (userId: string, orderId: string) =>
  db().order.findFirst({ where: { id: orderId, userId }, include: { items: true, events: { orderBy: { createdAt: 'asc' } } } });

export const listOrdersForUser = (userId: string) =>
  db().order.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50, include: { items: { select: { icon: true, productName: true, quantity: true } } } });
