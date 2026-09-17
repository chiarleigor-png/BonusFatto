import nodemailer from 'nodemailer';
import { randomUUID } from 'node:crypto';

const BACKOFFICE_EMAIL = 'pratiche@bonusfatto.it';
const ALLOWED_CHANNELS = new Set(['email', 'whatsapp', 'both']);

function clean(value, max = 1000) {
  return String(value ?? '').trim().slice(0, max);
}

function validEmail(value) {
  const email = clean(value, 320).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

function activationCode() {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  return `BF-ALERT-${date}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function channelLabel(channel) {
  if (channel === 'whatsapp') return 'WhatsApp';
  if (channel === 'both') return 'Email + WhatsApp';
  return 'Email';
}

function formatEuro(value) {
  const number = Number(value);
  return Number.isFinite(number)
    ? number.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
    : '-';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Metodo non consentito.' });
  }

  const smtpUser = validEmail(process.env.PRACTICHE_SMTP_USER || process.env.SMTP_USER);
  const smtpPassword = String(process.env.PRACTICHE_SMTP_PASSWORD || process.env.SMTP_PASSWORD || '');
  const smtpHost = clean(process.env.SMTP_HOST || 'smtps.aruba.it', 255);
  const smtpPort = Number(process.env.SMTP_PORT || 465);

  if (!smtpUser || !smtpPassword || !smtpHost || !Number.isInteger(smtpPort)) {
    return res.status(503).json({ ok: false, error: 'Configurazione email del servizio incompleta.' });
  }

  const form = req.body?.form || {};
  const entry = req.body?.entry || {};
  const nome = clean(form.nome, 100);
  const cognome = clean(form.cognome, 100);
  const customerEmail = validEmail(form.email);
  const channel = clean(form.channel, 20).toLowerCase();
  const whatsapp = clean(form.whatsapp, 50);
  const consent = form.consent === true;

  if (!nome || !cognome || !customerEmail || !ALLOWED_CHANNELS.has(channel) || !consent) {
    return res.status(400).json({ ok: false, error: 'Completa i dati obbligatori e conferma il consenso agli aggiornamenti.' });
  }
  if ((channel === 'whatsapp' || channel === 'both') && !whatsapp) {
    return res.status(400).json({ ok: false, error: 'Inserisci il numero WhatsApp per il canale selezionato.' });
  }

  const code = activationCode();
  const activatedAt = new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' });
  const comune = clean(entry.comune, 140) || '-';
  const figli = Number.isFinite(Number(entry.figli)) ? Number(entry.figli) : 0;
  const label = channelLabel(channel);

  const internalBody = [
    'NUOVA ATTIVAZIONE SERVIZIO CONTINUATIVO BONUSFATTO',
    '',
    `Codice attivazione: ${code}`,
    'Stato: RICHIESTA RICEVUTA - TEST OPERATIVO',
    `Ricevuta il: ${activatedAt}`,
    '',
    'CLIENTE',
    `Nome e cognome: ${nome} ${cognome}`,
    `Email: ${customerEmail}`,
    `Canale scelto: ${label}`,
    `WhatsApp: ${whatsapp || '-'}`,
    `Consenso aggiornamenti: ${consent ? 'SI' : 'NO'}`,
    '',
    'PROFILO DI PARTENZA',
    `Comune: ${comune}`,
    `ISEE: ${formatEuro(entry.isee)}`,
    `Figli indicati: ${figli}`,
    '',
    'OPERAZIONE BACKOFFICE',
    '1. conservare il codice attivazione;',
    '2. associare il recapito ai futuri aggiornamenti BonusFatto;',
    '3. per WhatsApp verificare il numero prima dell’attivazione del canale definitivo;',
    '4. il consenso potrà essere revocato dal cliente in qualsiasi momento.',
    '',
    'BonusFatto.it - LU.CA. S.r.l.s.',
  ].join('\r\n');

  const customerBody = [
    `Ciao ${nome},`,
    '',
    'la tua richiesta di attivazione del Servizio continuativo BonusFatto è stata ricevuta correttamente.',
    '',
    `Codice attivazione: ${code}`,
    `Canale scelto: ${label}`,
    ...(whatsapp ? [`Numero WhatsApp indicato: ${whatsapp}`] : []),
    `Comune di riferimento: ${comune}`,
    `ISEE di partenza: ${formatEuro(entry.isee)}`,
    `Figli indicati: ${figli}`,
    '',
    'In questa fase di test ricevi questa email come conferma reale della registrazione. Gli aggiornamenti periodici automatici non vengono ancora inviati.',
    'Quando il servizio sarà attivo in produzione, riceverai avvisi su novità, scadenze e opportunità Bonus/TARI attraverso i canali selezionati.',
    '',
    'Potrai chiedere in qualsiasi momento la modifica del canale o la revoca del consenso.',
    '',
    'BonusFatto.it',
    'Servizio gestito da LU.CA. S.r.l.s.',
    'pratiche@bonusfatto.it',
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

    let internalSent = false;
    let internalMessageId = '';
    try {
      const internalInfo = await transporter.sendMail({
        from: `BonusFatto Pratiche <${smtpUser}>`,
        to: BACKOFFICE_EMAIL,
        replyTo: customerEmail,
        subject: `[BonusFatto] Servizio continuativo ${code} · ${cognome} ${nome}`,
        text: internalBody,
        headers: {
          'X-BonusFatto-Activation': code,
          'X-BonusFatto-Service': 'CONTINUATIVO',
        },
      });
      internalSent = true;
      internalMessageId = clean(internalInfo?.messageId || '', 240);
    } catch (internalError) {
      console.error('BonusFatto continuous internal delivery failed', {
        message: clean(internalError?.message || String(internalError), 500),
        responseCode: internalError?.responseCode || null,
        command: clean(internalError?.command || '', 80),
        code: clean(internalError?.code || '', 80),
      });
    }

    const customerInfo = await transporter.sendMail({
      from: `BonusFatto Pratiche <${smtpUser}>`,
      to: customerEmail,
      bcc: BACKOFFICE_EMAIL,
      replyTo: BACKOFFICE_EMAIL,
      subject: `BonusFatto - Servizio continuativo ${code}`,
      text: customerBody,
      headers: {
        'X-BonusFatto-Activation': code,
        'X-BonusFatto-Service': 'CONTINUATIVO-CONFERMA',
      },
    });

    return res.status(200).json({
      ok: true,
      activationCode: code,
      deliveredTo: BACKOFFICE_EMAIL,
      internalSent,
      confirmationSent: true,
      messageId: internalMessageId,
      confirmationMessageId: clean(customerInfo?.messageId || '', 240),
      backofficeCopy: true,
    });
  } catch (error) {
    console.error('BonusFatto continuous activation failed', {
      message: clean(error?.message || String(error), 500),
      responseCode: error?.responseCode || null,
      command: clean(error?.command || '', 80),
      code: clean(error?.code || '', 80),
    });
    return res.status(502).json({
      ok: false,
      error: 'Non è stato possibile registrare il servizio continuativo. Riprova tra poco.',
    });
  } finally {
    transporter.close();
  }
}
