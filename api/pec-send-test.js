import nodemailer from 'nodemailer';
import { createHash } from 'node:crypto';

const ALLOWED_RECIPIENT_HASH = '9feb31c82e009049e56767cd28f23c232e82566ea7f84f239bece04d0365d5f8';
const MAX_TOTAL_ATTACHMENT_BYTES = 2_700_000;

function clean(value, max = 1000) {
  return String(value ?? '').trim().slice(0, max);
}

function validEmail(value) {
  const email = clean(value, 320).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

function isAllowedRecipient(email) {
  return createHash('sha256').update(email.toLowerCase(), 'utf8').digest('hex') === ALLOWED_RECIPIENT_HASH;
}

function boolEnv(value, fallback = true) {
  const raw = clean(value, 20).toLowerCase();
  if (!raw) return fallback;
  return !['0', 'false', 'no', 'off'].includes(raw);
}

function pecEnv() {
  const userRaw = process.env.PEC_USER || process.env.PEC_SMTP_USER || process.env.SMTP_PEC_USER || process.env.PEC_EMAIL || '';
  const passwordRaw = process.env.PEC_PASSWORD || process.env.PEC_SMTP_PASSWORD || process.env.SMTP_PEC_PASSWORD || '';
  const fromRaw = process.env.PEC_FROM || userRaw;
  const portRaw = Number(process.env.PEC_SMTP_PORT || 465);

  return {
    user: validEmail(userRaw),
    password: String(passwordRaw || ''),
    from: validEmail(fromRaw),
    host: clean(process.env.PEC_SMTP_HOST || 'smtps.pec.aruba.it', 200),
    port: Number.isInteger(portRaw) && portRaw > 0 ? portRaw : 465,
    secure: boolEnv(process.env.PEC_SMTP_SECURE, true),
    clientName: clean(process.env.PEC_SMTP_NAME || 'bonusfatto.it', 200),
    hasUser: Boolean(clean(userRaw)),
    hasPassword: Boolean(String(passwordRaw || '').trim()),
    hasFrom: Boolean(clean(fromRaw)),
  };
}

function safeFilename(value) {
  return clean(value || 'allegato', 120)
    .replace(/["\r\n\\]/g, '_')
    .replace(/[^A-Za-z0-9._() -]/g, '_');
}

function safeContentType(value) {
  const type = clean(value || 'application/octet-stream', 100).toLowerCase();
  return /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/.test(type) ? type : 'application/octet-stream';
}

function safeSmtpReply(error) {
  return clean(error?.response || error?.message || '', 500)
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ');
}

function friendlyMailerError(error) {
  const code = Number(error?.responseCode || 0);
  const command = clean(error?.command || '', 80);
  const reply = safeSmtpReply(error);
  if (code === 535) return `Autenticazione Aruba rifiutata (SMTP 535).${reply ? ` Risposta Aruba: ${reply}` : ''}`;
  if (code === 554) return `Aruba ha rifiutato il messaggio dopo il comando ${command || 'SMTP'} (SMTP 554).${reply ? ` Risposta Aruba: ${reply}` : ''}`;
  if (code) return `Server Aruba raggiunto, errore SMTP ${code}${command ? ` durante ${command}` : ''}.${reply ? ` Risposta Aruba: ${reply}` : ''}`;
  return reply || 'Connessione SMTP Aruba non riuscita.';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Metodo non consentito.' });
  }

  const env = pecEnv();
  if (!env.user || !env.password || !env.from) {
    const missing = [];
    if (!env.hasUser) missing.push('PEC_USER');
    else if (!env.user) missing.push('PEC_USER non valida');
    if (!env.hasPassword) missing.push('PEC_PASSWORD');
    if (!env.hasFrom) missing.push('PEC_FROM');
    else if (!env.from) missing.push('PEC_FROM non valida');
    return res.status(503).json({
      ok: false,
      error: `Configurazione PEC incompleta: ${missing.join(' + ')}. Verifica le variabili Vercel e poi esegui un nuovo Redeploy.`,
    });
  }

  const recipient = validEmail(req.body?.recipient);
  if (!recipient || !isAllowedRecipient(recipient)) {
    return res.status(403).json({ ok: false, error: 'Destinatario di test non autorizzato.' });
  }

  const comune = clean(req.body?.comune, 120);
  const isee = Number(req.body?.isee);
  const municipalPec = validEmail(req.body?.municipalPec);
  const attachments = Array.isArray(req.body?.attachments) ? req.body.attachments.slice(0, 8) : [];

  let totalBytes = 0;
  const mailAttachments = [];
  for (const item of attachments) {
    const data = String(item?.data || '').replace(/\s+/g, '');
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(data)) continue;
    const approxBytes = Math.floor((data.length * 3) / 4);
    totalBytes += approxBytes;
    if (totalBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
      return res.status(413).json({ ok: false, error: 'Allegati troppo pesanti per il test. Riduci la dimensione totale sotto circa 2,7 MB.' });
    }
    mailAttachments.push({
      filename: safeFilename(item?.filename),
      content: Buffer.from(data, 'base64'),
      contentType: safeContentType(item?.contentType),
    });
  }

  const subject = `[TEST BonusFatto] Pratica TARI ${comune || ''}`.trim();
  const text = [
    'TEST INVIO PEC BONUSFATTO',
    '',
    'Questa comunicazione e stata inviata esclusivamente per verificare il flusso tecnico della pratica TARI.',
    `Comune pratica: ${comune || '-'}`,
    `ISEE: ${Number.isFinite(isee) ? isee.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' }) : '-'}`,
    `PEC comunale individuata dal sistema (NON utilizzata nel test): ${municipalPec || 'non disponibile'}`,
    '',
    `Allegati inclusi: ${mailAttachments.length}`,
    '',
    'Nessuna comunicazione e stata inviata al Comune.',
    '',
    'BonusFatto.it - LU.CA. S.r.l.s.',
  ].join('\n');

  const transporter = nodemailer.createTransport({
    host: env.host,
    port: env.port,
    secure: env.secure,
    name: env.clientName,
    auth: {
      user: env.user,
      pass: env.password,
    },
    tls: {
      servername: env.host,
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2',
    },
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 30000,
    disableFileAccess: true,
    disableUrlAccess: true,
  });

  try {
    await transporter.verify();
    const info = await transporter.sendMail({
      envelope: { from: env.from, to: [recipient] },
      from: env.from,
      to: recipient,
      subject,
      text,
      attachments: mailAttachments,
      headers: {
        'X-BonusFatto-Test': 'TARI-PEC',
      },
    });

    return res.status(200).json({
      ok: true,
      sender: env.from,
      recipient,
      attachmentCount: mailAttachments.length,
      messageId: clean(info?.messageId || '', 200),
      response: clean(info?.response || '', 260),
      smtp: { host: env.host, port: env.port, secure: env.secure, clientName: env.clientName },
    });
  } catch (error) {
    const reply = safeSmtpReply(error);
    console.error('BonusFatto PEC Nodemailer test failed', {
      message: clean(error?.message || String(error), 500),
      responseCode: error?.responseCode || null,
      command: error?.command || null,
      code: error?.code || null,
      response: reply,
      smtpHost: env.host,
      smtpPort: env.port,
      smtpSecure: env.secure,
      smtpClientName: env.clientName,
    });
    return res.status(502).json({
      ok: false,
      error: `Invio PEC di test non riuscito. ${friendlyMailerError(error)}`,
      diagnostic: {
        responseCode: error?.responseCode || null,
        command: clean(error?.command || '', 80),
        code: clean(error?.code || '', 80),
        response: reply,
        smtp: { host: env.host, port: env.port, secure: env.secure, clientName: env.clientName },
      },
    });
  } finally {
    transporter.close();
  }
}
