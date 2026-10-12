import fs from 'fs';
import path from 'path';

const SITE_URL = 'https://www.bonusfatto.it';
const COMUNI_PATH = path.join(process.cwd(), 'lib', 'comuniSeo.json');
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const COMUNI_OUT_DIR = path.join(PUBLIC_DIR, 'comune');
const BONUS_INDEX_PATH = path.join(PUBLIC_DIR, 'bonus', 'index.html');
const SITEMAP_PATH = path.join(PUBLIC_DIR, 'sitemap.xml');
const GUIDES_DIR = path.join(PUBLIC_DIR, 'guide-bonus');

function slugify(name) {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function loadComuni() {
  const comuni = JSON.parse(fs.readFileSync(COMUNI_PATH, 'utf-8'));
  if (!Array.isArray(comuni) || comuni.length === 0 || comuni.length >= 200) {
    throw new Error('La lista SEO deve contenere da 1 a 199 Comuni.');
  }
  const istatCodes = new Set();
  const regions = new Set();
  for (const comune of comuni) {
    if (!comune.nome || !/^\d{6}$/.test(String(comune.istat)) || !comune.provincia || !comune.regione) {
      throw new Error(`Comune SEO non valido: ${JSON.stringify(comune)}`);
    }
    if (istatCodes.has(comune.istat)) throw new Error(`Codice ISTAT duplicato: ${comune.istat}`);
    istatCodes.add(comune.istat);
    regions.add(comune.regione);
  }
  if (regions.size !== 20) throw new Error(`Copertura regionale incompleta: ${regions.size}/20 regioni.`);
  return comuni;
}

const pageCss = `:root{color-scheme:light;--ink:#182018;--muted:#566157;--brand:#176b45;--accent:#ffd84d;--paper:#fff9e6;--card:#fff;--line:#dfe6dc}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:Inter,Arial,sans-serif;line-height:1.6}a{color:var(--brand)}header,main,footer{width:min(920px,calc(100% - 32px));margin:auto}header{padding:26px 0}.brand{font-size:1.35rem;font-weight:800;text-decoration:none;color:var(--ink)}.brand span{color:var(--brand)}main{padding:34px;background:var(--card);border:1px solid var(--line);border-radius:24px;box-shadow:0 16px 40px rgba(24,32,24,.08)}.eyebrow{font-weight:800;color:var(--brand);text-transform:uppercase;letter-spacing:.08em;font-size:.78rem}h1{font-size:clamp(2rem,6vw,3.7rem);line-height:1.05;margin:.45rem 0 1rem}h2{margin-top:2rem}.lead{font-size:1.15rem;color:var(--muted);max-width:70ch}.facts{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:28px 0}.fact{padding:16px;border-radius:16px;background:#f5f8f3}.fact span{display:block;color:var(--muted);font-size:.8rem}.fact strong{font-size:1.05rem}.cta{display:inline-block;margin-top:18px;padding:13px 20px;border-radius:999px;background:var(--brand);color:#fff;text-decoration:none;font-weight:800}.note{padding:16px;border-left:4px solid var(--accent);background:#fffbed}footer{padding:28px 0 42px;color:var(--muted);font-size:.9rem}@media(max-width:640px){main{padding:24px}.facts{grid-template-columns:1fr}}`;

function comunePage(comune) {
  const nome = escapeHtml(comune.nome);
  const slug = slugify(comune.nome);
  const canonical = `${SITE_URL}/comune/${comune.istat}/${slug}`;
  const description = `Bonus e agevolazioni 2026 per chi vive a ${comune.nome}: verifica requisiti ISEE, famiglia e misure locali del Comune.`;
  const structuredData = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'WebPage',
    name: `Bonus e agevolazioni 2026 a ${comune.nome}`, description, url: canonical,
    about: { '@type': 'Place', name: comune.nome,
      containedInPlace: { '@type': 'AdministrativeArea', name: comune.regione } },
  }).replaceAll('<', '\\u003c');
  return `<!doctype html><html lang="it"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bonus e agevolazioni 2026 a ${nome} | BonusFatto.it</title><meta name="description" content="${escapeHtml(description)}"><link rel="canonical" href="${canonical}"><meta property="og:type" content="website"><meta property="og:title" content="Bonus e agevolazioni 2026 a ${nome}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${SITE_URL}/og-image.png?v=2"><meta name="twitter:card" content="summary_large_image"><link rel="icon" type="image/png" href="/favicon.png?v=2"><script type="application/ld+json">${structuredData}</script><style>${pageCss}</style></head><body><header><a class="brand" href="/">BonusFatto<span>.it</span></a></header><main><p class="eyebrow">Comune di ${nome}</p><h1>Bonus e agevolazioni 2026 a ${nome}</h1><p class="lead">Una guida iniziale per verificare le misure nazionali e locali che possono riguardare chi risiede a ${nome}. Il risultato dipende da ISEE, composizione familiare e requisiti previsti dai singoli bandi.</p><div class="facts"><div class="fact"><span>Regione</span><strong>${escapeHtml(comune.regione)}</strong></div><div class="fact"><span>Provincia</span><strong>${escapeHtml(comune.provincia)}</strong></div><div class="fact"><span>Codice ISTAT</span><strong>${escapeHtml(comune.istat)}</strong></div></div><h2>Cosa puoi verificare</h2><p>Con BonusFatto puoi effettuare una prima verifica orientativa di bonus collegati all’ISEE, alla famiglia, alle utenze e alla residenza. Per le agevolazioni comunali, come eventuali riduzioni TARI, trasporto, mensa o servizi educativi, requisiti e scadenze possono variare.</p><p class="note"><strong>Importante:</strong> questa pagina è informativa e non sostituisce i bandi o le comunicazioni ufficiali del Comune di ${nome} e degli enti competenti.</p><a class="cta" href="/">Verifica i bonus per la tua famiglia</a></main><footer><a href="/bonus">Consulta i principali Comuni</a> · <a href="/">Torna alla home</a></footer></body></html>`;
}

