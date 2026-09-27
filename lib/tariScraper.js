import { createRequire } from 'node:module';
import pdfParse from 'pdf-parse';
import { upsertComuneTari } from './tariDb.js';

const require = createRequire(import.meta.url);
const top100 = require('./top100Comuni.json');

const USER_AGENT = 'BonusFatto/2.0 (+https://bonusfatto.it; motore TARI MEF)';
const MAX_PDF_BYTES = 15 * 1024 * 1024;
const MAX_TEXT_CHARS = 60000;

export function getTop100Comuni() {
  return top100;
}

function normalize(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function absoluteUrl(href, base) {
  try {
    const url = new URL(href, base);
    if (!/(^|\.)finanze\.gov\.it$/i.test(url.hostname)) return null;
    return url.href;
  } catch {
    return null;
  }
}

function extractLinks(html, baseUrl) {
  const out = [];
  const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = re.exec(html))) {
    const url = absoluteUrl(match[1], baseUrl);
    if (!url) continue;
    const label = match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    out.push({ url, label });
  }
  return out;
}

function scoreCandidate(item) {
  const hay = normalize(`${item.url} ${item.label}`);
  let score = 0;
  if (/\.pdf(?:$|[?#])/i.test(item.url)) score += 100;
  if (hay.includes('2026')) score += 30;
  if (hay.includes('tari')) score += 25;
  if (hay.includes('delibera')) score += 15;
  if (hay.includes('tariff')) score += 12;
  if (hay.includes('regolamento')) score += 8;
  if (hay.includes('download') || hay.includes('document')) score += 6;
  return score;
}

async function fetchPortal(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/pdf;q=0.9,*/*;q=0.8' },
  });
  if (!response.ok) throw new Error(`MEF HTTP ${response.status} su ${url}`);
  return response;
}

async function discoverPdfUrls(entry) {
  const seen = new Set();
  const pdfs = [];
  const landing = await fetchPortal(entry.url_mef);
  const contentType = String(landing.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('application/pdf')) return [landing.url || entry.url_mef];

  const html = await landing.text();
  const firstLinks = extractLinks(html, landing.url || entry.url_mef)
    .sort((a, b) => scoreCandidate(b) - scoreCandidate(a))
    .slice(0, 24);

  for (const item of firstLinks) {
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    if (/\.pdf(?:$|[?#])/i.test(item.url)) {
      pdfs.push(item.url);
      continue;
    }
    if (scoreCandidate(item) < 10) continue;
    try {
      const response = await fetchPortal(item.url);
      const type = String(response.headers.get('content-type') || '').toLowerCase();
      if (type.includes('application/pdf')) {
        pdfs.push(response.url || item.url);
        continue;
      }
      if (!type.includes('text/html')) continue;
      const nestedHtml = await response.text();
      const nested = extractLinks(nestedHtml, response.url || item.url)
        .filter((x) => /\.pdf(?:$|[?#])/i.test(x.url) || scoreCandidate(x) >= 20)
        .sort((a, b) => scoreCandidate(b) - scoreCandidate(a))
        .slice(0, 12);
      for (const nestedItem of nested) {
        if (/\.pdf(?:$|[?#])/i.test(nestedItem.url) && !pdfs.includes(nestedItem.url)) pdfs.push(nestedItem.url);
      }
    } catch {}
    if (pdfs.length >= 6) break;
  }
  return pdfs.slice(0, 6);
}

async function readPdf(url) {
  const response = await fetchPortal(url);
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > MAX_PDF_BYTES) throw new Error('PDF MEF troppo grande.');
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_PDF_BYTES) throw new Error('PDF MEF troppo grande.');
  const parsed = await pdfParse(buffer);
  return {
    url: response.url || url,
    text: String(parsed?.text || '').replace(/\u0000/g, ' ').replace(/[ \t]+/g, ' ').trim(),
  };
}

function isoDate(value) {
  if (!value) return null;
  const s = String(value).trim();
  return /^2026-\d{2}-\d{2}$/.test(s) ? s : null;
}

function percent(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
}

async function extractWithOpenAI(entry, rawText, sourceUrl) {
  const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) throw new Error('OPENAI_API_KEY non configurata.');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Sei un estrattore documentale. Restituisci solo dati esplicitamente presenti nel testo. Se un dato non è espresso chiaramente, usa null. Non inferire e non usare conoscenza esterna.' },
        { role: 'user', content: `Comune: ${entry.nome} (${entry.istat}), provincia ${entry.provincia}. Fonte: portale MEF.
Estrai dal testo TARI 2026:
- scadenza_rata_1: prima scadenza di pagamento TARI 2026, ISO YYYY-MM-DD oppure null;
- scadenza_rata_2: seconda scadenza di pagamento TARI 2026, ISO YYYY-MM-DD oppure null;
- riduzione_isee_9796: percentuale di riduzione/esenzione COMUNALE applicabile a un ISEE pari a 9.796 euro, soltanto se la fascia che comprende 9.796 è esplicita; numero 0-100 oppure null;
- verified: true solo se almeno uno dei tre dati è sostenuto chiaramente dal testo;
- note: massimo 300 caratteri con breve spiegazione dell'evidenza.
Non confondere la riduzione nazionale del 25% con le riduzioni comunali.
URL documento: ${sourceUrl}

TESTO:
${rawText.slice(0, MAX_TEXT_CHARS)}` }
      ],
    }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message || `OpenAI HTTP ${response.status}`);
  let parsed = {};
  try { parsed = JSON.parse(payload?.choices?.[0]?.message?.content || '{}'); } catch {}
  return {
    scadenza_rata_1: isoDate(parsed.scadenza_rata_1),
    scadenza_rata_2: isoDate(parsed.scadenza_rata_2),
    riduzione_isee_9796: percent(parsed.riduzione_isee_9796),
    verified: Boolean(parsed.verified),
    note: String(parsed.note || '').slice(0, 300),
  };
}

export async function scrapeComune(entry) {
  const pdfUrls = await discoverPdfUrls(entry);
  if (!pdfUrls.length) {
    return upsertComuneTari({
      istat: entry.istat, comune: entry.nome, provincia: entry.provincia,
      scadenza_rata_1: null, scadenza_rata_2: null, riduzione_isee_9796: null,
      url_fonte: entry.url_mef,
      raw_text: 'Nessun PDF TARI 2026 individuato automaticamente nel portale MEF alla data del controllo.',
      verified: false,
    });
  }

  const docs = [];
  for (const url of pdfUrls) {
    try {
      const doc = await readPdf(url);
      if (doc.text) docs.push(doc);
    } catch {}
  }
  if (!docs.length) {
    return upsertComuneTari({
      istat: entry.istat, comune: entry.nome, provincia: entry.provincia,
      scadenza_rata_1: null, scadenza_rata_2: null, riduzione_isee_9796: null,
      url_fonte: pdfUrls[0] || entry.url_mef,
      raw_text: 'PDF individuati sul portale MEF ma testo non estraibile automaticamente.',
      verified: false,
    });
  }

  const combined = docs
    .map((doc, index) => `--- DOCUMENTO ${index + 1}: ${doc.url} ---\n${doc.text}`)
    .join('\n\n').slice(0, MAX_TEXT_CHARS);
  const primarySource = docs[0].url;
  const extracted = await extractWithOpenAI(entry, combined, primarySource);
  const verified = extracted.verified && Boolean(
    extracted.scadenza_rata_1 || extracted.scadenza_rata_2 || extracted.riduzione_isee_9796 !== null
  );

  return upsertComuneTari({
    istat: entry.istat, comune: entry.nome, provincia: entry.provincia,
    scadenza_rata_1: extracted.scadenza_rata_1,
    scadenza_rata_2: extracted.scadenza_rata_2,
    riduzione_isee_9796: extracted.riduzione_isee_9796,
    url_fonte: primarySource,
    raw_text: `${extracted.note ? `[AI] ${extracted.note}\n\n` : ''}${combined}`.slice(0, MAX_TEXT_CHARS),
    verified,
  });
}

export function batchForToday(size = 20, date = new Date()) {
  const groups = Math.ceil(top100.length / size);
  const epochDay = Math.floor(date.getTime() / 86400000);
  const group = ((epochDay % groups) + groups) % groups;
  const start = group * size;
  return { group, start, comuni: top100.slice(start, start + size) };
}

export async function scrapeBatch(entries, concurrency = 4) {
  const queue = [...entries];
  const results = [];
  async function worker() {
    while (queue.length) {
      const entry = queue.shift();
      if (!entry) break;
      try {
        const row = await scrapeComune(entry);
        results.push({ istat: entry.istat, comune: entry.nome, ok: true, verified: Boolean(row?.verified) });
      } catch (error) {
        results.push({ istat: entry.istat, comune: entry.nome, ok: false, error: error?.message || String(error) });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, entries.length || 1) }, () => worker()));
  return results;
}
