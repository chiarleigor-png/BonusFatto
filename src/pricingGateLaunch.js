import { openBillingForm } from './billingForm.js';
import top100Comuni from '../lib/top100Comuni.json';
import { PRICES, formatPrice } from './config/prices.js';

const CHILDREN_KEY = 'bonusfatto_checkout_children';
const PROFILE_KEY = 'bonusfatto_profile_2026';
const REPORT_ENTRY = 'bonusfatto_report_entry';
const SERVICE_ENTRY = 'bonusfatto_service_entry';
const TARI_ISEE_STANDARD_2026 = 9796;
const TARI_ISEE_LARGE_FAMILY_2026 = 20000;

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
  const comuneFromSummary = summary[2]?.querySelector('strong')?.textContent?.trim() || '';
  const lead = shell.querySelector('.paywall-heading .lead')?.textContent || '';
  const leadParts = lead.split('·').map((item) => item.trim());
  const comune = comuneFromSummary || leadParts[0] || '';
  const iseePart = leadParts.find((part) => /ISEE/i.test(part)) || '';
  const isee = parseEuroNumber(iseePart.replace(/ISEE/i, ''));
  const figli = Number(sessionStorage.getItem(CHILDREN_KEY) || 0);
  const sourceComune = top100Comuni.find((item) => item.nome.toLocaleLowerCase('it') === comune.toLocaleLowerCase('it')) || null;
  const istatFromShell = String(shell.dataset.istat || '').trim();
  return {
    comune,
    istat: /^\d{6}$/.test(istatFromShell) ? istatFromShell : (sourceComune?.istat || ''),
    isee,
    figli: Number.isInteger(figli) && figli >= 0 ? figli : 0,
    profile: readProfile()
  };
}

