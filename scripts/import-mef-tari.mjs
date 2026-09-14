import { mkdir, writeFile } from 'node:fs/promises';

const YEAR = Number(process.env.MEF_TARI_YEAR || new Date().getFullYear());
const BASE = 'https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/nuova_at/dati/download_csv_nuova_at.php';
const SOURCES = [
  { kind: 'delibera', tipo: 'D' },
  { kind: 'regolamento', tipo: 'R' },
];
const OUT = new URL('../src/data/mef-tari-national.json', import.meta.url);

function splitCsvLine(line) {
  const out = [];
  let value = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        value += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (ch === ';' && !quoted) {
      out.push(value.trim());
      value = '';
    } else {
      value += ch;
    }
  }
  out.push(value.trim());
  return out;
}

function parseCsv(text) {
  const clean = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = clean.split('\n').filter((line) => line.trim());
  if (!lines.length) return [];
  const headers = splitCsvLine(lines[0]).map((h, i) => h || `campo_${i + 1}`);
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
  });
}

function normalizedKey(key) {
  return key.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function pick(row, candidates) {
  const entries = Object.entries(row);
  for (const candidate of candidates) {
    const exact = entries.find(([key]) => normalizedKey(key) === candidate);
    if (exact?.[1]) return exact[1];
  }
  for (const candidate of candidates) {
    const fuzzy = entries.find(([key]) => normalizedKey(key).includes(candidate));
    if (fuzzy?.[1]) return fuzzy[1];
  }
  return '';
}

function isTari(row) {
  const haystack = Object.values(row).join(' ').toUpperCase();
  return /\bTARI\b|TASSA\s+SUI\s+RIFIUTI|TASSA\s+RIFIUTI|TARES|TARSU/.test(haystack);
}

function normalizeRow(row, kind) {
  const sourceUrl = pick(row, ['url', 'link', 'download', 'documento', 'atto']);
  const comune = pick(row, ['comune', 'denominazionecomune', 'denominazione']);
  const provincia = pick(row, ['provincia', 'siglaprovincia']);
  const regione = pick(row, ['regione']);
  const codice = pick(row, ['codicecatastale', 'codicecomune', 'codiceente', 'codice']);
  const data = pick(row, ['dataatto', 'datadelibera', 'data']);
  const numero = pick(row, ['numeroatto', 'numerodelibera', 'numero']);
  const oggetto = pick(row, ['oggetto', 'descrizione', 'titolo']);

  return {
    year: YEAR,
    kind,
    comune,
    provincia,
    regione,
    codice,
    data,
    numero,
    oggetto,
    sourceUrl,
    status: 'OFFICIAL_DOC_FOUND_UNPARSED',
    source: 'MEF_DIPARTIMENTO_FINANZE',
    raw: row,
  };
}

async function fetchCsv(tipo) {
  const url = `${BASE}?anno=${YEAR}&tipo=${tipo}`;
  const response = await fetch(url, {
    headers: {
      'user-agent': 'BonusFatto/1.0 (+https://bonusfatto.it)',
      accept: 'text/csv,application/csv,text/plain,*/*',
    },
    redirect: 'follow',
  });
  if (!response.ok) throw new Error(`MEF ${tipo}: HTTP ${response.status}`);
  const text = await response.text();
  if (!text.trim()) throw new Error(`MEF ${tipo}: risposta vuota`);
  return { url, rows: parseCsv(text) };
}

const documents = [];
const sourceStats = [];

for (const source of SOURCES) {
  const { url, rows } = await fetchCsv(source.tipo);
  const tariRows = rows.filter(isTari);
  documents.push(...tariRows.map((row) => normalizeRow(row, source.kind)));
  sourceStats.push({ kind: source.kind, url, totalRows: rows.length, tariRows: tariRows.length });
}

const unique = new Map();
for (const doc of documents) {
  const key = [doc.kind, doc.codice, doc.comune, doc.data, doc.numero, doc.oggetto, doc.sourceUrl]
    .map((v) => String(v || '').trim().toLowerCase())
    .join('|');
  if (!unique.has(key)) unique.set(key, doc);
}

const sorted = [...unique.values()].sort((a, b) =>
  `${a.regione}|${a.provincia}|${a.comune}|${a.kind}|${a.data}`.localeCompare(
    `${b.regione}|${b.provincia}|${b.comune}|${b.kind}|${b.data}`,
    'it',
  ),
);

const municipalities = new Set(sorted.map((d) => `${d.codice || ''}|${d.comune}`).filter((v) => v !== '|'));
const regions = new Set(sorted.map((d) => d.regione).filter(Boolean));

const payload = {
  schemaVersion: 1,
  year: YEAR,
  generatedAt: new Date().toISOString(),
  source: 'MEF - Dipartimento delle Finanze, Fiscalità locale, altri tributi comunali',
  sourcePage: `https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/nuova_at/dati/download.htm?anno=${YEAR}`,
  sourceStats,
  stats: {
    documents: sorted.length,
    municipalities: municipalities.size,
    regions: regions.size,
  },
  note: 'Indice nazionale automatico degli atti MEF candidati TARI. Lo stato OFFICIAL_DOC_FOUND_UNPARSED indica fonte ufficiale presente ma contenuto non ancora interpretato ai fini di riduzioni/ISEE.',
  documents: sorted,
};

await mkdir(new URL('../src/data/', import.meta.url), { recursive: true });
await writeFile(OUT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`MEF TARI ${YEAR}: ${payload.stats.documents} atti, ${payload.stats.municipalities} comuni, ${payload.stats.regions} regioni.`);
