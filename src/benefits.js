import { getLocalTariBand, getPiemonteTariRule } from './tariPiemonte.js';

export const euro = (n) =>
  new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(n);

export const MEDIA_TARI = {
  Roma: 360,
  Milano: 400,
  Torino: 380,
  Napoli: 340,
  Bologna: 370,
  Firenze: 350,
  Genova: 360,
  Costarainera: 285,
  Imperia: 290,
};

export const DEADLINES = {
  Roma: {
    date: '2026-02-28T23:59:59+01:00',
    label: '28 febbraio 2026',
    url: 'https://www.comune.roma.it/web/it/notizia/esenzione-tari-2026-domande-entro-28-febbraio.page',
  },
  Fiumicino: {
    date: '2026-03-16T23:59:59+01:00',
    label: '16 marzo 2026',
    url: 'https://www.comune.fiumicino.rm.it/index.php/it/news/bando-agevolazioni-tari-2026',
  },
};

export function countdown(date, now = Date.now()) {
  const remaining = Math.max(0, Math.floor((new Date(date).getTime() - now) / 1000));
  return {
    expired: remaining === 0,
    days: Math.floor(remaining / 86400),
    hours: Math.floor(remaining / 3600) % 24,
    minutes: Math.floor(remaining / 60) % 60,
    seconds: remaining % 60,
  };
}

