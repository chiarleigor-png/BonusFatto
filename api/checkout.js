function getOrigin(req) {
  if (req.headers.origin) return req.headers.origin;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${host}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { plan, comune, isee, figli } = req.body || {};
  if (!['base', 'report'].includes(plan)) return res.status(400).json({ error: 'Piano non valido.' });

  const iseeNumber = Number(isee);
  const childrenNumber = Number(figli);
  if (!comune || !Number.isFinite(iseeNumber) || !Number.isInteger(childrenNumber)) {
    return res.status(400).json({ error: 'Dati del calcolo non validi.' });
  }

  const payload = Buffer.from(
    JSON.stringify({
      plan,
      comune: String(comune).slice(0, 120),
      isee: iseeNumber,
      figli: childrenNumber,
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
