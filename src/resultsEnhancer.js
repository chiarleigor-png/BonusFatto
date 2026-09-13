function parseItalianNumber(value) {
  if (!value) return 0;
  const normalized = String(value)
    .replace(/[^0-9,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function checkoutPayloadFromResults(root) {
  const lead = root.querySelector('.result-heading .lead')?.textContent || '';
  const parts = lead.split('·').map((part) => part.trim());
  const comune = parts[0] || '';
  const isee = parseItalianNumber((parts[1] || '').replace(/^ISEE\s*/i, ''));
  const figliMatch = (parts[2] || '').match(/(\d+)/);
  const figli = figliMatch ? Number(figliMatch[1]) : 0;
  return { comune, isee, figli };
}

function benefitPreviewCard(name, index) {
  const article = document.createElement('article');
  article.className = 'bf-preview-card';
  article.innerHTML = `
    <div class="bf-preview-index">${String(index + 1).padStart(2, '0')}</div>
    <div class="bf-preview-copy">
      <span>AGEVOLAZIONE INDIVIDUATA</span>
      <h3>${name || 'Bonus da verificare'}</h3>
      <div class="bf-preview-blur" aria-hidden="true">
        <i></i><i></i><i></i>
      </div>
    </div>
    <div class="bf-preview-lock">Dettagli bloccati</div>
  `;
  return article;
}

function enhancePaywall() {
  const shell = document.querySelector('.paywall-shell');
  if (!shell || shell.dataset.bfEnhanced === 'true') return;
  shell.dataset.bfEnhanced = 'true';
  shell.classList.add('bf-gate-v2');

  const heading = shell.querySelector('.paywall-heading h1');
  const count = shell.querySelector('.teaser-summary > div strong')?.textContent?.trim() || '';
  if (heading && count) heading.innerHTML = `Abbiamo individuato <span>${count} agevolazioni</span><br />da approfondire per te.`;

  const lead = shell.querySelector('.paywall-heading .lead');
  let names = [];
  if (lead) {
    const text = lead.textContent || '';
    const preview = text.split('Anteprima:')[1] || '';
    names = preview
      .replace(/…/g, '')
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean)
      .slice(0, 4);
    const profile = text.split('· Anteprima:')[0].trim();
    lead.textContent = `${profile} · il dettaglio completo è pronto per essere sbloccato.`;
  }

  const previewSection = document.createElement('section');
  previewSection.className = 'bf-preview-section';
  previewSection.innerHTML = `
    <div class="bf-preview-heading">
      <div>
        <span class="eyebrow">ANTEPRIMA DEL RISULTATO</span>
        <h2>I bonus ci sono. Sblocca importi, requisiti e prossimi passi.</h2>
      </div>
      <span class="bf-preview-count">${count || names.length} individuati</span>
    </div>
  `;
  const list = document.createElement('div');
  list.className = 'bf-preview-list';
  (names.length ? names : Array.from({ length: Math.min(Number(count) || 4, 4) }, () => 'Agevolazione da verificare'))
    .forEach((name, index) => list.appendChild(benefitPreviewCard(name, index)));
  previewSection.appendChild(list);

  const planGrid = shell.querySelector('.plan-grid');
  if (planGrid) planGrid.insertAdjacentElement('beforebegin', previewSection);

  const baseCard = shell.querySelector('.plan-card:not(.featured)');
  if (baseCard) {
    const badge = baseCard.querySelector('.plan-badge');
    const title = baseCard.querySelector('h2');
    const description = baseCard.querySelector(':scope > p');
    const button = baseCard.querySelector('.primary');
    if (badge) badge.textContent = 'SBLOCCA IL RISULTATO';
    if (title) title.textContent = 'Analisi completa';
    if (description) description.textContent = 'Visualizza tutti i bonus individuati con importi, requisiti, documenti e indicazioni operative.';
    if (button) {
      button.innerHTML = 'Sblocca l’analisi completa – 4,99 € <span aria-hidden="true">→</span>';
    }
  }
}

function installDossierCheckout(button, root) {
  if (!button || button.dataset.bound === 'true') return;
  button.dataset.bound = 'true';
  button.addEventListener('click', async () => {
    const payload = checkoutPayloadFromResults(root);
    button.disabled = true;
    const oldText = button.textContent;
    button.textContent = 'Apertura…';
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'report', ...payload }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Checkout non disponibile.');
      window.location.assign(data.url);
    } catch (error) {
      button.disabled = false;
      button.textContent = oldText;
      window.alert(error.message || 'Impossibile aprire il checkout.');
    }
  });
}

