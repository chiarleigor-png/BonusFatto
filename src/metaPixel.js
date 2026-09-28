import { trackGoogleAdsPurchase } from './googleAds.js';

const PIXEL_ID = '1122441816881464';
const STATE_KEY = '__bonusFattoMetaPixel';
const PURCHASES_KEY = 'bonusfatto_meta_purchases';
const CHECKOUTS_KEY = 'bonusfatto_meta_checkouts';

function state() {
  if (!window[STATE_KEY]) {
    window[STATE_KEY] = { initialized: false, lastPage: '', navigationInstalled: false };
  }
  return window[STATE_KEY];
}

function readIds(storage, key) {
  try {
    const value = JSON.parse(storage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function rememberId(storage, key, id) {
  const ids = readIds(storage, key);
  if (ids.includes(id)) return false;
  storage.setItem(key, JSON.stringify([...ids.slice(-99), id]));
  return true;
}

function currentPage() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function trackPageView() {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
  const pixelState = state();
  const page = currentPage();
  if (pixelState.lastPage === page) return;
  pixelState.lastPage = page;
  window.fbq('track', 'PageView');
}

function installSpaNavigationTracking() {
  const pixelState = state();
  if (pixelState.navigationInstalled) return;
  pixelState.navigationInstalled = true;

  const notify = () => queueMicrotask(trackPageView);
  window.addEventListener('popstate', notify);
  window.addEventListener('hashchange', notify);

  for (const method of ['pushState', 'replaceState']) {
    const original = window.history[method];
    window.history[method] = function trackedHistoryState(...args) {
      const result = original.apply(this, args);
      notify();
      return result;
    };
  }
}

export function initMetaPixel() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const pixelState = state();
  if (!pixelState.initialized) {
    if (typeof window.fbq !== 'function') {
      const fbq = function metaPixelQueue(...args) {
        if (fbq.callMethod) fbq.callMethod(...args);
        else fbq.queue.push(args);
      };
      fbq.push = fbq;
      fbq.loaded = true;
      fbq.version = '2.0';
      fbq.queue = [];
      window.fbq = fbq;
      window._fbq = fbq;

      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://connect.facebook.net/en_US/fbevents.js';
      document.head.appendChild(script);
    }
    window.fbq('init', PIXEL_ID);
    pixelState.initialized = true;
  }

  installSpaNavigationTracking();
  trackPageView();
}

export function trackInitiateCheckout({ checkoutId, plan, value, currency }) {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function' || !checkoutId) return;
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 0 || currency !== 'EUR') return;
  if (!rememberId(window.sessionStorage, CHECKOUTS_KEY, checkoutId)) return;
  window.fbq('track', 'InitiateCheckout', {
    content_ids: plan ? [plan] : undefined,
    content_type: 'product',
    value: numericValue,
    currency: 'EUR',
  });
}

export function trackPurchase({ sessionId, value, currency }) {
  if (typeof window === 'undefined' || !sessionId) return;
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0 || currency !== 'EUR') return;

  // Google Ads: conversione solo dopo pagamento Stripe verificato.
  trackGoogleAdsPurchase({ sessionId, value: numericValue, currency: 'EUR' });

  // Meta Pixel: mantiene il tracciamento esistente e la sua deduplicazione.
  if (typeof window.fbq !== 'function') return;
  if (!rememberId(window.localStorage, PURCHASES_KEY, sessionId)) return;
  window.fbq('track', 'Purchase', { value: numericValue, currency: 'EUR' });
}
