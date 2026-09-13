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

// Product brief formulas, intentionally isolated from official eligibility rules.
// Never present these bands as Italian law or municipal tariff regulations.
export function calculate({ isee, children, municipality }) {
  if (
    !Number.isFinite(isee) ||
    isee < 0 ||
    !Number.isInteger(children) ||
    children < 0 ||
    children > 5 ||
    !municipality?.name
  )
    throw new Error('Controlla ISEE, figli e Comune.');
  const tariPercent = isee <= 8000 ? 100 : isee <= 15000 ? 50 : isee <= 26530 ? 25 : 0;
  const tariBase = MEDIA_TARI[municipality.name] ?? 350;
  const benefits = [];
  const add = (id, name, category, amount, period, description) =>
    benefits.push({ id, name, category, amount, period, description });
  if (tariPercent)
    add(
      'tari',
      'Sconto TARI',
      'Casa',
      (tariBase * tariPercent) / 100,
      'annuo',
      `${tariPercent}% su una TARI ipotetica di ${euro(tariBase)}. Fasce del simulatore, non aliquote del Comune. Le agevolazioni locali devono essere verificate.`,
    );
  if (isee <= 9530 || (children >= 4 && isee <= 20000))
    add(
      'utilities',
      'Bonus luce, gas e acqua',
      'Bollette',
      250,
      'annuo',
      'Ipotesi: luce 80 € + gas 120 € + acqua 50 €. Il valore reale dipende da nucleo, forniture e consumi. Il modello usa 9.530 €; la soglia ordinaria ufficiale 2026 è 9.796 €.',
    );
  if (children > 0) {
    const monthly = isee <= 17500 ? 199 : isee <= 40000 ? 120 : 57;
    add(
      'children',
      'Assegno unico maggiorato',
      'Famiglia',
      monthly * children * 12,
      'annuo',
      `Stima semplificata: ${euro(monthly)} × ${children} figli × 12 mesi. Età, maggiorazioni e tabelle INPS possono cambiare l’importo.`,
    );
  }
  if (isee <= 50000)
    add(
      'psychologist',
      'Bonus psicologo 2026',
      'Benessere',
      isee <= 15000 ? 1500 : isee <= 30000 ? 1000 : 500,
      'massimale',
      'Fino a 50 € per seduta. Occorrono domanda, disponibilità delle risorse e posizione utile in graduatoria; non è un pagamento automatico.',
    );
  if (children >= 2 && isee <= 40000)
    add(
      'mothers',
      'Bonus mamme 2026',
      'Famiglia',
      3000,
      'annuo',
      'Massimo ipotizzato dal modello. Attività lavorativa, reddito ed età dei figli non sono rilevati: spettanza e importo da verificare.',
    );
  // Family size is unknown. Keep this candidate conditional, without assuming two adults.
  if (isee <= 15000)
    add(
      'dedicated',
      'Carta Dedicata a Te',
      'Spesa',
      500,
      'una tantum',
      'Solo se il nucleo ha almeno 3 persone e rispetta gli altri requisiti. La composizione del nucleo e l’assegnazione comunale non sono verificate.',
    );
  if (isee <= 8117)
    add(
      'purchases',
      'Carta acquisti',
      'Spesa',
      480,
      'annuo',
      '80 € a bimestre × 6. Soglia del modello; sono necessari anche requisiti anagrafici (under 3 o almeno 65 anni), reddituali e patrimoniali.',
    );
  if (children > 0)
    add(
      'nursery',
      'Bonus asilo nido',
      'Famiglia',
      isee <= 25000 ? 3000 : isee <= 40000 ? 2500 : 1500,
      'massimale',
      'Ipotesi per un bambino. Richiede età idonea e spese documentate; il rimborso non supera la spesa. Le regole 2026 possono prevedere fino a 3.600 €.',
    );
  add(
    'renovation',
    'Detrazione 730 ristrutturazione',
    'Casa',
    null,
    'detrazione',
    'Ipotesi del brief: 50% in 10 anni su massimo 96.000 €. Aliquota effettiva, abitazione, spesa e capienza fiscale da verificare. Esclusa dal totale.',
  );
  if (children > 0)
    add(
      'newborn',
      'Bonus nuovi nati',
      'Famiglia',
      1000,
      'una tantum',
      'Solo per una nascita o adozione ammissibile. Avere figli non basta: nel 2026 è richiesto anche un ISEE specifico non superiore a 40.000 €.',
    );
  return {
    benefits,
    tariPercent,
    tariBase,
    total: benefits.reduce((sum, b) => sum + (b.amount ?? 0), 0),
    recurring: benefits.filter((b) => b.period === 'annuo').reduce((sum, b) => sum + b.amount, 0),
    conditional: benefits
      .filter((b) => ['massimale', 'una tantum'].includes(b.period))
      .reduce((sum, b) => sum + b.amount, 0),
  };
}

export function emailTemplate({ municipality, isee }) {
  return `Oggetto: Richiesta agevolazione TARI 2026 – ISEE ${euro(isee)} – Comune ${municipality.name}\n\nGentile Ufficio Tributi del Comune di ${municipality.name},\n\nsono residente nel Comune e il mio ISEE è pari a ${euro(isee)}. Vorrei conoscere le agevolazioni TARI previste per il mio nucleo familiare, i requisiti, la documentazione necessaria e le modalità di presentazione della domanda.\n\nChiedo inoltre conferma delle scadenze 2026 e, se già trascorse, delle eventuali possibilità ancora disponibili.\n\nResto a disposizione per trasmettere la documentazione attraverso i vostri canali ufficiali.\n\nCordiali saluti,\n[Nome e cognome]\n[Codice utenza TARI]\n[Recapito]`;
}
