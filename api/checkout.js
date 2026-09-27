import { PRICES } from '../src/config/prices.js';
import pecComuni from '../lib/pecComuni.json' with { type: 'json' };

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

function planFromPriceId(priceId) {
  return Object.values(PRICES).find((item) => item.stripePriceId === priceId) || null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Metodo non consentito.' });
  }

  const secret = String(process.env.STRIPE_SECRET_KEY || '').trim();
  if (!secret) return res.status(503).json({ error: 'Pagamento temporaneamente non disponibile.' });

  const { priceId, comune, istat, isee, figli, billing, consents } = req.body || {};
  const selected = planFromPriceId(String(priceId || ''));
  if (!selected) return res.status(400).json({ error: 'Prezzo/piano non valido.' });

  const email = clean(billing?.email, 160).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Inserisci un indirizzo email valido.' });
  }

  const municipality = clean(comune, 180);
  const istatCode = clean(istat, 12);
  const pecRecipient = selected.id === 'pec'
    ? (pecComuni[istatCode] || 'pec@comune.it')
    : '';

  if (selected.id === 'pec' && (!consents?.authorizeSend || !consents?.truthDeclaration)) {
    return res.status(400).json({ error: 'Per il servizio PEC sono obbligatorie entrambe le autorizzazioni.' });
  }

  if (selected.id === 'pec') {
    console.log('[PEC_ORDER_PENDING]', JSON.stringify({
      status: 'da inviare',
      istat: istatCode,
      comune: municipality,
      pecDestinatario: pecRecipient,
      emailCliente: email,
      nome: clean(billing?.nome, 120),
      cognome: clean(billing?.cognome, 120),
      codiceFiscale: clean(billing?.codiceFiscale, 16),
      isee,
      figli,
      autorizzazioneInvio: true,
      dichiarazioneVeridicita: true,
      createdAt: new Date().toISOString(),
    }));
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

  // stripePriceId è l'ID logico centralizzato; usiamo price_data per garantire
  // importi 2,99 / 6,90 / 14,90 senza dipendere da Price Stripe non ancora creati.
  params.append('line_items[0][price_data][currency]', 'eur');
  params.append('line_items[0][price_data][unit_amount]', String(amount));
  params.append('line_items[0][price_data][product_data][name]', selected.label);
  params.append('customer_email', email);

  params.append('metadata[source]', 'bonusfatto');
  params.append('metadata[plan]', selected.id);
  params.append('metadata[price_id]', selected.stripePriceId);
  params.append('metadata[comune]', municipality);
  params.append('metadata[istat]', istatCode);
  params.append('metadata[isee]', String(isee ?? ''));
  params.append('metadata[figli]', String(figli ?? ''));
  if (selected.id === 'pec') {
    params.append('metadata[pec_destinatario]', pecRecipient);
    params.append('metadata[pec_status]', 'da inviare');
    params.append('metadata[authorize_send]', 'true');
    params.append('metadata[truth_declaration]', 'true');
  }

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
      console.error('[Stripe checkout error]', stripeResponse.status, session?.error?.message || session);
      return res.status(502).json({ error: session?.error?.message || 'Stripe non ha potuto creare il pagamento.' });
    }

    return res.status(200).json({
      id: session.id,
      url: session.url,
      plan: selected.id,
      priceId: selected.stripePriceId,
      value: selected.price,
      currency: 'EUR',
      pecDestinatario: pecRecipient || undefined,
    });
  } catch (error) {
    console.error('[Stripe checkout exception]', error?.message || error);
    return res.status(502).json({ error: 'Impossibile contattare Stripe.' });
  }
}
