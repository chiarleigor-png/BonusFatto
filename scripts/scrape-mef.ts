import { batchForToday, getTop100Comuni, scrapeBatch } from '../lib/tariScraper.js';

async function main() {
  const arg = process.argv.find((value) => value.startsWith('--batch='));
  const size = 20;
  const automatic = batchForToday(size);
  const requested = arg ? Number(arg.split('=')[1]) : automatic.group;
  const group = Number.isInteger(requested) && requested >= 0 && requested <= 4 ? requested : automatic.group;
  const entries = getTop100Comuni().slice(group * size, group * size + size);
  const results = await scrapeBatch(entries, 4);
  const failed = results.filter((item) => !item.ok);
  console.log(JSON.stringify({ group, processed: results.length, failed: failed.length, results }, null, 2));
  if (failed.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
