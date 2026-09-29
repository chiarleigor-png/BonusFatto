import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMefUrl, parseTariPage } from '../lib/tari/mef.js';

test('buildMefUrl usa anno 2026 e codice catastale', () => {
  const url = buildMefUrl('C933');
  assert.match(url, /annosel=2026/);
  assert.match(url, /cc=C933/);
});

test('parseTariPage estrae link PDF TARI', () => {
  const html = '<html><body><h2>TARI</h2><a href="download_lib.php?key=abc&nome=404119_DIMUNIC-09mb26a759d.pdf">404119_DIMUNIC-09mb26a759d.pdf</a><span>15-07-2026</span></body></html>';
  const out = parseTariPage(html, 'https://example.test');
  assert.equal(out.found, true);
  assert.equal(out.documents.length, 1);
  assert.match(out.documents[0].url, /download_lib\.php/);
});
