import './contactPage.css';

const CONTACT_HASH = '#contatti';

function contactMarkup() {
  return `
    <div class="bf-contact-hero">
      <span class="bf-legal-kicker">BONUSFATTO.IT</span>
      <h1>Hai bisogno di <span>aiuto?</span></h1>
      <p>Scrivici per assistenza sul portale, sui servizi acquistati, sui pagamenti o sulle pratiche TARI. La richiesta viene inviata direttamente al nostro servizio assistenza.</p>
    </div>
    <div class="bf-contact-shell">
      <aside class="bf-contact-aside">
        <span class="bf-contact-aside-kicker">ASSISTENZA BONUSFATTO</span>
        <h2>Ti aiutiamo a capire cosa fare.</h2>
        <p>Descrivi il problema nel modo più semplice possibile. Se hai già effettuato un acquisto, indica nel messaggio il riferimento dell’ordine o della pratica.</p>
        <a class="bf-contact-email-card" href="mailto:info@bonusfatto.it">
          <span>Email assistenza</span>
          <strong>info@bonusfatto.it</strong>
        </a>
        <div class="bf-contact-support-list">
          <div class="bf-contact-support-item"><b>01</b><div><strong>Assistenza sul portale</strong><p>Calcolo, risultati, accesso ai servizi e funzionamento del sito.</p></div></div>
          <div class="bf-contact-support-item"><b>02</b><div><strong>Pagamenti e fatturazione</strong><p>Ordini, pagamenti Stripe e documentazione fiscale.</p></div></div>
          <div class="bf-contact-support-item"><b>03</b><div><strong>Pratiche TARI</strong><p>Documenti, delega, stato della pratica e comunicazioni con il Comune.</p></div></div>
        </div>
      </aside>
      <section class="bf-contact-form-panel">
        <div class="bf-contact-form-heading">
          <div><h2>Invia una richiesta</h2><p>Compila il modulo: il messaggio arriverà direttamente a info@bonusfatto.it.</p></div>
          <span class="bf-contact-secure">✓ Invio diretto</span>
        </div>
        <form class="bf-contact-form" id="bf-contact-form-direct">
          <div class="bf-contact-row">
            <label>Nome e cognome<input name="name" autocomplete="name" required></label>
            <label>Email<input type="email" name="email" autocomplete="email" required></label>
          </div>
          <label>Oggetto<select name="subject" required><option>Assistenza BonusFatto</option><option>Pagamento o fatturazione</option><option>Pratica TARI</option><option>Privacy</option><option>Altro</option></select></label>
          <label>Messaggio<textarea name="message" placeholder="Descrivi qui la tua richiesta..." required></textarea></label>
          <label class="bf-contact-consent"><input type="checkbox" name="consent" required><span>Ho letto l'<a href="#privacy">informativa privacy</a> e chiedo di essere ricontattato in merito alla mia richiesta.</span></label>
          <button class="bf-contact-submit" type="submit">Invia richiesta <span aria-hidden="true">→</span></button>
          <p class="bf-contact-status" aria-live="polite"></p>
        </form>
      </section>
    </div>`;
}

function bindDirectContactForm() {
  const form = document.getElementById('bf-contact-form-direct');
  if (!form || form.dataset.bound === '1') return;
  form.dataset.bound = '1';

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('.bf-contact-submit');
    const status = form.querySelector('.bf-contact-status');
    const data = new FormData(form);

    button.disabled = true;
    button.textContent = 'Invio in corso…';
    status.className = 'bf-contact-status';
    status.textContent = '';

    try {
      const response = await fetch('/api/contact-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.get('name'),
          email: data.get('email'),
          subject: data.get('subject'),
          message: data.get('message'),
          consent: data.get('consent') === 'on',
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result?.ok) throw new Error(result?.error || 'Invio non riuscito.');

      status.textContent = 'Richiesta inviata correttamente. Ti risponderemo all’indirizzo email indicato.';
      status.className = 'bf-contact-status is-visible is-success';
      form.reset();
    } catch (error) {
      status.textContent = error?.message || 'Non è stato possibile inviare la richiesta. Riprova tra poco.';
      status.className = 'bf-contact-status is-visible is-error';
    } finally {
      button.disabled = false;
      button.innerHTML = 'Invia richiesta <span aria-hidden="true">→</span>';
    }
  });
}

function enhanceContactPage() {
  if (window.location.hash !== CONTACT_HASH) return;
  const host = document.getElementById('bf-legal-page-host');
  const article = host?.querySelector('.bf-legal-card');
  if (!host || !article || article.dataset.contactRedesign === '1') return;

  host.classList.add('bf-contact-page-host');
  article.classList.add('bf-contact-page-card');
  article.dataset.contactRedesign = '1';
  article.innerHTML = contactMarkup();
  document.title = 'Contatti | BonusFatto.it';
  bindDirectContactForm();
}

function initContactPageEnhancement() {
  enhanceContactPage();
  window.addEventListener('hashchange', () => {
    window.setTimeout(enhanceContactPage, 0);
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initContactPageEnhancement);
else initContactPageEnhancement();
