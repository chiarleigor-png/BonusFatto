import tls from 'node:tls';

const ALLOWED_PLANS = new Set(['base', 'report', 'whatsapp', 'tari']);

function clean(value, max = 500) {
  return String(value ?? '').trim().slice(0, max);
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

async function sendOrderEmail(order) {
  const host = clean(process.env.SMTP_HOST || 'smtps.aruba.it', 255);
  const user = clean(process.env.SMTP_USER, 255);
  const password = String(process.env.SMTP_PASSWORD || '');
  if (!host || !user || !password) throw new Error('Configurazione SMTP incompleta.');

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
    await smtpCommand(socket, `RCPT TO:<${user}>`, [250, 251]);
    await smtpCommand(socket, 'DATA', [354]);

    const amount = (Number(order.amount_cents || 0) / 100).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
    const subject = `Nuovo ordine BonusFatto - ${order.order_code}`;
    const body = [
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
    ].join('\r\n');

    const message = [
      `From: BonusFatto <${user}>`,
      `To: ${user}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      body.replace(/^\./gm, '..'),
      '.',
      '',
    ].join('\r\n');
    socket.write(message);
    response = await readSmtpResponse(socket);
    if (response.code !== 250) throw new Error(`SMTP ${response.code}`);
    await smtpCommand(socket, 'QUIT', [221]);
  } finally {
    socket.end();
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Metodo non consentito.' });
  }

  const stripeSecret = clean(process.env.STRIPE_SECRET_KEY, 1200);
  if (!stripeSecret) return res.status(503).json({ error: 'Configurazione Stripe mancante.' });

  const event = req.body || {};
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

    const paidOrder = await markPaid(session);
    if (!paidOrder) return res.status(200).json({ received: true, duplicate: true });

    try {
      await sendOrderEmail(paidOrder);
    } catch (mailError) {
      console.error('BonusFatto order email failed', mailError?.message || mailError);
    }

    return res.status(200).json({ received: true, processed: true, order_code: paidOrder.order_code });
  } catch (error) {
    console.error('BonusFatto Stripe webhook failed', error?.message || error);
    return res.status(500).json({ error: 'Errore elaborazione webhook.' });
  }
}
