// Integration tests against the VeenaMart database in DATABASE_URL (run: npm run test:db).
// Fixtures use unique slugs/emails and are deleted afterwards; seeded catalog data is not modified.
import 'dotenv/config';
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { db } from '../../app/server/db';
import { availableSlots } from '../../app/server/delivery';
import { hmacSha256Hex } from '../../app/server/razorpay-signature';
import { EXPIRED_REASON, OrderError, advanceOrder, cancelOrderAsAdmin, cancelOrderAsCustomer, placeOrder, recordRazorpayPayment, releaseExpiredReservations } from '../../app/server/orders';

const skip = !process.env.DATABASE_URL && 'DATABASE_URL not set';
const run = randomUUID().slice(0, 8);
const ids = { users: [] as string[], products: [] as string[] };
let customer: string, other: string, address: string, otherAddress: string, farAddress: string;

const stockOf = async (id: string) => (await db().product.findUniqueOrThrow({ where: { id } })).stock;
async function product(stock: number, pricePaise = 10_000) {
  const created = await db().product.create({ data: { slug: `test-${run}-${ids.products.length}`, name: `Test item ${ids.products.length}`, categorySlug: 'groceries', brand: 'Test', unit: '1 pc', pricePaise, mrpPaise: pricePaise + 1000, stock, icon: '🧪', description: 'Integration test product' } });
  ids.products.push(created.id);
  return created.id;
}
const checkout = (items: { productId: string; quantity: number }[], extra: Record<string, unknown> = {}, now = new Date()) =>
  ({ items, addressId: address, slotId: availableSlots(now)[0].id, paymentMethod: 'COD', idempotencyKey: randomUUID(), ...extra });
const rejects409 = (promise: Promise<unknown>) => assert.rejects(promise, (error: unknown) => error instanceof OrderError && error.status === 409);

