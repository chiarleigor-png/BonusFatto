const PLANS = {
  base: {
    amount: 499,
    name: 'BonusFatto – Analisi completa',
    description: 'Risultato completo dei bonus e stima personalizzata per Comune e ISEE.',
  },
  report: {
    amount: 990,
    name: 'BonusFatto – Analisi + Report PDF',
    description: 'Analisi completa, relazione PDF e testo email/PEC per le agevolazioni TARI comunali.',
  },
};

function getOrigin(req) {
  if (req.headers.origin) return req.headers.origin;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${host}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(503).json({
      code: 'STRIPE_NOT_CONFIGURED',
      error: 'Checkout pronto: configura STRIPE_SECRET_KEY su Vercel per attivare i pagamenti.',
    });
  }

  const { plan, comune, isee, figli } = req.body || {};
  const selected = PLANS[plan];
  if (!selected) return res.status(400).json({ error: 'Piano non valido.' });

  const iseeNumber = Number(isee);
  const childrenNumber = Number(figli);
  if (!comune || !Number.isFinite(iseeNumber) || !Number.isInteger(childrenNumber)) {
    return res.status(400).json({ error: 'Dati del calcolo non validi.' });
  }

  const origin = getOrigin(req);
  const params = new URLSearchParams();
  params.set('mode', 'payment');
  params.set('payment_method_types[0]', 'card');
  params.set('line_items[0][quantity]', '1');
  params.set('line_items[0][price_data][currency]', 'eur');
  params.set('line_items[0][price_data][unit_amount]', String(selected.amount));
  params.set('line_items[0][price_data][product_data][name]', selected.name);
  params.set('line_items[0][price_data][product_data][description]', selected.description);
  params.set('success_url', `${origin}/?session_id={CHECKOUT_SESSION_ID}`);
  params.set('cancel_url', `${origin}/?checkout=cancelled`);
  params.set('metadata[plan]', plan);
  params.set('metadata[comune]', String(comune).slice(0, 120));
  params.set('metadata[isee]', String(iseeNumber));
  params.set('metadata[figli]', String(childrenNumber));

  try {
    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const session = await stripeResponse.json();
    if (!stripeResponse.ok) {
      console.error('Stripe checkout error', session);
      return res.status(502).json({ error: session?.error?.message || 'Errore Stripe.' });
    }

    return res.status(200).json({ url: session.url, id: session.id });
  } catch (error) {
    console.error('Checkout error', error);
    return res.status(500).json({ error: 'Impossibile avviare il checkout.' });
  }
}
