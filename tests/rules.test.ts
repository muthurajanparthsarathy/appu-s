import { test } from 'node:test';
import assert from 'node:assert/strict';
import { orderNumber, paiseToRupeesInput, parseRupeesToPaise } from '../app/lib/money';
import { availableSlots, findSlot, isPincode, SLOT_CUTOFF_MINUTES } from '../app/server/delivery';
import { ADMIN_CANCELLABLE, CUSTOMER_CANCELLABLE, NEXT_STATUS, paymentLabel, paymentStatusAfterAdvance, paymentStatusAfterCancel } from '../app/server/order-rules';
import { hashPassword, verifyPassword } from '../app/server/password';
import { hmacSha256Hex, verifyPaymentSignature, verifyWebhookSignature } from '../app/server/razorpay-signature';
import { normalizeIndianMobile, parseAddress, parseLoginIdentifier, parseProduct, parseRegistration, safeNextPath, slugify } from '../app/server/validation';

test('rupee input converts to exact integer paise', () => {
  assert.equal(parseRupeesToPaise('32'), 3200);
  assert.equal(parseRupeesToPaise('32.5'), 3250);
  assert.equal(parseRupeesToPaise(' 0.07 '), 7);
  assert.equal(parseRupeesToPaise('1234.99'), 123499);
  for (const bad of ['', '-1', '1.234', '1e3', 'abc', '12,50', 5]) assert.equal(parseRupeesToPaise(bad), null);
  assert.equal(paiseToRupeesInput(3205), '32.05');
  assert.equal(parseRupeesToPaise(paiseToRupeesInput(49900)), 49900);
  assert.equal(orderNumber(100001), 'AM100001');
});

// 2026-10-12 06:00 UTC = 11:30 IST
const morning = new Date('2026-10-12T06:00:00Z');
test('slots respect the cutoff and are expressed in IST', () => {
  const slots = availableSlots(morning);
  // 12:00 IST is only 30 minutes away (< 2h cutoff), so today's first bookable slot is 17:00 IST = 11:30 UTC.
  assert.equal(slots[0].id, '2026-10-12T11:30:00.000Z');
  assert.ok(slots.every(slot => slot.start.getTime() - morning.getTime() >= SLOT_CUTOFF_MINUTES * 60_000));
  assert.equal(new Set(slots.map(slot => slot.dayLabel)).size, 3);
  assert.equal(slots.length, 7);
  assert.equal(slots.at(-1)!.id, '2026-10-14T11:30:00.000Z');
});

test('late-night requests still offer three days of slots', () => {
  const night = new Date('2026-10-12T17:00:00Z'); // 22:30 IST
  const slots = availableSlots(night);
  assert.equal(slots[0].id, '2026-10-13T01:30:00.000Z'); // 07:00 IST next day
  assert.equal(slots.length, 9);
});

test('only currently offered slot ids are accepted', () => {
  assert.ok(findSlot('2026-10-12T11:30:00.000Z', morning));
  assert.equal(findSlot('2026-10-12T06:30:00.000Z', morning), null); // past
  assert.equal(findSlot('2026-10-12T11:31:00.000Z', morning), null); // not a window
  assert.equal(findSlot(123, morning), null);
});

test('pincode and mobile validation', () => {
  assert.ok(isPincode('641001'));
  for (const bad of ['041001', '64100', '6410011', 'abcdef', 641001]) assert.equal(isPincode(bad), false);
  assert.equal(normalizeIndianMobile('+91 98765 43210'), '9876543210');
  assert.equal(normalizeIndianMobile('09876543210'), '9876543210');
  assert.equal(normalizeIndianMobile('5876543210'), null);
  assert.equal(normalizeIndianMobile('98765'), null);
});

test('order transitions and payment states', () => {
  assert.equal(NEXT_STATUS.CONFIRMED, 'PACKING');
  assert.equal(NEXT_STATUS.DELIVERED, undefined);
  assert.equal(NEXT_STATUS.CANCELLED, undefined);
  assert.equal(NEXT_STATUS.PENDING_PAYMENT, undefined); // only payment confirms an online order
  assert.ok(!CUSTOMER_CANCELLABLE.includes('PACKING'));
  assert.ok(ADMIN_CANCELLABLE.includes('PACKING'));
  assert.ok(!ADMIN_CANCELLABLE.includes('DELIVERED'));
  assert.equal(paymentStatusAfterCancel('PAID'), 'REFUND_DUE');
  assert.equal(paymentStatusAfterCancel('PENDING'), 'PENDING');
  assert.equal(paymentStatusAfterAdvance('COD', 'DELIVERED', 'PENDING'), 'PAID');
  assert.equal(paymentStatusAfterAdvance('COD', 'PACKING', 'PENDING'), 'PENDING');
  assert.equal(paymentStatusAfterAdvance('RAZORPAY', 'DELIVERED', 'PAID'), 'PAID');
  assert.equal(paymentLabel('COD', 'PENDING', 'CANCELLED'), 'Not charged');
  assert.equal(paymentLabel('RAZORPAY', 'REFUND_DUE', 'CANCELLED'), 'Refund due');
});

test('passwords are salted, verifiable and reject tampering', async () => {
  const a = await hashPassword('correct horse battery');
  const b = await hashPassword('correct horse battery');
  assert.notEqual(a, b);
  assert.ok(a.startsWith('scrypt$16384$8$1$'));
  assert.ok(await verifyPassword('correct horse battery', a));
  assert.equal(await verifyPassword('correct horse batterY', a), false);
  assert.equal(await verifyPassword('correct horse battery', a.slice(0, -2) + 'AA'), false);
  assert.equal(await verifyPassword('x', 'not-a-hash'), false);
});

