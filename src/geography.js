export const DATASET_URLS = [
  'https://cdn.jsdelivr.net/gh/RP92/comuni-italiani/data/comuni.json',
  'https://raw.githubusercontent.com/RP92/comuni-italiani/main/data/comuni.json',
];

export const alphabetical = (a, b) => a.localeCompare(b, 'it');
export const uniqueSorted = (values) => [...new Set(values.filter(Boolean))].sort(alphabetical);
export const normalizeText = (value = '') =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('it').trim();

function apply2026Corrections(rows) {
  const removed = new Set(['Lirio', 'Castegnero', 'Nanto']);
  const corrected = rows.filter((c) => !removed.has(c.name));
  if (!corrected.some((c) => c.name === 'Castegnero Nanto')) {
    corrected.push({ id: '024129', name: 'Castegnero Nanto', region: 'Veneto', province: 'Vicenza', code: 'VI', caps: [], cadastralCode: '' });
  }
  const seen = new Set();
  return corrected.filter((c) => {
    const key = `${c.id}-${c.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function normalizeDataset(raw) {
  if (!Array.isArray(raw) || raw.length < 7800) throw new Error('Elenco comuni incompleto');
  const rows = raw.map((c) => ({
    id: String(c.codice || c.id || ''),
    name: c.nome || c.name,
    region: c.regione?.nome || c.region,
    province: c.provincia?.nome || c.province,
    code: c.sigla || c.provincia?.sigla || c.code,
    caps: Array.isArray(c.cap) ? c.cap.map(String) : c.cap ? [String(c.cap)] : [],
    cadastralCode: c.codiceCatastale || c.codice_catastale || c.cadastralCode || '',
  }));
  if (rows.some((c) => !c.id || !c.name || !c.region || !c.province)) throw new Error('Formato comuni non valido');
  const corrected = apply2026Corrections(rows);
  if (new Set(corrected.map((c) => c.region)).size !== 20) throw new Error('Regioni mancanti');
  if (corrected.length < 7894) throw new Error('Dataset 2026 incompleto');
  return corrected;
}

async function fetchOne(fetcher, url, signal) {
  const response = await fetcher(url, { signal });
  if (!response.ok) throw new Error('Dataset non disponibile');
  return normalizeDataset(await response.json());
}

export async function fetchMunicipalities(fetcher = fetch, timeoutMs = 5000, externalSignal) {
  const controller = new AbortController();
  let timer;
  const abort = () => controller.abort();
  externalSignal?.addEventListener('abort', abort, { once: true });
  if (externalSignal?.aborted) controller.abort();
  try {
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new Error('Timeout comuni'));
      }, timeoutMs);
    });
    const source = Promise.any(DATASET_URLS.map((url) => fetchOne(fetcher, url, controller.signal)));
    return await Promise.race([source, timeout]);
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener('abort', abort);
  }
}

export function searchMunicipalities(rows, region, province, query = '') {
  const term = normalizeText(query);
  return rows
    .filter((c) => c.region === region && c.province === province && normalizeText(c.name).includes(term))
    .sort((a, b) => alphabetical(a.name, b.name))
    .slice(0, 80);
}

export function findCapital(rows, region, province) {
  const capitals = {
    'Monza e della Brianza': 'Monza',
    'Verbano-Cusio-Ossola': 'Verbania',
    "Valle d'Aosta/Vallée d'Aoste": 'Aosta',
    'Gallura Nord-Est Sardegna': 'Olbia',
    Ogliastra: 'Lanusei',
    'Sulcis Iglesiente': 'Carbonia',
    'Medio Campidano': 'Sanluri',
    'Forlì-Cesena': 'Forlì',
    'Massa-Carrara': 'Massa',
    'Pesaro e Urbino': 'Pesaro',
    'Barletta-Andria-Trani': 'Barletta',
    'Bolzano/Bozen': 'Bolzano',
    "Reggio nell'Emilia": "Reggio nell'Emilia",
  };
  const name = capitals[province] || province;
  return rows.find((c) => c.region === region && c.province === province && (c.name === name || c.name.startsWith(name + '/')));
}
