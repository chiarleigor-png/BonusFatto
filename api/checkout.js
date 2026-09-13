function getOrigin(req) {
  if (req.headers.origin) return req.headers.origin;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${host}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { plan, comune, isee, figli, billing } = req.body || {};
  if (!['base', 'report', 'whatsapp', 'tari'].includes(plan)) return res.status(400).json({ error: 'Piano non valido.' });

  const iseeNumber = Number(isee);
  const childrenNumber = Number(figli);
  if (!comune || !Number.isFinite(iseeNumber) || !Number.isInteger(childrenNumber)) {
    return res.status(400).json({ error: 'Dati del calcolo non validi.' });
  }

  const safeBilling = billing && typeof billing === 'object' ? {
    email: String(billing.email || '').slice(0, 160),
    nome: String(billing.nome || '').slice(0, 100),
    cognome: String(billing.cognome || '').slice(0, 100),
    codiceFiscale: String(billing.codiceFiscale || '').slice(0, 16),
    indirizzo: String(billing.indirizzo || '').slice(0, 200),
    cap: String(billing.cap || '').slice(0, 5),
    comuneFatturazione: String(billing.comuneFatturazione || '').slice(0, 120),
    provincia: String(billing.provincia || '').slice(0, 2),
    pec: String(billing.pec || '').slice(0, 160),
    whatsapp: String(billing.whatsapp || '').slice(0, 30),
    waConsent: Boolean(billing.waConsent),
  } : null;

  const payload = Buffer.from(
    JSON.stringify({
      plan,
      comune: String(comune).slice(0, 120),
      isee: iseeNumber,
      figli: childrenNumber,
      billing: safeBilling,
    }),
    'utf8',
  ).toString('base64url');

  const demoSession = `demo_${payload}`;
  const origin = getOrigin(req);

  return res.status(200).json({
    demo: true,
    id: demoSession,
    url: `${origin}/?session_id=${encodeURIComponent(demoSession)}`,
  });
}
