import {
  countRows,
  getPending,
  isSupabaseConfigured,
  updateMunicipality,
  upsertMunicipalities,
} from '../../lib/tari/supabase.js';
import { fetchTariForMunicipality } from '../../lib/tari/mef.js';

const COMUNI_URL = 'https://raw.githubusercontent.com/matteocontrini/comuni-json/master/comuni.json';
const BATCH_SIZE = 500;
const CONCURRENCY = 12;

function authorized(req) {
  const secret = String(process.env.CRON_SECRET || '');
  if (!secret) return false;
  const auth = String(req.headers.authorization || '');
  return auth === `Bearer ${secret}`;
}

function normalizeComune(c) {
  return {
    istat: String(c.codice || c.istat || '').trim(),
    nome: String(c.nome || '').trim(),
    provincia: String(c.sigla || c.provincia?.codice || c.provincia?.nome || '').trim(),
    regione: String(c.regione?.nome || c.regione || '').trim(),
    codice_catastale: String(c.codiceCatastale || c.codice_catastale || '').trim().toUpperCase(),
    status: 'pending',
    attempts: 0,
    source_label: 'MEF - Fiscalità locale - TARI 2026',
  };
}

async function ensureSeeded() {
  const count = await countRows();
  if (count >= 7800) return { seeded: false, count };

  const response = await fetch(COMUNI_URL, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Comuni source HTTP ${response.status}`);
  const source = await response.json();
  const rows = source.map(normalizeComune).filter((c) => c.istat && c.nome && c.codice_catastale);

  for (let i = 0; i < rows.length; i += 500) {
    await upsertMunicipalities(rows.slice(i, i + 500));
  }
  return { seeded: true, count: rows.length };
}

async function worker(queue, stats) {
  while (queue.length) {
    const row = queue.shift();
    if (!row) return;
    try {
      const attemptsBefore = Number(row.attempts || 0);
      const result = await fetchTariForMunicipality(row);
      const attempts = attemptsBefore + 1;
      if (attemptsBefore > 0) stats.retried += 1;
      if (result.found) {
        await updateMunicipality(row.istat, {
          status: 'found',
          attempts,
          mef_url: result.mefUrl,
          documents: result.documents,
          mef_publication_date: result.publicationDate,
          last_checked_at: new Date().toISOString(),
          last_error: null,
        });
        stats.found += 1;
      } else {
        const finalNoDocument = result.reason === 'missing_codice_catastale' || attempts >= 3;
        await updateMunicipality(row.istat, {
          status: finalNoDocument ? 'no_document' : 'pending',
          attempts,
          mef_url: result.mefUrl || null,
          documents: result.documents || [],
          last_checked_at: new Date().toISOString(),
          last_error: result.reason || 'tari_not_found',
        });
        stats.notFound += 1;
        if (finalNoDocument) stats.noDocument += 1;
      }
    } catch (error) {
      await updateMunicipality(row.istat, {
        status: 'error',
        attempts: Number(row.attempts || 0) + 1,
        last_checked_at: new Date().toISOString(),
        last_error: String(error?.message || error).slice(0, 500),
      }).catch(() => {});
      stats.errors += 1;
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Metodo non consentito' });
  }
  if (!authorized(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (!isSupabaseConfigured()) {
    return res.status(503).json({
      error: 'Supabase non configurato',
      required: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'CRON_SECRET'],
    });
  }

  const startedAt = Date.now();
  try {
    const seed = await ensureSeeded();
    const requestedLimit = Math.min(
      Math.max(Number(req.query?.limit || BATCH_SIZE) || BATCH_SIZE, 1),
      BATCH_SIZE,
    );
    const pending = await getPending(requestedLimit);
    const queue = [...pending];
    const stats = {
      requested: pending.length,
      found: 0,
      notFound: 0,
      noDocument: 0,
      retried: 0,
      errors: 0,
    };

    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, queue.length || 1) }, () => worker(queue, stats)),
    );

    return res.status(200).json({
      ok: true,
      seed,
      batchSize: requestedLimit,
      concurrency: CONCURRENCY,
      ...stats,
      durationMs: Date.now() - startedAt,
      nextRun: 'nightly',
    });
  } catch (error) {
    console.error('[TARI_INGEST_CRON]', error);
    return res.status(500).json({ error: String(error?.message || error) });
  }
}
