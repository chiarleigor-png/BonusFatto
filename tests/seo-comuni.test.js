import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();

test('genera i 160 Comuni SEO e include le guide nella sitemap', () => {
  execFileSync(process.execPath, ['scripts/generate-guides.mjs'], { cwd: root });
  execFileSync(process.execPath, ['scripts/generate-seo-comuni.mjs'], { cwd: root });
  const selected = JSON.parse(fs.readFileSync(path.join(root, 'lib', 'comuniSeo.json'), 'utf-8'));
  assert.equal(selected.length, 160);
  assert.equal(new Set(selected.map((comune) => comune.regione)).size, 20);
  assert.equal(new Set(selected.map((comune) => comune.istat)).size, 160);

  const torino = fs.readFileSync(path.join(root, 'public', 'comune', '001272', 'torino', 'index.html'), 'utf-8');
  assert.match(torino, /<h1>Bonus e agevolazioni 2026 a Torino<\/h1>/);
  assert.match(torino, /rel="canonical" href="https:\/\/www\.bonusfatto\.it\/comune\/001272\/torino"/);
  assert.doesNotMatch(torino, /http-equiv="refresh"/i);
  assert.equal(fs.existsSync(path.join(root, 'public', 'comune', '001038', 'bruino')), false);

  const sitemap = fs.readFileSync(path.join(root, 'public', 'sitemap.xml'), 'utf-8');
  assert.equal((sitemap.match(/<loc>/g) || []).length, 187);
  assert.equal((sitemap.match(/\/comune\//g) || []).length, 160);
  assert.equal((sitemap.match(/\/guide-bonus\//g) || []).length, 25);
  assert.doesNotMatch(sitemap, /\/comune\/001038\/bruino/);

  const bonusIndex = fs.readFileSync(path.join(root, 'public', 'bonus', 'index.html'), 'utf-8');
  assert.equal((bonusIndex.match(/href="\/comune\//g) || []).length, 160);

  const vercelConfig = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf-8'));
  const fallback = vercelConfig.rewrites.find((rule) => rule.source === '/comune/:istat/:slug');
  assert.equal(fallback?.destination, '/api/gone');
});
