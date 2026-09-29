const TABLE = 'tari_comuni_ingest';

function cfg() {
  const url = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '');
  if (!url || !key) return null;
  return { url, key };
}

async function request(path, options = {}) {
  const config = cfg();
  if (!config) throw new Error('SUPABASE_NOT_CONFIGURED');

  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Supabase ${response.status}: ${body.slice(0, 300)}`);
  }

  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export function isSupabaseConfigured() {
  return Boolean(cfg());
}

export async function countRows() {
  const config = cfg();
  if (!config) throw new Error('SUPABASE_NOT_CONFIGURED');

  const response = await fetch(`${config.url}/rest/v1/${TABLE}?select=istat&limit=1`, {
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      Prefer: 'count=exact',
      Range: '0-0',
    },
  });
  if (!response.ok) throw new Error(`Supabase count ${response.status}`);
  const range = response.headers.get('content-range') || '*/0';
  return Number(range.split('/')[1] || 0);
}

export async function upsertMunicipalities(rows) {
  if (!rows.length) return;
  return request(`${TABLE}?on_conflict=istat`, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(rows),
  });
}

export async function getPending(limit = 500) {
  const safeLimit = Math.min(Math.max(Number(limit) || 500, 1), 500);
  return request(
    `${TABLE}?select=istat,nome,provincia,regione,codice_catastale,status,attempts&status=in.(pending,error)&order=attempts.asc,updated_at.asc&limit=${safeLimit}`,
  );
}

export async function updateMunicipality(istat, patch) {
  return request(`${TABLE}?istat=eq.${encodeURIComponent(istat)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
  });
}

export async function getByIstat(istat) {
  const rows = await request(
    `${TABLE}?select=istat,nome,provincia,regione,status,mef_url,documents,scadenza,riduzione,source_label,last_checked_at&istat=eq.${encodeURIComponent(istat)}&limit=1`,
  );
  return Array.isArray(rows) ? rows[0] || null : null;
}
