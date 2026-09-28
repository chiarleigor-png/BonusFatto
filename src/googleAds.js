const GOOGLE_ADS_ID = 'AW-18481382989';
const PURCHASE_SEND_TO = 'AW-18481382989/8PmMCJ-H0okdEM2MzuxE';
const PURCHASES_KEY = 'bonusfatto_google_ads_purchases';

function readIds() {
  try {
    const value = JSON.parse(window.localStorage.getItem(PURCHASES_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function rememberPurchase(sessionId) {
  const ids = readIds();
  if (ids.includes(sessionId)) return false;
  try {
    window.localStorage.setItem(PURCHASES_KEY, JSON.stringify([...ids.slice(-99), sessionId]));
  } catch {
    // Tracking still works if localStorage is unavailable.
  }
  return true;
}

export function initGoogleAds() {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = function gtag(){ window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GOOGLE_ADS_ID);
  }
}

export function trackGoogleAdsPurchase({ sessionId, value, currency }) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function' || !sessionId) return;
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0 || currency !== 'EUR') return;
  if (!rememberPurchase(sessionId)) return;

  window.gtag('event', 'conversion', {
    send_to: PURCHASE_SEND_TO,
    value: numericValue,
    currency: 'EUR',
    transaction_id: sessionId,
  });
}
