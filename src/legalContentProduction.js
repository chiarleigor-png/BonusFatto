const LEGAL_COMPANY = {
  name: 'LU.CA. Società a Responsabilità Limitata Semplificata',
  short: 'LU.CA. S.R.L.S.',
  vat: '13023710018',
  rea: 'TO-1333259',
  pec: 'lu.casrls@pec.it',
  email: 'info@bonusfatto.it',
};

const productionPages = {
  'note-legali': {
    title: 'Note legali',
    intro: 'Informazioni sulla natura di BonusFatto.it, sui contenuti pubblicati e sui limiti delle simulazioni e dei servizi disponibili.',
    html: `
      <h2>1. Natura del portale</h2>
      <p><strong>BonusFatto.it è un servizio privato</strong> gestito da ${LEGAL_COMPANY.short}, C.F./P.IVA ${LEGAL_COMPANY.vat}, REA ${LEGAL_COMPANY.rea}. Non è un sito istituzionale e non appartiene a INPS, Agenzia delle Entrate, ARERA, Comuni o altre Pubbliche Amministrazioni.</p>
      <p>Le informazioni pubblicate hanno finalità informative e di orientamento. Quando viene acquistato un servizio operativo, BonusFatto svolge esclusivamente le attività descritte nella relativa offerta e nelle Condizioni d’uso.</p>

      <h2>2. Simulazioni e risultati</h2>
      <p>I risultati vengono elaborati sulla base dei dati inseriti dall’utente e delle informazioni disponibili nel sistema. L’indicazione di un bonus, di un’agevolazione o di una riduzione come compatibile, potenzialmente compatibile o da verificare <strong>non costituisce riconoscimento del diritto</strong> e non sostituisce il provvedimento dell’ente competente.</p>
      <p>Requisiti, importi, cumulabilità, scadenze e procedure possono essere modificati da norme, regolamenti, delibere o istruzioni degli enti. In caso di contrasto, prevalgono sempre le fonti ufficiali vigenti.</p>

      <h2>3. Bonus sociale rifiuti e TARI comunale</h2>
      <p>BonusFatto distingue il <strong>bonus sociale rifiuti nazionale</strong>, riconosciuto automaticamente quando ricorrono i requisiti previsti dalla disciplina nazionale, dalle eventuali <strong>riduzioni, esenzioni o agevolazioni TARI comunali</strong>, che dipendono dal regolamento e dalle procedure del singolo Comune.</p>
      <p>Il servizio “Invio pratica TARI” riguarda la verifica e la predisposizione della richiesta relativa alle agevolazioni comunali applicabili al profilo indicato. L’accoglimento della domanda, le integrazioni documentali, i tempi di risposta e l’applicazione concreta dell’agevolazione restano di competenza del Comune.</p>

      <h2>4. Fonti e aggiornamento dei contenuti</h2>
      <p>BonusFatto utilizza, per quanto possibile, fonti normative, istituzionali e amministrative. Alcuni dati locali possono richiedere una verifica ulteriore perché i Comuni possono modificare regolamenti, modulistica, scadenze, recapiti e modalità di presentazione.</p>
      <p>Nonostante l’attività di aggiornamento, non è possibile garantire che ogni variazione venga recepita in tempo reale. Per gli adempimenti con scadenza o per situazioni particolari è opportuno verificare anche la fonte ufficiale indicata.</p>

      <h2>5. Guide e contenuti editoriali</h2>
      <p>Le Guide Bonus e gli altri contenuti editoriali hanno funzione divulgativa. Non costituiscono consulenza legale, fiscale, previdenziale o professionale personalizzata e non sostituiscono l’esame del caso concreto da parte del soggetto competente.</p>

      <h2>6. Collegamenti e servizi di terzi</h2>
      <p>Il sito può contenere collegamenti a portali istituzionali o servizi di terzi. BonusFatto non controlla disponibilità, contenuti, sicurezza o successive modifiche dei siti esterni e non risponde del loro funzionamento.</p>

      <h2>7. Proprietà intellettuale</h2>
      <p>Marchi, testi, grafica, struttura del portale, report, guide e materiali originali di BonusFatto sono protetti dalla normativa applicabile. È consentito l’uso personale dei contenuti; la riproduzione sistematica, la pubblicazione o l’utilizzo commerciale richiedono autorizzazione quando non diversamente consentito dalla legge.</p>

      <h2>8. Limitazioni tecniche</h2>
      <p>Il servizio può subire sospensioni o rallentamenti per manutenzione, aggiornamenti, indisponibilità di fornitori esterni, problemi di rete o eventi non controllabili dal gestore. In tali casi verranno adottate misure ragionevoli per ripristinare il servizio nel più breve tempo possibile.</p>

      <h2>9. Segnalazioni</h2>
      <p>Per segnalare informazioni non aggiornate, errori o problemi tecnici puoi utilizzare la pagina <a href="#contatti">Contatti</a> o scrivere a <a href="mailto:${LEGAL_COMPANY.email}">${LEGAL_COMPANY.email}</a>.</p>`
  },

  privacy: {
    title: 'Informativa privacy',
    intro: 'Informazioni sul trattamento dei dati personali effettuato tramite BonusFatto.it, i moduli online, gli acquisti e i servizi richiesti dagli utenti.',
    html: `
      <h2>1. Titolare del trattamento</h2>
      <p>Il Titolare del trattamento è <strong>${LEGAL_COMPANY.name}</strong>, C.F./P.IVA ${LEGAL_COMPANY.vat}, REA ${LEGAL_COMPANY.rea}. Per richieste relative alla protezione dei dati puoi scrivere a <a href="mailto:${LEGAL_COMPANY.email}">${LEGAL_COMPANY.email}</a> oppure alla PEC <a href="mailto:${LEGAL_COMPANY.pec}">${LEGAL_COMPANY.pec}</a>.</p>

      <h2>2. Dati trattati</h2>
      <p>A seconda delle funzioni utilizzate possono essere trattati: dati tecnici di navigazione; nome, cognome e recapiti; Comune di residenza; valore ISEE; numero dei figli e altre informazioni sul nucleo familiare inserite dall’utente; dati necessari al pagamento e alla documentazione fiscale; eventuale numero WhatsApp; dati contenuti nelle richieste di assistenza.</p>
      <p>Per il servizio TARI possono inoltre essere trattati codice fiscale, indirizzo, documento di identità, attestazione ISEE, delega firmata, eventuale codice utenza e documentazione TARI caricata dall’utente.</p>

      <h2>3. Finalità del trattamento</h2>
      <ul>
        <li>fornire simulazioni, analisi e report richiesti dall’utente;</li>
        <li>gestire ordini, pagamenti, conferme, assistenza e adempimenti amministrativi e fiscali;</li>
        <li>predisporre e lavorare le pratiche TARI acquistate, compresa la trasmissione al Comune tramite il backoffice quando prevista;</li>
        <li>gestire il servizio continuativo e inviare aggiornamenti attraverso i canali scelti dall’utente;</li>
        <li>rispondere alle richieste inviate tramite la pagina Contatti;</li>
        <li>garantire sicurezza, prevenzione di abusi, funzionamento tecnico e tutela dei diritti del Titolare;</li>
        <li>adempiere a obblighi previsti da legge, regolamenti o provvedimenti delle autorità.</li>
      </ul>

      <h2>4. Basi giuridiche</h2>
      <p>I trattamenti sono effettuati, a seconda dei casi, per eseguire misure precontrattuali richieste dall’utente o il contratto concluso, per adempiere obblighi legali, per perseguire legittimi interessi connessi alla sicurezza e alla tutela del servizio e, quando richiesto, sulla base del consenso dell’interessato.</p>
      <p>Il consenso utilizzato per comunicazioni o canali facoltativi può essere revocato in qualsiasi momento senza pregiudicare la liceità del trattamento svolto prima della revoca.</p>

      <h2>5. Conferimento dei dati</h2>
      <p>I dati contrassegnati come obbligatori sono necessari per fornire la funzione o il servizio richiesto. Il mancato conferimento può impedire l’elaborazione del risultato, il pagamento, la gestione della pratica o la risposta alla richiesta. I dati facoltativi possono essere omessi senza impedire l’uso delle altre funzioni non collegate.</p>

      <h2>6. Modalità di trattamento e sicurezza</h2>
      <p>I dati sono trattati con strumenti informatici e, quando necessario, con attività manuali di backoffice. Sono adottate misure tecniche e organizzative proporzionate al rischio, con criteri di minimizzazione, controllo degli accessi e limitazione dei dati alle informazioni necessarie alla finalità perseguita.</p>

      <h2>7. Destinatari e fornitori</h2>
      <p>I dati possono essere trattati da personale e collaboratori autorizzati e da fornitori tecnici necessari al funzionamento del portale, come servizi di hosting, database, posta elettronica, pagamento, elaborazione documentale e assistenza tecnica. Tali soggetti operano secondo il ruolo previsto dalla normativa applicabile.</p>
      <p>Quando l’utente acquista la gestione della pratica TARI, i dati e i documenti necessari possono essere comunicati al Comune competente o ad altri soggetti pubblici coinvolti nella procedura.</p>

      <h2>8. Pagamenti</h2>
      <p>I pagamenti online sono gestiti tramite il prestatore di servizi di pagamento utilizzato nel checkout. BonusFatto non acquisisce direttamente il numero completo della carta, il codice di sicurezza o le credenziali bancarie; conserva invece le informazioni necessarie a identificare ordine, importo, cliente e stato del pagamento.</p>

      <h2>9. Conservazione</h2>
      <p>I dati sono conservati per il tempo necessario a fornire il servizio e gestire il rapporto con l’utente, e successivamente per i periodi richiesti dalla normativa fiscale, contabile o dalla necessità di tutela dei diritti. I documenti di pratica vengono conservati secondo criteri di necessità e proporzionalità rispetto alla gestione e alla chiusura della pratica.</p>
      <p>I dati collegati al servizio continuativo sono utilizzati per la durata acquistata e, successivamente, per il tempo necessario a documentare l’attivazione, gestire eventuali richieste e rispettare obblighi di legge.</p>

      <h2>10. Minori e dati del nucleo</h2>
      <p>BonusFatto è destinato a utenti maggiorenni. Le informazioni relative a figli o altri componenti del nucleo vengono inserite dall’adulto che utilizza il servizio esclusivamente nella misura necessaria a verificare le agevolazioni potenzialmente applicabili.</p>

      <h2>11. Elaborazioni automatizzate</h2>
      <p>Il portale utilizza regole automatizzate per confrontare i dati inseriti con i requisiti delle misure presenti nel sistema. Tali elaborazioni producono un risultato informativo e non determinano effetti giuridici né sostituiscono le decisioni degli enti pubblici competenti.</p>

      <h2>12. Diritti dell’interessato</h2>
      <p>Nei casi previsti dal Regolamento (UE) 2016/679, l’interessato può chiedere accesso, rettifica, cancellazione, limitazione del trattamento, portabilità dei dati e opposizione, nonché revocare il consenso quando il trattamento si basa su di esso.</p>
      <p>Le richieste possono essere inviate a <a href="mailto:${LEGAL_COMPANY.email}">${LEGAL_COMPANY.email}</a>. L’interessato può inoltre proporre reclamo al Garante per la protezione dei dati personali.</p>

      <h2>13. Cookie e strumenti di tracciamento</h2>
      <p>Le informazioni relative a cookie, memorie locali e altri strumenti tecnici utilizzati dal portale sono disponibili nella <a href="#cookie">Cookie policy</a>. Gli eventuali strumenti non strettamente necessari vengono gestiti secondo le regole applicabili e, quando richiesto, previo consenso.</p>

      <h2>14. Aggiornamenti dell’informativa</h2>
      <p>La presente informativa può essere aggiornata per adeguamenti normativi, modifiche dei servizi o cambiamenti tecnici. La versione pubblicata sul sito è quella applicabile dal momento della sua messa a disposizione.</p>`
  },

  condizioni: {
    title: 'Condizioni d’uso e di servizio',
    intro: 'Condizioni applicabili all’utilizzo di BonusFatto.it e ai servizi acquistati online da utenti consumatori.',
    html: `
      <h2>1. Gestore e ambito del servizio</h2>
      <p>BonusFatto.it è gestito da <strong>${LEGAL_COMPANY.name}</strong>, C.F./P.IVA ${LEGAL_COMPANY.vat}, REA ${LEGAL_COMPANY.rea}. Il portale è rivolto a utenti privati maggiorenni che richiedono informazioni, simulazioni o servizi collegati a bonus e agevolazioni.</p>
      <p>Utilizzando il portale, l’utente si impegna a fornire informazioni corrette, aggiornate e pertinenti alla richiesta.</p>

      <h2>2. Natura delle simulazioni</h2>
      <p>Le simulazioni e le analisi si basano sui dati forniti dall’utente e sulle regole presenti nel sistema. Il risultato non equivale a un provvedimento amministrativo, non certifica il possesso definitivo dei requisiti e non garantisce l’erogazione di un beneficio.</p>

      <h2>3. Servizi e prezzi attualmente disponibili</h2>
      <ul>
        <li><strong>Analisi veloce in 30 secondi – 2,99 € una tantum:</strong> sblocca l’analisi rapida delle agevolazioni compatibili con Comune, ISEE e numero di figli indicati.</li>
        <li><strong>Analisi con relazione – 6,90 € una tantum:</strong> consente di completare l’analisi utilizzando l’attestazione ISEE e di ottenere la relazione PDF personalizzata.</li>
        <li><strong>Invio pratica TARI – 14,90 € una tantum:</strong> comprende predisposizione della delega, raccolta e verifica documentale e lavorazione della richiesta TARI da parte del backoffice ai fini della trasmissione al Comune.</li>
        <li><strong>Servizio continuativo – 6,90 € per 12 mesi:</strong> comprende aggiornamenti periodici su novità, scadenze, bonus e TARI attraverso i canali scelti dall’utente.</li>
      </ul>
      <p>I prezzi applicabili sono quelli mostrati sul sito prima dell’acquisto. Eventuali future variazioni non modificano il prezzo degli ordini già conclusi.</p>

      <h2>4. Acquisto e pagamento</h2>
      <p>Prima del pagamento vengono mostrati servizio selezionato, prezzo e dati necessari alla conclusione dell’ordine. Il pagamento viene gestito attraverso il prestatore indicato nel checkout. L’ordine si considera concluso quando il pagamento risulta correttamente completato e il sistema ne riceve conferma.</p>
      <p>L’utente deve verificare la correttezza dell’indirizzo email e degli altri dati inseriti, perché tali informazioni vengono utilizzate per conferme, documenti e comunicazioni relative al servizio.</p>

      <h2>5. Analisi veloce e relazione PDF</h2>
      <p>L’analisi veloce utilizza un numero limitato di dati e può indicare alcune misure come “da verificare” quando servono requisiti ulteriori. L’analisi con relazione consente di approfondire il profilo e utilizza i dati dell’attestazione ISEE e le ulteriori informazioni richieste nel percorso.</p>
      <p>La relazione è personalizzata sui dati forniti ma rimane uno strumento informativo e operativo: il diritto alle prestazioni viene sempre valutato dall’ente competente secondo la normativa vigente.</p>

      <h2>6. Servizio TARI</h2>
      <p>Il servizio TARI è destinato ai profili per i quali il portale consente l’accesso sulla base dei dati inseriti. Il bonus sociale rifiuti nazionale, quando spettante, è automatico e non richiede una domanda presentata da BonusFatto.</p>
      <p>Il servizio acquistato riguarda invece la verifica e l’eventuale richiesta delle agevolazioni comunali applicabili. L’utente deve scaricare e firmare la delega, caricare attestazione ISEE, documento di identità e gli ulteriori documenti richiesti. La pratica viene ricevuta dal backoffice, verificata e successivamente trasmessa al Comune attraverso il canale operativo appropriato, inclusa PEC quando prevista.</p>
      <p>L’accoglimento, il rigetto, eventuali richieste di integrazione e i tempi di definizione dipendono dal Comune e non sono garantiti da BonusFatto.</p>

      <h2>7. Servizio continuativo</h2>
      <p>Il servizio ha durata di 12 mesi dall’attivazione e utilizza il canale scelto dall’utente tra email, WhatsApp o entrambi, quando disponibile. L’utente può chiedere la modifica del canale o la revoca del consenso alle comunicazioni facoltative.</p>
      <p>Il servizio ha funzione informativa e non costituisce monitoraggio individuale di ogni possibile misura nazionale o locale né garantisce la segnalazione in tempo reale di qualsiasi modifica normativa.</p>

      <h2>8. Tempi di esecuzione e collaborazione dell’utente</h2>
      <p>I servizi digitali disponibili immediatamente vengono resi accessibili dopo la conferma del pagamento. I servizi che richiedono verifica manuale, documenti o attività di backoffice vengono lavorati dopo la ricezione completa delle informazioni necessarie.</p>
      <p>Ritardi dovuti a documenti mancanti, dati errati, richieste di integrazione dell’ente o indisponibilità di servizi esterni non possono essere imputati al gestore.</p>

      <h2>9. Diritto di recesso</h2>
      <p>Ai contratti conclusi a distanza si applicano le tutele previste dal Codice del consumo. Quando sussiste il diritto di recesso, il consumatore può esercitarlo nei termini di legge mediante una dichiarazione esplicita inviata ai recapiti del gestore.</p>
      <p>Se il consumatore richiede l’avvio della prestazione durante il periodo di recesso, oppure acquista contenuti o servizi digitali resi immediatamente disponibili, si applicano le conseguenze e le eventuali eccezioni previste dalla normativa soltanto quando ricorrono i relativi presupposti e sono stati raccolti i consensi o le dichiarazioni richiesti dalla legge.</p>

      <h2>10. Obblighi dell’utente</h2>
      <p>L’utente è responsabile della correttezza dei dati, dei documenti e delle dichiarazioni trasmesse. Non devono essere caricati documenti di terzi senza titolo, contenuti illeciti o informazioni ulteriori rispetto a quelle necessarie per il servizio.</p>

      <h2>11. Responsabilità e fonti ufficiali</h2>
      <p>BonusFatto adotta ragionevoli misure per mantenere aggiornate le informazioni, ma norme, importi, requisiti e procedure possono cambiare. Le fonti istituzionali e i provvedimenti degli enti competenti prevalgono sulle informazioni presenti sul portale.</p>
      <p>Il gestore non risponde del mancato riconoscimento di un beneficio quando dipende dall’assenza dei requisiti, da informazioni errate fornite dall’utente, da decisioni dell’ente competente o da modifiche normative successive.</p>

      <h2>12. Assistenza e reclami</h2>
      <p>Per assistenza su ordini, pagamenti o pratiche l’utente può utilizzare la pagina <a href="#contatti">Contatti</a> o scrivere a <a href="mailto:${LEGAL_COMPANY.email}">${LEGAL_COMPANY.email}</a>. Per comunicazioni formali è disponibile anche la PEC <a href="mailto:${LEGAL_COMPANY.pec}">${LEGAL_COMPANY.pec}</a>.</p>

      <h2>13. Legge applicabile e foro del consumatore</h2>
      <p>Le presenti condizioni sono regolate dalla legge italiana. Per le controversie con utenti qualificabili come consumatori restano ferme le tutele inderogabili previste dalla normativa applicabile, compresa la competenza territoriale prevista a favore del consumatore.</p>

      <h2>14. Aggiornamenti delle condizioni</h2>
      <p>Le condizioni possono essere aggiornate per adeguamenti normativi, tecnici o commerciali. Per ciascun acquisto si applicano le condizioni messe a disposizione al momento della conclusione dell’ordine.</p>`
  },

  faq: {
    title: 'Domande frequenti',
    intro: 'Le risposte aggiornate alle domande più comuni su analisi, pagamenti, TARI, servizio continuativo e utilizzo di BonusFatto.',
    html: `<div class="bf-faq-list bf-faq-production">
      <details open><summary>BonusFatto garantisce che riceverò i bonus indicati?</summary><p>No. BonusFatto individua misure compatibili o potenzialmente compatibili con i dati inseriti. La spettanza definitiva dipende dai requisiti completi e dalla verifica dell’ente competente.</p></details>
      <details><summary>Quanto costa l’Analisi veloce e cosa comprende?</summary><p>L’Analisi veloce costa <strong>2,99 € una tantum</strong>. Utilizza Comune, ISEE e numero di figli per mostrare rapidamente le principali agevolazioni compatibili e quelle che richiedono ulteriori verifiche.</p></details>
      <details><summary>Qual è la differenza tra Analisi veloce e Analisi con relazione?</summary><p>L’Analisi veloce utilizza pochi dati e fornisce un primo risultato. L’Analisi con relazione, al costo di <strong>6,90 € una tantum</strong>, permette di caricare l’attestazione ISEE, completare i dati necessari e ottenere una relazione PDF personalizzata più approfondita.</p></details>
      <details><summary>Perché alcune misure sono indicate come “da verificare”?</summary><p>Perché Comune, ISEE e numero di figli non sono sufficienti per stabilire tutti i requisiti. Età dei figli, situazione lavorativa, disabilità, patrimonio o altri elementi possono essere necessari per una verifica completa.</p></details>
      <details><summary>Il bonus sociale rifiuti nazionale deve essere richiesto?</summary><p>No. Quando ricorrono i requisiti previsti dalla disciplina nazionale, il bonus sociale rifiuti viene riconosciuto automaticamente. BonusFatto non vende una domanda per ottenere il bonus nazionale.</p></details>
      <details><summary>Quali soglie ISEE usa BonusFatto per l’accesso al servizio TARI?</summary><p>Per il 2026 il portale utilizza come riferimento la soglia nazionale di <strong>9.796 €</strong>, elevata a <strong>20.000 € per i nuclei con almeno 4 figli a carico</strong>. Se il profilo supera la soglia applicabile, il servizio TARI non viene proposto come acquistabile sulla base del solo ISEE.</p></details>
      <details><summary>Cosa comprende il servizio Invio pratica TARI da 14,90 €?</summary><p>Comprende la predisposizione della delega, la raccolta dei documenti, la verifica della pratica e la lavorazione da parte del backoffice per l’eventuale richiesta di riduzione o agevolazione TARI comunale. Dopo il caricamento completo, la pratica viene trasmessa al Comune attraverso il canale operativo appropriato.</p></details>
      <details><summary>Quali documenti devo caricare per la pratica TARI?</summary><p>Sono richiesti almeno attestazione ISEE, documento di identità e delega precompilata firmata. Quando disponibili possono essere caricati anche avviso TARI, bolletta, codice utenza o altre comunicazioni del Comune utili alla lavorazione.</p></details>
      <details><summary>La riduzione TARI è uguale in tutti i Comuni?</summary><p>No. Le agevolazioni comunali possono avere soglie, percentuali, moduli, scadenze e requisiti differenti. Per questo BonusFatto distingue il bonus nazionale dalle riduzioni previste dal singolo Comune.</p></details>
      <details><summary>BonusFatto invia automaticamente la PEC al Comune?</summary><p>La pratica viene raccolta online e ricevuta dal backoffice. Dopo il controllo dei documenti e del recapito corretto dell’ente, l’invio al Comune viene effettuato attraverso il canale operativo appropriato, inclusa PEC quando prevista.</p></details>
      <details><summary>Come funziona il Servizio continuativo?</summary><p>Il servizio costa <strong>6,90 € per 12 mesi</strong> e consente di ricevere aggiornamenti periodici su novità, scadenze, bonus e TARI attraverso email, WhatsApp o entrambi i canali, in base alla scelta effettuata.</p></details>
      <details><summary>Posso modificare il canale o revocare il consenso agli aggiornamenti?</summary><p>Sì. Puoi chiedere in qualsiasi momento la modifica del canale scelto o la revoca del consenso relativo alle comunicazioni facoltative contattando BonusFatto.</p></details>
      <details><summary>Come vengono gestiti i pagamenti?</summary><p>I pagamenti vengono effettuati tramite checkout sicuro del prestatore di pagamento. BonusFatto non acquisisce direttamente il numero completo della carta o il codice di sicurezza.</p></details>
      <details><summary>Cosa succede dopo il pagamento?</summary><p>Per i servizi digitali il contenuto viene sbloccato dopo la conferma del pagamento. Per TARI e servizio continuativo il sistema registra l’acquisto e apre il relativo percorso operativo o di attivazione.</p></details>
      <details><summary>BonusFatto è un sito del Comune, dell’INPS o di un altro ente pubblico?</summary><p>No. BonusFatto è un servizio privato gestito da ${LEGAL_COMPANY.short}. Le decisioni sulle prestazioni restano sempre di competenza degli enti pubblici preposti.</p></details>
      <details><summary>Dove posso approfondire bonus e agevolazioni?</summary><p>La sezione <strong>Guide Bonus</strong> raccoglie articoli e guide pratiche su ISEE, assegno unico, bonus sociali, TARI e altre misure. Le guide hanno finalità informative e vengono aggiornate nel tempo.</p></details>
      <details><summary>Come posso chiedere assistenza?</summary><p>Puoi utilizzare direttamente il modulo nella pagina <a href="#contatti">Contatti</a>. La richiesta viene inviata a BonusFatto senza bisogno di aprire il tuo programma di posta.</p></details>
      <details><summary>Come vengono protetti i miei dati?</summary><p>I dati vengono trattati per le finalità necessarie al servizio, secondo criteri di minimizzazione e sicurezza. Per dettagli su categorie di dati, finalità, conservazione e diritti consulta l’<a href="#privacy">Informativa privacy</a>.</p></details>
    </div>`
  },
};

