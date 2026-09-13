export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const sessionId = String(req.query?.session_id || '');
  if (!sessionId.startsWith('demo_')) {
    return res.status(400).json({ error: 'Sessione demo non valida.' });
  }

  try {
    const encoded = sessionId.slice(5);
    const decoded = Buffer.from(encoded, 'base64url').toString('utf8');
    const data = JSON.parse(decoded);

    if (!['base', 'report'].includes(data.plan)) {
      return res.status(400).json({ error: 'Piano demo non riconosciuto.' });
    }

    const isee = Number(data.isee);
    const figli = Number(data.figli);
    if (!data.comune || !Number.isFinite(isee) || !Number.isInteger(figli)) {
      return res.status(400).json({ error: 'Dati della sessione demo non validi.' });
    }

    return res.status(200).json({
      paid: false,
      demo: true,
      plan: data.plan,
      comune: String(data.comune),
      isee,
      figli,
    });
  } catch {
    return res.status(400).json({ error: 'Impossibile leggere la sessione demo.' });
  }
}