export function calculate({ isee, children, municipality }) {
  if (
    !Number.isFinite(isee) ||
    isee < 0 ||
    !Number.isInteger(children) ||
    children < 0 ||
    children > 5 ||
    !municipality?.name
  ) {
    throw new Error('Controlla ISEE, figli e Comune.');
  }

  const socialThreshold = isee <= 9796 || (children >= 4 && isee <= 20000);
  const tariPercent = socialThreshold ? 25 : 0;
  const tariBase = MEDIA_TARI[municipality.name] ?? 350;
  const benefits = [];

  // eligibility: stimabile = i dati raccolti consentono una stima; verifica = servono altri requisiti;
  // informativo = agevolazione reale ma non determinabile dal questionario corrente.
  // countInTotal evita di sommare massimali o prestazioni condizionate come se fossero certe.
  const add = (id, name, category, amount, period, description, options = {}) =>
    benefits.push({
      id,
      name,
      category,
      amount,
      period,
      description,
      eligibility: options.eligibility ?? 'verifica',
      amountType: options.amountType ?? (amount == null ? 'non-stimabile' : 'massimo'),
      countInTotal: options.countInTotal ?? false,
      sourceUrl: options.sourceUrl ?? null,
    });

  if (socialThreshold) {
    add(
      'tari',
      'Bonus sociale rifiuti (TARI)',
      'Casa',
      (tariBase * 25) / 100,
      'annuo',
      `Riduzione nazionale del 25% sulla TARI dovuta. Il valore in euro usa una TARI media stimata di ${euro(tariBase)}; l'importo reale dipende dalla TARI effettivamente dovuta. Il bonus è automatico con DSU/ISEE valido e con gli ulteriori requisiti della fornitura/utenza.`,
      { eligibility: 'stimabile', amountType: 'stima', countInTotal: true, sourceUrl: 'https://www.arera.it/comunicati-stampa/dettaglio/bonus-sociali-arera-alza-a-9796-euro-la-soglia-isee-per-laccesso-alle-agevolazioni-per-acqua-luce-gas-e-rifiuti' },
    );

    add(
      'utilities',
      'Bonus sociali luce, gas e acqua',
      'Bollette',
      null,
      'variabile',
      'Nel 2026 la soglia ISEE è 9.796 euro, elevata a 20.000 euro per nuclei con almeno 4 figli a carico. ARERA prevede, in termini generali, uno sconto del 30% per l’elettricità, del 15% per il gas e per l’acqua una quantità agevolata equivalente a 50 litri per abitante al giorno. Senza dati delle forniture non è corretto trasformare questi benefici in un importo fisso in euro.',
      { eligibility: 'verifica', amountType: 'non-stimabile', sourceUrl: 'https://www.arera.it/comunicati-stampa/dettaglio/bonus-sociali-arera-alza-a-9796-euro-la-soglia-isee-per-laccesso-alle-agevolazioni-per-acqua-luce-gas-e-rifiuti' },
    );
  }

  const localTariRule = getPiemonteTariRule(municipality.name);
  const localTariBand = getLocalTariBand(localTariRule, isee);
  if (localTariBand) {
    const deadlineExpired = localTariRule.deadline
      ? new Date(localTariRule.deadline).getTime() < Date.now()
      : null;
    const deadlineText = localTariRule.deadlineLabel
      ? ` Scadenza indicata dalla fonte: ${localTariRule.deadlineLabel}${deadlineExpired ? ' (scaduta)' : ''}.`
      : ' La scadenza 2026 deve essere verificata sulla fonte ufficiale.';
    add(
      `tari-local-${municipality.name.toLowerCase().replace(/\s+/g, '-')}`,
      `Riduzione TARI comunale – ${municipality.name}`,
      'Casa',
      (tariBase * localTariBand.percent) / 100,
      'annuo',
      `Agevolazione comunale 2026 verificata: riduzione del ${localTariBand.percent}% per la fascia ISEE inserita. Il valore in euro è una stima calcolata sulla TARI media usata dal simulatore (${euro(tariBase)}), non sull'importo reale della bolletta.${deadlineText}${localTariRule.note ? ` ${localTariRule.note}` : ''} Fonte ufficiale: ${localTariRule.sourceUrl}`,
      { eligibility: 'stimabile', amountType: 'stima', countInTotal: true, sourceUrl: localTariRule.sourceUrl },
    );
  }

  if (children > 0) {
    add(
      'children',
      'Assegno unico e universale (AUU) 2026',
      'Famiglia',
      null,
      'mensile',
      'Misura spettante per i figli nelle condizioni previste dalla normativa. Nel 2026 la quota base per ciascun figlio minore varia da 203,80 euro/mese con ISEE fino a 17.468,51 euro a 58,30 euro/mese senza ISEE o con ISEE almeno pari a 46.582,71 euro. Età dei figli, disabilità, numero dei figli, età della madre e situazione lavorativa dei genitori incidono sull’importo: il questionario attuale non raccoglie dati sufficienti per un calcolo corretto. Da marzo 2026 si usa l’ISEE per specifiche prestazioni familiari e per l’inclusione.',
      { eligibility: 'verifica', amountType: 'non-stimabile', sourceUrl: 'https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.assegno-unico-e-universale-per-i-figli-a-carico-55984.assegno-unico-e-universale-per-i-figli-a-carico.html' },
    );
  }

  if (isee <= 50000) {
    const psychologistMax = isee < 15000 ? 1500 : isee <= 30000 ? 1000 : 500;
    add(
      'psychologist',
      'Bonus psicologo',
      'Benessere',
      psychologistMax,
      'massimale',
      'Massimale teorico: fino a 1.500 euro con ISEE inferiore a 15.000 euro, 1.000 euro nella fascia successiva fino a 30.000 euro e 500 euro oltre 30.000 e fino a 50.000 euro, nel limite di 50 euro per seduta. La spettanza dipende da domanda, risorse e graduatoria; il massimale non viene sommato al totale.',
      { eligibility: 'verifica', amountType: 'massimo', sourceUrl: 'https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.contributo-per-sostenere-le-spese-relative-a-sessioni-di-psicoterapia-bonus-psicologo.html' },
    );
  }

  if (children >= 2) {
    add(
      'mothers',
      'Bonus mamme 2026',
      'Famiglia',
      720,
      'massimale',
      'Nel 2026 è pari a 60 euro mensili, fino a 720 euro annui. Riguarda lavoratrici dipendenti, escluso il lavoro domestico, e autonome con reddito da lavoro non superiore a 40.000 euro: con almeno 2 figli fino al decimo compleanno del più piccolo, oppure con almeno 3 figli fino al diciottesimo compleanno del più piccolo, secondo le regole di coordinamento INPS. L’ISEE inserito non equivale al reddito da lavoro, quindi la spettanza va verificata e il massimale non viene sommato.',
      { eligibility: 'verifica', amountType: 'massimo', sourceUrl: 'https://www.inps.it/it/it/inps-comunica/notizie/dettaglio-news-page.news.2026.01.vademecum-bonus-mamme.html' },
    );
  }

  if (isee <= 15000)
    add(
      'dedicated',
      'Carta Dedicata a Te 2026',
      'Spesa',
      null,
      'da definire',
      'La misura è rifinanziata per il 2026 per nuclei con ISEE non superiore a 15.000 euro. Non attribuiamo automaticamente l’importo 2025: importo individuale, criteri operativi e assegnazione 2026 devono risultare dal provvedimento attuativo applicabile.',
      { eligibility: 'verifica', amountType: 'non-stimabile', sourceUrl: 'https://www.inps.it/it/it/inps-comunica/notizie/dettaglio-news-page.news.2026.01.legge-di-bilancio-2026-genitorialit-inclusione-sociale-e-disabilit.html' },
    );

  if (isee <= 8230.81)
    add(
      'purchases',
      'Carta acquisti 2026',
      'Spesa',
      480,
      'massimale annuo',
      '80 euro ogni due mesi, pari a 480 euro in un anno intero. La soglia ISEE 2026 è 8.230,81 euro, ma la misura riguarda specifiche platee (tra cui minori di 3 anni e persone di almeno 65 anni) e richiede ulteriori requisiti reddituali e patrimoniali. Il questionario non rileva età e patrimonio: l’importo non viene sommato.',
      { eligibility: 'verifica', amountType: 'massimo', sourceUrl: 'https://www.inps.it/it/it/dettaglio-approfondimento.schede-informative.la-carta-acquisti.html' },
    );

  if (children > 0)
    add(
      'nursery',
      'Bonus asilo nido 2026',
      'Famiglia',
      null,
      'massimale',
      'Il contributo può arrivare a 3.600 euro annui. Per bambini nati dal 1° gennaio 2024 il massimo è 3.600 euro con ISEE per specifiche prestazioni familiari e per l’inclusione fino a 40.000 euro e 1.500 euro oltre soglia o senza ISEE valido; per i nati prima del 2024 si applicano fasce diverse. Servono data di nascita, frequenza/spesa del servizio ammesso o i requisiti del supporto domiciliare: senza questi dati non assegniamo un importo.',
      { eligibility: 'verifica', amountType: 'non-stimabile', sourceUrl: 'https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.bonus-asilo-nido-e-forme-di-supporto-presso-la-propria-abitazione-51105.bonus-asilo-nido-e-forme-di-supporto-presso-la-propria-abitazione.html' },
    );

  if (children > 0 && isee <= 40000)
    add(
      'newborn',
      'Bonus nuovi nati 2026',
      'Famiglia',
      1000,
      'una tantum',
      'Importo di 1.000 euro per nascita, adozione o affidamento preadottivo ammissibile avvenuto nel 2026, con ISEE per specifiche prestazioni familiari e per l’inclusione non superiore a 40.000 euro. La domanda va ordinariamente presentata entro 120 giorni dall’evento. Il solo numero di figli non dimostra che l’evento sia avvenuto nel 2026: l’importo non viene sommato.',
      { eligibility: 'verifica', amountType: 'una tantum', sourceUrl: 'https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.bonus-nuovi-nati.html' },
    );

  if (children > 0 && isee <= 20668.26)
    add(
      'maternity-municipality',
      'Assegno di maternità dei Comuni 2026',
      'Famiglia',
      2065.5,
      'massimale',
      'Nel 2026 l’importo intero è 413,10 euro per cinque mensilità, pari a 2.065,50 euro, con ISEE non superiore a 20.668,26 euro. Riguarda nascite, affidamenti preadottivi o adozioni senza affidamento avvenuti nel 2026 e richiede gli ulteriori requisiti previsti, inclusa la situazione rispetto alla tutela economica di maternità. Il massimale non viene sommato.',
      { eligibility: 'verifica', amountType: 'massimo', sourceUrl: 'https://www.inps.it/it/it/inps-comunica/notizie/dettaglio-news-page.news.2026.02.assegno-di-maternit-e-soglia-isee-aggiornamenti-per-il-2026.html' },
    );

  if (isee <= 10140)
    add(
      'adi',
      'Assegno di Inclusione (ADI)',
      'Sostegno economico',
      null,
      'mensile',
      'La soglia ISEE è 10.140 euro. L’ADI richiede però la presenza nel nucleo di almeno un componente nelle condizioni previste (ad esempio minore, disabilità, almeno 60 anni o specifica condizione di svantaggio) e verifiche su reddito familiare, patrimonio, residenza e altri requisiti. L’importo dipende dalla scala di equivalenza, dal reddito e dall’eventuale locazione: con il solo ISEE non è calcolabile.',
      { eligibility: 'verifica', amountType: 'non-stimabile', sourceUrl: 'https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.assegno-di-inclusione-adi.html' },
    );

  if (isee <= 10140)
    add(
      'sfl',
      'Supporto per la Formazione e il Lavoro (SFL)',
      'Lavoro',
      500,
      'mensile condizionato',
      'Il SFL prevede 500 euro mensili durante la partecipazione alle attività previste. È rivolto a singoli componenti in possesso dei requisiti, tra cui requisiti anagrafici, economici, patrimoniali, di cittadinanza/residenza e di attivazione; ISEE e reddito familiare devono rispettare le soglie vigenti. Non basta l’ISEE inserito e l’importo non viene sommato.',
      { eligibility: 'verifica', amountType: 'mensile', sourceUrl: 'https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.supporto-per-la-formazione-e-il-lavoro-sfl-.html' },
    );

  add(
    'renovation',
    'Detrazione ristrutturazioni 2026',
    'Casa',
    null,
    'detrazione',
    'Per le spese 2026 la detrazione ordinaria è del 36%; è elevata al 50% quando ricorrono i requisiti per l’abitazione principale del proprietario o titolare di diritto reale. Servono spesa, tipologia di intervento, titolo sull’immobile e capienza fiscale: non viene inclusa nel totale.',
    { eligibility: 'informativo', amountType: 'non-stimabile', sourceUrl: 'https://infoprecompilata.agenziaentrate.gov.it/portale/semplificata-mod-oneri-immobili' },
  );

  const countable = benefits.filter((b) => b.countInTotal && Number.isFinite(b.amount));
  return {
    benefits,
    tariPercent,
    tariBase,
    tariEstimatedSaving: (tariBase * tariPercent) / 100,
    tariNationalEligible: socialThreshold,
    tariLocalRule: localTariRule,
    tariLocalPercent: localTariBand?.percent ?? 0,
    total: countable.reduce((sum, b) => sum + b.amount, 0),
    recurring: countable.filter((b) => b.period === 'annuo').reduce((sum, b) => sum + b.amount, 0),
    conditional: benefits
      .filter((b) => !b.countInTotal && Number.isFinite(b.amount))
      .reduce((sum, b) => sum + b.amount, 0),
  };
}

export function emailTemplate({ municipality, isee }) {
  return `Oggetto: Richiesta informazioni agevolazioni TARI 2026 – ISEE ${euro(isee)} – Comune ${municipality.name}\n\nGentile Ufficio Tributi del Comune di ${municipality.name},\n\nsono residente nel Comune e dispongo di un ISEE 2026 pari a ${euro(isee)}.\n\nChiedo cortesemente di conoscere le eventuali agevolazioni, riduzioni o esenzioni TARI comunali ulteriori rispetto al bonus sociale rifiuti nazionale, con indicazione di requisiti, percentuali applicabili, documentazione necessaria, modalità di presentazione e scadenze.\n\nQualora sia prevista una procedura a domanda, chiedo anche il relativo modulo o il collegamento al servizio online.\n\nResto a disposizione per trasmettere la documentazione attraverso i canali ufficiali dell'Ente.\n\nCordiali saluti,\n[Nome e cognome]\n[Codice fiscale]\n[Codice utenza TARI]\n[Recapito]`;
}
