import fs from 'node:fs';
import path from 'node:path';

const SITE='https://bonusfatto.it';
const sitemapPath=path.resolve('public/sitemap.xml');
const top100=JSON.parse(fs.readFileSync(path.resolve('lib/top100Comuni.json'),'utf8'));
const fallback=JSON.parse(fs.readFileSync(path.resolve('src/fallback.json'),'utf8'));
const batches=[1,2,3,4].flatMap(function(n){
  return JSON.parse(fs.readFileSync(path.resolve('lib/tari/batch'+n+'_125.json'),'utf8'));
});

const byIstat=new Map();
for(const item of batches) byIstat.set(String(item.istat||item.codiceIstat||''),item);
for(const item of top100) byIstat.set(String(item.istat),Object.assign({},byIstat.get(String(item.istat))||{},item));

function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
const fallbackByName=new Map();
for(const item of fallback){
  const key=norm(item.name);
  if(!fallbackByName.has(key)) fallbackByName.set(key,item);
}
function esc(v){return String(v||'').replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];});}
function human(v){return Number(v).toLocaleString('it-IT');}
function titleNameFromSlug(slug){return String(slug||'').split('-').map(function(x){return x?x.charAt(0).toUpperCase()+x.slice(1):x;}).join(' ');}

const xml=fs.readFileSync(sitemapPath,'utf8');
const matches=Array.from(xml.matchAll(/<loc>(https:\/\/bonusfatto\.it\/comune\/([^/]+)\/([^<]+))<\/loc>/g));
const urls=matches.map(function(m){return {canonical:m[1],istat:m[2],slug:m[3]};});
if(urls.length!==483) throw new Error('Attesi 483 URL comunali, trovati '+urls.length);
if(urls.some(function(u){return /^0008[3-9]$|^0009[0-9]$/.test(u.istat);})){
  throw new Error('Placeholder 00083-00099 presenti nella sitemap');
}

const outRoot=path.resolve('public/comune');
fs.rmSync(outRoot,{recursive:true,force:true});

for(const u of urls){
  const item=byIstat.get(u.istat)||{};
  const name=item.nome||item.comune||titleNameFromSlug(u.slug);
  const fallbackItem=fallbackByName.get(norm(name))||{};
  const provincia=item.provincia||fallbackItem.code||fallbackItem.province||'';
  const abitanti=Number(item.abitanti)||null;
  const provinceLabel=provincia||'Italia';
  const title='TARI '+name+' 2026 - Scadenza e Riduzione '+provinceLabel;
  const description=abitanti
    ? 'TARI '+name+' 2026 ('+provinceLabel+'): scadenza, riduzione e fonti ufficiali per un Comune di '+human(abitanti)+' abitanti. Verifica delibere e regolamenti.'
    : 'TARI '+name+' 2026 ('+provinceLabel+'): scadenza, riduzione e fonti ufficiali disponibili. Verifica delibere e regolamenti comunali aggiornati.';
  const mef=item.url_mef||'https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/federalismofiscale/DelibereTari/';
  const albo=item.url_albo||'';
  const sources='<section class="sources"><h2>Fonti ufficiali</h2><ul><li><a href="'+esc(mef)+'" rel="nofollow noopener" target="_blank">MEF - Delibere TARI ↗</a></li>'+(albo?'<li><a href="'+esc(albo)+'" rel="nofollow noopener" target="_blank">Albo pretorio del Comune ↗</a></li>':'<li>Albo pretorio: consulta il sito istituzionale del Comune per il regolamento vigente.</li>')+'</ul></section>';
  const h1='TARI '+esc(name)+(provincia?' ('+esc(provincia)+')':'');
  const metaPop=abitanti?' · '+human(abitanti)+' abitanti':'';
  const html='<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(title)+'</title><meta name="description" content="'+esc(description)+'"><link rel="canonical" href="'+esc(u.canonical)+'"><meta name="robots" content="index,follow"><meta property="og:type" content="website"><meta property="og:title" content="'+esc(title)+'"><meta property="og:description" content="'+esc(description)+'"><meta property="og:url" content="'+esc(u.canonical)+'"><link rel="icon" href="/favicon.png?v=2"><style>body{margin:0;background:#fbf8f1;color:#252237;font-family:Inter,system-ui,-apple-system,sans-serif;line-height:1.65}header,main,footer{max-width:960px;margin:auto;padding:24px}.brand{font-weight:900;text-decoration:none;font-size:22px}.brand span{color:#6f46b8}.hero,.sources,.card{background:#fff;border:1px solid #e6dfef;border-radius:22px;padding:26px;margin:22px 0}h1{font-size:clamp(34px,6vw,56px);line-height:1.05;margin:10px 0 14px}h2{margin-top:0}.eyebrow{font-size:12px;letter-spacing:.12em;font-weight:900;color:#6f46b8}.meta{color:#6d6878}.metric{font-size:30px;font-weight:900;color:#6f46b8}.sources a{color:#5d36a6;font-weight:750}.cta{display:inline-block;background:#6f46b8;color:white;text-decoration:none;font-weight:850;padding:13px 18px;border-radius:12px}footer{color:#6d6878;font-size:13px}</style></head><body><header><a class="brand" href="/">BonusFatto<span>.it</span></a></header><main><section class="hero"><span class="eyebrow">TARI 2026 · COMUNE</span><h1>'+h1+'</h1><p class="meta">Codice ISTAT: '+esc(u.istat)+metaPop+'</p><p>Consulta le informazioni TARI 2026 disponibili per '+esc(name)+'. Le riduzioni comunali vanno sempre verificate sul regolamento e sulla delibera vigente.</p></section><section class="card"><h2>Dati TARI nel motore BonusFatto</h2><p><span class="metric">25%</span><br>Riduzione di riferimento del motore TARI 2026</p><p><strong>Scadenza di riferimento:</strong> 30/11/2026</p><p>Il dato locale va verificato sulle fonti ufficiali del Comune e del MEF prima di presentare una richiesta.</p></section>'+sources+'<a class="cta" href="/">Verifica bonus e TARI per '+esc(name)+'</a></main><footer>BonusFatto.it · servizio informativo indipendente. Non sostituisce Comune, CAF o consulenza professionale.</footer></body></html>';
  const dir=path.join(outRoot,u.istat,u.slug);
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'index.html'),html);
}

const bonusDir=path.resolve('public/bonus');
fs.mkdirSync(bonusDir,{recursive:true});
fs.writeFileSync(path.join(bonusDir,'index.html'),'<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bonus 2026 - Verifica agevolazioni | BonusFatto.it</title><meta name="description" content="Verifica bonus e agevolazioni 2026 in base a Comune, ISEE e composizione familiare."><link rel="canonical" href="'+SITE+'/bonus"></head><body><main><h1>Bonus 2026</h1><p>Verifica bonus e agevolazioni con il simulatore BonusFatto.it.</p><a href="/">Avvia il calcolo</a></main></body></html>');
console.log('Generated '+urls.length+' pagine comunali SEO + /bonus.');
