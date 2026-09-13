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
  const add = (id, name, category, amount, period, description) =>
    benefits.push({ id, name, category, amount, period, description });

  if (socialThreshold) {
    add(
      'tari',
      'Bonus sociale rifiuti (TARI)',
      'Casa',
      (tariBase * 25) / 100,
      'annuo',
      `Riduzione nazionale del 25% sulla TARI dovuta. Il valore in euro mostrato usa una TARI media stimata di ${euro(tariBase)}; l'importo reale dipende dalla TARI effettivamente dovuta. Il bonus nazionale è automatico con DSU/ISEE valido.`,
    );

    add(
      'utilities',
      'Bonus sociali luce, gas e acqua',
      'Bollette',
      250,
      'annuo',
      'Stima orientativa complessiva. Nel 2026 la soglia ordinaria ISEE è 9.796 euro, elevata a 20.000 euro per nuclei con almeno 4 figli a carico. Gli importi effettivi dipendono dalle regole ARERA e dalle caratteristiche delle forniture.',
    );
  }

  if (children > 0) {
    const monthly = isee <= 17500 ? 199 : isee <= 40000 ? 120 : 57;
    add(
      'children',
      'Assegno unico maggiorato',
      'Famiglia',
      monthly * children * 12,
      'annuo',
      `Stima semplificata: ${euro(monthly)} × ${children} figli × 12 mesi. Età, maggiorazioni e tabelle INPS possono cambiare l'importo.`,
    );
  }

  if (isee <= 50000)
    add(
      'psychologist',
      'Bonus psicologo 2026',
      'Benessere',
      isee <= 15000 ? 1500 : isee <= 30000 ? 1000 : 500,
      'massimale',
      'Importo massimo orientativo. Occorrono domanda, disponibilità delle risorse e posizione utile in graduatoria.',
    );

  if (children >= 2 && isee <= 40000)
    add(
      'mothers',
      'Bonus mamme 2026',
      'Famiglia',
      3000,
      'massimale',
      'Massimale indicativo: attività lavorativa, reddito ed età dei figli possono modificare spettanza e importo.',
    );

  if (isee <= 15000)
    add(
      'dedicated',
      'Carta Dedicata a Te',
      'Spesa',
      500,
      'una tantum',
      'Possibile solo se il nucleo rispetta i requisiti previsti e rientra nell’assegnazione disponibile. La composizione completa del nucleo non viene rilevata dal simulatore.',
    );

  if (isee <= 8117)
    add(
      'purchases',
      'Carta acquisti',
      'Spesa',
      480,
      'annuo',
      '80 euro a bimestre per 6 erogazioni. Sono necessari anche specifici requisiti anagrafici, reddituali e patrimoniali.',
    );

  if (children > 0)
    add(
      'nursery',
      'Bonus asilo nido',
      'Famiglia',
      isee <= 25000 ? 3000 : isee <= 40000 ? 2500 : 1500,
      'massimale',
      'Stima per un bambino. Richiede età idonea e spese documentate; il rimborso non supera la spesa sostenuta.',
    );

  add(
    'renovation',
    'Detrazione 730 ristrutturazione',
    'Casa',
    null,
    'detrazione',
    'Agevolazione da verificare sulla singola spesa, sull’immobile e sulla capienza fiscale. Non viene inclusa nel totale stimato.',
  );

  if (children > 0 && isee <= 40000)
    add(
      'newborn',
      'Bonus nuovi nati',
      'Famiglia',
      1000,
      'una tantum',
      'Solo in presenza di nascita o adozione ammissibile e degli ulteriori requisiti previsti.',
    );

  return {
    benefits,
    tariPercent,
    tariBase,
    tariEstimatedSaving: (tariBase * tariPercent) / 100,
    tariNationalEligible: socialThreshold,
    total: benefits.reduce((sum, b) => sum + (b.amount ?? 0), 0),
    recurring: benefits.filter((b) => b.period === 'annuo').reduce((sum, b) => sum + (b.amount ?? 0), 0),
    conditional: benefits
      .filter((b) => ['massimale', 'una tantum'].includes(b.period))
      .reduce((sum, b) => sum + (b.amount ?? 0), 0),
  };
}

export function emailTemplate({ municipality, isee }) {
  return `Oggetto: Richiesta informazioni agevolazioni TARI 2026 – ISEE ${euro(isee)} – Comune ${municipality.name}\n\nGentile Ufficio Tributi del Comune di ${municipality.name},\n\nsono residente nel Comune e dispongo di un ISEE 2026 pari a ${euro(isee)}.\n\nChiedo cortesemente di conoscere le eventuali agevolazioni, riduzioni o esenzioni TARI comunali ulteriori rispetto al bonus sociale rifiuti nazionale, con indicazione di requisiti, percentuali applicabili, documentazione necessaria, modalità di presentazione e scadenze.\n\nQualora sia prevista una procedura a domanda, chiedo anche il relativo modulo o il collegamento al servizio online.\n\nResto a disposizione per trasmettere la documentazione attraverso i canali ufficiali dell'Ente.\n\nCordiali saluti,\n[Nome e cognome]\n[Codice fiscale]\n[Codice utenza TARI]\n[Recapito]`;
}
