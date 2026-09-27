const SUPABASE_URL = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '');

function assertConfig() {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Supabase non configurato.');
}

function headers(extra = {}) {
  assertConfig();
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

export async function getComuneTari(istat) {
  assertConfig();
  const url = `${SUPABASE_URL}/rest/v1/comuni_tari?istat=eq.${encodeURIComponent(istat)}&select=istat,comune,provincia,scadenza_rata_1,scadenza_rata_2,riduzione_isee_9796,url_fonte,raw_text,verified`;
  const response = await fetch(url, { headers: headers() });
  if (!response.ok) {
    const detail = await response.text();
    const error = new Error(`Supabase comuni_tari GET failed: ${response.status} ${detail.slice(0, 300)}`);
    error.status = response.status;
    throw error;
  }
  const rows = await response.json();
  return Array.isArray(rows) ? rows[0] || null : null;
}

export async function upsertComuneTari(row) {
  assertConfig();
  const response = await fetch(`${SUPABASE_URL}/rest/v1/comuni_tari?on_conflict=istat`, {
    method: 'POST',
    headers: headers({ Prefer: 'resolution=merge-duplicates,return=representation' }),
    body: JSON.stringify(row),
  });
  if (!response.ok) {
    const detail = await response.text();
    const error = new Error(`Supabase comuni_tari UPSERT failed: ${response.status} ${detail.slice(0, 500)}`);
    error.status = response.status;
    throw error;
  }
  const rows = await response.json().catch(() => []);
  return Array.isArray(rows) ? rows[0] || row : row;
}
