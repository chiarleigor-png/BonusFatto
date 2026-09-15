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

const PROFILE_KEY = 'bonusfatto_profile_2026';

function readStoredProfile() {
  if (typeof window === 'undefined') return {};
  if (window.__bonusFattoProfile2026) return window.__bonusFattoProfile2026;
  try {
    return JSON.parse(window.localStorage.getItem(PROFILE_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

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

export function calculate({ isee, children, municipality, profile: inputProfile }) {
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

  const storedProfile = inputProfile && typeof inputProfile === 'object' ? inputProfile : readStoredProfile();
  const profile = Number(storedProfile?.children) === children ? storedProfile : {};
  const childAges = Array.isArray(profile.childAges) ? profile.childAges.filter(Number.isFinite) : [];
  const hasYoungChild = childAges.some((age) => age >= 0 && age < 3);
  const hasNidoAgeChild = childAges.some((age) => age >= 0 && age <= 3);
  const youngestAge = childAges.length ? Math.min(...childAges) : null;
  const event2026 = ['birth', 'adoption', 'foster'].includes(profile.event2026) ? profile.event2026 : null;
  const qualifyingAdiProfile = children > 0 || profile.disability === 'yes' || profile.over65 === 'yes' || profile.disadvantage === 'yes';

  const socialThreshold = isee <= 9796 || (children >= 4 && isee <= 20000);
  const tariPercent = socialThreshold ? 25 : 0;
  const tariBase = MEDIA_TARI[municipality.name] ?? 350;
  const benefits = [];

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
      childAges.length === children
        ? `Profilo acquisito con età dei figli: ${childAges.join(', ')}. Nel 2026 la quota base per ciascun figlio minore varia in funzione dell’ISEE e può essere maggiorata in presenza di ulteriori condizioni. Il profilo raccolto riduce i falsi positivi, ma l’importo esatto richiede anche le maggiorazioni previste dalla disciplina AUU.`
        : 'Misura spettante per i figli nelle condizioni previste dalla normativa. L’importo dipende da ISEE, età dei figli, disabilità e ulteriori maggiorazioni previste dalla disciplina AUU.',
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

  const motherEligibleByAge = children >= 3 ? youngestAge == null || youngestAge < 18 : youngestAge == null || youngestAge < 10;
  if (
    children >= 2 &&
    ['employee', 'self'].includes(profile.motherWork) &&
    profile.motherIncome === 'yes' &&
    motherEligibleByAge
  ) {
    add(
      'mothers',
      'Bonus mamme 2026',
      'Famiglia',
      720,
      'massimale',
      'Il profilo inserito è compatibile con i principali requisiti raccolti dal questionario: almeno due figli, attività lavorativa ammessa, reddito personale da lavoro entro 40.000 euro e requisito anagrafico del figlio più piccolo. Restano da verificare le regole INPS di coordinamento e gli ulteriori requisiti applicabili.',
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

  if (isee <= 8230.81 && (hasYoungChild || profile.over65 === 'yes'))
    add(
      'purchases',
      'Carta acquisti 2026',
      'Spesa',
      480,
      'massimale annuo',
      `Il profilo rientra in una delle platee anagrafiche intercettate dal questionario (${hasYoungChild ? 'presenza di un minore sotto i 3 anni' : 'presenza di una persona di almeno 65 anni'}). Restano da verificare gli ulteriori requisiti reddituali, patrimoniali e soggettivi.`,
      { eligibility: 'verifica', amountType: 'massimo', sourceUrl: 'https://www.inps.it/it/it/dettaglio-approfondimento.schede-informative.la-carta-acquisti.html' },
    );

  if (profile.nursery === 'yes' && hasNidoAgeChild)
    add(
      'nursery',
      'Bonus asilo nido 2026',
      'Famiglia',
      null,
      'massimale',
      'Il questionario conferma la presenza di un figlio nella fascia 0-3 anni e la frequenza di un servizio ammesso. L’importo effettivo dipende dall’età/data di nascita, dall’ISEE specifico per prestazioni familiari e dalla spesa documentata.',
      { eligibility: 'verifica', amountType: 'non-stimabile', sourceUrl: 'https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.bonus-asilo-nido-e-forme-di-supporto-presso-la-propria-abitazione-51105.bonus-asilo-nido-e-forme-di-supporto-presso-la-propria-abitazione.html' },
    );

  if (event2026 && isee <= 40000)
    add(
      'newborn',
      'Bonus nuovi nati 2026',
      'Famiglia',
      1000,
      'una tantum',
      'Il questionario conferma un evento 2026 compatibile (nascita, adozione o affidamento preadottivo). Con ISEE entro 40.000 euro il profilo è coerente con i principali requisiti economici raccolti; restano da verificare termini e requisiti soggettivi.',
      { eligibility: 'verifica', amountType: 'una tantum', sourceUrl: 'https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.bonus-nuovi-nati.html' },
    );

  if (event2026 && isee <= 20668.26 && profile.maternityBenefit !== 'yes')
    add(
      'maternity-municipality',
      'Assegno di maternità dei Comuni 2026',
      'Famiglia',
      2065.5,
      'massimale',
      'Il questionario conferma un evento 2026 compatibile e non risulta già indicata un’indennità economica di maternità. L’importo intero 2026 è pari a 2.065,50 euro; restano da verificare tutela previdenziale, requisiti soggettivi e domanda al Comune nei termini previsti.',
      { eligibility: 'verifica', amountType: 'massimo', sourceUrl: 'https://www.inps.it/it/it/inps-comunica/notizie/dettaglio-news-page.news.2026.02.assegno-di-maternit-e-soglia-isee-aggiornamenti-per-il-2026.html' },
    );

  if (isee <= 10140 && qualifyingAdiProfile)
    add(
      'adi',
      'Assegno di Inclusione (ADI)',
      'Sostegno economico',
      null,
      'mensile',
      'Il profilo contiene almeno una condizione utile intercettata dal questionario (minore, disabilità, persona anziana o svantaggio certificato). Restano necessari i controlli su reddito familiare, patrimonio, residenza, composizione del nucleo e gli altri requisiti previsti.',
      { eligibility: 'verifica', amountType: 'non-stimabile', sourceUrl: 'https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.assegno-di-inclusione-adi.html' },
    );

  if (isee <= 10140 && profile.unemployed === 'yes')
    add(
      'sfl',
      'Supporto per la Formazione e il Lavoro (SFL)',
      'Lavoro',
      500,
      'mensile condizionato',
      'Il questionario segnala almeno un componente tra 18 e 59 anni senza lavoro e disponibile a formazione/inserimento. Restano da verificare requisiti economici, patrimoniali, di cittadinanza/residenza e l’effettiva attivazione nel percorso previsto.',
      { eligibility: 'verifica', amountType: 'mensile', sourceUrl: 'https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.supporto-per-la-formazione-e-il-lavoro-sfl-.html' },
    );

  if (profile.renovation === 'yes')
    add(
      'renovation',
      'Detrazione ristrutturazioni 2026',
      'Casa',
      null,
      'detrazione',
      `Il questionario conferma spese di ristrutturazione nel 2026. La detrazione ordinaria è del 36%; può salire al 50% nei casi previsti per abitazione principale del proprietario o titolare di diritto reale. Situazione abitativa indicata: ${profile.housing === 'owner' ? 'proprietà/diritto reale' : profile.housing === 'rent' ? 'affitto' : 'altra situazione'}. Servono spesa, tipologia di intervento e capienza fiscale.`,
      { eligibility: 'informativo', amountType: 'non-stimabile', sourceUrl: 'https://infoprecompilata.agenziaentrate.gov.it/portale/semplificata-mod-oneri-immobili' },
    );

  const countable = benefits.filter((b) => b.countInTotal && Number.isFinite(b.amount));
  return {
    benefits,
    profile,
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
