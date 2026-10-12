// Razorpay API client behaviour with fetch stubbed (no network, no keys needed).
import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { capturedPayment } from '../app/server/razorpay';

const config = { keyId: 'rzp_test_dummy', keySecret: 'secret', webhookSecret: null };
const expected = { razorpayOrderId: 'order_A', amountPaise: 13100 };
const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

function stub(responses: Record<string, unknown>) {
  const calls: { url: string; method: string; body?: string; auth?: string }[] = [];
  globalThis.fetch = (async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET';
    calls.push({ url, method, body: init.body as string | undefined, auth: (init.headers as Record<string, string>)?.Authorization });
    const key = `${method} ${new URL(url).pathname}`;
    if (!(key in responses)) return new Response('{}', { status: 404 });
    return Response.json(responses[key]);
  }) as typeof fetch;
  return calls;
}
const payment = (status: string, extra = {}) => ({ id: 'pay_1', order_id: 'order_A', amount: 13100, currency: 'INR', status, ...extra });

test('captured payments are accepted without a capture call', async () => {
  const calls = stub({ 'GET /v1/payments/pay_1': payment('captured') });
  assert.deepEqual(await capturedPayment(config, 'pay_1', expected), { captured: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].auth, `Basic ${Buffer.from('rzp_test_dummy:secret').toString('base64')}`);
});

test('authorised payments are captured for exactly the order amount', async () => {
  const calls = stub({ 'GET /v1/payments/pay_1': payment('authorized'), 'POST /v1/payments/pay_1/capture': payment('captured') });
  assert.deepEqual(await capturedPayment(config, 'pay_1', expected), { captured: true });
  assert.equal(calls[1].method, 'POST');
  assert.deepEqual(JSON.parse(calls[1].body!), { amount: 13100, currency: 'INR' });
});

test('payments that are not captured are not treated as paid', async () => {
  stub({ 'GET /v1/payments/pay_1': payment('failed') });
  assert.deepEqual(await capturedPayment(config, 'pay_1', expected), { captured: false });
});

test('a payment for another order, amount or currency is rejected', async () => {
  for (const extra of [{ order_id: 'order_B' }, { amount: 100 }, { currency: 'USD' }]) {
    stub({ 'GET /v1/payments/pay_1': payment('captured', extra) });
    await assert.rejects(capturedPayment(config, 'pay_1', expected), /does not match/);
  }
  stub({});
  await assert.rejects(capturedPayment(config, 'pay_1', expected), /HTTP 404/);
});
