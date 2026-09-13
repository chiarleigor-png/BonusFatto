export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(503).json({
      code: 'STRIPE_NOT_CONFIGURED',
      error: 'Stripe non è ancora configurato.',
    });
  }

  const sessionId = String(req.query?.session_id || '');
  if (!sessionId.startsWith('cs_')) return res.status(400).json({ error: 'Sessione non valida.' });

  try {
    const stripeResponse = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
      { headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` } },
    );
    const session = await stripeResponse.json();

    if (!stripeResponse.ok) {
      return res.status(502).json({ error: session?.error?.message || 'Verifica Stripe non riuscita.' });
    }

    if (session.payment_status !== 'paid') {
      return res.status(402).json({ paid: false, error: 'Pagamento non completato.' });
    }

    const metadata = session.metadata || {};
    if (!['base', 'report'].includes(metadata.plan)) {
      return res.status(400).json({ error: 'Piano della sessione non riconosciuto.' });
    }

    return res.status(200).json({
      paid: true,
      plan: metadata.plan,
      comune: metadata.comune,
      isee: Number(metadata.isee),
      figli: Number(metadata.figli),
    });
  } catch (error) {
    console.error('Verify checkout error', error);
    return res.status(500).json({ error: 'Impossibile verificare il pagamento.' });
  }
}
