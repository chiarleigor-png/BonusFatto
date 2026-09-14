const ALLOWED_PLANS = new Set(['base', 'report', 'whatsapp', 'tari']);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Metodo non consentito.' });
  }

  const secret = String(process.env.STRIPE_SECRET_KEY || '').trim();
  if (!secret) {
    return res.status(503).json({ error: 'Verifica pagamento temporaneamente non disponibile: configurazione Stripe mancante.' });
  }

  const sessionId = String(req.query?.session_id || '').trim();
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
    return res.status(400).json({ error: 'Sessione di pagamento non valida.' });
  }

  try {
    const stripeResponse = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const session = await stripeResponse.json();

    if (!stripeResponse.ok || !session?.id) {
      return res.status(400).json({ error: 'Sessione Stripe non trovata.' });
    }

    const metadata = session.metadata || {};
    const plan = String(metadata.plan || '');
    const comune = String(metadata.comune || '');
    const isee = Number(metadata.isee);
    const figli = Number(metadata.figli);
    const paid = session.payment_status === 'paid' && session.status === 'complete';

    if (!ALLOWED_PLANS.has(plan) || !comune || !Number.isFinite(isee) || !Number.isInteger(figli)) {
      return res.status(400).json({ error: 'Dati della sessione Stripe incompleti.' });
    }

    if (!paid) {
      return res.status(402).json({ paid: false, error: 'Pagamento non ancora completato.' });
    }

    return res.status(200).json({
      paid: true,
      plan,
      comune,
      isee,
      figli,
    });
  } catch (error) {
    console.error('Stripe verification failed', error?.message || error);
    return res.status(502).json({ error: 'Impossibile verificare il pagamento con Stripe.' });
  }
}
