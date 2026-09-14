import './legalSite.css';

const COMPANY = {
  name: 'LU.CA. Società a Responsabilità Limitata Semplificata',
  short: 'LU.CA. S.R.L.S.',
  vat: '13023710018',
  rea: 'TO-1333259',
  pec: 'lu.casrls@pec.it',
  email: 'info@bonusfatto.it',
};

const pages = {
  privacy: {
    title: 'Informativa privacy',
    intro: 'Informazioni sul trattamento dei dati personali effettuato attraverso BonusFatto.it, i moduli online e i servizi acquistabili sul portale.',
    html: `
      <h2>1. Titolare del trattamento</h2>
      <p>Il Titolare del trattamento è <strong>${COMPANY.name}</strong>, C.F. e P.IVA ${COMPANY.vat}, REA ${COMPANY.rea}. Per richieste relative alla privacy puoi scrivere a <a href="mailto:${COMPANY.email}">${COMPANY.email}</a> o alla PEC <a href="mailto:${COMPANY.pec}">${COMPANY.pec}</a>.</p>
      <h2>2. Dati trattati</h2>
      <p>BonusFatto può trattare dati tecnici di navigazione, dati anagrafici e di contatto, Comune di residenza, valore ISEE, composizione del nucleo indicata dall'utente, dati necessari alla fatturazione, nonché il numero WhatsApp quando viene richiesto il relativo servizio.</p>
      <p>Per il servizio di presentazione della pratica TARI potranno inoltre essere richiesti documento di identità, codice fiscale, attestazione ISEE, delega firmata e gli ulteriori documenti necessari alla pratica.</p>
      <h2>3. Finalità e basi giuridiche</h2>
      <ul><li>fornire la simulazione e i servizi richiesti dall'utente;</li><li>gestire acquisti, pagamenti, fatturazione e assistenza;</li><li>predisporre e, quando acquistato, trasmettere la pratica TARI in forza della delega conferita;</li><li>inviare avvisi WhatsApp esclusivamente quando il relativo servizio è acquistato e il consenso è prestato;</li><li>adempiere agli obblighi di legge e tutelare i diritti del Titolare.</li></ul>
      <p>Le basi giuridiche sono, a seconda dei casi, l'esecuzione di misure precontrattuali o contrattuali, l'adempimento di obblighi legali, il legittimo interesse del Titolare e il consenso quando richiesto.</p>
      <h2>4. Destinatari</h2>
      <p>I dati possono essere trattati da soggetti autorizzati e da fornitori tecnici necessari al funzionamento del servizio, compresi hosting, sistemi di pagamento e servizi di comunicazione. Quando l'utente acquista la presentazione della pratica TARI, i dati e i documenti necessari possono essere trasmessi al Comune competente o ad altri soggetti coinvolti nella procedura.</p>
      <h2>5. Pagamenti</h2>
      <p>I dati completi delle carte di pagamento non vengono acquisiti direttamente da BonusFatto quando il pagamento è gestito dal prestatore di servizi di pagamento. BonusFatto conserva soltanto le informazioni necessarie a identificare ordine, importo e stato del pagamento.</p>
      <h2>6. Conservazione</h2>
      <p>I dati sono conservati per il tempo necessario a gestire la richiesta e il servizio. La documentazione fiscale e contabile viene conservata per i termini previsti dalla legge; i dati relativi a pratiche, contestazioni o richieste sono conservati per il periodo necessario alla gestione del rapporto e alla tutela dei diritti.</p>
      <h2>7. Diritti</h2>
      <p>L'interessato può esercitare, quando applicabili, i diritti di accesso, rettifica, cancellazione, limitazione, portabilità e opposizione, nonché revocare il consenso. È inoltre possibile proporre reclamo al Garante per la protezione dei dati personali.</p>
      <h2>8. Sicurezza e minimizzazione</h2>
      <p>BonusFatto richiede soltanto i dati necessari alla fase in corso e adotta misure tecniche e organizzative adeguate al rischio. L'utente è invitato a non inviare dati o documenti ulteriori rispetto a quelli richiesti per il servizio selezionato.</p>`
  },
  cookie: {
    title: 'Cookie policy',
    intro: 'Informazioni sui cookie e sugli strumenti tecnici utilizzati da BonusFatto.it.',
    html: `
      <h2>Cookie e strumenti tecnici</h2><p>BonusFatto utilizza gli strumenti tecnici necessari al funzionamento del sito, alla gestione della sessione e al corretto svolgimento del percorso di acquisto. Possono inoltre essere utilizzate memorie locali del browser per mantenere temporaneamente informazioni indispensabili al servizio.</p>
      <h2>Cookie non necessari</h2><p>Nella configurazione attuale il portale non richiede cookie di profilazione per il funzionamento ordinario. Qualora in futuro vengano introdotti strumenti analitici o di marketing che richiedano il consenso, essi saranno attivati soltanto dopo una scelta dell'utente e la policy sarà aggiornata.</p>
      <h2>Gestione dal browser</h2><p>L'utente può eliminare o bloccare cookie e dati locali attraverso le impostazioni del proprio browser. La disattivazione degli strumenti strettamente necessari può però impedire il corretto funzionamento di alcune funzioni del sito.</p>`
  },
  'note-legali': {
    title: 'Note legali',
    intro: 'Informazioni sulla natura del servizio BonusFatto e sui limiti delle informazioni pubblicate.',
    html: `
      <h2>Natura del portale</h2><p><strong>BonusFatto non è un ente pubblico</strong> e non è un sito istituzionale di INPS, ARERA, Agenzia delle Entrate, Comuni o altre amministrazioni. Il servizio è gestito da ${COMPANY.short}.</p>
      <h2>Informazioni e simulazioni</h2><p>I risultati hanno natura informativa e orientativa. L'indicazione di un'agevolazione come potenzialmente compatibile non costituisce riconoscimento del diritto da parte dell'ente competente. Requisiti, importi, cumulabilità, scadenze e procedure possono variare e devono essere verificati sulle fonti ufficiali vigenti.</p>
      <h2>TARI</h2><p>Le riduzioni locali TARI dipendono dai regolamenti, dalle delibere e dalle procedure del singolo Comune. BonusFatto distingue, per quanto possibile, le misure nazionali dalle agevolazioni locali e segnala quando un dato comunale necessita di ulteriore verifica.</p>
      <h2>Collegamenti esterni</h2><p>I collegamenti a fonti o siti di terzi sono forniti per agevolare la consultazione. BonusFatto non controlla contenuti, disponibilità o successive modifiche dei siti esterni.</p>`
  },
  condizioni: {
    title: 'Condizioni d’uso e di servizio',
    intro: 'Condizioni applicabili all’utilizzo del portale BonusFatto.it e ai servizi acquistati da utenti privati.',
    html: `
      <h2>1. Ambito</h2><p>BonusFatto è rivolto a utenti privati maggiorenni. Utilizzando il portale, l'utente si impegna a fornire dati corretti e pertinenti rispetto alla richiesta.</p>
      <h2>2. Simulazione</h2><p>La simulazione si basa sui dati inseriti dall'utente e sulle informazioni disponibili nel sistema. Il risultato non equivale a un provvedimento amministrativo né garantisce l'erogazione di un beneficio.</p>
      <h2>3. Servizi a pagamento</h2><p>Il portale può proporre l'analisi completa, il dossier operativo con relazione PDF e modello email/PEC TARI, il servizio Bonus Alert WhatsApp e la presentazione della pratica TARI. Prezzo e contenuto del servizio sono indicati prima dell'acquisto.</p>
      <h2>4. Dossier e modelli</h2><p>Il dossier e i modelli vengono predisposti sulla base dei dati forniti e delle informazioni disponibili. Il modello destinato al Comune deve essere utilizzato tenendo conto della procedura effettivamente prevista dall'ente.</p>
      <h2>5. Presentazione pratica TARI</h2><p>Il servizio richiede la disponibilità dei documenti necessari e una delega sottoscritta dall'interessato. BonusFatto predispone la richiesta, verifica gli allegati e la trasmette per conto dell'utente attraverso il canale previsto dal Comune, inclusa PEC quando ammessa. L'accoglimento, il rigetto, le richieste di integrazione e i tempi di risposta restano di competenza dell'ente.</p>
      <h2>6. Bonus Alert WhatsApp</h2><p>Il servizio segnala per il periodo acquistato le principali scadenze e nuove opportunità coerenti con il profilo indicato. Non costituisce un servizio di monitoraggio istituzionale completo e non garantisce che ogni misura o modifica normativa venga segnalata in tempo reale.</p>
      <h2>7. Pagamento e fatturazione</h2><p>Il pagamento avviene attraverso il sistema indicato nel checkout. L'utente deve fornire i dati corretti necessari alla documentazione fiscale. Eventuali condizioni specifiche relative all'esecuzione immediata di servizi digitali saranno presentate nel percorso di acquisto quando applicabili.</p>
      <h2>8. Responsabilità dell'utente</h2><p>L'utente è responsabile della correttezza dei dati, dei documenti e delle dichiarazioni forniti. Informazioni incomplete o errate possono rendere inesatto il risultato o impedire l'esecuzione del servizio.</p>
      <h2>9. Aggiornamenti</h2><p>Le presenti condizioni possono essere aggiornate per adeguamenti normativi, tecnici o commerciali. La versione applicabile al singolo acquisto è quella resa disponibile al momento dell'ordine.</p>`
  },
  faq: {
    title: 'Domande frequenti',
    intro: 'Le risposte alle domande più comuni su BonusFatto, risultati, TARI e servizi disponibili.',
    html: `<div class="bf-faq-list">
      <details open><summary>BonusFatto garantisce che riceverò i bonus indicati?</summary><p>No. BonusFatto individua agevolazioni potenzialmente compatibili con i dati inseriti. La spettanza definitiva dipende dai requisiti previsti dagli enti competenti.</p></details>
      <details><summary>Perché alcune informazioni TARI cambiano da Comune a Comune?</summary><p>Perché, oltre alle misure nazionali, i Comuni possono prevedere proprie riduzioni, esenzioni, soglie ISEE, procedure e scadenze.</p></details>
      <details><summary>Cosa comprende l'analisi da 4,99 €?</summary><p>Sblocca il dettaglio delle agevolazioni individuate, con importi stimabili, requisiti, documenti e indicazioni operative disponibili nel modello.</p></details>
      <details><summary>Cosa comprende il dossier da 9,90 €?</summary><p>Comprende la relazione PDF personalizzata e il modello email/PEC da utilizzare verso il Comune per chiedere o verificare la riduzione o esenzione TARI collegata all'ISEE, quando prevista.</p></details>
      <details><summary>Come funziona Bonus Alert WhatsApp?</summary><p>Inserendo il numero e prestando il consenso, l'utente può ricevere per 12 mesi avvisi sulle principali scadenze e sui nuovi bonus coerenti con il profilo indicato.</p></details>
      <details><summary>Cosa comprende la Presentazione pratica TARI da 24,90 €?</summary><p>BonusFatto predispone la richiesta, verifica gli allegati e la trasmette per conto dell'utente all'Ufficio Tributi attraverso il canale previsto, inclusa PEC quando ammessa.</p></details>
      <details><summary>Per la pratica TARI serve una delega?</summary><p>Sì. Nella prima versione operativa verrà richiesta una delega precompilata da firmare e ricaricare insieme ai documenti necessari.</p></details>
      <details><summary>BonusFatto è un sito del Comune o dell'INPS?</summary><p>No. BonusFatto è un servizio privato gestito da ${COMPANY.short} e non è un portale della Pubblica Amministrazione.</p></details>
      <details><summary>Come posso contattarvi?</summary><p>Puoi scrivere a <a href="mailto:${COMPANY.email}">${COMPANY.email}</a> oppure utilizzare il modulo Contatti.</p></details>
    </div>`
  },
  contatti: {
    title: 'Contatti',
    intro: 'Scrivici per assistenza sul portale, sui servizi acquistati o sulle pratiche TARI.',
    html: `<div class="bf-contact-grid"><div class="bf-contact-box"><strong>Email</strong><a href="mailto:${COMPANY.email}">${COMPANY.email}</a><p>Per permetterci di aiutarti più velocemente, indica nel messaggio il Comune e, se presente, il riferimento dell'ordine o della pratica.</p><p><strong>Gestore del servizio</strong>${COMPANY.short}<br>C.F./P.IVA ${COMPANY.vat}<br>REA ${COMPANY.rea}</p></div><form class="bf-contact-form" id="bf-contact-form"><label>Nome e cognome<input name="name" required></label><label>Email<input type="email" name="email" required></label><label>Oggetto<select name="subject"><option>Assistenza BonusFatto</option><option>Pagamento o fatturazione</option><option>Pratica TARI</option><option>Privacy</option><option>Altro</option></select></label><label>Messaggio<textarea name="message" required></textarea></label><label class="bf-contact-consent"><input type="checkbox" required><span>Ho letto l'<a href="#privacy">informativa privacy</a> e chiedo di essere ricontattato in merito alla mia richiesta.</span></label><button class="bf-contact-submit" type="submit">Invia richiesta</button><p class="bf-contact-status" aria-live="polite"></p></form></div>`
  }
};

