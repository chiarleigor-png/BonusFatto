import { createTariDelegationPdf } from '../lib/tariDelegationPdf.js';

function clean(value, max = 300) {
  return String(value ?? '').trim().slice(0, max);
}

async function verifyPaidSession(sessionId) {
  const secret = clean(process.env.STRIPE_SECRET_KEY, 1200);
  const id = clean(sessionId, 255);
  if (!secret || !/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) return false;
  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const session = await response.json().catch(() => ({}));
  return Boolean(response.ok && session?.payment_status === 'paid' && session?.status === 'complete' && session?.metadata?.source === 'bonusfatto' && session?.metadata?.plan === 'tari');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Metodo non consentito.' });
  }

  try {
    const paid = await verifyPaidSession(req.body?.sessionId);
    if (!paid) return res.status(403).json({ error: 'Pagamento del servizio TARI non verificato.' });

    const form = req.body?.form || {};
    const required = ['nome', 'cognome', 'email', 'codiceFiscale', 'indirizzo', 'cap', 'comuneResidenza', 'provinciaResidenza', 'comuneTari'];
    const missing = required.filter((key) => !clean(form[key]));
    if (missing.length) return res.status(400).json({ error: 'Completa i dati anagrafici prima di scaricare la delega.' });

    const isee = Number(form.isee);
    if (!Number.isFinite(isee) || isee < 0) return res.status(400).json({ error: 'Valore ISEE non valido.' });

    const code = `BF-TARI-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Date.now().toString(36).toUpperCase()}`;
    const order = {
      order_code: code,
      customer_name: clean(form.nome, 120),
      customer_surname: clean(form.cognome, 120),
      customer_email: clean(form.email, 180),
      fiscal_code: clean(form.codiceFiscale, 16).toUpperCase(),
      billing_address: clean(form.indirizzo, 200),
      billing_zip: clean(form.cap, 5),
      billing_city: clean(form.comuneResidenza, 120),
      billing_province: clean(form.provinciaResidenza, 2).toUpperCase(),
      calculation_municipality: clean(form.comuneTari, 120),
      isee,
      tari_property_address: clean(form.indirizzoImmobile, 240),
      tari_utility_code: clean(form.codiceUtenza, 120),
    };

    const pdf = await createTariDelegationPdf(order);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="BonusFatto_Delega_TARI_${code}.pdf"`);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(pdf);
  } catch (error) {
    console.error('TARI delegation generation failed', error?.message || error);
    return res.status(500).json({ error: 'Impossibile generare la delega.' });
  }
}
