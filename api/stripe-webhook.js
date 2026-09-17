import nodemailer from 'nodemailer';
import { createHmac, timingSafeEqual } from 'node:crypto';

export const config = { api: { bodyParser: false } };

const ALLOWED_PLANS = new Set(['base', 'report', 'whatsapp', 'tari']);
const WEBHOOK_TOLERANCE_SECONDS = 300;
const BACKOFFICE_EMAIL = 'pratiche@bonusfatto.it';

function clean(value, max = 500) {
  return String(value ?? '').trim().slice(0, max);
}

function validEmail(value) {
  const email = clean(value, 320).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function verifyStripeSignature(rawBody, signatureHeader, secret) {
  const parts = String(signatureHeader || '').split(',').map((part) => part.trim());
  const timestampPart = parts.find((part) => part.startsWith('t='));
  const signatures = parts.filter((part) => part.startsWith('v1=')).map((part) => part.slice(3));
  const timestamp = Number(timestampPart?.slice(2));
  if (!Number.isInteger(timestamp) || signatures.length === 0) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - timestamp) > WEBHOOK_TOLERANCE_SECONDS) return false;

  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody.toString('utf8')}`, 'utf8').digest('hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  return signatures.some((signature) => {
    if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
    const actual = Buffer.from(signature, 'hex');
    return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
  });
}

async function stripeSession(secret, sessionId) {
  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const session = await response.json();
  if (!response.ok || !session?.id) throw new Error('Sessione Stripe non verificabile.');
  return session;
}

function supabaseHeaders() {
  const key = clean(process.env.SUPABASE_SERVICE_ROLE_KEY, 1200);
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY mancante.');
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
}

function supabaseBase() {
  const url = clean(process.env.SUPABASE_URL, 600).replace(/\/$/, '');
  if (!url) throw new Error('SUPABASE_URL mancante.');
  return url;
}

async function getPendingOrder(sessionId) {
  const url = `${supabaseBase()}/rest/v1/bonusfatto_orders?stripe_session_id=eq.${encodeURIComponent(sessionId)}&status=eq.pending&select=*`;
  const response = await fetch(url, { headers: supabaseHeaders() });
  const rows = await response.json();
  if (!response.ok) throw new Error('Errore lettura ordine Supabase.');
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function markPaid(session) {
  const paymentIntent = typeof session.payment_intent === 'string' ? session.payment_intent : null;
  const url = `${supabaseBase()}/rest/v1/bonusfatto_orders?stripe_session_id=eq.${encodeURIComponent(session.id)}&status=eq.pending`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { ...supabaseHeaders(), Prefer: 'return=representation' },
    body: JSON.stringify({
      status: 'paid',
      updated_at: new Date().toISOString(),
      stripe_payment_intent_id: paymentIntent,
      stripe_payment_status: session.payment_status || 'paid',
    }),
  });
  const rows = await response.json();
  if (!response.ok) throw new Error('Errore aggiornamento ordine Supabase.');
  return Array.isArray(rows) ? rows[0] || null : null;
}

function planInstructions(plan) {
  if (plan === 'base') return 'Al rientro su BonusFatto.it troverai immediatamente la tua Analisi veloce.';
  if (plan === 'report') return 'Al rientro su BonusFatto.it potrai completare l’analisi e scaricare la relazione PDF definitiva.';
  if (plan === 'tari') return 'Al rientro su BonusFatto.it potrai completare la pratica TARI, scaricare la delega e caricare i documenti richiesti.';
  if (plan === 'whatsapp') return 'Al rientro su BonusFatto.it potrai scegliere Email, WhatsApp o entrambi e completare l’attivazione per 12 mesi.';
  return 'Al rientro su BonusFatto.it troverai il servizio acquistato.';
}

function customerMessage(order) {
  const name = clean(order.customer_name, 120) || 'Cliente';
  const amount = (Number(order.amount_cents || 0) / 100).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
  return {
    subject: `BonusFatto - pagamento confermato ${order.order_code}`,
    text: [
      `Ciao ${name},`,
      '',
      'il pagamento su BonusFatto.it è stato ricevuto correttamente.',
      `Codice ordine: ${order.order_code}`,
      `Servizio: ${order.service_name}`,
      `Importo: ${amount}`,
      '',
      planInstructions(order.plan),
      '',
      'Conserva questa email come conferma dell’acquisto.',
      '',
      'BonusFatto.it',
      'Servizio gestito da LU.CA. S.r.l.s.',
      'info@bonusfatto.it',
    ].join('\r\n'),
  };
}

function internalMessage(order) {
  const amount = (Number(order.amount_cents || 0) / 100).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
  return {
    subject: `[BonusFatto] Nuovo ordine pagato ${order.order_code}`,
    text: [
      'NUOVO ORDINE BONUSFATTO',
      '',
      `Codice ordine: ${order.order_code}`,
      `Servizio: ${order.service_name}`,
      `Piano: ${order.plan}`,
      `Importo: ${amount}`,
      `Cliente: ${[order.customer_name, order.customer_surname].filter(Boolean).join(' ') || '-'}`,
      `Email: ${order.customer_email || '-'}`,
      `Comune: ${order.calculation_municipality || '-'}`,
      `ISEE: ${Number(order.isee || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}`,
      `Figli: ${order.children ?? 0}`,
      `Stripe Session: ${order.stripe_session_id}`,
      '',
      'Stato: PAGATO - IN ATTESA DI COMPLETAMENTO SERVIZIO O CONSEGNA',
    ].join('\r\n'),
  };
}

function mailTransport() {
  const user = validEmail(process.env.SMTP_USER || process.env.PRACTICHE_SMTP_USER);
  const pass = String(process.env.SMTP_PASSWORD || process.env.PRACTICHE_SMTP_PASSWORD || '');
  const host = clean(process.env.SMTP_HOST || 'smtps.aruba.it', 255);
  const port = Number(process.env.SMTP_PORT || 465);
  if (!user || !pass || !host || !Number.isInteger(port)) return null;
  return {
    user,
    transporter: nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: true },
      connectionTimeout: 20000,
      greetingTimeout: 20000,
      socketTimeout: 30000,
      disableFileAccess: true,
      disableUrlAccess: true,
    }),
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Metodo non consentito.' });
  }

  const stripeSecret = clean(process.env.STRIPE_SECRET_KEY, 1200);
  const webhookSecret = clean(process.env.STRIPE_WEBHOOK_SECRET, 1200);
  if (!stripeSecret || !webhookSecret) return res.status(503).json({ error: 'Configurazione Stripe incompleta.' });

  let rawBody;
  try { rawBody = await readRawBody(req); }
  catch { return res.status(400).json({ error: 'Payload webhook non leggibile.' }); }

  if (!verifyStripeSignature(rawBody, req.headers['stripe-signature'], webhookSecret)) {
    return res.status(400).json({ error: 'Firma webhook Stripe non valida.' });
  }

  let event;
  try { event = JSON.parse(rawBody.toString('utf8')); }
  catch { return res.status(400).json({ error: 'Payload webhook non valido.' }); }

  if (event.type !== 'checkout.session.completed') return res.status(200).json({ received: true, ignored: true });

  const sessionId = clean(event?.data?.object?.id, 255);
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) return res.status(200).json({ received: true, ignored: true });

  try {
    const session = await stripeSession(stripeSecret, sessionId);
    const plan = clean(session?.metadata?.plan, 50);
    if (session?.metadata?.source !== 'bonusfatto' || !ALLOWED_PLANS.has(plan)) return res.status(200).json({ received: true, ignored: true });
    if (session.payment_status !== 'paid' || session.status !== 'complete') return res.status(200).json({ received: true, ignored: true });

    const pendingOrder = await getPendingOrder(session.id);
    if (!pendingOrder) return res.status(200).json({ received: true, duplicate: true });
    const paidOrder = await markPaid(session);
    if (!paidOrder) return res.status(200).json({ received: true, duplicate: true });

    const mail = mailTransport();
    if (mail) {
      try {
        const internal = internalMessage(paidOrder);
        await mail.transporter.sendMail({
          from: `BonusFatto <${mail.user}>`,
          to: BACKOFFICE_EMAIL,
          replyTo: paidOrder.customer_email || undefined,
          subject: internal.subject,
          text: internal.text,
        });
      } catch (error) {
        console.error('BonusFatto internal payment email failed', error?.message || error);
      }

      try {
        const customer = customerMessage(paidOrder);
        await mail.transporter.sendMail({
          from: `BonusFatto <${mail.user}>`,
          to: paidOrder.customer_email,
          replyTo: BACKOFFICE_EMAIL,
          subject: customer.subject,
          text: customer.text,
        });
      } catch (error) {
        console.error('BonusFatto customer payment email failed', error?.message || error);
      } finally {
        mail.transporter.close();
      }
    }

    return res.status(200).json({ received: true, processed: true, order_code: paidOrder.order_code });
  } catch (error) {
    console.error('BonusFatto Stripe webhook failed', error?.message || error);
    return res.status(500).json({ error: 'Errore elaborazione webhook.' });
  }
}
