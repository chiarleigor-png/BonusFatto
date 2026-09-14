import tls from 'node:tls';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { createBonusFattoReport } from '../lib/reportPdf.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

const ALLOWED_PLANS = new Set(['base', 'report', 'whatsapp', 'tari']);
const WEBHOOK_TOLERANCE_SECONDS = 300;

function clean(value, max = 500) {
  return String(value ?? '').trim().slice(0, max);
}

function validRecipient(value) {
  const email = clean(value, 160).toLowerCase();
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
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

  const signedPayload = `${timestamp}.${rawBody.toString('utf8')}`;
  const expected = createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex');
  const expectedBuffer = Buffer.from(expected, 'hex');

  return signatures.some((signature) => {
    if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
    const actualBuffer = Buffer.from(signature, 'hex');
    return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
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
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
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

function readSmtpResponse(socket) {
  return new Promise((resolve, reject) => {
    let buffer = '';
    const timer = setTimeout(() => cleanup(new Error('Timeout SMTP.')), 10000);
    const onData = (chunk) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split(/\r?\n/).filter(Boolean);
      const last = lines[lines.length - 1] || '';
      if (/^\d{3} /.test(last)) cleanup(null, { code: Number(last.slice(0, 3)), text: buffer });
    };
    const onError = (error) => cleanup(error);
    const cleanup = (error, value) => {
      clearTimeout(timer);
      socket.off('data', onData);
      socket.off('error', onError);
      error ? reject(error) : resolve(value);
    };
    socket.on('data', onData);
    socket.on('error', onError);
  });
}

async function smtpCommand(socket, command, expected = [250]) {
  if (command) socket.write(`${command}\r\n`);
  const response = await readSmtpResponse(socket);
  if (!expected.includes(response.code)) throw new Error(`SMTP ${response.code}: ${response.text}`);
  return response;
}

function wrapBase64(buffer) {
  return Buffer.from(buffer).toString('base64').match(/.{1,76}/g)?.join('\r\n') || '';
}

async function sendMail(to, subject, body, attachment = null) {
  const host = clean(process.env.SMTP_HOST || 'smtps.aruba.it', 255);
  const user = validRecipient(process.env.SMTP_USER);
  const password = String(process.env.SMTP_PASSWORD || '');
  const recipient = validRecipient(to);
  if (!host || !user || !password || !recipient) throw new Error('Configurazione SMTP o destinatario non validi.');

  const socket = tls.connect({ host, port: 465, servername: host, rejectUnauthorized: true });
  await new Promise((resolve, reject) => {
    socket.once('secureConnect', resolve);
    socket.once('error', reject);
  });

  try {
    let response = await readSmtpResponse(socket);
    if (response.code !== 220) throw new Error(`SMTP ${response.code}`);
    await smtpCommand(socket, 'EHLO bonusfatto.it', [250]);
    await smtpCommand(socket, 'AUTH LOGIN', [334]);
    await smtpCommand(socket, Buffer.from(user).toString('base64'), [334]);
    await smtpCommand(socket, Buffer.from(password).toString('base64'), [235]);
    await smtpCommand(socket, `MAIL FROM:<${user}>`, [250]);
    await smtpCommand(socket, `RCPT TO:<${recipient}>`, [250, 251]);
    await smtpCommand(socket, 'DATA', [354]);

    const safeSubject = clean(subject, 180).replace(/[\r\n]+/g, ' ');
    const textBody = String(body || '').replace(/^\./gm, '..');
    const commonHeaders = [
      `From: BonusFatto <${user}>`,
      `To: ${recipient}`,
      `Subject: ${safeSubject}`,
      'MIME-Version: 1.0',
    ];

    let message;
    if (attachment?.data) {
      const boundary = `----BonusFatto-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const filename = clean(attachment.filename || 'BonusFatto_Relazione.pdf', 160).replace(/["\r\n]/g, '_');
      const contentType = clean(attachment.contentType || 'application/octet-stream', 80);
      message = [
        ...commonHeaders,
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        '',
        textBody,
        '',
        `--${boundary}`,
        `Content-Type: ${contentType}; name="${filename}"`,
        'Content-Transfer-Encoding: base64',
        `Content-Disposition: attachment; filename="${filename}"`,
        '',
        wrapBase64(attachment.data),
        `--${boundary}--`,
        '.',
        '',
      ].join('\r\n');
    } else {
      message = [
        ...commonHeaders,
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        '',
        textBody,
        '.',
        '',
      ].join('\r\n');
    }

    socket.write(message);
    response = await readSmtpResponse(socket);
    if (response.code !== 250) throw new Error(`SMTP ${response.code}`);
    await smtpCommand(socket, 'QUIT', [221]);
  } finally {
    socket.end();
  }
}

function adminEmail(order) {
  const amount = (Number(order.amount_cents || 0) / 100).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
  return {
    subject: `Nuovo ordine BonusFatto - ${order.order_code}`,
    body: [
      'Nuovo ordine BonusFatto',
      '',
      `Codice ordine: ${order.order_code}`,
      'Pagamento: RIUSCITO',
      `Servizio: ${order.service_name}`,
      `Importo: ${amount}`,
      `Cliente: ${[order.customer_name, order.customer_surname].filter(Boolean).join(' ') || '-'}`,
      `Email: ${order.customer_email || '-'}`,
      `Comune analizzato: ${order.calculation_municipality || '-'}`,
      `ISEE: ${Number(order.isee || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}`,
      `Figli: ${order.children ?? 0}`,
      `Piano: ${order.plan || '-'}`,
      `Stripe Session: ${order.stripe_session_id}`,
      '',
      'Stato pratica: PAGATO',
    ].join('\r\n'),
  };
}

function customerEmail(order, hasAttachment = false) {
  const firstName = clean(order.customer_name, 120) || 'Cliente';
  const code = clean(order.order_code, 80);
  const commonHeader = [
    `Ciao ${firstName},`,
    '',
    'il pagamento su BonusFatto.it è stato ricevuto correttamente.',
    `Codice ordine: ${code}`,
    `Servizio acquistato: ${order.service_name}`,
    '',
  ];

  const commonFooter = [
    '',
    'Conserva questa email come conferma dell’acquisto.',
    '',
    'BonusFatto.it',
    'info@bonusfatto.it',
  ];

  if (order.plan === 'report') {
    return {
      subject: `BonusFatto - relazione PDF e ordine ${code}`,
      body: [
        ...commonHeader,
        'Hai acquistato Analisi + relazione PDF.',
        hasAttachment
          ? 'Trovi in allegato la tua relazione BonusFatto personalizzata in formato PDF, già predisposta con i dati del tuo ordine.'
          : 'La tua relazione BonusFatto personalizzata è disponibile nella pagina post-pagamento.',
        'Nel documento trovi il riepilogo delle opportunità individuate, la sezione TARI, le verifiche ancora necessarie e il testo email/PEC personalizzato da utilizzare con l’Ufficio Tributi del Comune.',
        'Puoi inoltre scaricare nuovamente la relazione dalla pagina BonusFatto aperta dopo il pagamento.',
        ...commonFooter,
      ].join('\r\n'),
    };
  }

  if (order.plan === 'whatsapp') {
    const phoneLine = order.whatsapp ? `Numero indicato: ${order.whatsapp}` : 'Numero WhatsApp: quello indicato in fase di acquisto.';
    const consentLine = order.whatsapp_consent ? 'Il consenso agli avvisi WhatsApp risulta registrato.' : 'Verificheremo il consenso agli avvisi prima dell’attivazione.';
    return {
      subject: `BonusFatto - Bonus Alert attivato (${code})`,
      body: [
        ...commonHeader,
        'Hai acquistato Bonus Alert WhatsApp per 12 mesi.',
        phoneLine,
        consentLine,
        'Riceverai su WhatsApp gli avvisi collegati a scadenze e nuovi bonus previsti dal servizio acquistato.',
        ...commonFooter,
      ].join('\r\n'),
    };
  }

  if (order.plan === 'tari') {
    return {
      subject: `BonusFatto - pratica TARI aperta (${code})`,
      body: [
        ...commonHeader,
        'La tua pratica TARI è stata aperta correttamente.',
        'Il prossimo passaggio è la raccolta dei documenti necessari e della delega firmata per consentire a BonusFatto di predisporre e trasmettere la richiesta al Comune attraverso il canale previsto.',
        'Riceverai le istruzioni per documenti e delega sullo stesso indirizzo email utilizzato per l’acquisto.',
        ...commonFooter,
      ].join('\r\n'),
    };
  }

  return {
    subject: `BonusFatto - ordine ${code} confermato`,
    body: [
      ...commonHeader,
      'Hai acquistato l’Analisi completa.',
      'Il risultato dettagliato è disponibile immediatamente al rientro su BonusFatto.it dopo il pagamento.',
      'Se hai già chiuso la pagina, conserva questa email come conferma del pagamento: l’ordine risulta registrato correttamente.',
      ...commonFooter,
    ].join('\r\n'),
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Metodo non consentito.' });
  }

  const stripeSecret = clean(process.env.STRIPE_SECRET_KEY, 1200);
  const webhookSecret = clean(process.env.STRIPE_WEBHOOK_SECRET, 1200);
  if (!stripeSecret || !webhookSecret) {
    return res.status(503).json({ error: 'Configurazione Stripe incompleta.' });
  }

  let rawBody;
  try {
    rawBody = await readRawBody(req);
  } catch {
    return res.status(400).json({ error: 'Payload webhook non leggibile.' });
  }

  const signature = req.headers['stripe-signature'];
  if (!verifyStripeSignature(rawBody, signature, webhookSecret)) {
    return res.status(400).json({ error: 'Firma webhook Stripe non valida.' });
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Payload webhook non valido.' });
  }

  if (event.type !== 'checkout.session.completed') {
    return res.status(200).json({ received: true, ignored: true });
  }

  const sessionId = clean(event?.data?.object?.id, 255);
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
    return res.status(200).json({ received: true, ignored: true });
  }

  try {
    const session = await stripeSession(stripeSecret, sessionId);
    const metadata = session.metadata || {};
    const source = clean(metadata.source, 50);
    const plan = clean(metadata.plan, 50);

    if (source !== 'bonusfatto' || !ALLOWED_PLANS.has(plan)) {
      return res.status(200).json({ received: true, ignored: true });
    }

    const paid = session.payment_status === 'paid' && session.status === 'complete';
    if (!paid) return res.status(200).json({ received: true, ignored: true });

    const pendingOrder = await getPendingOrder(session.id);
    if (!pendingOrder) {
      return res.status(200).json({ received: true, duplicate: true });
    }

    let reportPdf = null;
    if (plan === 'report') {
      reportPdf = await createBonusFattoReport(pendingOrder);
      if (!Buffer.isBuffer(reportPdf) || reportPdf.length < 500) throw new Error('PDF relazione non generato correttamente.');
    }

    const paidOrder = await markPaid(session);
    if (!paidOrder) return res.status(200).json({ received: true, duplicate: true });

    const smtpUser = validRecipient(process.env.SMTP_USER);
    const internal = adminEmail(paidOrder);
    try {
      await sendMail(smtpUser, internal.subject, internal.body);
    } catch (mailError) {
      console.error('BonusFatto internal order email failed', mailError?.message || mailError);
    }

    const customer = customerEmail(paidOrder, Boolean(reportPdf));
    const attachment = reportPdf
      ? {
          filename: `BonusFatto_Relazione_${clean(paidOrder.order_code, 80).replace(/[^A-Za-z0-9_-]/g, '')}.pdf`,
          contentType: 'application/pdf',
          data: reportPdf,
        }
      : null;
    try {
      await sendMail(paidOrder.customer_email, customer.subject, customer.body, attachment);
    } catch (mailError) {
      console.error('BonusFatto customer order email failed', mailError?.message || mailError);
    }

    return res.status(200).json({ received: true, processed: true, order_code: paidOrder.order_code, report_attached: Boolean(reportPdf) });
  } catch (error) {
    console.error('BonusFatto Stripe webhook failed', error?.message || error);
    return res.status(500).json({ error: 'Errore elaborazione webhook.' });
  }
}
