const YEAR = Number(process.env.MEF_TARI_YEAR || new Date().getFullYear());
const BASE = 'https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/nuova_at/dati/download_csv_nuova_at.php';

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
      } else quoted = !quoted;
    } else if (ch === ';' && !quoted) {
      out.push(value.trim());
      value = '';
    } else value += ch;
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

function norm(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function pick(row, candidates) {
  const entries = Object.entries(row);
  for (const candidate of candidates) {
    const exact = entries.find(([key]) => norm(key) === candidate);
    if (exact?.[1]) return exact[1];
  }
  for (const candidate of candidates) {
    const fuzzy = entries.find(([key]) => norm(key).includes(candidate));
    if (fuzzy?.[1]) return fuzzy[1];
  }
  return '';
}

function isTari(row) {
  const haystack = Object.values(row).join(' ').toUpperCase();
  return /\bTARI\b|TASSA\s+SUI\s+RIFIUTI|TASSA\s+RIFIUTI|TARES|TARSU/.test(haystack);
}

function normalizeRow(row, kind) {
  return {
    year: YEAR,
    kind,
    comune: pick(row, ['comune', 'denominazionecomune', 'denominazione']),
    provincia: pick(row, ['provincia', 'siglaprovincia']),
    regione: pick(row, ['regione']),
    codice: pick(row, ['codicecatastale', 'codicecomune', 'codiceente', 'codice']),
    data: pick(row, ['dataatto', 'datadelibera', 'data']),
    numero: pick(row, ['numeroatto', 'numerodelibera', 'numero']),
    oggetto: pick(row, ['oggetto', 'descrizione', 'titolo']),
    sourceUrl: pick(row, ['url', 'link', 'download', 'documento', 'atto']),
    status: 'OFFICIAL_DOC_FOUND_UNPARSED',
    source: 'MEF_DIPARTIMENTO_FINANZE',
  };
}

async function load(tipo, kind) {
  const url = `${BASE}?anno=${YEAR}&tipo=${tipo}`;
  const response = await fetch(url, {
    headers: {
      accept: 'text/csv,application/csv,text/plain,*/*',
      'user-agent': 'BonusFatto/1.0 (+https://bonusfatto.it)',
    },
  });
  if (!response.ok) throw new Error(`MEF ${tipo}: HTTP ${response.status}`);
  const rows = parseCsv(await response.text());
  return rows.filter(isTari).map((row) => normalizeRow(row, kind));
}

export default async function handler(req, res) {
  try {
    const [delibere, regolamenti] = await Promise.all([
      load('D', 'delibera'),
      load('R', 'regolamento'),
    ]);
    const all = [...delibere, ...regolamenti];
    const comune = norm(req.query?.comune);
    const codice = norm(req.query?.codice);
    const regione = norm(req.query?.regione);
    const limit = Math.min(Math.max(Number(req.query?.limit || 100), 1), 500);

    const filtered = all.filter((doc) => {
      if (comune && !norm(doc.comune).includes(comune)) return false;
      if (codice && norm(doc.codice) !== codice) return false;
      if (regione && !norm(doc.regione).includes(regione)) return false;
      return true;
    });

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    res.status(200).json({
      ok: true,
      year: YEAR,
      source: 'MEF - Dipartimento delle Finanze',
      sourcePage: `https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/nuova_at/dati/download.htm?anno=${YEAR}`,
      stats: {
        tariDocuments: all.length,
        delibere: delibere.length,
        regolamenti: regolamenti.length,
        matched: filtered.length,
      },
      filters: { comune: req.query?.comune || null, codice: req.query?.codice || null, regione: req.query?.regione || null },
      documents: filtered.slice(0, limit),
    });
  } catch (error) {
    res.status(502).json({ ok: false, error: 'MEF_TARI_IMPORT_FAILED', detail: error.message });
  }
}
