import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTariPage } from '../lib/tari/mef.js';

test('considera trovato un Comune quando il MEF espone un PDF ufficiale anche senza etichetta TARI', () => {
  const html = '<html><body><a href="download_lib.php?key=abc&nome=400018_DIMUNIC-09mi26b240d.pdf">Delibera comunale 2026</a></body></html>';
  const out = parseTariPage(html, 'https://example.test');
  assert.equal(out.found, true);
  assert.equal(out.documents.length, 1);
});

test('nessun documento se non ci sono link download_lib', () => {
  const out = parseTariPage('<html><body>TARI 2026</body></html>', 'https://example.test');
  assert.equal(out.found, false);
  assert.equal(out.documents.length, 0);
});
