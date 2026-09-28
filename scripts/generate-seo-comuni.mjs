
// scripts/generate-seo-comuni.mjs - VERSIONE 7894 COMUNI COMPLETA
import fs from 'fs';
import path from 'path';

const TOP100_PATH = path.join(process.cwd(), 'lib', 'top100Comuni.json');
const SITEMAP_PATH = path.join(process.cwd(), 'public', 'sitemap.xml');

function slugify(name) {
  return name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function getComuni() {
  // 1. Prova a scaricare lista completa 7894 da GitHub (funziona su Vercel)
  try {
    console.log('🌍 Scarico lista 7894 comuni da GitHub...');
    const res = await fetch('https://raw.githubusercontent.com/matteocontrini/comuni-json/master/comuni.json');
    if (res.ok) {
      const data = await res.json();
      console.log(`✅ Scaricati ${data.length} comuni da GitHub`);
      // data ha formato {nome, codice, provincia...} mappiamo
      return data.map(c => ({
        nome: c.nome,
        istat: c.codice || c.istat,
        provincia: c.provincia?.nome || c.provincia || '',
        regione: c.regione?.nome || c.regione || ''
      })).filter(c => c.istat);
    }
  } catch (e) {
    console.warn('⚠️ Fetch GitHub fallito:', e.message);
  }

  // 2. Fallback locale top100 + Collegno + Costarainera
  try {
    const raw = fs.readFileSync(TOP100_PATH, 'utf-8');
    const comuni = JSON.parse(raw);
    console.log(`📦 Fallback locale: ${comuni.length} comuni`);
    // Aggiungi Collegno se manca
    if (!comuni.find(c => (c.istat||c.codiceIstat)==='001090')) {
      comuni.push({ nome: 'Collegno', istat: '001090', provincia: 'TO', regione: 'Piemonte' });
    }
    if (!comuni.find(c => (c.istat||c.codiceIstat)==='008024')) {
      comuni.push({ nome: 'Costarainera', istat: '008024', provincia: 'IM', regione: 'Liguria' });
    }
    return comuni;
  } catch (e) {
    console.error('❌ Nessun file comuni trovato');
    return [];
  }
}

const comuni = await getComuni();

let urls = [];
for (const c of comuni) {
  const istat = c.istat || c.codiceIstat || c.codice;
  const nome = c.nome || c.comune;
  if (!istat || !nome) continue;
  const slug = slugify(nome);
  urls.push(`https://www.bonusfatto.it/comune/${istat}/${slug}`);
}

console.log(`✅ URL comunali generati: ${urls.length} (target 7894)`);

// Genera cartelle SEO per OGNI comune (evita 404)
const outDir = path.join(process.cwd(), 'public', 'comune');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

for (const c of comuni) {
  const istat = c.istat || c.codiceIstat || c.codice;
  const nome = c.nome || c.comune;
  if (!istat || !nome) continue;
  const slug = slugify(nome);
  const dir = path.join(outDir, istat, slug);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const html = `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><title>Bonus 2026 ${nome} – ISTAT ${istat} – Tutti i bonus ISEE ed età</title><meta name="description" content="Bonus 2026 ${nome} (${istat}) – ISEE, età figli, TARI, trasporto, mensa, asilo"><link rel="canonical" href="https://www.bonusfatto.it/comune/${istat}/${slug}"><meta http-equiv="refresh" content="0; url=/?comune=${encodeURIComponent(nome)}"></head><body><p>Redirect a <a href="/?comune=${encodeURIComponent(nome)}">${nome}</a></p></body></html>`;
  fs.writeFileSync(path.join(dir, 'index.html'), html);
}

// Genera sitemap.xml COMPLETA con tutti i comuni
let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://www.bonusfatto.it/</loc><priority>1.0</priority><changefreq>daily</changefreq></url>
  <url><loc>https://www.bonusfatto.it/bonus</loc><priority>0.9</priority><changefreq>weekly</changefreq></url>
`;
for (const c of comuni) {
  const istat = c.istat || c.codiceIstat || c.codice;
  const nome = c.nome || c.comune;
  if (!istat || !nome) continue;
  const slug = slugify(nome);
  sitemap += `  <url><loc>https://www.bonusfatto.it/comune/${istat}/${slug}</loc><priority>0.8</priority><changefreq>weekly</changefreq></url>\n`;
}
sitemap += '</urlset>';

fs.writeFileSync(SITEMAP_PATH, sitemap);
console.log(`✅ Sitemap generata: ${SITEMAP_PATH} con ${urls.length + 2} URL`);
console.log(`✅ SEO comuni generato: ${comuni.length} cartelle in public/comune/`);