function ensureProductionLegalStyles() {
  if (document.getElementById('bf-production-legal-styles')) return;
  const style = document.createElement('style');
  style.id = 'bf-production-legal-styles';
  style.textContent = `
    .bf-legal-card.bf-production-copy h2{padding-top:4px;border-top:1px solid #eee7da}
    .bf-legal-card.bf-production-copy h2:first-of-type{border-top:0}
    .bf-legal-card.bf-production-copy ul{margin:10px 0 22px}
    .bf-legal-card.bf-production-copy li+li{margin-top:7px}
    .bf-faq-production details{background:linear-gradient(180deg,#fffefb 0%,#faf7ef 100%);transition:border-color .2s ease,box-shadow .2s ease,transform .2s ease}
    .bf-faq-production details:hover{border-color:#cfc2ff;box-shadow:0 10px 24px rgba(91,70,178,.08);transform:translateY(-1px)}
    .bf-faq-production summary{font-size:16px}
  `;
  document.head.appendChild(style);
}

function applyProductionLegalContent() {
  ensureProductionLegalStyles();
  const key = location.hash.replace(/^#/, '');
  const page = productionPages[key];
  if (!page) return;
  const card = document.querySelector('#bf-legal-page-host .bf-legal-card');
  if (!card) return;
  if (card.dataset.productionLegal === key) return;
  card.dataset.productionLegal = key;
  card.classList.add('bf-production-copy');
  card.innerHTML = `<span class="bf-legal-kicker">BONUSFATTO.IT</span><h1>${page.title}</h1><p class="bf-intro">${page.intro}</p>${page.html}`;
  document.title = `${page.title} | BonusFatto.it`;
}

function scheduleProductionLegalContent() {
  requestAnimationFrame(() => requestAnimationFrame(applyProductionLegalContent));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scheduleProductionLegalContent);
} else {
  scheduleProductionLegalContent();
}
window.addEventListener('hashchange', scheduleProductionLegalContent);
new MutationObserver(() => {
  const key = location.hash.replace(/^#/, '');
  if (productionPages[key]) scheduleProductionLegalContent();
}).observe(document.documentElement, { childList: true, subtree: true });
