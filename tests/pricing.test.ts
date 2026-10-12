import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateQuote, paidQuantity, parseCart } from '../app/server/pricing';
import { catalogProducts, products } from '../app/data/catalog';
const bySlug = (slug: string) => products.find(p => p.slug === slug)!;
test('rejects malformed, duplicate and unbounded quantities', () => {
  for (const value of [null, {}, [{productId:'pr-ghee-1l',quantity:-1}], [{productId:'pr-ghee-1l',quantity:1.5}], [{productId:'pr-ghee-1l',quantity:21}], [{productId:'pr-ghee-1l',quantity:1},{productId:'pr-ghee-1l',quantity:1}]]) assert.throws(() => parseCart(value));
});
test('server catalog prices override untrusted client fields', () => {
  const lines = parseCart([{productId:'pr-sesame-oil-500ml',quantity:2,pricePaise:1}]);
  const quote = calculateQuote(lines,products);
  assert.equal(quote.subtotalPaise,30000); assert.equal(quote.deliveryPaise,3500); assert.equal(quote.totalPaise,33500); assert.equal(quote.savingsPaise,0);
});
test('MRP savings use the owner price list', () => {
  const quote = calculateQuote([{productId:'appu-appalam-1kg',quantity:2}],products);
  assert.equal(quote.subtotalPaise,52000); assert.equal(quote.savingsPaise,8000); assert.equal(quote.deliveryPaise,0);
});
test('free delivery threshold is exact and empty basket is free', () => {
  const product = {...products[0],pricePaise:49900,mrpPaise:49900,offer:'NONE' as const};
  assert.equal(calculateQuote([{productId:product.id,quantity:1}],[product]).deliveryPaise,0);
  assert.equal(calculateQuote([{productId:product.id,quantity:1}],[{...product,pricePaise:49899}]).deliveryPaise,3500);
  assert.equal(calculateQuote([],products).totalPaise,0);
});
test('buy one get one: every second pack is free', () => {
  assert.deepEqual([1,2,3,4,5].map(q => paidQuantity('BOGO', q)), [1,1,2,2,3]);
  assert.deepEqual([1,2,3].map(q => paidQuantity('NONE', q)), [1,2,3]);
  const gold = bySlug('appu-gold-appalam-200g');
  assert.equal(gold.offer, 'BOGO');
  const two = calculateQuote([{productId:gold.id,quantity:2}],products).items[0];
  assert.deepEqual([two.quantity, two.paidQuantity, two.lineTotalPaise], [2, 1, 9000]);
  const three = calculateQuote([{productId:gold.id,quantity:3}],products);
  assert.equal(three.subtotalPaise, 18000);
  assert.equal(three.savingsPaise, 3 * 10000 - 18000); // savings are measured against MRP for every pack received
  const small = calculateQuote([{productId:'appu-appalam-150g',quantity:4}],products);
  assert.equal(small.subtotalPaise, 16000);
  assert.equal(small.savingsPaise, 16000);
});
test('unknown and insufficient-stock products fail closed; unpriced products are never sellable', () => {
  assert.throws(() => calculateQuote([{productId:'missing',quantity:1}],products));
  assert.throws(() => calculateQuote([{productId:'pr-ghee-1l',quantity:1}],[{...bySlug('pr-ghee-1l'),stock:0}]));
  const hidden = catalogProducts.filter(p => !p.active);
  assert.equal(hidden.length, 9);
  assert.ok(hidden.every(p => p.pricePaise === 0 && !products.some(q => q.id === p.id)));
  assert.throws(() => calculateQuote([{productId:'appu-idli-rice-26kg',quantity:1}],products));
});
test('owner price list is loaded as integer paise', () => {
  assert.equal(products.length, 21);
  const prices = Object.fromEntries(products.map(p => [p.slug, p.pricePaise]));
  assert.equal(prices['pr-ghee-1l'], 100000);
  assert.equal(prices['daivam-sesame-oil-500ml'], 18000);
  assert.equal(prices['appu-idli-rice-10kg'], 55000);
  assert.ok(products.every(p => Number.isInteger(p.pricePaise) && p.pricePaise > 0 && p.mrpPaise >= p.pricePaise));
});
