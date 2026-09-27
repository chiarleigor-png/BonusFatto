import { scrapeBatch, top100Municipalities } from '../lib/tariScraper.js';

const size = 20;
const arg = process.argv.find((value) => value.startsWith('--batch='));
const all = top100Municipalities();
const automatic = Math.floor(Date.now() / 86400000) % Math.ceil(all.length / size);
const requested = arg ? Number(arg.split('=')[1]) : automatic;
const batch = Number.isInteger(requested) && requested >= 0 && requested < Math.ceil(all.length / size)
  ? requested
  : automatic;
const comuni = all.slice(batch * size, batch * size + size);

scrapeBatch(comuni, 4)
  .then((results) => {
    const failed = results.filter((item) => !item.ok);
    console.log(JSON.stringify({ batch, processed: results.length, failed: failed.length, results }, null, 2));
    if (failed.length) process.exitCode = 1;
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