describe('order service', { skip }, () => {
  before(async () => {
    await db().serviceArea.upsert({ where: { pincode: '641001' }, create: { pincode: '641001', area: 'Coimbatore' }, update: {} });
    for (const name of ['customer', 'other']) {
      const user = await db().user.create({ data: { email: `test-${run}-${name}@veenamart.test`, name, passwordHash: 'disabled' } });
      ids.users.push(user.id);
    }
    [customer, other] = ids.users;
    const base = { fullName: 'Test Customer', phone: '9876543210', line1: '12 Test Street', city: 'Coimbatore' };
    address = (await db().address.create({ data: { ...base, userId: customer, pincode: '641001', isDefault: true } })).id;
    otherAddress = (await db().address.create({ data: { ...base, userId: other, pincode: '641001' } })).id;
    farAddress = (await db().address.create({ data: { ...base, userId: customer, pincode: '560034' } })).id;
  });

  after(async () => {
    await db().order.deleteMany({ where: { userId: { in: ids.users } } });
    await db().user.deleteMany({ where: { id: { in: ids.users } } });
    await db().product.deleteMany({ where: { id: { in: ids.products } } });
    await db().$disconnect();
  });

  test('COD order uses server prices, snapshots items and decrements stock', async () => {
    const id = await product(10, 4500);
    const { order, created } = await placeOrder(customer, checkout([{ productId: id, quantity: 3 }]), { razorpayEnabled: false });
    assert.ok(created);
    assert.equal(order.status, 'CONFIRMED');
    assert.equal(order.paymentStatus, 'PENDING');
    assert.equal(order.subtotalPaise, 13_500);
    assert.equal(order.deliveryPaise, 3500);
    assert.equal(order.totalPaise, 17_000);
    assert.equal(order.items[0].unitPricePaise, 4500);
    assert.equal(order.reservedUntil, null);
    assert.equal(await stockOf(id), 7);
    assert.equal(await db().orderEvent.count({ where: { orderId: order.id } }), 1);
  });

  test('same idempotency key replays the order; a different payload is refused', async () => {
    const id = await product(10);
    const body = checkout([{ productId: id, quantity: 2 }]);
    const first = await placeOrder(customer, body, { razorpayEnabled: false });
    const again = await placeOrder(customer, { ...body }, { razorpayEnabled: false });
    assert.equal(again.order.id, first.order.id);
    assert.equal(again.created, false);
    assert.equal(await stockOf(id), 8);
    await rejects409(placeOrder(customer, { ...body, items: [{ productId: id, quantity: 3 }] }, { razorpayEnabled: false }));
    // The key is scoped per customer.
    const theirs = await placeOrder(other, { ...body, addressId: otherAddress }, { razorpayEnabled: false });
    assert.notEqual(theirs.order.id, first.order.id);
  });

  test('a concurrent duplicate submission gets the original order, not "sold out"', async () => {
    const id = await product(3);
    const body = checkout([{ productId: id, quantity: 2 }]);
    const [a, b] = await Promise.all([placeOrder(customer, body, { razorpayEnabled: false }), placeOrder(customer, { ...body }, { razorpayEnabled: false })]);
    assert.equal(a.order.id, b.order.id);
    assert.deepEqual([a.created, b.created].sort(), [false, true]);
    assert.equal(await stockOf(id), 1);
  });

  test('a failing line rolls back every stock change', async () => {
    const plenty = await product(10), scarce = await product(1);
    await rejects409(placeOrder(customer, checkout([{ productId: plenty, quantity: 2 }, { productId: scarce, quantity: 2 }]), { razorpayEnabled: false }));
    assert.equal(await stockOf(plenty), 10);
    assert.equal(await stockOf(scarce), 1);
  });

  test('concurrent checkouts never oversell', async () => {
    const id = await product(3);
    const results = await Promise.allSettled(Array.from({ length: 8 }, () => placeOrder(customer, checkout([{ productId: id, quantity: 1 }]), { razorpayEnabled: false })));
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 3);
    assert.ok(results.filter(r => r.status === 'rejected').every(r => (r as PromiseRejectedResult).reason instanceof OrderError));
    assert.equal(await stockOf(id), 0);
  });

  test('checkout rejects bad input before touching stock', async () => {
    const id = await product(5);
    const hidden = await product(5);
    await db().product.update({ where: { id: hidden }, data: { active: false } });
    const cases: [Record<string, unknown>, RegExp][] = [
      [checkout([]), /empty/],
      [checkout([{ productId: id, quantity: 1 }], { addressId: otherAddress }), /address/],
      [checkout([{ productId: id, quantity: 1 }], { addressId: farAddress }), /560034/],
      [checkout([{ productId: id, quantity: 1 }], { slotId: '2020-01-01T00:00:00.000Z' }), /slot/],
      [checkout([{ productId: id, quantity: 1 }], { paymentMethod: 'RAZORPAY' }), /Online payment/],
      [checkout([{ productId: id, quantity: 1 }], { paymentMethod: 'CARD' }), /payment method/],
      [checkout([{ productId: id, quantity: 1 }], { idempotencyKey: 'short' }), /checkout token/],
      [checkout([{ productId: id, quantity: 21 }]), /1 to 20/],
      [checkout([{ productId: hidden, quantity: 1 }]), /no longer available/]
    ];
    for (const [body, message] of cases) await assert.rejects(placeOrder(customer, body as never, { razorpayEnabled: false }), message);
    assert.equal(await stockOf(id), 5);
  });

  test('cancellation restores stock once and respects ownership and status', async () => {
    const id = await product(5);
    const { order } = await placeOrder(customer, checkout([{ productId: id, quantity: 2 }]), { razorpayEnabled: false });
    assert.equal(await cancelOrderAsCustomer(other, order.id), false);
    assert.equal(await cancelOrderAsCustomer(customer, order.id), true);
    assert.equal(await cancelOrderAsCustomer(customer, order.id), false);
    assert.equal(await stockOf(id), 5);
    const second = (await placeOrder(customer, checkout([{ productId: id, quantity: 1 }]), { razorpayEnabled: false })).order;
    assert.ok(await advanceOrder(second.id, 'admin:test'));
    assert.equal(await cancelOrderAsCustomer(customer, second.id), false, 'customers cannot cancel once packing');
    assert.ok(await cancelOrderAsAdmin(second.id, 'admin:test', 'Damaged in packing'));
    assert.equal(await stockOf(id), 5);
  });

  test('fulfilment advances one step at a time and COD is collected on delivery', async () => {
    const id = await product(5);
    const { order } = await placeOrder(customer, checkout([{ productId: id, quantity: 1 }]), { razorpayEnabled: false });
    for (const expected of ['PACKING', 'OUT_FOR_DELIVERY', 'DELIVERED']) {
      assert.ok(await advanceOrder(order.id, 'admin:test'));
      assert.equal((await db().order.findUniqueOrThrow({ where: { id: order.id } })).status, expected);
    }
    assert.equal(await advanceOrder(order.id, 'admin:test'), false);
    const done = await db().order.findUniqueOrThrow({ where: { id: order.id } });
    assert.equal(done.paymentStatus, 'PAID');
    assert.equal(await cancelOrderAsAdmin(order.id, 'admin:test', 'too late'), false);
  });

  test('online payment confirms a held order exactly once', async () => {
    const id = await product(5);
    const { order } = await placeOrder(customer, checkout([{ productId: id, quantity: 2 }], { paymentMethod: 'RAZORPAY' }), { razorpayEnabled: true });
    assert.equal(order.status, 'PENDING_PAYMENT');
    assert.ok(order.reservedUntil && order.reservedUntil > new Date());
    assert.equal(await stockOf(id), 3, 'stock is held while awaiting payment');
    assert.equal(await advanceOrder(order.id, 'admin:test'), false, 'unpaid online orders cannot be fulfilled');
    await db().order.update({ where: { id: order.id }, data: { razorpayOrderId: `order_${run}_a` } });
    await assert.rejects(recordRazorpayPayment({ razorpayOrderId: `order_${run}_a`, razorpayPaymentId: `pay_${run}_x`, amountPaise: 1, actor: 'test' }), /amount/);
    const paid = await Promise.all([1, 2].map(() => recordRazorpayPayment({ razorpayOrderId: `order_${run}_a`, razorpayPaymentId: `pay_${run}_a`, actor: 'test' })));
    assert.ok(paid.every(p => p.status === 'CONFIRMED' && p.paymentStatus === 'PAID'));
    assert.equal(await db().orderEvent.count({ where: { orderId: order.id, paymentStatus: 'PAID' } }), 1);
    assert.equal(await stockOf(id), 3);
    assert.ok(await cancelOrderAsAdmin(order.id, 'admin:test', 'Out of delivery range'));
    assert.equal((await db().order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus, 'REFUND_DUE');
  });

  test('expired holds are released; a late payment re-reserves or is flagged for refund', async () => {
    const id = await product(4);
    const past = new Date(Date.now() - 30 * 60_000);
    const late = (await placeOrder(customer, checkout([{ productId: id, quantity: 2 }], { paymentMethod: 'RAZORPAY' }, past), { razorpayEnabled: true, now: past })).order;
    const lost = (await placeOrder(customer, checkout([{ productId: id, quantity: 2 }], { paymentMethod: 'RAZORPAY' }, past), { razorpayEnabled: true, now: past })).order;
    assert.equal(await stockOf(id), 0);
    assert.ok(await releaseExpiredReservations() >= 2);
    const expired = await db().order.findUniqueOrThrow({ where: { id: late.id } });
    assert.equal(expired.status, 'CANCELLED');
    assert.equal(expired.cancelReason, EXPIRED_REASON);
    assert.equal(await stockOf(id), 4);

    // Payment arrives late while stock is available: the order is revived.
    await db().order.update({ where: { id: late.id }, data: { razorpayOrderId: `order_${run}_late` } });
    const revived = await recordRazorpayPayment({ razorpayOrderId: `order_${run}_late`, razorpayPaymentId: `pay_${run}_late`, actor: 'test' });
    assert.equal(revived.status, 'CONFIRMED');
    assert.equal(revived.paymentStatus, 'PAID');
    assert.equal(await stockOf(id), 2);

    // Someone buys the rest, then the second late payment arrives: kept cancelled, refund due, stock untouched.
    await placeOrder(other, { ...checkout([{ productId: id, quantity: 2 }]), addressId: otherAddress }, { razorpayEnabled: false });
    await db().order.update({ where: { id: lost.id }, data: { razorpayOrderId: `order_${run}_lost` } });
    const refund = await recordRazorpayPayment({ razorpayOrderId: `order_${run}_lost`, razorpayPaymentId: `pay_${run}_lost`, actor: 'test' });
    assert.equal(refund.status, 'CANCELLED');
    assert.equal(refund.paymentStatus, 'REFUND_DUE');
    assert.equal(await stockOf(id), 0);
  });

  test('simultaneous late confirmations settle once; a passed delivery slot is never revived', async () => {
    const id = await product(4);
    const past = new Date(Date.now() - 30 * 60_000);
    const [racy, stale] = await Promise.all([1, 2].map(async () => (await placeOrder(customer, checkout([{ productId: id, quantity: 1 }], { paymentMethod: 'RAZORPAY' }, past), { razorpayEnabled: true, now: past })).order));
    await releaseExpiredReservations();
    assert.equal(await stockOf(id), 4);

    await db().order.update({ where: { id: racy.id }, data: { razorpayOrderId: `order_${run}_racy` } });
    const both = await Promise.all(['checkout', 'webhook'].map(actor => recordRazorpayPayment({ razorpayOrderId: `order_${run}_racy`, razorpayPaymentId: `pay_${run}_racy`, actor })));
    assert.ok(both.every(o => o.status === 'CONFIRMED' && o.paymentStatus === 'PAID'));
    assert.equal(await db().orderEvent.count({ where: { orderId: racy.id, paymentStatus: 'PAID' } }), 1);
    assert.equal(await stockOf(id), 3, 're-reserved exactly once');

    await db().order.update({ where: { id: stale.id }, data: { razorpayOrderId: `order_${run}_stale`, slotStart: new Date(Date.now() - 60_000) } });
    const refund = await recordRazorpayPayment({ razorpayOrderId: `order_${run}_stale`, razorpayPaymentId: `pay_${run}_stale`, actor: 'test' });
    assert.equal(refund.status, 'CANCELLED');
    assert.equal(refund.paymentStatus, 'REFUND_DUE');
    assert.equal(await stockOf(id), 3);
  });

  test('payment for a customer-cancelled order is refunded, not revived', async () => {
    const id = await product(3);
    const { order } = await placeOrder(customer, checkout([{ productId: id, quantity: 1 }], { paymentMethod: 'RAZORPAY' }), { razorpayEnabled: true });
    await db().order.update({ where: { id: order.id }, data: { razorpayOrderId: `order_${run}_cc` } });
    assert.ok(await cancelOrderAsCustomer(customer, order.id));
    const result = await recordRazorpayPayment({ razorpayOrderId: `order_${run}_cc`, razorpayPaymentId: `pay_${run}_cc`, actor: 'test' });
    assert.equal(result.status, 'CANCELLED');
    assert.equal(result.paymentStatus, 'REFUND_DUE');
    assert.equal(await stockOf(id), 3);
  });

  test('webhook verifies signatures and processes each event once', async () => {
    Object.assign(process.env, { RAZORPAY_KEY_ID: 'rzp_test_dummy', RAZORPAY_KEY_SECRET: 'test_key_secret', RAZORPAY_WEBHOOK_SECRET: 'test_webhook_secret' });
    const { POST } = await import('../../app/api/payments/razorpay/webhook/route');
    const id = await product(3);
    const { order } = await placeOrder(customer, checkout([{ productId: id, quantity: 1 }], { paymentMethod: 'RAZORPAY' }), { razorpayEnabled: true });
    await db().order.update({ where: { id: order.id }, data: { razorpayOrderId: `order_${run}_wh` } });
    const body = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: `pay_${run}_wh`, order_id: `order_${run}_wh`, amount: order.totalPaise, currency: 'INR' } } } });
    const send = (signature: string, eventId = `evt_${run}`) => POST(new Request('http://localhost/api/payments/razorpay/webhook', { method: 'POST', body, headers: { 'x-razorpay-signature': signature, 'x-razorpay-event-id': eventId } }));
    assert.equal((await send('0'.repeat(64))).status, 400);
    assert.equal((await db().order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus, 'PENDING');
    const signature = hmacSha256Hex('test_webhook_secret', body);
    assert.equal((await (await send(signature)).json()).status, 'ok');
    assert.equal((await (await send(signature)).json()).status, 'duplicate');
    const paid = await db().order.findUniqueOrThrow({ where: { id: order.id } });
    assert.equal(paid.paymentStatus, 'PAID');
    assert.equal(paid.razorpayPaymentId, `pay_${run}_wh`);
    await db().paymentWebhookEvent.delete({ where: { id: `evt_${run}` } });
  });
});
