export type BlogArticle = {
  slug: string;
  titolo: string;
  excerpt: string;
  categoria: string;
  data: string;
  lettura: string;
  img: string;
  keywords: string[];
  contenuto: string;
};

export const BLOG_ARTICLES: BlogArticle[] = [
  {
    slug: "isee-2026-guida-calcolo",
    titolo: "ISEE 2026: Guida completa al calcolo e ai documenti necessari",
    excerpt: "Come si calcola l'ISEE 2026, quali documenti servono e come evitare errori che ti fanno perdere bonus fino a 5000€.",
    categoria: "ISEE",
    data: "13 Set 2026",
    lettura: "6 min",
    img: "/blog/isee-2026-guida-calcolo.webp",
    keywords: ["ISEE 2026", "calcolo ISEE", "DSU", "documenti ISEE"],
    contenuto: `
      <h2>Cos'è l'ISEE 2026 e perché è fondamentale</h2>
      <p>L'Indicatore della Situazione Economica Equivalente (ISEE) 2026 è la chiave per accedere a oltre 15 bonus. Senza DSU aggiornata perdi automaticamente Bonus Sociale Luce/Gas, TARI agevolata, Asilo Nido e molti altri.</p>
      <img src="/blog/isee-2026-guida-calcolo.webp" alt="Famiglia calcola ISEE 2026" class="rounded-xl my-4 w-full" />
      <h3>Documenti necessari 2026</h3>
      <ul>
        <li>Carta d'identità e codice fiscale di tutti i componenti nucleo</li>
        <li>Redditi 2024 (CU, 730, Unico)</li>
        <li>Giacenza media conti e depositi al 31/12/2024</li>
        <li>Contratto affitto e targa auto se possedute</li>
      </ul>
      <h3>Errore più comune</h3>
      <p>Inserire la giacenza invece della giacenza media: ti fa schizzare l'ISEE di 10.000€ e perdi bonus TARI. Usa BonusFatto.it per verificare subito dopo il calcolo a quali bonus hai diritto con il tuo ISEE reale.</p>
      <div class="bg-amber-50 border border-amber-200 p-4 rounded-xl mt-4"><strong>💡 Tip:</strong> Presenta DSU a gennaio 2026, così l'ISEE vale 12 mesi e copri tutte le scadenze TARI (28/02 Roma, 31/07 Milano, 31/10 Torino).</div>
    `
  },
  {
    slug: "tari-sconto-isee-basso-2026",
    titolo: "Sconto TARI 2026 con ISEE basso: fino al 100% di esenzione",
    excerpt: "Scopri come ottenere sconto TARI dal 25% al 100% con ISEE sotto 15.000€. Regolamento per regolamento comunale.",
    categoria: "TARI",
    data: "12 Set 2026",
    lettura: "5 min",
    img: "/blog/tari-sconto-isee-basso.webp",
    keywords: ["sconto TARI", "esenzione TARI", "ISEE basso", "agevolazione TARI"],
    contenuto: `
      <h2>Quanto puoi risparmiare sulla TARI 2026?</h2>
      <p>La media TARI in Italia è 350€. Con ISEE sotto soglia, molti Comuni danno:</p>
      <ul>
        <li><strong>50-100%</strong> esenzione con ISEE &lt; 8.000€ (Roma, Torino, Milano)</li>
        <li><strong>30-50%</strong> sconto con ISEE 8.000-15.000€</li>
        <li><strong>20-30%</strong> per unico occupante, over 65, compostaggio</li>
      </ul>
      <img src="/blog/tari-sconto-isee-basso.webp" alt="Sconto TARI 50%" class="rounded-xl my-4 w-full" />
      <h3>Differenza tra bonus nazionale e comunale</h3>
      <p>Bonus nazionale ARERA (ISEE ≤ 9.796€) è automatico in bolletta rifiuti 25% se previsto. Sconto disagio ISEE comunale richiede domanda esplicita entro scadenza (es. Roma 28/02/2026). Puoi cumularli.</p>
      <div class="bg-violet-50 border border-violet-200 p-4 rounded-xl mt-4"><strong>Su BonusFatto.it:</strong> inserisci Comune + ISEE e calcoliamo % esatta + risparmio in € + scadenza del tuo Comune su 7904 comuni.</div>
    `
  },
  {
    slug: "come-richiedere-agevolazione-tari-comune",
    titolo: "Come richiedere agevolazione TARI in Comune: procedura 2026",
    excerpt: "Guida pratica step-by-step per presentare istanza TARI: moduli, PEC, SPID, scadenze per non perdere il bonus.",
    categoria: "Guide",
    data: "11 Set 2026",
    lettura: "4 min",
    img: "/blog/come-richiedere-tari.webp",
    keywords: ["richiedere TARI", "domanda TARI", "modulo TARI", "Ufficio Tributi"],
    contenuto: `
      <h2>Procedura in 4 step</h2>
      <p><strong>1. Verifica regolamento</strong> art.18-22 sul sito trasparenza del Comune (es. Roma art.21). <br/><strong>2. Prepara DSU ISEE 2026</strong> già attestata. <br/><strong>3. Compila istanza</strong> (allega ISEE, documento, utenza TARI). <br/><strong>4. Invia entro scadenza</strong> via PEC, sportello o online con SPID.</p>
      <img src="/blog/come-richiedere-tari.webp" alt="Richiesta TARI in Comune" class="rounded-xl my-4 w-full" />
      <h3>Tempi di risposta</h3>
      <p>30-60 giorni. Se accolta, sconto appare su bolletta successiva o conguaglio. Conserva ricevuta PEC.</p>
      <div class="bg-emerald-50 border border-emerald-200 p-4 rounded-xl mt-4">Su BonusFatto.it generiamo <strong>modello email pronta</strong> con ISEE e Comune già compilati da copiare in PEC.</div>
    `
  },
  {
    slug: "bonus-sociale-luce-gas-acqua-2026-arera",
    titolo: "Bonus Sociale Luce, Gas e Acqua 2026: 250€ automatici con ISEE",
    excerpt: "Con ISEE sotto 9.796€ (20.000€ con 4 figli) hai sconto automatico in bolletta luce, gas e acqua. Ecco importi ARERA.",
    categoria: "Bollette",
    data: "10 Set 2026",
    lettura: "5 min",
    img: "/blog/bonus-luce-gas-2026.webp",
    keywords: ["bonus luce gas", "ARERA", "bonus sociale", "sconto bollette"],
    contenuto: `
      <h2>Bonus automatico senza domanda</h2>
      <p>Dal 2021 basta DSU: ARERA incrocia dati con distributori e ti applica sconto direttamente in bolletta. ISEE 2026 soglie aggiornate:</p>
      <ul>
        <li><strong>ISEE ≤ 9.796€</strong>: Luce ~80€ + Gas ~120€ + Acqua ~50€ = ~250€/anno</li>
        <li><strong>ISEE ≤ 20.000€ con 4 figli</strong>: stesse agevolazioni</li>
      </ul>
      <img src="/blog/bonus-luce-gas-2026.webp" alt="Bonus luce gas ARERA 2026" class="rounded-xl my-4 w-full" />
      <h3>Verifica</h3>
      <p>In bolletta trovi voce "Bonus sociale". Se non lo vedi e hai ISEE sotto soglia, fai DSU nuova. Totale con TARI scontata: ~600€/anno di risparmio utenze.</p>
      <a href="https://www.arera.it/consumatori/bonus-sociale" target="_blank" class="text-blue-600 font-bold">Verifica su ARERA →</a>
    `
  },
  {
    slug: "voucher-scuola-piemonte-2026-2027",
    titolo: "Voucher Scuola Piemonte 2026-2027: fino a 1.500€ per iscrizione",
    excerpt: "Requisiti, scadenze giugno 2026 e importi Voucher Scuola Regione Piemonte per famiglie con ISEE ≤ 26.000€.",
    categoria: "Scuola",
    data: "09 Set 2026",
    lettura: "4 min",
    img: "/blog/voucher-scuola-piemonte.webp",
    keywords: ["voucher scuola Piemonte", "bonus scuola", "Regione Piemonte"],
    contenuto: `
      <h2>Chi può chiedere Voucher Scuola Piemonte?</h2>
      <p>Residenza in Piemonte, ISEE 2026 ≤ 26.000€, iscrizione a scuola paritaria o spese libri. Importi: 300-1500€ a seconda ISEE e ordine scuola.</p>
      <img src="/blog/voucher-scuola-piemonte.webp" alt="Voucher Scuola Piemonte" class="rounded-xl my-4 w-full" />
      <h3>Scadenza</h3>
      <p>Domanda su Piemonte TU entro giugno 2026 (countdown live su BonusFatto.it). Serve SPID/CIE.</p>
      <div class="bg-amber-50 border p-4 rounded-xl mt-4"><strong>Documenti:</strong> ISEE, iscrizione, carta identità, IBAN.</div>
    `
  },
  {
    slug: "bonus-asilo-nido-inps-2026",
    titolo: "Bonus Asilo Nido INPS 2026: fino a 3.600€ annui",
    excerpt: "Come ottenere rimborso retta nido fino a 3.600€ con ISEE 2026. Guida domanda INPS e tempi.",
    categoria: "Famiglia",
    data: "08 Set 2026",
    lettura: "5 min",
    img: "/blog/bonus-asilo-nido.webp",
    keywords: ["bonus asilo nido", "INPS nido", "rimborso nido"],
    contenuto: `
      <h2>Importi 2026</h2>
      <ul>
        <li>ISEE ≤ 25.000€: 3.000€/anno (272€/mese)</li>
        <li>25.001-40.000€: 2.500€</li>
        <li>&gt;40.000€: 1.500€</li>
        <li>+ supporto domiciliare bimbi gravi fino 3 anni</li>
      </ul>
      <img src="/blog/bonus-asilo-nido.webp" alt="Bonus asilo nido INPS" class="rounded-xl my-4 w-full" />
      <h3>Domanda</h3>
      <p>Su INPS con SPID, allega fatture nido. Pagamento mensile. Cumulabile con Assegno Unico.</p>
    `
  },
  {
    slug: "assegno-unico-figli-2026-importi-isee",
    titolo: "Assegno Unico Figli 2026: importi aggiornati per ISEE",
    excerpt: "Tabella importi Assegno Unico 2026 da 57€ a 199€ per figlio. Come ISEE influenza l'importo e maggiorazioni.",
    categoria: "Famiglia",
    data: "07 Set 2026",
    lettura: "6 min",
    img: "/blog/assegno-unico-2026.webp",
    keywords: ["assegno unico 2026", "importi assegno unico", "ISEE assegno unico"],
    contenuto: `
      <h2>Quanto spetta nel 2026?</h2>
      <p>ISEE ≤ 17.500€: 199,4€ per figlio + maggiorazioni. Oltre scala fino a 57€ minimo con ISEE >46.000€. </p>
      <img src="/blog/assegno-unico-2026.webp" alt="Assegno Unico 2026" class="rounded-xl my-4 w-full" />
      <h3>Maggiorazioni 2026</h3>
      <ul>
        <li>+122,7€ disabilità grave</li>
        <li>+99,4€ dal 3° figlio</li>
        <li>+23,4€ madre under 21</li>
      </ul>
      <p>Domanda unica su INPS, rinnovo automatico se ISEE aggiornato.</p>
    `
  },
  {
    slug: "soglie-isee-bonus-2026-tutti-i-limiti",
    titolo: "Soglie ISEE 2026 per tutti i bonus: tabella completa",
    excerpt: "Tutte le soglie ISEE 2026 aggiornate per bonus: da 9.796€ a 46.000€. Non perdere nessun bonus per 100€ di ISEE.",
    categoria: "ISEE",
    data: "06 Set 2026",
    lettura: "7 min",
    img: "/blog/soglie-isee-2026.webp",
    keywords: ["soglie ISEE 2026", "limiti ISEE bonus", "tabella ISEE"],
    contenuto: `
      <h2>Tabella soglie 2026</h2>
      <p>Ecco la tabella che usiamo su BonusFatto.it (fonte ARERA, INPS, Regioni):</p>
      <img src="/blog/soglie-isee-2026.webp" alt="Tabella soglie ISEE 2026" class="rounded-xl my-4 w-full border" />
      <ul>
        <li><strong>9.796€</strong>: Luce/Gas/Acqua/TARI ARERA</li>
        <li><strong>15.000€</strong>: TARI 50% molti Comuni</li>
        <li><strong>25.000€</strong>: Asilo Nido max, Bonus Mamma</li>
        <li><strong>26.000€</strong>: Voucher Scuola Piemonte</li>
        <li><strong>40.000€</strong>: Asilo Nido ridotto, Università</li>
        <li><strong>46.000€</strong>: Assegno Unico minimo</li>
      </ul>
      <div class="bg-slate-900 text-white p-4 rounded-xl mt-4">Prova su BonusFatto.it: inserisci ISEE e Comune e ti diciamo esattamente in quali fasce rientri.</div>
    `
  },
  {
    slug: "scadenza-tari-2026-roma-torino-milano",
    titolo: "Scadenze TARI 2026: Roma, Milano, Torino e tutti i Comuni",
    excerpt: "Calendario scadenze TARI 2026: Roma 28/02, Milano 31/07, Torino 31/10. Come non perdere l'agevolazione.",
    categoria: "TARI",
    data: "05 Set 2026",
    lettura: "4 min",
    img: "/blog/scadenze-tari-2026.webp",
    keywords: ["scadenza TARI 2026", "quando pagare TARI", "rate TARI"],
    contenuto: `
      <h2>Scadenze principali 2026</h2>
      <p>Ogni Comune ha 3-4 rate + saldo 31/12. Le più importanti:</p>
      <ul>
        <li><strong>Roma</strong>: 30/04, 31/07, 31/10, 31/12 - Agevolazione entro 28/02/26</li>
        <li><strong>Milano</strong>: 30/04, 31/07, 31/10, 31/12</li>
        <li><strong>Torino</strong>: 31/10 saldo, agevolazioni entro marzo</li>
        <li><strong>Fiumicino</strong>: entro 16/03/2026</li>
      </ul>
      <img src="/blog/scadenze-tari-2026.webp" alt="Calendario scadenze TARI 2026" class="rounded-xl my-4 w-full" />
      <h3>Cosa succede se paghi dopo?</h3>
      <p>Ravvedimento 90 giorni con sanzione ridotta. Oltre perdi rateizzazione. Su BonusFatto.it trovi countdown live per il tuo Comune.</p>
    `
  },
  {
    slug: "modello-email-tari-esempio-pronto",
    titolo: "Modello email TARI: esempio pronto da inviare al Comune",
    excerpt: "Fac-simile PEC per richiedere sconto TARI: copia, incolla, aggiungi ISEE e invia. Aumenta del 70% possibilità di accoglimento.",
    categoria: "Guide",
    data: "04 Set 2026",
    lettura: "3 min",
    img: "/blog/modello-email-tari.webp",
    keywords: ["modello email TARI", "fac simile TARI", "PEC TARI"],
    contenuto: `
      <h2>Perché usare un modello?</h2>
      <p>Email scritta bene con riferimento a delibera comunale, articolo regolamento e ISEE aumenta accoglimento. Ecco struttura vincente:</p>
      <img src="/blog/modello-email-tari.webp" alt="Modello email TARI" class="rounded-xl my-4 w-full" />
      <pre class="bg-slate-50 border p-4 rounded-xl text-sm overflow-x-auto">Oggetto: Richiesta agevolazione TARI 2026 – ISEE [ISEE] – Utenza [NUMERO]

Spett.le Ufficio Tributi Comune di [COMUNE],
ai sensi art.18 Regolamento TARI Delibera n.[X] richiedo sconto disagio economico ISEE [ISEE]€ ≤ [SOGLIA]€.
Allego DSU ISEE 2026, documento, bolletta TARI.
Resto a disposizione.
Cordiali saluti
[NOME] - [CF] - [TEL]
</pre>
      <div class="bg-violet-50 border p-4 rounded-xl mt-4">Su BonusFatto.it lo generiamo <strong>già compilato</strong> con tuo Comune e ISEE, pronto da copiare in PEC.</div>
    `
  },
];
