import { openBillingForm } from './billingForm.js';

function addIseeEntry() {
  const formCard = document.querySelector('.form-card');
  if (!formCard || formCard.querySelector('.bf-isee-entry')) return;

  const box = document.createElement('div');
  box.className = 'bf-isee-entry';
  box.style.marginTop = '16px';
  box.style.padding = '16px';
  box.style.border = '1px solid #d8e6dc';
  box.style.borderRadius = '16px';
  box.style.background = '#f4fbf6';
  box.innerHTML = `
    <div style="font-size:12px;font-weight:800;letter-spacing:.04em;color:#286447;margin-bottom:6px">ANALISI CON ISEE · IMMEDIATA</div>
    <div style="font-weight:800;font-size:18px;margin-bottom:6px">Preferisci caricare direttamente il tuo ISEE 2026?</div>
    <div style="font-size:14px;line-height:1.45;color:#5d665f;margin-bottom:12px">Evita il questionario lungo: dopo il pagamento carichi l'attestazione ISEE e BonusFatto completa l'analisi con poche domande mirate.</div>
    <button type="button" class="primary bf-isee-entry-button" style="width:100%">Analisi con ISEE · immediata · 6,90 €</button>
  `;

  box.querySelector('.bf-isee-entry-button').onclick = () => {
    openBillingForm('isee', { comune: 'Da indicare', isee: 0, figli: 0, profile: null });
  };

  formCard.appendChild(box);
}

addIseeEntry();
new MutationObserver(addIseeEntry).observe(document.documentElement, { childList: true, subtree: true });
