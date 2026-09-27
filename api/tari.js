function clean(value, max = 1000) {
  return String(value ?? '').trim().slice(0, max);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }
  const raw = Array.isArray(req.query?.istat) ? req.query.istat[0] : req.query?.istat;
  const istat = clean(raw, 6);
  if (!/^\d{6}$/.test(istat)) return res.status(400).json({ ok: false, error: 'ISTAT_INVALIDO' });

  const supabaseUrl = clean(process.env.SUPABASE_URL, 600).replace(/\/$/, '');
  const key = clean(process.env.SUPABASE_SERVICE_ROLE_KEY, 1200);
  if (!supabaseUrl || !key) return res.status(503).json({ ok: false, error: 'TARI_DB_NOT_CONFIGURED' });

  const response = await fetch(
    `${supabaseUrl}/rest/v1/comuni_tari?istat=eq.${encodeURIComponent(istat)}&select=istat,comune,provincia,scadenza_rata_1,scadenza_rata_2,riduzione_isee_9796,url_fonte,verified&limit=1`,
    { headers: { apikey: key, authorization: `Bearer ${key}` } },
  );
  const rows = await response.json().catch(() => []);
  if (!response.ok) return res.status(502).json({ ok: false, error: 'TARI_DB_ERROR' });

  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).json({ ok: true, data: Array.isArray(rows) ? rows[0] || null : null });
}
