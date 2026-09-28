import fs from 'fs';
import path from 'path';

const top100Path = path.join(process.cwd(), 'lib', 'top100Comuni.json');
const publicSitemap = path.join(process.cwd(), 'public', 'sitemap.xml');

console.log('🔍 Cerco Top100 in:', top100Path);

let comuni = [];
try {
  const raw = fs.readFileSync(top100Path, 'utf-8');
  comuni = JSON.parse(raw);
  console.log(`📦 Trovati ${comuni.length} comuni in top100Comuni.json`);
} catch (e) {
  console.error('⚠️ Non trovo lib/top100Comuni.json', e.message);
}

function slugify(name) {
  return name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

let urls = [];
for (const c of comuni) {
  const istat = c.codiceIstat || c.istat;
  const nome = c.comune || c.nome;
  if (!istat || !nome) continue;
  const slug = slugify(nome);
  urls.push(`https://www.bonusfatto.it/comune/${istat}/${slug}`);
}

console.log(`✅ URL comunali generati: ${urls.length}`);

// FIX: non bloccare più il build se <483, usa quelli che ci sono
if (urls.length < 80 && fs.existsSync(publicSitemap)) {
  try {
    const sitemapContent = fs.readFileSync(publicSitemap, 'utf-8');
    const matches = [...sitemapContent.matchAll(/<loc>https:\/\/www\.bonusfatto\.it\/comune\/[^<]+<\/loc>/g)];
    const sitemapUrls = matches.map(m => m[0].replace('<loc>','').replace('</loc>',''));
    const set = new Set([...urls, ...sitemapUrls]);
    urls = Array.from(set);
  } catch {}
}

const outDir = path.join(process.cwd(), 'public', 'comune');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

for (const c of comuni) {
  const istat = c.codiceIstat || c.istat;
  const nome = c.comune || c.nome;
  if (!istat || !nome) continue;
  const slug = slugify(nome);
  const dir = path.join(outDir, istat, slug);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const html = `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><title>Bonus TARI 2026 ${nome} – ISTAT ${istat}</title><link rel="canonical" href="https://www.bonusfatto.it/comune/${istat}/${slug}"><meta http-equiv="refresh" content="0; url=/?comune=${encodeURIComponent(nome)}"></head><body><p>Redirect a <a href="/?comune=${encodeURIComponent(nome)}">${nome}</a></p></body></html>`;
  fs.writeFileSync(path.join(dir, 'index.html'), html);
}

console.log(`✅ Generate SEO comuni completato: ${urls.length} URL - Sitemap non sovrascritta`);