test('Razorpay signatures verify only with the right secret and payload', () => {
  const keySecret = 'test_secret';
  const signature = hmacSha256Hex(keySecret, 'order_ABC|pay_XYZ');
  assert.ok(verifyPaymentSignature({ razorpayOrderId: 'order_ABC', razorpayPaymentId: 'pay_XYZ', signature, keySecret }));
  assert.equal(verifyPaymentSignature({ razorpayOrderId: 'order_ABC', razorpayPaymentId: 'pay_OTHER', signature, keySecret }), false);
  assert.equal(verifyPaymentSignature({ razorpayOrderId: 'order_ABC', razorpayPaymentId: 'pay_XYZ', signature, keySecret: 'wrong' }), false);
  assert.equal(verifyPaymentSignature({ razorpayOrderId: 'order_ABC', razorpayPaymentId: 'pay_XYZ', signature: 'zz', keySecret }), false);
  assert.equal(verifyPaymentSignature({ razorpayOrderId: 'order_ABC', razorpayPaymentId: 'pay_XYZ', signature: undefined, keySecret }), false);
  const body = JSON.stringify({ event: 'payment.captured' });
  assert.ok(verifyWebhookSignature(body, hmacSha256Hex('wh', body), 'wh'));
  assert.equal(verifyWebhookSignature(body + ' ', hmacSha256Hex('wh', body), 'wh'), false);
});

test('registration and address validation', () => {
  const ok = parseRegistration({ name: '  Asha  K ', email: ' Asha@Example.COM ', password: 'longenough', phone: '' });
  assert.ok(ok.ok && ok.data.email === 'asha@example.com' && ok.data.name === 'Asha K' && ok.data.phone === null);
  const bad = parseRegistration({ name: 'A', email: 'nope', password: 'short', phone: '123' });
  assert.ok(!bad.ok && Object.keys(bad.errors).sort().join() === 'email,name,password,phone');
  const address = parseAddress({ fullName: 'Asha', phone: '9876543210', line1: '12 Gandhi Street', city: 'Coimbatore', pincode: '641002' });
  assert.ok(address.ok && address.data.line2 === null);
  const badAddress = parseAddress({ fullName: '', phone: '1', line1: 'x', city: '', pincode: '0' });
  assert.ok(!badAddress.ok && Object.keys(badAddress.errors).length === 5);
});

test('sign-in identifier accepts an email address or an Indian mobile number', () => {
  assert.deepEqual(parseLoginIdentifier(' Asha@Example.COM '), { email: 'asha@example.com' });
  assert.deepEqual(parseLoginIdentifier('+91 98765 43210'), { phone: '9876543210' });
  assert.deepEqual(parseLoginIdentifier('09876543210'), { phone: '9876543210' });
  for (const bad of ['', '   ', 'nope@', '@example.com', 'asha', '12345', '5876543210', null, undefined, 42]) assert.equal(parseLoginIdentifier(bad), null);
});

test('product form validation converts money and guards image URLs', () => {
  const base = { name: 'Green Peas', slug: '', categorySlug: 'frozen', brand: 'Daily Good', unit: '500 g', price: '95', mrp: '110.00', stock: '15', icon: '🌱', imageUrl: '', description: 'Frozen green peas for curries.', active: 'on' };
  const ok = parseProduct(base, parseRupeesToPaise);
  assert.ok(ok.ok && ok.data.slug === 'green-peas' && ok.data.pricePaise === 9500 && ok.data.mrpPaise === 11000 && ok.data.active && !ok.data.featured && ok.data.offer === 'NONE');
  const bogo = parseProduct({ ...base, offer: 'BOGO' }, parseRupeesToPaise);
  assert.ok(bogo.ok && bogo.data.offer === 'BOGO');
  const sneaky = parseProduct({ ...base, offer: 'FREE_FOR_ALL' }, parseRupeesToPaise);
  assert.ok(sneaky.ok && sneaky.data.offer === 'NONE');
  assert.ok(!parseProduct({ ...base, price: '0' }, parseRupeesToPaise).ok, 'a product cannot be saved without a price');
  assert.ok(!parseProduct({ ...base, mrp: '90' }, parseRupeesToPaise).ok);
  assert.ok(!parseProduct({ ...base, stock: '-2' }, parseRupeesToPaise).ok);
  assert.ok(parseProduct({ ...base, imageUrl: '/images/products/peas.webp' }, parseRupeesToPaise).ok);
  assert.ok(parseProduct({ ...base, imageUrl: 'https://cdn.example.com/peas.jpg' }, parseRupeesToPaise).ok);
  for (const imageUrl of ['javascript:alert(1)', 'http://insecure.example/a.jpg', '/images/../.env', '/etc/passwd', 'https://x.com/"onerror=']) assert.ok(!parseProduct({ ...base, imageUrl }, parseRupeesToPaise).ok, imageUrl);
  assert.equal(slugify('Ãtta  (Whole Wheat) 5kg!'), 'atta-whole-wheat-5kg');
});

test('post-login redirects stay on this site', () => {
  assert.equal(safeNextPath('/checkout'), '/checkout');
  assert.equal(safeNextPath('/account/orders?tab=1#top'), '/account/orders?tab=1#top');
  for (const bad of ['https://evil.example', '//evil.example', '/\\evil.example', '/\t/evil.example', '/\n/evil.example', '/\r\n/evil.example', '/.//evil.example', '/%09/evil.example'.replace('%09', '\t'), 'checkout', undefined, 42]) {
    const result = safeNextPath(bad);
    assert.equal(new URL(result, 'https://veenamart.example').origin, 'https://veenamart.example', JSON.stringify(bad));
    assert.ok(!result.startsWith('//'), JSON.stringify(bad));
  }
});