function previewNames(shell) {
  const lead = shell.querySelector('.paywall-heading .lead')?.textContent || '';
  return (lead.split('Anteprima:')[1] || '')
    .replace(/…/g, '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
}

function track(eventName, params = {}) {
  if (typeof window.gtag === 'function') window.gtag('event', eventName, params);
}

function ensureStyles() {
  if (document.getElementById('bf-home-blur-funnel')) return;
  const style = document.createElement('style');
  style.id = 'bf-home-blur-funnel';
  style.textContent = `
    .bf-home-funnel{max-width:980px;margin:24px auto 0}
    .bf-blur-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin:20px 0 26px}
    .bf-blur-card{position:relative;min-height:152px;display:flex;align-items:stretch;overflow:hidden;border:1px solid #e5e0f4;border-radius:20px;background:#fff;box-shadow:0 12px 34px rgba(34,20,73,.07)}
    .bf-blur-content{width:100%;display:grid;pointer-events:none;grid-template-columns:48px 1fr auto;gap:13px;align-items:center;padding:20px;filter:blur(8px);user-select:none;transition:filter .2s ease}
    .bf-blur-card.is-unlocked .bf-blur-content{filter:none;user-select:text;pointer-events:auto}
    .bf-blur-icon{width:46px;height:46px;display:grid;place-items:center;border-radius:14px;background:#f1eaff;color:#6d28d9;font-size:22px}
    .bf-blur-title{margin:3px 0 0;font-size:18px;line-height:1.2;color:#282331;font-weight:850}
    .bf-blur-meta{font-size:11px;letter-spacing:.08em;color:#81788d;font-weight:800}
    .bf-blur-amount{font-weight:900;color:#5b21b6;white-space:nowrap}
    .bf-lock-overlay{position:absolute;inset:0;display:grid;place-items:center;background:rgba(255,255,255,.25);backdrop-filter:saturate(.8)}
    .bf-blur-card.is-unlocked .bf-lock-overlay{display:none}
    .bf-lock-pill{display:inline-flex;align-items:center;justify-content:center;min-width:46px;height:46px;border-radius:50%;background:#fff;box-shadow:0 8px 24px rgba(47,36,69,.16);font-size:20px}
    .bf-price-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
    .bf-price-card{position:relative;display:flex;flex-direction:column;min-height:330px;padding:24px;border:1px solid #e1dbea;border-radius:24px;background:#fff;box-shadow:0 18px 44px rgba(36,23,61,.08)}
    .bf-price-card.premium{border:2px solid #7C3AED;background:linear-gradient(180deg,#fbf9ff 0%,#f4efff 100%)}
    .bf-price-card h2{margin:8px 0 4px;font-size:26px;line-height:1.1;color:#261f30}
    .bf-price-card .bf-price-sub{margin:0 0 14px;color:#716878}
    .bf-price-card ul{display:grid;gap:10px;margin:14px 0 22px;padding:0;list-style:none;color:#4b4450}
    .bf-price-card li{display:flex;gap:9px;align-items:flex-start}
    .bf-price-card li:before{content:'✓';font-weight:900;color:#6d28d9}
    .bf-price-card button{margin-top:auto;width:100%;min-height:54px;border-radius:15px;font-size:16px;font-weight:900;cursor:pointer}
    .bf-basic-button{border:2px solid #d8cfdf;background:#fff;color:#4c4056}
    .bf-premium-button,.bf-pec-button{border:0;background:#7C3AED!important;color:#fff!important;box-shadow:0 10px 24px rgba(124,58,237,.25)}
    .bf-choice-badge{position:absolute;right:18px;top:18px;padding:7px 11px;border-radius:999px;background:#7C3AED;color:#fff;font-size:12px;font-weight:900}
    .bf-home-disclaimer{margin:18px auto 0;text-align:center;color:#756d79;font-size:12px;line-height:1.5}
    .bf-tari-longtail{margin:18px 0;padding:18px;border-radius:18px;background:#fff;border:1px solid #e5e0f4;text-align:left}
    .bf-tari-longtail h3{margin:0 0 8px;color:#282331}
    .bf-tari-green{margin:12px 0;padding:14px;border-radius:14px;background:#eefbf2;border:1px solid #b9e7c5;color:#245b34}
    .bf-tari-longtail-actions{display:grid;gap:8px}.bf-tari-longtail button{width:100%;min-height:50px;border-radius:14px;font-weight:900;cursor:pointer}.bf-tari-longtail .secondary{border:1px solid #cfc5dc;background:#fff;color:#4c4056}.bf-tari-longtail .primary{border:0;background:#7C3AED;color:#fff}
    @media (max-width:720px){
      .bf-blur-grid,.bf-price-grid{grid-template-columns:1fr}
      .bf-blur-card{min-height:138px}
      .bf-blur-content{grid-template-columns:44px 1fr;align-items:center;padding:17px}
      .bf-blur-amount{grid-column:2}
      .bf-price-card{min-height:auto}
    }
  `;
  document.head.appendChild(style);
}

async function loadVerifiedTari(funnel, payload) {
  const target = funnel.querySelector('.bf-tari-live-data');
  if (!target) return;

  const renderLongTail = () => {
    payload.tariFound = false;
    target.hidden = false;
    target.className = 'bf-tari-longtail bf-tari-live-data';
    target.innerHTML = `
      <h3>TARI comunale - ${payload.comune || 'il tuo Comune'}</h3>
      <p>Non abbiamo ancora la delibera specifica di <strong>${payload.comune || 'questo Comune'}</strong> nel motore Top 500. Non mostriamo dati comunali inventati.</p>
      <div class="bf-tari-green">
        <strong>Normativa nazionale TARI.</strong><br>
        Il DPR 158/1999 disciplina il metodo tariffario e la L. 147/2013 consente ai Comuni di prevedere riduzioni ed esenzioni, anche collegate alla capacità contributiva tramite ISEE. La spettanza concreta dipende dal regolamento locale vigente: puoi comunque presentare una richiesta di verifica.
      </div>
      <div class="bf-tari-longtail-actions">
        <button type="button" class="secondary bf-tari-base-cta">Verifica diritto con normativa nazionale</button>
        <button type="button" class="secondary bf-tari-pdf-cta">Genera PDF con normativa nazionale + testo richiesta</button>
        <button type="button" class="primary bf-tari-pec-cta">Invio PEC gestito con riferimento normativa nazionale</button>
      </div>
    `;
    target.querySelector('.bf-tari-base-cta')?.addEventListener('click', () => {
      openBillingForm(PRICES.base.id, { ...payload, tariFound: false });
    });
    target.querySelector('.bf-tari-pdf-cta')?.addEventListener('click', () => {
      openBillingForm(PRICES.pdf.id, { ...payload, tariFound: false });
    });
    target.querySelector('.bf-tari-pec-cta')?.addEventListener('click', () => {
      openBillingForm(PRICES.pec.id, { ...payload, tariFound: false });
    });
  };

  if (!payload.istat) {
    renderLongTail();
    return;
  }

  target.textContent = 'Verifica TARI comunale in corso…';

  try {
    const response = await fetch(`/api/tari?istat=${encodeURIComponent(payload.istat)}`);
    const json = await response.json();

    if (response.ok && json?.found === true) {
      payload.tariFound = true;
      target.textContent = '';
      target.hidden = true;
      return;
    }

    if (response.ok && json?.found === false) {
      renderLongTail();
      return;
    }

    target.hidden = false;
    target.textContent = 'Dati TARI comunali temporaneamente non disponibili.';
  } catch {
    target.hidden = false;
    target.textContent = 'Dati TARI comunali temporaneamente non disponibili.';
  }
}

function patchGate() {
  const shell = document.querySelector('.paywall-shell');
  if (!shell || shell.dataset.homeBlurFunnel === '1') return;
  const grid = shell.querySelector('.plan-grid');
  if (!grid) return;

  shell.dataset.homeBlurFunnel = '1';
  ensureStyles();

  const payload = payloadFromGate(shell);
  const names = previewNames(shell);
  const count = Number(shell.querySelector('.teaser-summary > div strong')?.textContent?.trim()) || names.length || 1;
  const threshold = payload.figli >= 4 ? TARI_ISEE_LARGE_FAMILY_2026 : TARI_ISEE_STANDARD_2026;
  const tariEligible = Number.isFinite(payload.isee) && payload.isee <= threshold;
  const listNames = [...names];
  if (tariEligible && !listNames.some((name) => /TARI/i.test(name))) {
    listNames.unshift(`Bonus TARI ${payload.comune || ''} 25%`.trim());
  }
  while (listNames.length < Math.min(4, count)) listNames.push(`Agevolazione ${listNames.length + 1}`);
  const visibleNames = listNames.slice(0, Math.max(2, Math.min(4, count)));

  const heading = shell.querySelector('.paywall-heading');
  if (heading) {
    heading.innerHTML = `
      <span class="eyebrow">RISULTATO DEL CALCOLO</span>
      <h1>Hai diritto a <span>${count} bonus</span></h1>
      <p class="lead">Su 12 agevolazioni verificate per ${payload.comune || 'il tuo Comune'}</p>
    `;
  }

  const summary = shell.querySelector('.teaser-summary');
  if (summary) summary.remove();

  const funnel = document.createElement('section');
  funnel.className = 'bf-home-funnel';
  funnel.innerHTML = `
    <div class="bf-blur-grid">
      ${visibleNames.map((name, index) => `
        <article class="bf-blur-card">
          <div class="bf-blur-content blur-[8px] select-none">
            <div class="bf-blur-icon">${['€','⌂','⚡','★'][index % 4]}</div>
            <div>
              <div class="bf-blur-meta">BONUS ${String(index + 1).padStart(2, '0')}</div>
              <h3 class="bf-blur-title">${name}</h3>
            </div>
            <div class="bf-blur-amount">Importo stimato</div>
          </div>
          <div class="bf-lock-overlay"><span class="bf-lock-pill">🔒</span></div>
        </article>
      `).join('')}
    </div>

    <div class="bf-price-grid">
      <article class="bf-price-card basic">
        <span class="eyebrow">VISTA SBLOCCATA</span>
        <h2>${PRICES.base.label} - ${formatPrice(PRICES.base.price)}</h2>
        <p class="bf-price-sub">Il modo più rapido per vedere il risultato del calcolo.</p>
        <ul>
          <li>Vedi nomi bonus</li>
          <li>Importi stimati</li>
          <li>Idoneità in base all’ISEE inserito</li>
        </ul>
        <button type="button" class="bf-basic-button">Sblocca per ${formatPrice(PRICES.base.price)}</button>
      </article>

      <article class="bf-price-card premium">
        <span class="bf-choice-badge">Più scelto</span>
        <span class="eyebrow">PREMIUM</span>
        <h2>${PRICES.pdf.label} - ${formatPrice(PRICES.pdf.price)}</h2>
        <p class="bf-price-sub">Prezzo finale: include anche la Vista Base.</p>
        <ul>
          <li>Tutto di Base</li>
          <li>PDF con scadenze Top 500 + moduli</li>
          <li>Testo PEC precompilato</li>
          <li>Moduli e link bando disponibili</li>
        </ul>
        <button type="button" class="bf-premium-button bg-violet-600">Sblocca Premium ${formatPrice(PRICES.pdf.price)}</button>
      </article>

      <article class="bf-price-card pec">
        <span class="eyebrow">INVIO GESTITO BETA</span>
        <h2>${PRICES.pec.label} - ${formatPrice(PRICES.pec.price)}</h2>
        <p class="bf-price-sub">Prepariamo e inviamo noi la PEC con i tuoi dati.</p>
        <ul>
          <li>Invio al Comune indicato</li>
          <li>Ricevuta di consegna entro 24h lavorative</li>
          <li>Esito dipende dal Comune</li>
          <li>Servizio informativo: non è CAF</li>
        </ul>
        <button type="button" class="bf-pec-button">Invio gestito ${formatPrice(PRICES.pec.price)}</button>
      </article>
    </div>

    <p class="bf-home-disclaimer bf-tari-live-data">Verifica dati TARI comunali dalla fonte MEF…</p>
    <p class="bf-home-disclaimer">
      Servizio informativo indipendente - Non sito governativo - 7894 comuni 2026<br />
      Soglia bonus sociale 2026: ISEE 9.796 €; 20.000 € per nuclei con almeno 4 figli a carico.
    </p>
  `;

  grid.replaceWith(funnel);

  shell.dataset.unlocked = '';
  shell.querySelectorAll('.bf-blur-card').forEach((card) => card.classList.remove('is-unlocked'));

  track('view_blurred_results', { bonus_count: count, comune: payload.comune || '' });
  loadVerifiedTari(funnel, payload);

  funnel.querySelector('.bf-basic-button').addEventListener('click', () => {
    track('click_unlock_base', { value: PRICES.base.price, currency: 'EUR', bonus_count: count });
    sessionStorage.setItem(SERVICE_ENTRY, JSON.stringify(payload));
    openBillingForm(PRICES.base.id, payload);
  });

  funnel.querySelector('.bf-premium-button').addEventListener('click', () => {
    track('click_unlock_pdf', { value: PRICES.pdf.price, currency: 'EUR', bonus_count: count });
    sessionStorage.setItem(REPORT_ENTRY, JSON.stringify(payload));
    openBillingForm(PRICES.pdf.id, payload);
  });

  funnel.querySelector('.bf-pec-button').addEventListener('click', () => {
    track('click_pec_managed', { value: PRICES.pec.price, currency: 'EUR', bonus_count: count });
    openBillingForm(PRICES.pec.id, payload);
  });
}

const observer = new MutationObserver(patchGate);
observer.observe(document.documentElement, { childList: true, subtree: true });
patchGate();
