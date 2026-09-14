const PLANS = {
  base: {
    name: 'BonusFatto - Analisi completa',
    amount: 499,
  },
  report: {
    name: 'BonusFatto - Relazione PDF + modello email/PEC TARI',
    amount: 990,
  },
  whatsapp: {
    name: 'BonusFatto - Bonus Alert WhatsApp 12 mesi',
    amount: 999,
  },
  tari: {
    name: 'BonusFatto - Presentazione pratica TARI',
    amount: 2490,
  },
};

function siteOrigin(req) {
  const configured = String(process.env.BONUSFATTO_SITE_URL || process.env.SITE_URL || '').trim();
  if (configured) return configured.replace(/\/$/, '');

  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').trim();
  const safeHost = /(^|\.)bonusfatto\.it$/i.test(host) || /\.vercel\.app$/i.test(host);
  if (safeHost) return `https://${host}`;

  return 'https://bonus-fatto.vercel.app';
}

function validEmail(value) {
  const email = String(value || '').trim();
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email.slice(0, 160) : '';
}

function appendMetadata(params, key, value) {
  if (value === undefined || value === null || value === '') return;
  params.append(`metadata[${key}]`, String(value).slice(0, 500));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Metodo non consentito.' });
  }

  const secret = String(process.env.STRIPE_SECRET_KEY || '').trim();
  if (!secret) {
    return res.status(503).json({ error: 'Pagamento temporaneamente non disponibile: configurazione Stripe mancante.' });
  }

  const { plan, comune, isee, figli, billing } = req.body || {};
  const selectedPlan = PLANS[plan];
  if (!selectedPlan) return res.status(400).json({ error: 'Piano non valido.' });

  const iseeNumber = Number(isee);
  const childrenNumber = Number(figli);
  const municipality = String(comune || '').trim();
  if (!municipality || !Number.isFinite(iseeNumber) || iseeNumber < 0 || !Number.isInteger(childrenNumber) || childrenNumber < 0) {
    return res.status(400).json({ error: 'Dati del calcolo non validi.' });
  }

  const email = validEmail(billing?.email);
  const origin = siteOrigin(req);
  const params = new URLSearchParams();

  params.append('mode', 'payment');
  params.append('payment_method_types[0]', 'card');
  params.append('locale', 'it');
  params.append('success_url', `${origin}/?session_id={CHECKOUT_SESSION_ID}`);
  params.append('cancel_url', `${origin}/?checkout=cancelled`);
  params.append('line_items[0][quantity]', '1');
  params.append('line_items[0][price_data][currency]', 'eur');
  params.append('line_items[0][price_data][unit_amount]', String(selectedPlan.amount));
  params.append('line_items[0][price_data][product_data][name]', selectedPlan.name);
  if (email) params.append('customer_email', email);

  appendMetadata(params, 'source', 'bonusfatto');
  appendMetadata(params, 'plan', plan);
  appendMetadata(params, 'comune', municipality);
  appendMetadata(params, 'isee', iseeNumber);
  appendMetadata(params, 'figli', childrenNumber);

  try {
    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const session = await stripeResponse.json();
    if (!stripeResponse.ok || !session?.id || !session?.url) {
      console.error('Stripe checkout error', session?.error?.type || stripeResponse.status);
      return res.status(502).json({ error: 'Stripe non ha potuto creare il pagamento. Riprova tra poco.' });
    }

    return res.status(200).json({ id: session.id, url: session.url });
  } catch (error) {
    console.error('Stripe checkout request failed', error?.message || error);
    return res.status(502).json({ error: 'Impossibile contattare Stripe. Riprova tra poco.' });
  }
}
