import fs from 'node:fs';
import { upsertMunicipalities } from '../lib/tari/supabase.js';

const COMUNI_URL = 'https://raw.githubusercontent.com/matteocontrini/comuni-json/master/comuni.json';

const response = await fetch(COMUNI_URL);
if (!response.ok) throw new Error(`Comuni source HTTP ${response.status}`);
const source = await response.json();

const rows = source.map((c) => ({
  istat: String(c.codice || c.istat || '').trim(),
  nome: String(c.nome || '').trim(),
  provincia: String(c.sigla || c.provincia?.codice || c.provincia?.nome || '').trim(),
  regione: String(c.regione?.nome || c.regione || '').trim(),
  codice_catastale: String(c.codiceCatastale || '').trim().toUpperCase(),
  status: 'pending',
  attempts: 0,
  source_label: 'MEF - Fiscalità locale - TARI 2026',
})).filter((c) => c.istat && c.nome && c.codice_catastale);

for (let i = 0; i < rows.length; i += 500) {
  await upsertMunicipalities(rows.slice(i, i + 500));
  console.log(`Seed ${Math.min(i + 500, rows.length)}/${rows.length}`);
}

console.log(`Seed completato: ${rows.length} comuni.`);