function footerMarkup() {
  return `<footer class="bf-legal-footer" id="bf-site-footer"><div class="bf-footer-inner"><div class="bf-footer-brand"><h2>BonusFatto.it</h2><p>Il portale che organizza bonus, agevolazioni e opportunità in base ai dati inseriti, distinguendo le informazioni nazionali da quelle comunali quando disponibili.</p><p class="bf-footer-meta">Servizio gestito da <strong>${COMPANY.short}</strong><br>C.F./P.IVA ${COMPANY.vat} · REA ${COMPANY.rea}<br><a href="mailto:${COMPANY.email}">${COMPANY.email}</a> · PEC <a href="mailto:${COMPANY.pec}">${COMPANY.pec}</a></p></div><div class="bf-footer-links"><h3>Informazioni</h3><nav><a href="#faq">FAQ</a><a href="#contatti">Contatti</a><a href="#note-legali">Note legali</a><a href="#condizioni">Condizioni d'uso</a></nav></div><div class="bf-footer-links"><h3>Privacy</h3><nav><a href="#privacy">Privacy</a><a href="#cookie">Cookie policy</a></nav></div></div><div class="bf-footer-bottom"><span>© 2026 BonusFatto.it · Tutti i diritti riservati</span><span>BonusFatto non è un ente pubblico e le simulazioni non costituiscono riconoscimento del diritto al beneficio.</span></div></footer>`;
}

