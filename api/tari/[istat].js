import { createRequire } from 'node:module';
import { getComuneTari } from '../../lib/tariDb.js';

const require = createRequire(import.meta.url);
const top100 = require('../../lib/top100Comuni.json');
const byIstat = new Map(top100.map((item) => [String(item.istat), item]));

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Metodo non consentito.' });
  }
  const istat = String(req.query?.istat || '').trim();
  if (!/^\d{6}$/.test(istat) || !byIstat.has(istat)) {
    return res.status(404).json({ ok: false, supported: false, error: 'Comune non presente nel motore TARI Top 100.' });
  }
  const source = byIstat.get(istat);
  try {
    const row = await getComuneTari(istat);
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({
      ok: true, supported: true, istat,
      comune: source.nome, provincia: source.provincia, url_mef: source.url_mef,
      data: row || { istat, comune: source.nome, provincia: source.provincia, scadenza_rata_1: null, scadenza_rata_2: null, riduzione_isee_9796: null, url_fonte: source.url_mef, verified: false },
      status: row?.verified ? 'verified' : 'pending',
    });
  } catch (error) {
    console.error('TARI API failed', error?.message || error);
    return res.status(503).json({ ok: false, supported: true, istat, comune: source.nome, url_mef: source.url_mef, status: 'database_unavailable', error: 'Dati TARI temporaneamente non disponibili.' });
  }
}
