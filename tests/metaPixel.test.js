import assert from 'node:assert/strict';
import test from 'node:test';
import { initMetaPixel, trackInitiateCheckout, trackPurchase } from '../src/metaPixel.js';

function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
}

function browser() {
  const calls = [];
  global.window = {
    fbq: (...args) => calls.push(args),
    localStorage: storage(),
    sessionStorage: storage(),
  };
  return calls;
}

test('InitiateCheckout is emitted once for each Stripe Checkout Session', () => {
  const calls = browser();
  const event = { checkoutId: 'cs_test_checkout', plan: 'report', value: 1, currency: 'EUR' };
  trackInitiateCheckout(event);
  trackInitiateCheckout(event);
  assert.deepEqual(calls, [['track', 'InitiateCheckout', { content_ids: ['report'], content_type: 'product', value: 1, currency: 'EUR' }]]);
});

test('the Pixel initializes once and PageView follows SPA navigation without duplicates', async () => {
  const calls = [];
  const listeners = {};
  global.window = {
    fbq: (...args) => calls.push(args),
    location: { pathname: '/', search: '', hash: '' },
    history: {
      pushState() {},
      replaceState() {},
    },
    addEventListener: (type, listener) => { listeners[type] = listener; },
  };
  global.document = {};

  initMetaPixel();
  initMetaPixel();
  window.location.hash = '#privacy';
  listeners.hashchange();
  await Promise.resolve();

  assert.equal(calls.filter((call) => call[0] === 'init').length, 1);
  assert.equal(calls.filter((call) => call[1] === 'PageView').length, 2);
});

test('Purchase uses the verified amount and is deduplicated by Stripe Session ID', () => {
  const calls = browser();
  const purchase = { sessionId: 'cs_test_paid', value: 14.9, currency: 'EUR' };
  trackPurchase(purchase);
  trackPurchase(purchase);
  assert.deepEqual(calls, [['track', 'Purchase', { value: 14.9, currency: 'EUR' }]]);
});

test('Purchase rejects invalid event data', () => {
  const calls = browser();
  trackPurchase({ sessionId: 'cs_test_bad', value: 0, currency: 'EUR' });
  trackPurchase({ sessionId: 'cs_test_bad_currency', value: 10, currency: 'USD' });
  assert.equal(calls.length, 0);
});
