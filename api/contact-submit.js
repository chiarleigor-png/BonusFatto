import nodemailer from 'nodemailer';

const DESTINATION = 'info@bonusfatto.it';
const ALLOWED_SUBJECTS = new Set([
  'Assistenza BonusFatto',
  'Pagamento o fatturazione',
  'Pratica TARI',
  'Privacy',
  'Altro',
]);

function clean(value, max = 4000) {
  return String(value ?? '').trim().slice(0, max);
}

function validEmail(value) {
  const email = clean(value, 320).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Metodo non consentito.' });
  }

  const name = clean(req.body?.name, 160);
  const customerEmail = validEmail(req.body?.email);
  const subject = clean(req.body?.subject, 120);
  const message = clean(req.body?.message, 5000);
  const consent = req.body?.consent === true;

  if (!name || !customerEmail || !message || !consent || !ALLOWED_SUBJECTS.has(subject)) {
    return res.status(400).json({ ok: false, error: 'Completa correttamente tutti i campi obbligatori.' });
  }

  const smtpUser = validEmail(process.env.SMTP_USER || process.env.PRACTICHE_SMTP_USER);
  const smtpPassword = String(process.env.SMTP_PASSWORD || process.env.PRACTICHE_SMTP_PASSWORD || '');
  const smtpHost = clean(process.env.SMTP_HOST || 'smtps.aruba.it', 255);
  const smtpPort = Number(process.env.SMTP_PORT || 465);

  if (!smtpUser || !smtpPassword || !smtpHost || !Number.isInteger(smtpPort)) {
    return res.status(503).json({ ok: false, error: 'Servizio contatti temporaneamente non disponibile.' });
  }

  const receivedAt = new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' });
  const body = [
    'NUOVA RICHIESTA DAL MODULO CONTATTI BONUSFATTO',
    '',
    `Ricevuta il: ${receivedAt}`,
    `Nome e cognome: ${name}`,
    `Email: ${customerEmail}`,
    `Oggetto: ${subject}`,
    '',
    'MESSAGGIO',
    message,
    '',
    'Consenso privacy: SI',
    '',
    'BonusFatto.it',
  ].join('\r\n');

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPassword },
    tls: { rejectUnauthorized: true },
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 30000,
    disableFileAccess: true,
    disableUrlAccess: true,
  });

  try {
    await transporter.verify();
    const info = await transporter.sendMail({
      from: `BonusFatto Contatti <${smtpUser}>`,
      to: DESTINATION,
      replyTo: customerEmail,
      subject: `[BonusFatto] ${subject} · ${name}`,
      text: body,
      headers: {
        'X-BonusFatto-Service': 'CONTATTI',
      },
    });

    return res.status(200).json({
      ok: true,
      deliveredTo: DESTINATION,
      messageId: clean(info?.messageId || '', 240),
    });
  } catch (error) {
    console.error('BonusFatto contact delivery failed', {
      message: clean(error?.message || String(error), 500),
      responseCode: error?.responseCode || null,
      command: clean(error?.command || '', 80),
      code: clean(error?.code || '', 80),
    });
    return res.status(502).json({ ok: false, error: 'Non è stato possibile inviare la richiesta. Riprova tra poco.' });
  } finally {
    transporter.close();
  }
}
