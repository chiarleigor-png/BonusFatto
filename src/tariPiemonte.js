export const TARI_PIEMONTE_2026 = {
  Torino: {
    province: 'TO',
    status: 'VERIFIED_2026',
    applicationRequired: true,
    deadline: '2026-09-30T23:59:59+02:00',
    deadlineLabel: '30 settembre 2026',
    dsuDeadlineLabel: '23 settembre 2026',
    sourceUrl: 'https://www.comune.torino.it/servizi/agevolazione-isee-per-utenze-domestiche-tari',
    bands: [
      { maxIsee: 10000, percent: 50 },
      { maxIsee: 15000, percent: 45 },
      { maxIsee: 22000, percent: 30 },
      { maxIsee: 30000, percent: 20 },
    ],
  },
  Moncalieri: {
    province: 'TO',
    status: 'VERIFIED_2026',
    applicationRequired: true,
    deadline: '2025-12-01T23:59:59+01:00',
    deadlineLabel: '1 dicembre 2025',
    sourceUrl: 'https://www.comune.moncalieri.to.it/media/1776',
    bands: [
      { maxIsee: 9530, percent: 65 },
      { maxIsee: 12000, percent: 60 },
      { maxIsee: 16000, percent: 30 },
      { maxIsee: 20000, percent: 10 },
    ],
    note: 'Il bando 2026 prevedeva anche un ulteriore 10% in presenza di invalidità almeno pari al 67%; il simulatore non raccoglie questo dato.',
  },
  Rivoli: {
    province: 'TO',
    status: 'VERIFIED_2026',
    applicationRequired: true,
    deadline: '2026-05-31T23:59:59+02:00',
    deadlineLabel: '31 maggio 2026',
    sourceUrl: 'https://www.comune.rivoli.to.it/Novita/Avvisi/Riduzioni-TARI-2026-online-il-modello-per-la-richiesta-delle-agevolazioni-ISEE',
    bands: [
      { maxIsee: 5000, percent: 75 },
      { maxIsee: 9530, percent: 45 },
      { maxIsee: 15000, percent: 50 },
    ],
    note: 'Prevista anche una riduzione del 30% per nuclei con portatori di handicap grave e ISEE fino a 22.000 euro; il simulatore non raccoglie questo dato.',
  },
  Collegno: {
    province: 'TO',
    status: 'VERIFIED_2026',
    applicationRequired: true,
    deadline: null,
    deadlineLabel: null,
    sourceUrl: 'https://www.trasparenzatari.it/trasparenzatari/?COMUNE=C860',
    bands: [
      { maxIsee: 8000, percent: 70 },
      { maxIsee: 10000, percent: 40 },
      { maxIsee: 13000, percent: 30 },
      { maxIsee: 16000, percent: 20 },
      { maxIsee: 18000, percent: 15 },
      { maxIsee: 20000, percent: 10 },
    ],
    note: 'La fonte ufficiale espone le fasce ISEE e le modalità di invio, ma non una scadenza 2026 univoca nella sezione consultata.',
  },
  Alessandria: {
    province: 'AL',
    status: 'OFFICIAL_DOC_FOUND_UNPARSED',
    sourceUrl: 'https://servizionline.comune.alessandria.it/cmsalessandria/portale/delibere/deliberericerca.aspx?ANNO=2026&CGC=1&P=700',
  },
  Asti: {
    province: 'AT',
    status: 'OFFICIAL_DOC_FOUND_UNPARSED',
    sourceUrl: 'https://www.comune.asti.it/servizi/tassa-sui-rifiuti-tari',
  },
  Biella: {
    province: 'BI',
    status: 'OFFICIAL_DOC_FOUND_UNPARSED',
    sourceUrl: 'https://comune.biella.it/wp-content/uploads/sites/150/2026/02/delcc-64-19-12-2025.pdf',
  },
  Cuneo: {
    province: 'CN',
    status: 'OFFICIAL_DOC_FOUND_UNPARSED',
    sourceUrl: 'https://www.trasparenzatari.it/trasparenzatari/?COMUNE=D205',
  },
  Novara: {
    province: 'NO',
    status: 'OFFICIAL_DOC_FOUND_UNPARSED',
    sourceUrl: 'https://www.comune.novara.it/servizi/tari',
  },
  Verbania: {
    province: 'VB',
    status: 'OFFICIAL_DOC_FOUND_UNPARSED',
    sourceUrl: 'https://www.trasparenzatari.it/trasparenzatari/?COMUNE=L746',
  },
  Vercelli: {
    province: 'VC',
    status: 'OFFICIAL_DOC_FOUND_UNPARSED',
    sourceUrl: 'https://www.comune.vercelli.it/servizi/tassa-raccolta-rifiuti',
  },
};

export function getPiemonteTariRule(municipalityName) {
  return TARI_PIEMONTE_2026[municipalityName] ?? null;
}

export function getLocalTariBand(rule, isee) {
  if (!rule || rule.status !== 'VERIFIED_2026' || !Array.isArray(rule.bands)) return null;
  return rule.bands.find((band) => isee <= band.maxIsee) ?? null;
}
