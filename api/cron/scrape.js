import { scrapeBatch, top100Municipalities } from '../../lib/tariScraper.js';

export default async function handler(req, res) {
  const configuredSecret = String(process.env.CRON_SECRET || '').trim();
  if (configuredSecret) {
    const auth = String(req.headers.authorization || '');
    if (auth !== `Bearer ${configuredSecret}`) return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' });
  }

  const all = top100Municipalities();
  const dayIndex = Math.floor(Date.now() / 86400000);
  const batchIndex = dayIndex % 5;
  const start = batchIndex * 20;
  const comuni = all.slice(start, start + 20);
  const results = await scrapeBatch(comuni);

  return res.status(200).json({
    ok: results.every((item) => item.ok),
    batch: batchIndex + 1,
    start,
    count: comuni.length,
    success: results.filter((item) => item.ok).length,
    failed: results.filter((item) => !item.ok),
    results
  });
}