function upsellMarkup(includeDossier = true) {
  return `
    <section class="bf-upsell-block">
      <div class="bf-upsell-heading">
        <span class="eyebrow">SERVIZI AGGIUNTIVI</span>
        <h2>Vuoi rendere il risultato ancora più operativo?</h2>
      </div>
      <div class="bf-upsell-grid ${includeDossier ? '' : 'single'}">
        ${includeDossier ? `
        <article class="bf-upsell-card dossier">
          <span class="bf-upsell-tag">DOSSIER OPERATIVO</span>
          <div class="bf-upsell-price">+ 9,90 €</div>
          <h3>Relazione PDF + modello per il Comune</h3>
          <ul>
            <li>Relazione PDF personalizzata</li>
            <li>Riepilogo bonus, importi e prossimi passi</li>
            <li>Modello email/PEC pronto da inviare al Comune per richiedere o verificare la riduzione TARI in base all’ISEE, quando prevista dal regolamento comunale</li>
          </ul>
          <button type="button" class="primary bf-dossier-checkout">Aggiungi il dossier – 9,90 €</button>
        </article>` : ''}
        <article class="bf-upsell-card alert">
          <span class="bf-upsell-tag">BONUS ALERT</span>
          <div class="bf-upsell-price">9,90 € / 12 mesi</div>
          <h3>Aggiornamenti WhatsApp</h3>
          <ul>
            <li>Promemoria sulle principali scadenze</li>
            <li>Segnalazione di nuovi bonus compatibili con il profilo indicato</li>
            <li>Servizio soggetto a consenso WhatsApp dedicato</li>
          </ul>
          <button type="button" class="secondary-action bf-alert-coming" disabled>Attivazione prossimamente</button>
        </article>
      </div>
    </section>
  `;
}

function makeTotalSafer(root) {
  const totalCard = root.querySelector('.total-card');
  if (!totalCard || totalCard.dataset.bfSafer === 'true') return;
  totalCard.dataset.bfSafer = 'true';

  const label = totalCard.querySelector(':scope > span');
  const headline = totalCard.querySelector(':scope > strong');
  const note = totalCard.querySelector(':scope > p');
  const rows = totalCard.querySelectorAll(':scope > div');
  const annual = rows[0]?.querySelector('b')?.textContent?.trim();

  if (label) label.textContent = 'BENEFICIO ANNUALE STIMATO DAI DATI DISPONIBILI';
  if (headline && annual) headline.textContent = `circa ${annual}`;
  if (note) note.textContent = 'Stima orientativa: l’importo effettivo può essere inferiore o non spettare in presenza di ulteriori requisiti.';
  if (rows[0]?.querySelector('span')) rows[0].querySelector('span').textContent = 'Stima annuale prudente';
  if (rows[1]?.querySelector('span')) rows[1].querySelector('span').textContent = 'Ulteriori massimali / una tantum';
  if (rows[1]?.querySelector('b')) rows[1].querySelector('b').textContent = 'Da verificare';
}

function enhancePaidResults() {
  const root = document.querySelector('.results');
  if (!root) return;

  makeTotalSafer(root);

  if (root.dataset.bfUpsells === 'true') return;
  root.dataset.bfUpsells = 'true';

  const locked = root.querySelector('.locked-extra');
  const emailCard = root.querySelector('.email-card');

  if (locked) {
    locked.className = 'bf-upsell-host';
    locked.innerHTML = upsellMarkup(true);
    installDossierCheckout(locked.querySelector('.bf-dossier-checkout'), root);
  } else if (emailCard) {
    const holder = document.createElement('div');
    holder.className = 'bf-upsell-host';
    holder.innerHTML = upsellMarkup(false);
    emailCard.insertAdjacentElement('afterend', holder);
  }
}

function enhance() {
  enhancePaywall();
  enhancePaidResults();
}

const observer = new MutationObserver(enhance);
observer.observe(document.documentElement, { subtree: true, childList: true });
enhance();
