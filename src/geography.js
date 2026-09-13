export const DATASET_URL =
  'https://raw.githubusercontent.com/matteocontrini/comuni-json/master/comuni.json';
export const alphabetical = (a, b) => a.localeCompare(b, 'it');
export const uniqueSorted = (values) => [...new Set(values)].sort(alphabetical);
export const normalizeText = (value) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('it')
    .trim();

export function normalizeDataset(raw) {
  if (!Array.isArray(raw) || raw.length < 100) throw new Error('Elenco comuni incompleto');
  const rows = raw.map((c) => ({
    id: c.codice,
    name: c.nome,
    region: c.regione?.nome,
    province: c.provincia?.nome,
    code: c.sigla,
  }));
  if (rows.some((c) => Object.values(c).some((v) => typeof v !== 'string' || !v)))
    throw new Error('Formato comuni non valido');
  if (new Set(rows.map((c) => c.region)).size !== 20) throw new Error('Regioni mancanti');
  return rows;
}

// Race includes body parsing: even a stalled response body falls back within 5 seconds.
export async function fetchMunicipalities(fetcher = fetch, timeoutMs = 5000, externalSignal) {
  const controller = new AbortController();
  let timer;
  const abort = () => controller.abort();
  externalSignal?.addEventListener('abort', abort, { once: true });
  if (externalSignal?.aborted) controller.abort();
  try {
    return await Promise.race([
      (async () => {
        const response = await fetcher(DATASET_URL, { signal: controller.signal });
        if (!response.ok) throw new Error('Dataset non disponibile');
        return normalizeDataset(await response.json());
      })(),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error('Timeout comuni'));
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener('abort', abort);
  }
}

export function searchMunicipalities(rows, region, province, query = '') {
  const term = normalizeText(query);
  return rows
    .filter(
      (c) => c.region === region && c.province === province && normalizeText(c.name).includes(term),
    )
    .sort((a, b) => alphabetical(a.name, b.name))
    .slice(0, 80);
}

// Several provinces contain multiple capitals or use names unlike their capital.
export function findCapital(rows, region, province) {
  const capitals = {
    'Monza e della Brianza': 'Monza',
    'Verbano-Cusio-Ossola': 'Verbania',
    "Valle d'Aosta/Vallée d'Aoste": 'Aosta',
    'Sud Sardegna': 'Carbonia',
    'Forlì-Cesena': 'Forlì',
    'Massa-Carrara': 'Massa',
    'Pesaro e Urbino': 'Pesaro',
    'Barletta-Andria-Trani': 'Barletta',
    'Bolzano/Bozen': 'Bolzano',
    "Reggio nell'Emilia": "Reggio nell'Emilia",
  };
  const name = capitals[province] || province;
  return rows.find(
    (c) =>
      c.region === region &&
      c.province === province &&
      (c.name === name || c.name.startsWith(name + '/')),
  );
}
