import { scrapeBatch, top100Municipalities } from '../lib/tariScraper.js';

function arg(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : '';
}

const all = top100Municipalities();
const requestedIstat = arg('--istat');
const offset = Math.max(0, Number(arg('--offset') || 0));
const limit = Math.min(100, Math.max(1, Number(arg('--limit') || 20)));

const comuni = requestedIstat
  ? all.filter((item) => item.istat === requestedIstat)
  : all.slice(offset, offset + limit);

if (!comuni.length) {
  console.error('Nessun Comune selezionato.');
  process.exit(1);
}

console.log(`BonusFatto TARI: elaborazione ${comuni.length} comuni`);
const result = await scrapeBatch(comuni);
console.log(JSON.stringify(result, null, 2));

if (result.some((item) => !item.ok)) process.exitCode = 1;
