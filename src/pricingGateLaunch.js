import { openBillingForm } from './billingForm.js';

const CHILDREN_KEY = 'bonusfatto_checkout_children';
const PROFILE_KEY = 'bonusfatto_profile_2026';
const REPORT_ANALYSIS_KEY = 'bonusfatto_report_analysis';
const SERVICE_ENTRY = 'bonusfatto_service_entry';
const REPORT_ENTRY = 'bonusfatto_report_entry';
const ISEE_FLOW_VERSION = '2026-09-17-final-1';

function readProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function parseEuroNumber(value = '') {
  const normalized = String(value).replace(/[^0-9,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function captureChildren(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  const label = Array.from(form.querySelectorAll('label')).find((item) => item.textContent.includes('Figli a carico'));
  const select = label?.querySelector('select');
  if (!select) return;
  const value = Number(select.value);
  if (Number.isInteger(value) && value >= 0) sessionStorage.setItem(CHILDREN_KEY, String(value));
}

document.addEventListener('submit', captureChildren, true);

function payloadFromGate(shell) {
  const summary = shell.querySelectorAll('.teaser-summary > div');
  const comune = summary[2]?.querySelector('strong')?.textContent?.trim() || '';
  const lead = shell.querySelector('.paywall-heading .lead')?.textContent || '';
  const iseePart = lead.split('·').find((part) => /ISEE/i.test(part)) || '';
  const isee = parseEuroNumber(iseePart.replace(/ISEE/i, ''));
  const figli = Number(sessionStorage.getItem(CHILDREN_KEY) || 0);
  return { comune, isee, figli: Number.isInteger(figli) && figli >= 0 ? figli : 0, profile: readProfile() };
}

function serviceCard({ badge, title, price, priceNote = '', description, plan, featured = false, button }) {
  return `
    <article class="plan-card${featured ? ' featured' : ''}">
      <span class="plan-badge">${badge}</span>
      <h2>${title}</h2>
      <div class="plan-price">${price}${priceNote ? ` <small>${priceNote}</small>` : ''}</div>
      <p>${description}</p>
      <button class="primary bf-launch-service" type="button" data-plan="${plan}">${button}</button>
    </article>`;
}

function patchGate() {
  const shell = document.querySelector('.paywall-shell');
  if (!shell || shell.dataset.launchPricing === '1') return;
  const grid = shell.querySelector('.plan-grid');
  if (!grid) return;

  shell.dataset.launchPricing = '1';

  const heading = shell.querySelector('.paywall-heading h1');
  if (heading) heading.innerHTML = heading.innerHTML.replace('Abbiamo trovato', 'Abbiamo individuato');

  grid.innerHTML = [
    serviceCard({
      badge: 'ANALISI VELOCE IN 30 SECONDI',
      title: 'Analisi veloce in 30 secondi',
      price: '2,99 €',
      priceNote: 'una tantum',
      description: 'Sblocca subito l’analisi rapida dei bonus compatibili con i dati inseriti.',
      plan: 'base',
      button: 'Sblocca analisi · 2,99 €',
    }),
    serviceCard({
      badge: 'ANALISI CON RELAZIONE',
      title: 'Analisi con relazione',
      price: '6,90 €',
      priceNote: 'una tantum',
      description: 'Carica l’attestazione ISEE, completa l’analisi e scarica la relazione PDF personalizzata.',
      plan: 'report',
      featured: true,
      button: 'Carica ISEE e prepara l’analisi',
    }),
    serviceCard({
      badge: 'INVIO TARI AL COMUNE',
      title: 'Invio pratica TARI',
      price: '14,90 €',
      priceNote: 'una tantum',
      description: 'Prepariamo la delega, raccogliamo i documenti e trasmettiamo la pratica TARI al Comune tramite il nostro backoffice.',
      plan: 'tari',
      button: 'Avvia pratica TARI · 14,90 €',
    }),
    serviceCard({
      badge: 'SERVIZIO CONTINUATIVO',
      title: 'Servizio continuativo',
      price: '6,90 €',
      priceNote: '12 mesi',
      description: 'Ricevi aggiornamenti periodici su novità, scadenze, bonus e TARI via email e/o WhatsApp.',
      plan: 'whatsapp',
      button: 'Attiva per 12 mesi · 6,90 €',
    }),
  ].join('');

  const payload = payloadFromGate(shell);
  grid.querySelectorAll('.bf-launch-service').forEach((button) => {
    button.addEventListener('click', () => {
      const plan = button.dataset.plan;
      if (plan === 'report') {
        sessionStorage.removeItem(REPORT_ANALYSIS_KEY);
        sessionStorage.setItem(REPORT_ENTRY, JSON.stringify(payload));
        window.location.assign(`/?isee_preview=1&flow=${encodeURIComponent(ISEE_FLOW_VERSION)}&fresh=1`);
        return;
      }
      if (['base', 'tari', 'whatsapp'].includes(plan)) {
        sessionStorage.setItem(SERVICE_ENTRY, JSON.stringify(payload));
        openBillingForm(plan, payload);
      }
    });
  });
}

const observer = new MutationObserver(patchGate);
observer.observe(document.documentElement, { childList: true, subtree: true });
patchGate();
