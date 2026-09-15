import { calculate } from '../src/benefits.js';

function clean(value, max = 500) { return String(value ?? '').trim().slice(0, max); }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Metodo non consentito.' });
  }

  try {
    const { session_id, isee, children, comune, profile } = req.body || {};
    const sessionId = clean(session_id, 255);
    const secret = clean(process.env.STRIPE_SECRET_KEY, 1200);
    if (!secret) return res.status(503).json({ error: 'Servizio temporaneamente non disponibile.' });
    if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) return res.status(400).json({ error: 'Sessione non valida.' });

    const stripeResponse = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const session = await stripeResponse.json();
    if (!stripeResponse.ok || !session?.id || session.payment_status !== 'paid' || session.status !== 'complete' || session.metadata?.source !== 'bonusfatto' || session.metadata?.plan !== 'isee') {
      return res.status(403).json({ error: 'Analisi ISEE non disponibile per questa sessione.' });
    }

    const iseeNumber = Number(isee);
    const childrenNumber = Number(children);
    const municipality = clean(comune || session.metadata?.comune, 180);
    if (!Number.isFinite(iseeNumber) || iseeNumber < 0 || !Number.isInteger(childrenNumber) || childrenNumber < 0 || !municipality) {
      return res.status(400).json({ error: 'Dati ISEE non validi.' });
    }

    const result = calculate({
      isee: iseeNumber,
      children: childrenNumber,
      municipality: { name: municipality },
      profile: profile && typeof profile === 'object' ? { ...profile, children: childrenNumber } : { children: childrenNumber },
    });

    return res.status(200).json({
      comune: municipality,
      isee: iseeNumber,
      children: childrenNumber,
      total: result.total,
      recurring: result.recurring,
      conditional: result.conditional,
      benefits: result.benefits.map((b) => ({
        id: b.id,
        name: b.name,
        category: b.category,
        amount: b.amount,
        period: b.period,
        description: b.description,
        eligibility: b.eligibility,
      })),
    });
  } catch (error) {
    console.error('ISEE analysis failed', error?.message || error);
    return res.status(500).json({ error: 'Impossibile completare l’analisi. Riprova.' });
  }
}
