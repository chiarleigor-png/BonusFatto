import { updateGoogleConsent } from './googleAds.js';
import { initMetaPixel } from './metaPixel.js';

export const CONSENT_KEY = 'bonusfatto_consent_v1';
export const CONSENT_EVENT = 'bonusfatto:consent-change';

const defaultConsent = {
  necessary: true,
  analytics: false,
  marketing: false,
  decided: false,
};

function normalize(value) {
  return {
    necessary: true,
    analytics: Boolean(value?.analytics),
    marketing: Boolean(value?.marketing),
    decided: Boolean(value?.decided),
  };
}

export function readConsent() {
  if (typeof window === 'undefined') return defaultConsent;
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    return raw ? normalize(JSON.parse(raw)) : defaultConsent;
  } catch {
    return defaultConsent;
  }
}

function loadClarity() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__bonusFattoClarityLoaded) return;
  window.__bonusFattoClarityLoaded = true;

  (function(c,l,a,r,i,t,y){
    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments);};
    t=l.createElement(r);
    t.async=1;
    t.src='https://www.clarity.ms/tag/'+i;
    y=l.getElementsByTagName(r)[0];
    y.parentNode.insertBefore(t,y);
  })(window, document, 'clarity', 'script', 'yjtiwfy3b5');
}

function applyConsent(consent) {
  const value = normalize(consent);

  // Consent Mode v2: Google parte sempre da denied in index.html e viene
  // aggiornato solo dopo la scelta esplicita dell'utente.
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('consent', 'update', {
      analytics_storage: value.analytics ? 'granted' : 'denied',
      ad_storage: value.marketing ? 'granted' : 'denied',
      ad_user_data: value.marketing ? 'granted' : 'denied',
      ad_personalization: value.marketing ? 'granted' : 'denied',
      functionality_storage: 'granted',
      security_storage: 'granted',
      personalization_storage: 'denied',
    });
    window.gtag('set', 'ads_data_redaction', !value.marketing);
  } else {
    updateGoogleConsent(value.analytics && value.marketing);
  }

  if (value.analytics) loadClarity();
  if (value.marketing) initMetaPixel();
}

export function saveConsent(next) {
  if (typeof window === 'undefined') return;
  const consent = normalize({ ...next, decided: true });
  try {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
  } catch {
    // Il consenso resta valido per la sessione anche se lo storage non è disponibile.
  }
  applyConsent(consent);
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: consent }));
}

export function acceptAllConsent() {
  saveConsent({ analytics: true, marketing: true });
}

export function rejectOptionalConsent() {
  saveConsent({ analytics: false, marketing: false });
}

export function initConsent() {
  if (typeof window === 'undefined') return;
  const consent = readConsent();
  if (consent.decided) applyConsent(consent);
}
