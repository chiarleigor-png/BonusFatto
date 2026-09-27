import { createRequire } from 'node:module';
import pdfParse from 'pdf-parse';

const require = createRequire(import.meta.url);
const top100 = require('./top100Comuni.json');

const MEF_HOST = 'www1.finanze.gov.it';
const MAX_PDFS_PER_COMUNE = 8;
const MAX_RAW_TEXT = 120000;

function requireEnv(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`Variabile ambiente mancante: ${name}`);
  return value;
}

function clean(value, max = 1000) {
  return String(value ?? '').trim().slice(0, max);
}

function htmlDecode(value = '') {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function stripHtml(value = '') {
  return htmlDecode(String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim());
}

function isPdfBuffer(buffer) {
  return Buffer.from(buffer).subarray(0, 5).toString('ascii') === '%PDF-';
}

function candidateLinks(pageHtml, pageUrl) {
  const out = [];
  const seen = new Set();
  const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = re.exec(pageHtml))) {
    const href = htmlDecode(match[1]).trim();
    const label = stripHtml(match[2]);
    let absolute;
    try { absolute = new URL(href, pageUrl); } catch { continue; }
    if (absolute.hostname !== MEF_HOST) continue;
    const hay = `${absolute.href} ${label}`.toLowerCase();
    if (!/(\.pdf(?:$|\?)|pdf|download|scarica|delibera|regolamento|tari|rifiuti)/i.test(hay)) continue;
    if (seen.has(absolute.href)) continue;
    seen.add(absolute.href);
    out.push({
      url: absolute.href,
      label,
      score:
        (/2026/.test(hay) ? 5 : 0) +
        (/tari|rifiuti/.test(hay) ? 4 : 0) +
        (/delibera|regolamento/.test(hay) ? 3 : 0) +
        (/tariff/.test(hay) ? 2 : 0) +
        (/\.pdf(?:$|\?)/.test(hay) ? 2 : 0),
    });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 30);
}

async function fetchPdfCandidates(comune) {
  const response = await fetch(comune.url_mef, {
    redirect: 'follow',
    headers: {
      accept: 'text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.7',
      'user-agent': 'BonusFatto/2.0 (+https://bonusfatto.it)',
    },
  });
  if (!response.ok) throw new Error(`MEF page HTTP ${response.status}`);

  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  const firstBuffer = Buffer.from(await response.arrayBuffer());
  if (contentType.includes('application/pdf') || isPdfBuffer(firstBuffer)) {
    return [{ url: response.url || comune.url_mef, buffer: firstBuffer }];
  }

  const pageHtml = firstBuffer.toString('utf8');
  const links = candidateLinks(pageHtml, response.url || comune.url_mef);
  const pdfs = [];

  for (const link of links) {
    if (pdfs.length >= MAX_PDFS_PER_COMUNE) break;
    try {
      const r = await fetch(link.url, {
        redirect: 'follow',
        headers: {
          accept: 'application/pdf,text/html;q=0.8,*/*;q=0.5',
          referer: comune.url_mef,
          'user-agent': 'BonusFatto/2.0 (+https://bonusfatto.it)',
        },
      });
      if (!r.ok) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      const type = String(r.headers.get('content-type') || '').toLowerCase();
      if (type.includes('application/pdf') || isPdfBuffer(buf)) {
        pdfs.push({ url: r.url || link.url, buffer: buf });
      }
    } catch {
      // Un singolo allegato non deve bloccare il Comune.
    }
  }
  return pdfs;
}

async function pdfText(pdfs) {
  const parts = [];
  for (const item of pdfs) {
    try {
      const parsed = await pdfParse(item.buffer);
      const text = String(parsed?.text || '').replace(/\u0000/g, ' ').trim().slice(0, 80000);
      if (text) parts.push(`FONTE PDF: ${item.url}\n${text}`);
    } catch {
      // PDF scansito o non parseabile: si prova il documento successivo.
    }
  }
  return parts.join('\n\n----- DOCUMENTO SUCCESSIVO -----\n\n').slice(0, MAX_RAW_TEXT);
}

function normalizeDate(value) {
  const s = clean(value, 20);
  return /^2026-\d{2}-\d{2}$/.test(s) ? s : null;
}

function normalizePercent(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
}

