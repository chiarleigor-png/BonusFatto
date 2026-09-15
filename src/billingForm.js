export function openBillingForm(plan, payload) {
  const info = {
    base: ['Analisi veloce — immediata', '2,99 €'],
    isee: ['Analisi con ISEE — immediata', '6,90 €'],
    report: ['Relazione PDF personalizzata', '4,90 €'],
    whatsapp: ['Bonus Alert WhatsApp', '6,90 €'],
    pec: ['Invio PEC al Comune', '14,90 €'],
    tari: ['Gestione completa pratica TARI', '19,90 €'],
  }[plan] || ['Analisi veloce — immediata', '2,99 €'];

  const defaultBillingCity = payload.comune && payload.comune !== 'Da indicare' ? payload.comune : '';
  const backdrop = document.createElement('div');
  backdrop.className = 'bf-billing-backdrop';
  backdrop.innerHTML = `
    <div class="bf-billing-modal" role="dialog" aria-modal="true">
      <div class="bf-billing-head">
        <div><span class="eyebrow">PRIMA DEL PAGAMENTO</span><h2>${info[0]} · ${info[1]}</h2></div>
        <button type="button" class="bf-billing-close" aria-label="Chiudi">×</button>
      </div>
      <form class="bf-billing-form">
        <div class="bf-billing-grid">
          <label>Email<input type="email" name="email" required /></label>
          <label>Nome<input name="nome" required /></label>
          <label>Cognome<input name="cognome" required /></label>
          <label>Codice fiscale<input name="codiceFiscale" maxlength="16" required /></label>
          <label class="full">Indirizzo di fatturazione<input name="indirizzo" required /></label>
          <label>CAP<input name="cap" maxlength="5" required /></label>
          <label>Comune<input name="comuneFatturazione" value="${defaultBillingCity}" required /></label>
          <label>Provincia<input name="provincia" maxlength="2" placeholder="TO" required /></label>
          <label class="full">PEC <small>(facoltativa)</small><input type="email" name="pec" /></label>
          ${plan === 'whatsapp' ? '<label class="full">Numero WhatsApp<input type="tel" name="whatsapp" placeholder="+39 333 1234567" required /></label>' : ''}
        </div>
        ${plan === 'whatsapp' ? '<label class="bf-billing-consent"><input type="checkbox" name="waConsent" required /><span>Acconsento a ricevere su WhatsApp gli avvisi relativi a scadenze e nuovi bonus del servizio acquistato.</span></label>' : ''}
        ${plan === 'isee' ? '<p class="bf-billing-note"><strong>Dopo il pagamento:</strong> verrai portato direttamente alla pagina per caricare la tua attestazione ISEE 2026 e ottenere l’analisi immediata.</p>' : plan === 'pec' ? '<p class="bf-billing-note"><strong>Dopo il pagamento:</strong> compilerai destinatario, oggetto, testo e allegati della PEC. BonusFatto prenderà in carico l’invio e ti trasmetterà le ricevute disponibili.</p>' : plan === 'tari' ? '<p class="bf-billing-note"><strong>Dopo il pagamento:</strong> riceverai via email la delega precompilata da firmare e le istruzioni per inviare i documenti necessari a pratiche@bonusfatto.it.</p>' : '<p class="bf-billing-note">Dati richiesti per il pagamento e per l’emissione della documentazione fiscale intestata a persona fisica.</p>'}
        <p class="bf-billing-error" hidden></p>
        <div class="bf-billing-actions">
          <button type="button" class="secondary-action bf-billing-cancel">Annulla</button>
          <button type="submit" class="primary">Continua al pagamento · ${info[1]}</button>
        </div>
      </form>
    </div>`;

  const close = () => backdrop.remove();
  backdrop.querySelector('.bf-billing-close').onclick = close;
  backdrop.querySelector('.bf-billing-cancel').onclick = close;
  backdrop.onclick = (event) => { if (event.target === backdrop) close(); };

  backdrop.querySelector('form').onsubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const error = form.querySelector('.bf-billing-error');
    const submit = form.querySelector('button[type="submit"]');
    const billing = Object.fromEntries(new FormData(form).entries());
    billing.waConsent = form.elements.waConsent ? form.elements.waConsent.checked : false;
    const checkoutPayload = { plan, ...payload, billing };
    if (plan === 'isee' && (!checkoutPayload.comune || checkoutPayload.comune === 'Da indicare')) {
      checkoutPayload.comune = billing.comuneFatturazione;
      checkoutPayload.isee = 0;
      checkoutPayload.figli = 0;
    }

    submit.disabled = true;
    submit.textContent = 'Apertura pagamento…';
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkoutPayload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Checkout non disponibile.');
      window.location.assign(data.url);
    } catch (err) {
      submit.disabled = false;
      submit.textContent = `Continua al pagamento · ${info[1]}`;
      error.hidden = false;
      error.textContent = err.message || 'Impossibile aprire il pagamento.';
    }
  };

  document.body.appendChild(backdrop);
  backdrop.querySelector('input[name="email"]')?.focus();
}
