import { PRICES } from '../src/config/prices.js';

function siteOrigin(req) {
  const configured = String(process.env.BONUSFATTO_SITE_URL || process.env.SITE_URL || '').trim();
  if (configured) return configured.replace(/\/$/, '');
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').trim();
  const safeHost = /(^|\.)bonusfatto\.it$/i.test(host) || /\.vercel\.app$/i.test(host);
  return safeHost ? `https://${host}` : 'https://bonusfatto.it';
}

function clean(value, max = 255) {
  return String(value || '').trim().slice(0, max);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Metodo non consentito.' });
  }

  const secret = String(process.env.STRIPE_SECRET_KEY || '').trim();
  if (!secret) return res.status(503).json({ error: 'Pagamento temporaneamente non disponibile.' });

  const { plan, comune, isee, figli, billing } = req.body || {};
  const selected = PRICES[plan];
  if (!selected) return res.status(400).json({ error: 'Piano non valido.' });

  const email = clean(billing?.email, 160).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Inserisci un indirizzo email valido.' });
  }

  const amount = Math.round(selected.price * 100);
  const origin = siteOrigin(req);
  const params = new URLSearchParams();
  params.append('mode', 'payment');
  params.append('payment_method_types[0]', 'card');
  params.append('locale', 'it');
  params.append('success_url', `${origin}/?session_id={CHECKOUT_SESSION_ID}`);
  params.append('cancel_url', `${origin}/?checkout=cancelled`);
  params.append('line_items[0][quantity]', '1');
  params.append('line_items[0][price_data][currency]', 'eur');
  params.append('line_items[0][price_data][unit_amount]', String(amount));
  params.append('line_items[0][price_data][product_data][name]', selected.label);
  params.append('customer_email', email);
  params.append('metadata[source]', 'bonusfatto');
  params.append('metadata[plan]', selected.id);
  params.append('metadata[comune]', clean(comune, 180));
  params.append('metadata[isee]', String(isee ?? ''));
  params.append('metadata[figli]', String(figli ?? ''));

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
      return res.status(502).json({ error: 'Stripe non ha potuto creare il pagamento.' });
    }
    return res.status(200).json({
      id: session.id,
      url: session.url,
      plan: selected.id,
      value: selected.price,
      currency: 'EUR',
    });
  } catch {
    return res.status(502).json({ error: 'Impossibile contattare Stripe.' });
  }
}
