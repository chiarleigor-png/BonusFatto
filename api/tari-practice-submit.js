import nodemailer from 'nodemailer';
import { randomUUID } from 'node:crypto';

const BACKOFFICE_EMAIL = 'pratiche@bonusfatto.it';
const MAX_TOTAL_ATTACHMENT_BYTES = 2_700_000;
const MAX_ATTACHMENTS = 8;

function clean(value, max = 1000) {
  return String(value ?? '').trim().slice(0, max);
}

function validEmail(value) {
  const email = clean(value, 320).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

function safeFilename(value) {
  return clean(value || 'allegato', 140)
    .replace(/["\r\n\\]/g, '_')
    .replace(/[^A-Za-z0-9À-ÿ._() -]/g, '_');
}

function safeContentType(value) {
  const type = clean(value || 'application/octet-stream', 100).toLowerCase();
  return /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/.test(type) ? type : 'application/octet-stream';
}

function practiceCode() {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  return `BF-TARI-${date}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function formatEuro(value) {
  const number = Number(value);
  return Number.isFinite(number)
    ? number.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
    : '-';
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
    return res.status(405).json({ ok: false, error: 'Metodo non consentito.' });
  }

  try {
    const paid = await verifyPaidSession(req.body?.sessionId);
    if (!paid) return res.status(403).json({ ok: false, error: 'Pagamento del servizio TARI non verificato.' });
  } catch {
    return res.status(502).json({ ok: false, error: 'Impossibile verificare il pagamento. Riprova tra poco.' });
  }

  const smtpUser = validEmail(process.env.PRACTICHE_SMTP_USER || process.env.SMTP_USER);
  const smtpPassword = String(process.env.PRACTICHE_SMTP_PASSWORD || process.env.SMTP_PASSWORD || '');
  const smtpHost = clean(process.env.SMTP_HOST || 'smtps.aruba.it', 255);
  const smtpPort = Number(process.env.SMTP_PORT || 465);

  if (!smtpUser || !smtpPassword || !smtpHost || !Number.isInteger(smtpPort)) {
    return res.status(503).json({ ok: false, error: 'Configurazione email backoffice incompleta.' });
  }

  const form = req.body?.form || {};
  const lookup = req.body?.lookup || {};
  const customerEmail = validEmail(form.email);
  const nome = clean(form.nome, 100);
  const cognome = clean(form.cognome, 100);
  const codiceFiscale = clean(form.codiceFiscale, 32).toUpperCase();
  const comuneTari = clean(form.comuneTari, 140);

  if (!nome || !cognome || !customerEmail || !codiceFiscale || !comuneTari) {
    return res.status(400).json({ ok: false, error: 'Dati obbligatori della pratica incompleti.' });
  }

  const incoming = Array.isArray(req.body?.attachments) ? req.body.attachments.slice(0, MAX_ATTACHMENTS) : [];
  if (!incoming.length) return res.status(400).json({ ok: false, error: 'Nessun allegato ricevuto.' });

  let totalBytes = 0;
  const attachments = [];
  const attachmentRows = [];

  for (const item of incoming) {
    const data = String(item?.data || '').replace(/\s+/g, '');
    if (!data || !/^[A-Za-z0-9+/]*={0,2}$/.test(data)) continue;
    const approxBytes = Math.floor((data.length * 3) / 4);
    totalBytes += approxBytes;
    if (totalBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
      return res.status(413).json({ ok: false, error: 'Gli allegati superano circa 2,7 MB complessivi. Riduci la dimensione dei file e riprova.' });
    }
    const role = clean(item?.role || 'allegato', 60);
    const filename = safeFilename(item?.filename);
    attachments.push({ filename, content: Buffer.from(data, 'base64'), contentType: safeContentType(item?.contentType) });
    attachmentRows.push(`- ${role}: ${filename}`);
  }

  if (attachments.length < 3) {
    return res.status(400).json({ ok: false, error: 'La pratica deve includere ISEE, documento di identità e delega firmata.' });
  }

  const code = practiceCode();
  const pecComune = validEmail(lookup?.pec) || 'da verificare';
  const pecConfidence = clean(lookup?.confidence || 'manuale', 40);
  const pecOffice = clean(lookup?.office || lookup?.entity || '', 180);
  const updatedAt = clean(lookup?.updatedAt || '', 40);

  const body = [
    'NUOVA PRATICA TARI BONUSFATTO',
    '',
    `Codice pratica: ${code}`,
    'Stato: DOCUMENTI RICEVUTI - DA VERIFICARE E INVIARE VIA PEC',
    `Ricevuta il: ${new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' })}`,
    '',
    'RICHIEDENTE',
    `Nome e cognome: ${nome} ${cognome}`,
    `Codice fiscale: ${codiceFiscale}`,
    `Email: ${customerEmail}`,
    `Residenza: ${clean(form.indirizzo, 220)} - ${clean(form.cap, 10)} ${clean(form.comuneResidenza, 140)} (${clean(form.provinciaResidenza, 10)})`,
    '',
    'PRATICA TARI',
    `Comune: ${comuneTari}`,
    `ISEE 2026: ${formatEuro(form.isee)}`,
    `Immobile / utenza: ${clean(form.indirizzoImmobile, 240) || '-'}`,
    `Codice utenza: ${clean(form.codiceUtenza, 120) || '-'}`,
    '',
    'PEC COMUNE INDIVIDUATA DA BONUSFATTO',
    `PEC: ${pecComune}`,
    `Affidabilità: ${pecConfidence}`,
    `Ufficio / ente: ${pecOffice || '-'}`,
    `Aggiornamento IndicePA: ${updatedAt || '-'}`,
    '',
    `ALLEGATI (${attachments.length})`,
    ...attachmentRows,
    '',
    'OPERAZIONE BACKOFFICE',
    '1. verificare completezza e leggibilità degli allegati;',
    '2. verificare la PEC dell’Ufficio Tributi / Comune;',
    '3. predisporre e inviare la PEC;',
    '4. conservare ricevuta di accettazione e consegna nella pratica.',
    '',
    'BonusFatto.it - LU.CA. S.r.l.s.',
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
      from: `BonusFatto Pratiche <${smtpUser}>`,
      to: BACKOFFICE_EMAIL,
      replyTo: customerEmail,
      subject: `[BonusFatto] Pratica TARI ${code} · ${comuneTari} · ${cognome} ${nome}`,
      text: body,
      attachments,
      headers: { 'X-BonusFatto-Practice': code, 'X-BonusFatto-Service': 'TARI' },
    });

    return res.status(200).json({ ok: true, practiceCode: code, deliveredTo: BACKOFFICE_EMAIL, attachmentCount: attachments.length, messageId: clean(info?.messageId || '', 240) });
  } catch (error) {
    console.error('BonusFatto TARI backoffice delivery failed', {
      message: clean(error?.message || String(error), 500), responseCode: error?.responseCode || null, command: clean(error?.command || '', 80), code: clean(error?.code || '', 80),
    });
    return res.status(502).json({ ok: false, error: 'Non è stato possibile recapitare la pratica al backoffice. Riprova tra poco.' });
  } finally {
    transporter.close();
  }
}
