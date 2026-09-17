import tls from 'node:tls';

function clean(value, max = 1200) {
  return String(value ?? '').trim().slice(0, max);
}

function readSmtpResponse(socket) {
  return new Promise((resolve, reject) => {
    let buffer = '';
    const timer = setTimeout(() => cleanup(new Error('Timeout SMTP PEC.')), 10000);
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

async function command(socket, value, expected) {
  if (value) socket.write(`${value}\r\n`);
  const response = await readSmtpResponse(socket);
  if (!expected.includes(response.code)) throw new Error(`SMTP PEC ${response.code}`);
  return response;
}

export default async function handler(req, res) {
  const temporaryProbe = req.method === 'GET' && String(req.query?.probe || '') === 'ready';
  if (req.method !== 'POST' && !temporaryProbe) {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Metodo non consentito.' });
  }

  const user = clean(process.env.PEC_USER, 320).toLowerCase();
  const password = String(process.env.PEC_PASSWORD || '');
  if (!user || !password) {
    return res.status(503).json({ ok: false, error: 'Credenziali PEC non configurate su Vercel.' });
  }

  const host = 'smtps.pec.aruba.it';
  const socket = tls.connect({ host, port: 465, servername: host, rejectUnauthorized: true });

  try {
    await new Promise((resolve, reject) => {
      socket.once('secureConnect', resolve);
      socket.once('error', reject);
    });

    let response = await readSmtpResponse(socket);
    if (response.code !== 220) throw new Error(`SMTP PEC ${response.code}`);
    await command(socket, 'EHLO bonusfatto.it', [250]);
    await command(socket, 'AUTH LOGIN', [334]);
    await command(socket, Buffer.from(user).toString('base64'), [334]);
    await command(socket, Buffer.from(password).toString('base64'), [235]);
    await command(socket, 'QUIT', [221]);

    return res.status(200).json({ ok: true, account: user, host, port: 465 });
  } catch (error) {
    console.error('BonusFatto PEC health failed', error?.message || error);
    return res.status(502).json({ ok: false, error: 'Connessione o autenticazione PEC non riuscita.' });
  } finally {
    if (!socket.destroyed) socket.end();
  }
}
