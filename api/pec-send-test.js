import tls from 'node:tls';
import { createHash, randomUUID } from 'node:crypto';

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

function pecEnv() {
  const userRaw = process.env.PEC_USER || process.env.PEC_SMTP_USER || process.env.SMTP_PEC_USER || process.env.PEC_EMAIL || '';
  const passwordRaw = process.env.PEC_PASSWORD || process.env.PEC_SMTP_PASSWORD || process.env.SMTP_PEC_PASSWORD || '';
  return {
    user: validEmail(userRaw),
    password: String(passwordRaw || ''),
    hasUser: Boolean(clean(userRaw)),
    hasPassword: Boolean(String(passwordRaw || '').trim()),
  };
}

function readSmtpResponse(socket) {
  return new Promise((resolve, reject) => {
    let buffer = '';
    const timer = setTimeout(() => cleanup(new Error('Timeout SMTP PEC.')), 15000);
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

function smtpError(stage, response) {
  const error = new Error(`SMTP ${response?.code || 'ERR'} @ ${stage}`);
  error.smtpCode = response?.code || 0;
  error.smtpStage = stage;
  return error;
}

async function command(socket, value, expected, stage) {
  if (value) socket.write(`${value}\r\n`);
  const response = await readSmtpResponse(socket);
  if (!expected.includes(response.code)) throw smtpError(stage, response);
  return response;
}

function safeFilename(value) {
  return clean(value || 'allegato', 160).replace(/["\r\n]/g, '_');
}

function wrapBase64(value) {
  return String(value || '').match(/.{1,76}/g)?.join('\r\n') || '';
}

function friendlySmtpError(error) {
  const code = Number(error?.smtpCode || 0);
  const stage = String(error?.smtpStage || 'connessione');

  if (code === 535) {
    return 'Autenticazione Aruba rifiutata (SMTP 535). Verifica PEC_USER e PEC_PASSWORD.';
  }
  if (code === 554 && stage === 'MAIL FROM') {
    return 'Aruba ha autenticato la PEC ma ha rifiutato il mittente (SMTP 554 · MAIL FROM). Verifichiamo che il mittente coincida esattamente con la casella PEC autenticata.';
  }
  if (code === 554 && stage === 'RCPT TO') {
    return 'Aruba ha autenticato la PEC ma ha rifiutato il destinatario di test (SMTP 554 · RCPT TO).';
  }
  if (code === 554 && stage === 'DATA') {
    return 'Aruba ha autenticato mittente e destinatario ma ha rifiutato l’avvio del messaggio (SMTP 554 · DATA).';
  }
  if (code === 554 && stage === 'ACCETTAZIONE MESSAGGIO') {
    return 'Aruba ha accettato login, mittente e destinatario, ma ha rifiutato il contenuto finale del messaggio (SMTP 554 · dopo DATA).';
  }
  if (code) return `Server Aruba raggiunto, errore SMTP ${code} nella fase ${stage}.`;
  return 'Connessione SMTP Aruba non riuscita.';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Metodo non consentito.' });
  }

  const env = pecEnv();
  if (!env.user || !env.password) {
    const missing = [];
    if (!env.hasUser) missing.push('PEC_USER');
    else if (!env.user) missing.push('PEC_USER non valida');
    if (!env.hasPassword) missing.push('PEC_PASSWORD');
    return res.status(503).json({
      ok: false,
      error: `Configurazione PEC incompleta: ${missing.join(' + ')}. Verifica che le variabili siano abilitate per Production e poi esegui un nuovo Redeploy.`,
      env: { userConfigured: env.hasUser, passwordConfigured: env.hasPassword },
    });
  }

  const pecUser = env.user;
  const pecPassword = env.password;
  const recipient = validEmail(req.body?.recipient);
  if (!recipient || !isAllowedRecipient(recipient)) {
    return res.status(403).json({ ok: false, error: 'Destinatario di test non autorizzato.' });
  }

  const comune = clean(req.body?.comune, 120);
  const isee = Number(req.body?.isee);
  const municipalPec = validEmail(req.body?.municipalPec);
  const attachments = Array.isArray(req.body?.attachments) ? req.body.attachments.slice(0, 8) : [];

  let totalBytes = 0;
  const safeAttachments = [];
  for (const item of attachments) {
    const data = String(item?.data || '').replace(/\s+/g, '');
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(data)) continue;
    const approxBytes = Math.floor((data.length * 3) / 4);
    totalBytes += approxBytes;
    if (totalBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
      return res.status(413).json({ ok: false, error: 'Allegati troppo pesanti per il test. Riduci la dimensione totale sotto circa 2,7 MB.' });
    }
    safeAttachments.push({
      filename: safeFilename(item?.filename),
      contentType: clean(item?.contentType || 'application/octet-stream', 100),
      data,
    });
  }

  const subject = `[TEST BonusFatto] Pratica TARI ${comune || ''}`.trim();
  const textBody = [
    'TEST INVIO PEC BONUSFATTO',
    '',
    'Questa comunicazione è stata inviata esclusivamente per verificare il flusso tecnico della pratica TARI.',
    `Comune pratica: ${comune || '-'}`,
    `ISEE: ${Number.isFinite(isee) ? isee.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' }) : '-'}`,
    `PEC comunale individuata dal sistema (NON utilizzata nel test): ${municipalPec || 'non disponibile'}`,
    '',
    `Allegati inclusi: ${safeAttachments.length}`,
    '',
    'Nessuna comunicazione è stata inviata al Comune.',
    '',
    'BonusFatto.it - LU.CA. S.r.l.s.',
  ].join('\r\n');

  const boundary = `----BonusFattoPEC-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const messageId = `<${randomUUID()}@bonusfatto.it>`;
  const mime = [
    `From: ${pecUser}`,
    `To: ${recipient}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: ${messageId}`,
    `Subject: ${subject.replace(/[\r\n]+/g, ' ')}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    textBody,
    '',
    ...safeAttachments.flatMap((attachment) => [
      `--${boundary}`,
      `Content-Type: ${attachment.contentType}; name="${attachment.filename}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${attachment.filename}"`,
      '',
      wrapBase64(attachment.data),
      '',
    ]),
    `--${boundary}--`,
    '',
  ].join('\r\n');

  const host = 'smtps.pec.aruba.it';
  const socket = tls.connect({ host, port: 465, servername: host, rejectUnauthorized: true });

  try {
    await new Promise((resolve, reject) => {
      socket.once('secureConnect', resolve);
      socket.once('error', reject);
    });

    let response = await readSmtpResponse(socket);
    if (response.code !== 220) throw smtpError('GREETING', response);

    await command(socket, 'EHLO bonusfatto.it', [250], 'EHLO');
    await command(socket, 'AUTH LOGIN', [334], 'AUTH LOGIN');
    await command(socket, Buffer.from(pecUser).toString('base64'), [334], 'AUTH USER');
    await command(socket, Buffer.from(pecPassword).toString('base64'), [235], 'AUTH PASSWORD');
    await command(socket, `MAIL FROM:<${pecUser}>`, [250], 'MAIL FROM');
    await command(socket, `RCPT TO:<${recipient}>`, [250, 251], 'RCPT TO');
    await command(socket, 'DATA', [354], 'DATA');

    socket.write(`${mime}\r\n.\r\n`);
    response = await readSmtpResponse(socket);
    if (response.code !== 250) throw smtpError('ACCETTAZIONE MESSAGGIO', response);

    await command(socket, 'QUIT', [221], 'QUIT');

    return res.status(200).json({ ok: true, sender: pecUser, recipient, attachmentCount: safeAttachments.length });
  } catch (error) {
    console.error('BonusFatto PEC send test failed', {
      message: error?.message || String(error),
      smtpCode: error?.smtpCode || null,
      smtpStage: error?.smtpStage || null,
    });
    return res.status(502).json({
      ok: false,
      error: `Invio PEC di test non riuscito. ${friendlySmtpError(error)}`,
      diagnostic: {
        smtpCode: error?.smtpCode || null,
        smtpStage: error?.smtpStage || null,
      },
    });
  } finally {
    if (!socket.destroyed) socket.end();
  }
}
