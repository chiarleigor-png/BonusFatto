import top100 from '../../lib/top100Comuni.json' with { type: 'json' };

function clean(value, max = 500) {
  return String(value ?? '').trim().slice(0, max);
}

function env(name) {
  return clean(process.env[name], 1000);
}

export default async function handler(req, res) {
  const raw = Array.isArray(req.query?.istat) ? req.query.istat[0] : req.query?.istat;
  const istat = clean(raw, 6);
  if (!/^\d{6}$/.test(istat)) return res.status(400).json({ ok: false, error: 'ISTAT_INVALIDO' });

  const comune = top100.find((item) => item.istat === istat);
  if (!comune) return res.status(404).json({ ok: false, error: 'COMUNE_NON_IN_TOP100' });

  const supabaseUrl = env('SUPABASE_URL').replace(/\/$/, '');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !key) return res.status(503).json({ ok: false, error: 'TARI_DB_NOT_CONFIGURED' });

  const response = await fetch(
    `${supabaseUrl}/rest/v1/comuni_tari?istat=eq.${encodeURIComponent(istat)}&select=istat,comune,provincia,scadenza_rata_1,scadenza_rata_2,riduzione_isee_9796,url_fonte,verified&limit=1`,
    { headers: { apikey: key, authorization: `Bearer ${key}` } }
  );
  const rows = await response.json().catch(() => []);
  if (!response.ok) return res.status(502).json({ ok: false, error: 'TARI_DB_ERROR' });

  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  const data = Array.isArray(rows) ? rows[0] || null : null;
  return res.status(200).json({
    ok: true,
    available: Boolean(data),
    comune: { nome: comune.nome, istat: comune.istat, provincia: comune.provincia, regione: comune.regione, url_mef: comune.url_mef },
    data
  });
}