function installFooter() {
  if (document.getElementById('bf-site-footer')) return;
  document.body.insertAdjacentHTML('beforeend', footerMarkup());
}

function renderLegalPage() {
  const key = location.hash.replace(/^#/, '');
  const page = pages[key];
  const root = document.getElementById('root');
  let host = document.getElementById('bf-legal-page-host');
  if (!page) {
    root?.classList.remove('bf-hidden-for-legal');
    host?.remove();
    document.title = 'BonusFatto.it — I tuoi bonus, in un posto solo';
    return;
  }
  root?.classList.add('bf-hidden-for-legal');
  if (!host) {
    host = document.createElement('main');
    host.id = 'bf-legal-page-host';
    host.className = 'bf-legal-page';
    document.getElementById('bf-site-footer')?.insertAdjacentElement('beforebegin', host);
  }
  host.innerHTML = `<div class="bf-legal-wrap"><a class="bf-legal-back" href="#">← Torna a BonusFatto</a><article class="bf-legal-card"><span class="bf-legal-kicker">BONUSFATTO.IT</span><h1>${page.title}</h1><p class="bf-intro">${page.intro}</p>${page.html}</article></div>`;
  document.title = `${page.title} | BonusFatto.it`;
  if (key === 'contatti') bindContactForm();
  window.scrollTo({ top: 0, behavior: 'auto' });
}

function bindContactForm() {
  const form = document.getElementById('bf-contact-form');
  if (!form) return;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const subject = `[BonusFatto] ${data.get('subject')}`;
    const body = `Nome: ${data.get('name')}\nEmail: ${data.get('email')}\n\n${data.get('message')}`;
    form.querySelector('.bf-contact-status').textContent = `Si apre il tuo programma di posta con il messaggio indirizzato a ${COMPANY.email}.`;
    window.location.href = `mailto:${COMPANY.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }, { once: true });
}

function initLegalSite() {
  installFooter();
  renderLegalPage();
  window.addEventListener('hashchange', renderLegalPage);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initLegalSite);
else initLegalSite();
