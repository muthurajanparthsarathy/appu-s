import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateQuote, parseCart } from '../app/server/pricing';
import { products } from '../app/data/catalog';
test('rejects malformed, duplicate and unbounded quantities', () => {
  for (const value of [null, {}, [{productId:'tomato',quantity:-1}], [{productId:'tomato',quantity:1.5}], [{productId:'tomato',quantity:21}], [{productId:'tomato',quantity:1},{productId:'tomato',quantity:1}]]) assert.throws(() => parseCart(value));
});
test('server catalog prices override untrusted client fields', () => {
  const lines = parseCart([{productId:'tomato',quantity:2,pricePaise:1}]);
  const quote = calculateQuote(lines,products);
  assert.equal(quote.subtotalPaise,6400); assert.equal(quote.deliveryPaise,3500); assert.equal(quote.totalPaise,9900); assert.equal(quote.savingsPaise,1600);
});
test('free delivery threshold is exact and empty basket is free', () => {
  const product = {...products[0],pricePaise:49900,mrpPaise:49900};
  assert.equal(calculateQuote([{productId:product.id,quantity:1}],[product]).deliveryPaise,0);
  assert.equal(calculateQuote([{productId:product.id,quantity:1}],[{...product,pricePaise:49899}]).deliveryPaise,3500);
  assert.equal(calculateQuote([],products).totalPaise,0);
});
test('unknown and insufficient-stock products fail closed', () => {
  assert.throws(() => calculateQuote([{productId:'missing',quantity:1}],products));
  assert.throws(() => calculateQuote([{productId:'broccoli',quantity:1}],products));
  assert.throws(() => calculateQuote([{productId:'sunflower-oil',quantity:20}],products));
});