async function extractWithOpenAI(comune, rawText, sourceUrls) {
  const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) {
    return {
      scadenza_rata_1: null,
      scadenza_rata_2: null,
      riduzione_isee_9796: null,
      verified: false,
      note: 'OPENAI_API_KEY non configurata: testo MEF acquisito ma non estratto.',
    };
  }

  const prompt = [
    'Analizza ESCLUSIVAMENTE il testo estratto dai documenti ufficiali MEF TARI 2026 riportato sotto.',
    'Non usare conoscenze esterne e non inventare dati mancanti.',
    'Restituisci JSON con queste chiavi esatte:',
    'scadenza_rata_1: prima scadenza di pagamento TARI 2026 in formato YYYY-MM-DD oppure null;',
    'scadenza_rata_2: seconda scadenza di pagamento TARI 2026 in formato YYYY-MM-DD oppure null;',
    'riduzione_isee_9796: percentuale numerica della riduzione/esenzione TARI COMUNALE esplicitamente applicabile a un ISEE di 9.796 euro, oppure null;',
    'verified: true soltanto se almeno uno dei valori restituiti è esplicitamente supportato dal testo; false altrimenti;',
    'note: massimo 300 caratteri, descrivi brevemente l’evidenza trovata.',
    'Se il documento parla solo del bonus sociale nazionale del 25%, NON trattarlo come riduzione comunale.',
    `Comune: ${comune.nome} (${comune.istat}), provincia ${comune.provincia}.`,
    `Fonti PDF: ${sourceUrls.join(' | ')}`,
    'TESTO:',
    rawText.slice(0, 60000),
  ].join('\n\n');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'Sei un estrattore conservativo di dati amministrativi italiani. Restituisci soltanto ciò che è sostenuto dal testo fornito.',
        },
        { role: 'user', content: prompt },
      ],
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`OpenAI HTTP ${response.status}: ${clean(data?.error?.message || '', 300)}`);
  let parsed = {};
  try { parsed = JSON.parse(data?.choices?.[0]?.message?.content || '{}'); } catch {}

  const result = {
    scadenza_rata_1: normalizeDate(parsed.scadenza_rata_1),
    scadenza_rata_2: normalizeDate(parsed.scadenza_rata_2),
    riduzione_isee_9796: normalizePercent(parsed.riduzione_isee_9796),
    verified: Boolean(parsed.verified),
    note: clean(parsed.note || '', 300),
  };
  result.verified = result.verified && Boolean(
    result.scadenza_rata_1 || result.scadenza_rata_2 || result.riduzione_isee_9796 !== null
  );
  return result;
}

async function supabaseUpsert(row) {
  const supabaseUrl = requireEnv('SUPABASE_URL').replace(/\/$/, '');
  const key = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const response = await fetch(`${supabaseUrl}/rest/v1/comuni_tari?on_conflict=istat`, {
    method: 'POST',
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
      prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(row),
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Supabase upsert HTTP ${response.status}: ${body.slice(0, 400)}`);
  return body ? JSON.parse(body) : [];
}

export function municipalityByIstat(istat) {
  return top100.find((item) => item.istat === String(istat || '').padStart(6, '0')) || null;
}

export function top100Municipalities() {
  return top100;
}

export async function scrapeComune(comune) {
  if (!comune?.istat || !comune?.url_mef) throw new Error('Comune non valido');
  const pdfs = await fetchPdfCandidates(comune);
  const rawText = await pdfText(pdfs);

  let extracted = {
    scadenza_rata_1: null,
    scadenza_rata_2: null,
    riduzione_isee_9796: null,
    verified: false,
    note: '',
  };

  if (rawText.trim()) extracted = await extractWithOpenAI(comune, rawText, pdfs.map((p) => p.url));

  const row = {
    istat: comune.istat,
    comune: comune.nome,
    provincia: comune.provincia,
    scadenza_rata_1: extracted.scadenza_rata_1,
    scadenza_rata_2: extracted.scadenza_rata_2,
    riduzione_isee_9796: extracted.riduzione_isee_9796,
    url_fonte: pdfs[0]?.url || comune.url_mef,
    raw_text: `${extracted.note ? `[estrazione] ${extracted.note}\n\n` : ''}${rawText || '[Nessun PDF MEF leggibile individuato automaticamente]'}`.slice(0, MAX_RAW_TEXT),
    verified: Boolean(extracted.verified && rawText),
  };

  await supabaseUpsert(row);
  return { ...row, raw_text: undefined, pdf_count: pdfs.length };
}

export async function scrapeBatch(comuni, concurrency = 4) {
  const queue = [...comuni];
  const results = [];
  async function worker() {
    while (queue.length) {
      const comune = queue.shift();
      if (!comune) return;
      try {
        results.push({ ok: true, ...(await scrapeComune(comune)) });
      } catch (error) {
        results.push({
          ok: false,
          istat: comune.istat,
          comune: comune.nome,
          error: clean(error?.message || error, 500),
        });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(1, comuni.length)) }, () => worker()));
  return results;
}
