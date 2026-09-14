import { randomBytes } from 'node:crypto';

const PLANS = {
  base: {
    name: 'BonusFatto - Analisi completa',
    amount: 100,
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

function cleanText(value, max = 255) {
  return String(value || '').trim().slice(0, max);
}

function validEmail(value) {
  const email = cleanText(value, 160).toLowerCase();
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

function validFiscalCode(value) {
  const fiscalCode = cleanText(value, 16).toUpperCase();
  return /^[A-Z0-9]{16}$/.test(fiscalCode) ? fiscalCode : '';
}

function appendMetadata(params, key, value) {
  if (value === undefined || value === null || value === '') return;
  params.append(`metadata[${key}]`, String(value).slice(0, 500));
}

function orderCode() {
  const date = new Date();
  const y = String(date.getUTCFullYear());
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `BF-${y}${m}${d}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

async function archiveOrder(order) {
  const supabaseUrl = cleanText(process.env.SUPABASE_URL, 500).replace(/\/$/, '');
  const supabaseKey = cleanText(process.env.SUPABASE_SERVICE_ROLE_KEY, 1000);
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Configurazione Supabase mancante.');
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/bonusfatto_orders`, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(order),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error('Supabase order insert failed', response.status, detail.slice(0, 500));
    throw new Error('Impossibile archiviare l’ordine.');
  }
}

async function expireStripeSession(secret, sessionId) {
  try {
    await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}/expire`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  } catch (error) {
    console.error('Stripe checkout expire failed', error?.message || error);
  }
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
  const municipality = cleanText(comune, 180);
  if (!municipality || !Number.isFinite(iseeNumber) || iseeNumber < 0 || !Number.isInteger(childrenNumber) || childrenNumber < 0) {
    return res.status(400).json({ error: 'Dati del calcolo non validi.' });
  }

  const email = validEmail(billing?.email);
  if (!email) {
    return res.status(400).json({ error: 'Inserisci un indirizzo email valido prima di procedere al pagamento.' });
  }

  const code = orderCode();
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
  params.append('customer_email', email);

  appendMetadata(params, 'source', 'bonusfatto');
  appendMetadata(params, 'plan', plan);
  appendMetadata(params, 'comune', municipality);
  appendMetadata(params, 'isee', iseeNumber);
  appendMetadata(params, 'figli', childrenNumber);
  appendMetadata(params, 'order_code', code);

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

    try {
      await archiveOrder({
        order_code: code,
        status: 'pending',
        plan,
        service_name: selectedPlan.name,
        amount_cents: selectedPlan.amount,
        currency: 'eur',
        customer_email: email,
        customer_name: cleanText(billing?.nome, 120) || null,
        customer_surname: cleanText(billing?.cognome, 120) || null,
        fiscal_code: validFiscalCode(billing?.codiceFiscale) || null,
        billing_address: cleanText(billing?.indirizzo, 255) || null,
        billing_zip: cleanText(billing?.cap, 10) || null,
        billing_city: cleanText(billing?.comuneFatturazione, 180) || null,
        billing_province: cleanText(billing?.provincia, 10).toUpperCase() || null,
        pec: validEmail(billing?.pec) || null,
        whatsapp: cleanText(billing?.whatsapp, 40) || null,
        whatsapp_consent: Boolean(billing?.waConsent),
        calculation_municipality: municipality,
        isee: iseeNumber,
        children: childrenNumber,
        stripe_session_id: session.id,
        stripe_payment_intent_id: null,
        stripe_payment_status: session.payment_status || 'unpaid',
        source: 'bonusfatto',
      });
    } catch (archiveError) {
      await expireStripeSession(secret, session.id);
      console.error('Checkout archived order failed', archiveError?.message || archiveError);
      return res.status(502).json({ error: 'Non è stato possibile registrare l’ordine. Riprova tra poco.' });
    }

    return res.status(200).json({ id: session.id, url: session.url, order_code: code });
  } catch (error) {
    console.error('Stripe checkout request failed', error?.message || error);
    return res.status(502).json({ error: 'Impossibile contattare Stripe. Riprova tra poco.' });
  }
}
