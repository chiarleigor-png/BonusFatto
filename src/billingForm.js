import { trackInitiateCheckout } from './metaPixel.js';
import { PRICES, formatPrice } from './config/prices.js';
import pecComuni from '../lib/pecComuni.json';

export function openBillingForm(plan, payload) {
  const normalizedPlan = plan === 'report' ? 'pdf' : plan === 'tari' ? 'pec' : plan;
  const selected = PRICES[normalizedPlan] || PRICES.base;
  const pecRecipient = normalizedPlan === 'pec'
    ? (pecComuni[String(payload.istat || '')] || 'pec@comune.it')
    : '';

  const backdrop = document.createElement('div');
  backdrop.className = 'bf-billing-backdrop';
  backdrop.innerHTML = `
    <div class="bf-billing-modal" role="dialog" aria-modal="true">
      <div class="bf-billing-head">
        <div><span class="eyebrow">DATI PER L’ACQUISTO</span><h2>${selected.label} · ${formatPrice(selected.price)}</h2></div>
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
          <label>Comune<input name="comuneFatturazione" value="${payload.comune || ''}" required /></label>
          <label>Provincia<input name="provincia" maxlength="2" placeholder="TO" required /></label>
          <label class="full">PEC <small>(facoltativa)</small><input type="email" name="pec" /></label>
        </div>

        ${normalizedPlan === 'pec' ? `
          <div class="bf-billing-note">
            <strong>Invio Gestito BETA:</strong> prepariamo e inviamo noi la PEC con i tuoi dati, ti giriamo ricevuta di consegna entro 24h lavorative. Esito dipende dal Comune. Non è CAF.<br>
            <strong>Destinatario previsto:</strong> ${pecRecipient}
          </div>
          <label class="checkbox-label"><input type="checkbox" name="authorizeSend" required /> <span>Autorizzo BonusFatto.it ad inviare per mio conto la richiesta riduzione TARI al Comune di ${payload.comune || ''} con i dati da me inseriti</span></label>
          <label class="checkbox-label"><input type="checkbox" name="truthDeclaration" required /> <span>Dichiaro che i dati sono veritieri</span></label>
        ` : normalizedPlan === 'pdf'
          ? '<p class="bf-billing-note"><strong>Dopo il pagamento:</strong> potrai accedere alla relazione PDF Top 100 e al testo PEC.</p>'
          : '<p class="bf-billing-note"><strong>Dopo il pagamento:</strong> potrai consultare la Vista Base con nomi bonus, importi stimati e idoneità ISEE.</p>'}

        <p class="bf-billing-error" hidden></p>
        <div class="bf-billing-actions">
          <button type="button" class="secondary-action bf-billing-cancel">Annulla</button>
          <button type="submit" class="primary">Continua al pagamento · ${formatPrice(selected.price)}</button>
        </div>
      </form>
    </div>`;

  const keepPaywallLocked = () => {
    document.querySelectorAll('.bf-blur-card').forEach((card) => card.classList.remove('is-unlocked'));
    document.querySelectorAll('.bf-blur-content').forEach((node) => {
      node.style.filter = 'blur(8px)';
      node.style.pointerEvents = 'none';
      node.style.userSelect = 'none';
    });
  };

  const close = () => {
    keepPaywallLocked();
    backdrop.remove();
  };

  backdrop.querySelector('.bf-billing-close').onclick = close;
  backdrop.querySelector('.bf-billing-cancel').onclick = close;
  backdrop.onclick = (event) => { if (event.target === backdrop) close(); };

  backdrop.querySelector('form').onsubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const error = form.querySelector('.bf-billing-error');
    const submit = form.querySelector('button[type="submit"]');
    const billing = Object.fromEntries(new FormData(form).entries());
    const consents = {
      authorizeSend: billing.authorizeSend === 'on',
      truthDeclaration: billing.truthDeclaration === 'on',
    };

    if (normalizedPlan === 'pec' && (!consents.authorizeSend || !consents.truthDeclaration)) {
      error.hidden = false;
      error.textContent = 'Per il servizio PEC sono obbligatorie entrambe le dichiarazioni.';
      return;
    }

    submit.disabled = true;
    submit.textContent = 'Apertura pagamento…';

    try {
      const requestBody = {
        priceId: selected.stripePriceId,
        comune: payload.comune || '',
        istat: payload.istat || '',
        isee: payload.isee,
        figli: payload.figli,
        billing,
        consents,
      };
      console.log('[BonusFatto checkout]', normalizedPlan, requestBody.priceId, requestBody.comune, requestBody.istat);

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error('[BonusFatto checkout error]', response.status, data);
        if (response.status >= 500) {
          alert(`Errore checkout (${response.status}): ${data.error || 'errore server'}`);
        }
        throw new Error(data.error || 'Checkout non disponibile.');
      }

      console.log('[BonusFatto checkout ok]', data.id, data.url);
      trackInitiateCheckout({ checkoutId: data.id, plan: data.plan, value: data.value, currency: data.currency });
      window.location.assign(data.url);
    } catch (err) {
      keepPaywallLocked();
      submit.disabled = false;
      submit.textContent = `Continua al pagamento · ${formatPrice(selected.price)}`;
      error.hidden = false;
      error.textContent = err.message || 'Impossibile aprire il pagamento.';
    }
  };

  document.body.appendChild(backdrop);
  backdrop.querySelector('input[name="email"]')?.focus();
}
