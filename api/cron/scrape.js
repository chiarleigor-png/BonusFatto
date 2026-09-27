import { batchForToday, scrapeBatch } from '../../lib/tariScraper.js';

export const maxDuration = 300;

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Metodo non consentito.' });
  }
  const secret = String(process.env.CRON_SECRET || '').trim();
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Non autorizzato.' });
  }
  const batch = batchForToday(20);
  const results = await scrapeBatch(batch.comuni, 4);
  const failed = results.filter((item) => !item.ok);
  return res.status(failed.length === results.length ? 502 : 200).json({ ok: failed.length < results.length, batch: batch.group, start: batch.start, processed: results.length, failed: failed.length, results });
}
