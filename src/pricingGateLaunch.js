import { openBillingForm } from './billingForm.js';

const CHILDREN_KEY = 'bonusfatto_checkout_children';
const PROFILE_KEY = 'bonusfatto_profile_2026';
const REPORT_ENTRY = 'bonusfatto_report_entry';
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
  const comune = summary[2]?.querySelector('strong')?.textContent?.trim() || '';
  const lead = shell.querySelector('.paywall-heading .lead')?.textContent || '';
  const iseePart = lead.split('·').find((part) => /ISEE/i.test(part)) || '';
  const isee = parseEuroNumber(iseePart.replace(/ISEE/i, ''));
  const figli = Number(sessionStorage.getItem(CHILDREN_KEY) || 0);
  return { comune, isee, figli: Number.isInteger(figli) && figli >= 0 ? figli : 0, profile: readProfile() };
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
  if (document.getElementById('bf-single-pdf-funnel')) return;
  const style = document.createElement('style');
  style.id = 'bf-single-pdf-funnel';
  style.textContent = `
    .bf-free-result{max-width:820px;margin:22px auto;padding:24px;border:1px solid #cfe4c5;border-radius:24px;background:linear-gradient(180deg,#f6fff1 0%,#edf8e7 100%);box-shadow:0 16px 44px rgba(55,86,38,.08)}
    .bf-free-result h2{margin:8px 0 6px;font-size:clamp(25px,5vw,38px);line-height:1.08;color:#315a2b}
    .bf-free-result p{margin:0;color:#5d6b56}
    .bf-free-list{display:grid;gap:10px;margin:18px 0;padding:0;list-style:none}
    .bf-free-list li{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:14px;background:#fff;border:1px solid #dbead4;font-weight:700;color:#354333}
    .bf-saving-estimate{margin-top:16px!important;padding-top:16px;border-top:1px dashed #bfd4b6;color:#315a2b!important;font-weight:800}
    .bf-pdf-paywall{max-width:820px;margin:18px auto 0;padding:26px;border-radius:26px;background:linear-gradient(145deg,#5b21b6 0%,#7C3AED 58%,#6d28d9 100%);color:#fff;box-shadow:0 24px 60px rgba(91,33,182,.24)}
    .bf-pdf-paywall .bf-pdf-kicker{font-size:12px;letter-spacing:.13em;font-weight:900;opacity:.85}
    .bf-pdf-paywall h2{margin:8px 0 10px;font-size:clamp(27px,5vw,40px);line-height:1.08;color:#fff}
    .bf-pdf-paywall ul{display:grid;gap:9px;margin:18px 0 22px;padding:0;list-style:none}
    .bf-pdf-paywall li:before{content:'✓';display:inline-grid;place-items:center;width:22px;height:22px;margin-right:9px;border-radius:50%;background:#fff;color:#6d28d9;font-weight:900}
    .bf-pdf-cta{width:100%;min-height:56px;border:0;border-radius:16px;background:#fff!important;color:#5b21b6!important;font-weight:900;font-size:17px;cursor:pointer}
    .bf-pdf-trust{margin:13px 0 0!important;text-align:center;font-size:12px;line-height:1.45;opacity:.86}
    @media (max-width:640px){.bf-free-result,.bf-pdf-paywall{padding:19px;border-radius:20px}.bf-free-list li{font-size:14px}.bf-pdf-paywall h2{font-size:28px}}
  `;
  document.head.appendChild(style);
}

function patchGate() {
  const shell = document.querySelector('.paywall-shell');
  if (!shell || shell.dataset.singlePdfFunnel === '1') return;
  const grid = shell.querySelector('.plan-grid');
  if (!grid) return;

  shell.dataset.singlePdfFunnel = '1';
  ensureStyles();

  const payload = payloadFromGate(shell);
  const names = previewNames(shell);
  const count = Number(shell.querySelector('.teaser-summary > div strong')?.textContent?.trim()) || names.length || 1;
  const tariEligible = payload.isee <= (payload.figli >= 4 ? TARI_ISEE_LARGE_FAMILY_2026 : TARI_ISEE_STANDARD_2026);
  const listNames = names.length ? names : ['Bonus e agevolazioni compatibili con il tuo profilo'];
  if (tariEligible && !listNames.some((name) => /TARI/i.test(name))) listNames.unshift(`Bonus TARI ${payload.comune || ''} 25%`.trim());

  const heading = shell.querySelector('.paywall-heading');
  if (heading) {
    heading.innerHTML = `
      <span class="eyebrow">RISULTATO GRATUITO</span>
      <h1>Abbiamo trovato <span>${count} bonus</span> da verificare per te.</h1>
      <p class="lead">${payload.comune || 'Il tuo Comune'} · ISEE inserito · anteprima gratuita disponibile subito.</p>
    `;
  }

  const summary = shell.querySelector('.teaser-summary');
  if (summary) summary.remove();

  const free = document.createElement('section');
  free.className = 'bf-free-result';
  free.innerHTML = `
    <span class="eyebrow">ANTEPRIMA GRATIS</span>
    <h2>Hai diritto a ${count} bonus da approfondire</h2>
    <p>Ti mostriamo subito i nomi delle agevolazioni individuate, senza sbloccare ancora gli importi esatti.</p>
    <ul class="bf-free-list">${listNames.slice(0, Math.max(4, listNames.length)).map((name) => `<li><span>✓</span><span>${name}</span></li>`).join('')}</ul>
    <p class="bf-saving-estimate">Stima orientativa del risparmio annuo: circa 250–450 € + eventuali bonus familiari e riduzioni locali.</p>
  `;

  const paywall = document.createElement('section');
  paywall.className = 'bf-pdf-paywall';
  paywall.innerHTML = `
    <div class="bf-pdf-kicker">RELAZIONE 2026</div>
    <h2>Sblocca Relazione PDF Completa - 4,99€</h2>
    <ul>
      <li>Importi esatti calcolati con il tuo ISEE</li>
      <li>Scadenze del Comune e link ai bandi disponibili</li>
      <li>Moduli e indicazioni operative per la domanda</li>
      <li>Contenuti aggiornati al 2026</li>
    </ul>
    <button type="button" class="bf-pdf-cta">Scarica PDF Completo - 4,99€</button>
    <p class="bf-pdf-trust">Pagamento sicuro • Download immediato • Servizio informativo indipendente, non sito governativo</p>
  `;

  grid.replaceWith(free, paywall);
  track('bonus_calcolato');

  paywall.querySelector('.bf-pdf-cta').addEventListener('click', () => {
    track('begin_checkout', { value: 4.99, currency: 'EUR' });
    sessionStorage.setItem(REPORT_ENTRY, JSON.stringify(payload));
    openBillingForm('report', payload);
  });
}

const observer = new MutationObserver(patchGate);
observer.observe(document.documentElement, { childList: true, subtree: true });
patchGate();