function bonusIndex(comuni) {
  const grouped = Map.groupBy(comuni, (comune) => comune.regione);
  const sections = [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b, 'it'))
    .map(([regione, rows]) => `<section><h2>${escapeHtml(regione)}</h2><ul>${rows.map((comune) => `<li><a href="/comune/${comune.istat}/${slugify(comune.nome)}">${escapeHtml(comune.nome)}</a> <span>· ${escapeHtml(comune.provincia)}</span></li>`).join('')}</ul></section>`).join('');
  const css = `:root{--ink:#182018;--muted:#566157;--brand:#176b45;--paper:#fff9e6;--card:#fff;--line:#dfe6dc}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:Inter,Arial,sans-serif;line-height:1.55}header,main,footer{width:min(1040px,calc(100% - 32px));margin:auto}header{padding:26px 0}.brand{font-size:1.35rem;font-weight:800;text-decoration:none;color:var(--ink)}.brand span{color:var(--brand)}main{padding-bottom:28px}h1{font-size:clamp(2rem,5vw,3.4rem);line-height:1.08;margin:.4rem 0}.lead{color:var(--muted);max-width:70ch}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-top:30px}section{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:20px}h2{margin:0 0 10px}ul{list-style:none;padding:0;margin:0;columns:2}li{break-inside:avoid;margin:.35rem 0}li span{color:var(--muted);font-size:.84rem}a{color:var(--brand)}footer{padding:20px 0 40px;color:var(--muted)}@media(max-width:760px){.grid{grid-template-columns:1fr}ul{columns:1}}`;
  return `<!doctype html><html lang="it"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bonus 2026 nei principali Comuni italiani | BonusFatto.it</title><meta name="description" content="Consulta le pagine BonusFatto dedicate ai principali Comuni di ogni regione italiana."><link rel="canonical" href="${SITE_URL}/bonus"><link rel="icon" type="image/png" href="/favicon.png?v=2"><style>${css}</style></head><body><header><a class="brand" href="/">BonusFatto<span>.it</span></a></header><main><p>GUIDE LOCALI</p><h1>Bonus nei principali Comuni italiani</h1><p class="lead">Abbiamo selezionato otto Comuni per ogni regione, privilegiando quelli con più residenti. Le pagine aiutano a orientarsi tra misure nazionali e possibili agevolazioni locali.</p><div class="grid">${sections}</div></main><footer><a href="/">Torna alla home</a></footer></body></html>`;
}

const comuni = loadComuni();
const urls = comuni.map((comune) => `${SITE_URL}/comune/${comune.istat}/${slugify(comune.nome)}`);
const guideUrls = fs.existsSync(GUIDES_DIR)
  ? fs.readdirSync(GUIDES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(GUIDES_DIR, entry.name, 'index.html')))
    .map((entry) => `${SITE_URL}/guide-bonus/${entry.name}/`)
    .sort()
  : [];
fs.rmSync(COMUNI_OUT_DIR, { recursive: true, force: true });
for (const comune of comuni) {
  const dir = path.join(COMUNI_OUT_DIR, comune.istat, slugify(comune.nome));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), comunePage(comune));
}
fs.mkdirSync(path.dirname(BONUS_INDEX_PATH), { recursive: true });
fs.writeFileSync(BONUS_INDEX_PATH, bonusIndex(comuni));
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${SITE_URL}/</loc><priority>1.0</priority><changefreq>daily</changefreq></url>\n  <url><loc>${SITE_URL}/bonus</loc><priority>0.9</priority><changefreq>weekly</changefreq></url>\n  <url><loc>${SITE_URL}/guide-bonus/</loc><priority>0.9</priority><changefreq>weekly</changefreq></url>\n${urls.map((url) => `  <url><loc>${url}</loc><priority>0.8</priority><changefreq>weekly</changefreq></url>`).join('\n')}\n${guideUrls.map((url) => `  <url><loc>${url}</loc><priority>0.8</priority><changefreq>weekly</changefreq></url>`).join('\n')}\n</urlset>`;
fs.writeFileSync(SITEMAP_PATH, sitemap);
console.log(`✅ Generate ${comuni.length} pagine Comune in 20 regioni.`);
console.log(`✅ Sitemap generata con ${urls.length + guideUrls.length + 3} URL.`);
