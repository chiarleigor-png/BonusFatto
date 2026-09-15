import { openBillingForm } from './billingForm.js';

const childrenStorageKey = 'bonusfatto_checkout_children';
const profileStorageKey = 'bonusfatto_profile_2026';

function validChildren(value) {
  if (value == null || String(value).trim() === '') return null;
  const children = Number(value);
  return Number.isSafeInteger(children) && children >= 0 ? children : null;
}

function readProfile() {
  try {
    const raw = localStorage.getItem(profileStorageKey);
    const profile = raw ? JSON.parse(raw) : null;
    return profile && typeof profile === 'object' ? profile : null;
  } catch {
    return window.__bonusFattoProfile2026 || null;
  }
}

document.addEventListener('submit', (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  const label = Array.from(form.querySelectorAll('label')).find((item) => item.textContent.includes('Figli a carico'));
  const select = label?.control || label?.querySelector('select');
  if (!(select instanceof HTMLSelectElement)) return;
  const children = validChildren(select.value);
  if (children === null) sessionStorage.removeItem(childrenStorageKey);
  else sessionStorage.setItem(childrenStorageKey, String(children));
}, true);

function euroNumber(value) {
  const n = Number(String(value || '').replace(/[^0-9,.-]/g, '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function payload(shell) {
  const lead = shell.querySelector('.paywall-heading .lead')?.textContent || '';
  const parts = lead.split('·').map((item) => item.trim());
  return {
    comune: parts[0] || '',
    isee: euroNumber((parts[1] || '').replace(/^ISEE\s*/i, '')),
    figli: validChildren(sessionStorage.getItem(childrenStorageKey)) ?? 0,
    profile: readProfile(),
  };
}

function previewNames(shell) {
  const lead = shell.querySelector('.paywall-heading .lead')?.textContent || '';
  return (lead.split('Anteprima:')[1] || '').replace(/…/g, '').split(',').map((n) => n.trim()).filter(Boolean);
}

function makeCard(name, index) {
  const card = document.createElement('article');
  card.className = 'bf-preview-card-v3';
  card.innerHTML = `
    <div class="bf-card-blurred">
      <div class="bf-card-index">${String(index + 1).padStart(2, '0')}</div>
      <div><span class="category">AGEVOLAZIONE INDIVIDUATA</span><h3>${name}</h3><p>Importo, requisiti, documenti e prossimi passi disponibili dopo lo sblocco.</p></div>
      <div class="bf-card-amount">€ —</div>
    </div>
    <div class="bf-preview-lock-overlay"><span class="bf-preview-lock-pill">🔒 Dettagli bloccati</span></div>`;
  return card;
}

function makeOffer({ type = '', tag, title, price, plan, description, items, button }) {
  const card = document.createElement('article');
  card.className = `bf-offer-card ${type}`;
  card.innerHTML = `
    <div><span class="bf-offer-tag">${tag}</span><h3>${title}</h3><p>${description}</p><ul>${items.map((x) => `<li>${x}</li>`).join('')}</ul></div>
    <div class="bf-offer-action"><div class="bf-offer-price">${price}</div><button type="button" class="primary bf-offer-button" data-plan="${plan}">${button}</button></div>`;
  return card;
}

function enhancePaywall() {
  const shell = document.querySelector('.paywall-shell');
  if (!shell || shell.dataset.bfV3) return;
  shell.dataset.bfV3 = 'true';
  shell.classList.add('bf-gate-v3');

  const count = shell.querySelector('.teaser-summary > div strong')?.textContent?.trim() || '0';
  const heading = shell.querySelector('.paywall-heading h1');
  if (heading) heading.innerHTML = `Abbiamo individuato <span>${count} agevolazioni</span><br />da approfondire per te.`;

  const lead = shell.querySelector('.paywall-heading .lead');
  const names = previewNames(shell);
  if (lead) {
    const profile = (lead.textContent || '').split('· Anteprima:')[0].trim();
    lead.textContent = `${profile} · il dettaglio completo è pronto per essere sbloccato.`;
  }

  const preview = document.createElement('section');
  preview.className = 'bf-preview-section-v3';
  preview.innerHTML = `<div class="bf-preview-heading"><div><span class="eyebrow">AGEVOLAZIONI TROVATE</span><h2>Ecco i bonus individuati per il tuo profilo</h2></div><span class="bf-preview-count">${count} trovati</span></div>`;
  const list = document.createElement('div');
  list.className = 'bf-preview-list-v3';
  const total = Math.max(Number(count) || names.length || 1, names.length || 1);
  for (let i = 0; i < total; i += 1) list.appendChild(makeCard(names[i] || `Agevolazione ${i + 1}`, i));
  preview.appendChild(list);

  const stack = document.createElement('section');
  stack.className = 'bf-offer-stack';
  stack.append(
    makeOffer({ tag: 'ANALISI VELOCE', title: 'Risultato immediato in circa 30 secondi', price: '2,99 €', plan: 'base', description: 'Sblocca subito l’analisi dei bonus compatibili con i dati inseriti.', items: ['Risultato immediato', 'Tutte le agevolazioni individuate', 'Importi stimabili, requisiti e prossimi passi'], button: 'Sblocca analisi · 2,99 €' }),
    makeOffer({ type: 'isee', tag: 'ANALISI CON ISEE · IMMEDIATA', title: 'Carica il tuo ISEE 2026', price: '6,90 €', plan: 'isee', description: 'Carica l’attestazione ISEE: BonusFatto legge i dati disponibili e completa l’analisi con poche domande mirate.', items: ['Caricamento attestazione ISEE', 'Lettura automatica dei dati disponibili', 'Analisi immediata più precisa'], button: 'Analizza il mio ISEE · 6,90 €' }),
    makeOffer({ type: 'report', tag: 'RELAZIONE PERSONALIZZATA', title: 'Relazione PDF pronta da conservare', price: '4,90 €', plan: 'report', description: 'Ricevi una relazione personalizzata con riepilogo bonus, TARI e modello email/PEC per il Comune.', items: ['Relazione PDF personalizzata', 'Riepilogo bonus e prossimi passi', 'Modello email/PEC TARI'], button: 'Ottieni relazione · 4,90 €' }),
    makeOffer({ type: 'whatsapp', tag: 'BONUS ALERT WHATSAPP', title: 'Scadenze e nuovi bonus via WhatsApp', price: '6,90 €', plan: 'whatsapp', description: 'Ricevi per 12 mesi avvisi sulle principali scadenze e sui nuovi bonus coerenti con il profilo indicato.', items: ['Avvisi principali sulle scadenze', 'Segnalazioni nuovi bonus', 'Servizio per 12 mesi con consenso dedicato'], button: 'Attiva Bonus Alert · 6,90 €' }),
    makeOffer({ type: 'pec', tag: 'INVIO PEC AL COMUNE', title: 'Prepariamo e inviamo la PEC per te', price: '14,90 €', plan: 'pec', description: 'Dopo il pagamento inserisci destinatario, oggetto, testo e allegati. BonusFatto prende in carico l’invio e ti trasmette le ricevute disponibili.', items: ['Compilazione guidata', 'Controllo formale dei dati', 'Invio PEC da parte nostra', 'Ricevute disponibili'], button: 'Affida a noi la PEC · 14,90 €' }),
    makeOffer({ type: 'tari-service', tag: 'GESTIONE COMPLETA PRATICA TARI', title: 'Pensiamo noi alla richiesta al Comune', price: '19,90 €', plan: 'tari', description: 'BonusFatto predispone la richiesta, verifica gli allegati e la trasmette per tuo conto all’Ufficio Tributi attraverso il canale previsto, inclusa PEC quando ammessa.', items: ['Predisposizione della richiesta', 'Verifica degli allegati', 'Trasmissione per tuo conto al Comune', 'Copia della pratica e ricevute disponibili'], button: 'Gestisci pratica TARI · 19,90 €' })
  );

  const grid = shell.querySelector('.plan-grid');
  if (grid) { grid.style.display = 'none'; grid.before(preview); grid.after(stack); } else { shell.append(preview, stack); }
  const data = payload(shell);
  stack.querySelectorAll('.bf-offer-button').forEach((button) => button.onclick = () => openBillingForm(button.dataset.plan, data));
}

function saferTotal() {
  const card = document.querySelector('.results .total-card');
  if (!card || card.dataset.bfSafe) return;
  card.dataset.bfSafe = 'true';
  card.classList.add('bf-safe-total');
  const rows = card.querySelectorAll(':scope > div');
  const annual = rows[0]?.querySelector('b')?.textContent?.trim();
  const label = card.querySelector(':scope > span');
  const total = card.querySelector(':scope > strong');
  const note = card.querySelector(':scope > p');
  if (label) label.textContent = 'BENEFICIO ANNUALE STIMATO DAI DATI DISPONIBILI';
  if (total && annual) total.textContent = `circa ${annual}`;
  if (note) note.textContent = 'Stima orientativa: l’importo effettivo può dipendere dalle verifiche dell’ente e dalle condizioni dichiarate.';
  if (rows[1]?.querySelector('span')) rows[1].querySelector('span').textContent = 'Ulteriori massimali / una tantum';
  if (rows[1]?.querySelector('b')) rows[1].querySelector('b').textContent = 'Vedi dettaglio';
}

function updateLaunchPricingLabels() {
  document.querySelectorAll('.stats > div').forEach((box) => {
    const label = box.querySelector('span')?.textContent?.trim();
    const value = box.querySelector('strong');
    const note = box.querySelector('p');
    if (label === 'CHECKOUT' && value) { value.textContent = '2,99 €'; if (note) note.textContent = 'analisi veloce'; }
    if (label === 'REPORT' && value) { value.textContent = '4,90 €'; if (note) note.textContent = 'relazione PDF'; }
  });
  document.querySelectorAll('.news-box span').forEach((node) => {
    if (node.textContent.includes('pacchetto da 9,90')) node.textContent = 'Puoi scegliere anche Analisi con ISEE immediata a 6,90 €.';
  });
}

function injectIseeHomeCta() {
  const hero = document.querySelector('.hero-copy');
  if (!hero || hero.querySelector('.bf-isee-direct')) return;
  const a = document.createElement('a');
  a.className = 'bf-isee-direct';
  a.href = '/isee-start/';
  a.textContent = 'Oppure carica il tuo ISEE · Analisi immediata 6,90 €';
  a.style.cssText = 'display:inline-flex;margin:12px 0 4px;padding:12px 16px;border-radius:12px;background:#eef7f1;color:#215f40;font-weight:800;text-decoration:none;border:1px solid #c9dfd0';
  const desc = hero.querySelector('.hero-description');
  if (desc) desc.insertAdjacentElement('afterend', a); else hero.appendChild(a);
}

function run() { enhancePaywall(); saferTotal(); updateLaunchPricingLabels(); injectIseeHomeCta(); }
new MutationObserver(run).observe(document.documentElement, { subtree: true, childList: true });
run();
