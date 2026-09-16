import PDFDocument from 'pdfkit';
import { calculate, euro } from '../src/benefits.js';

const C = {
  blue: '#2563EB', green: '#16A34A', dark: '#172033', muted: '#667085',
  light: '#F7F9FC', border: '#DDE3EC', amber: '#D97706', paleGreen: '#ECFDF3',
  paleBlue: '#EFF6FF', paleAmber: '#FFF7E6', white: '#FFFFFF',
};

const clean = (v, max = 1200) => String(v ?? '').trim().slice(0, max);
const fullName = (o) => [o.customer_name, o.customer_surname].filter(Boolean).join(' ') || 'Cliente BonusFatto';
const dateIt = (d) => new Intl.DateTimeFormat('it-IT', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Rome' }).format(d);

function title(doc, text) {
  doc.font('Helvetica-Bold').fontSize(20).fillColor(C.dark).text(text);
  doc.moveDown(.45);
}
function h2(doc, text) {
  doc.font('Helvetica-Bold').fontSize(13).fillColor(C.dark).text(text);
  doc.moveDown(.25);
}
function body(doc, text, options = {}) {
  doc.font('Helvetica').fontSize(9.5).fillColor(C.dark).text(text, { lineGap: 3, ...options });
  doc.moveDown(.45);
}
function small(doc, text) {
  doc.font('Helvetica').fontSize(7.8).fillColor(C.muted).text(text, { lineGap: 2 });
}
function ensure(doc, height = 100) {
  if (doc.y + height > 754) doc.addPage();
}
function infoBox(doc, titleText, text, kind = 'blue') {
  const palette = kind === 'green' ? [C.paleGreen, C.green] : kind === 'amber' ? [C.paleAmber, C.amber] : [C.paleBlue, C.blue];
  const x = 48, w = 499, p = 12;
  const titleH = doc.heightOfString(titleText, { width: w - p * 2 });
  const textH = doc.heightOfString(text, { width: w - p * 2, lineGap: 3 });
  const h = titleH + textH + 31;
  ensure(doc, h + 8);
  const y = doc.y;
  doc.roundedRect(x, y, w, h, 7).fillAndStroke(palette[0], palette[1]);
  doc.fillColor(palette[1]).font('Helvetica-Bold').fontSize(8).text(titleText, x + p, y + p, { width: w - p * 2 });
  doc.fillColor(C.dark).font('Helvetica').fontSize(9.4).text(text, x + p, y + p + titleH + 9, { width: w - p * 2, lineGap: 3 });
  doc.y = y + h + 12;
}
function kv(doc, rows) {
  const x = 48, w = 499, left = 185, p = 8;
  for (const [k, v] of rows) {
    const value = String(v ?? '—');
    const h = Math.max(
      doc.heightOfString(String(k), { width: left - p * 2 }),
      doc.heightOfString(value, { width: w - left - p * 2, lineGap: 2 })
    ) + p * 2;
    ensure(doc, h + 5);
    const y = doc.y;
    doc.rect(x, y, w, h).fillAndStroke(C.light, C.border);
    doc.moveTo(x + left, y).lineTo(x + left, y + h).strokeColor(C.border).stroke();
    doc.fillColor(C.muted).font('Helvetica-Bold').fontSize(8.2).text(String(k), x + p, y + p, { width: left - p * 2 });
    doc.fillColor(C.dark).font('Helvetica').fontSize(8.8).text(value, x + left + p, y + p, { width: w - left - p * 2, lineGap: 2 });
    doc.y = y + h;
  }
  doc.moveDown(.8);
}
function badge(doc, text, kind = 'green') {
  const palette = kind === 'green' ? [C.paleGreen, C.green] : [C.paleAmber, C.amber];
  const width = Math.min(499, doc.widthOfString(text) + 20);
  ensure(doc, 28);
  const y = doc.y;
  doc.roundedRect(48, y, width, 20, 5).fillAndStroke(palette[0], palette[1]);
  doc.fillColor(palette[1]).font('Helvetica-Bold').fontSize(7.5).text(text, 58, y + 6, { width: width - 20 });
  doc.y = y + 27;
}
function pageHeaderFooter(doc, order) {
  const pages = doc.bufferedPageRange();
  for (let i = pages.start; i < pages.start + pages.count; i += 1) {
    doc.switchToPage(i);
    const old = doc.y;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.blue).text('Bonus', 48, 25, { continued: true, lineBreak: false }).fillColor(C.green).text('Fatto.it', { lineBreak: false });
    doc.font('Helvetica').fontSize(7).fillColor(C.muted).text(`Relazione ${order.order_code}`, 330, 27, { width: 217, align: 'right', lineBreak: false });
    doc.moveTo(48, 42).lineTo(547, 42).strokeColor(C.border).lineWidth(.5).stroke();
    doc.moveTo(48, 776).lineTo(547, 776).strokeColor(C.border).lineWidth(.5).stroke();
    doc.font('Helvetica').fontSize(7).fillColor(C.muted).text('Relazione informativa personalizzata · BonusFatto.it', 48, 784, { lineBreak: false });
    doc.text(`Pagina ${i + 1}`, 480, 784, { width: 67, align: 'right', lineBreak: false });
    doc.y = old;
  }
}

function metadataProfile(metadata = {}) {
  const p = {};
  for (const [k, v] of Object.entries(metadata)) {
    if (!k.startsWith('p_')) continue;
    p[k.slice(2)] = v;
  }
  if (p.childAges) p.childAges = String(p.childAges).split(',').filter(Boolean).map(Number).filter(Number.isFinite);
  for (const key of ['children','household','annualRent','adiFamilyIncome','adiMovableAssets','adiRealEstateAssets','renovationAmount']) {
    if (p[key] !== undefined && p[key] !== '') p[key] = Number(p[key]);
  }
  return p;
}

async function profileFromStripe(order) {
  const secret = clean(process.env.STRIPE_SECRET_KEY, 1200);
  const id = clean(order.stripe_session_id, 255);
  if (!secret || !/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) return {};
  try {
    const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${secret}` } });
    const s = await r.json();
    if (!r.ok) return {};
    return metadataProfile(s.metadata || {});
  } catch {
    return {};
  }
}

function yesNo(value) {
  if (value === 'yes') return 'Sì';
  if (value === 'no') return 'No';
  return 'Non indicato';
}
function housing(value) {
  if (value === 'owner') return 'Abitazione principale di proprietà / diritto reale';
  if (value === 'rent') return 'Abitazione in affitto';
  if (value === 'other') return 'Altra situazione abitativa';
  return 'Non indicata';
}
function benefitLevel(b) {
  if (b.eligibility === 'spetta-profilo' || b.eligibility === 'stimabile') return ['PROFILO COMPATIBILE', 'green'];
  if (b.eligibility === 'potenzialmente-assegnabile' || b.eligibility === 'graduatoria') return ['POTENZIALMENTE ASSEGNABILE', 'amber'];
  if (b.eligibility === 'compatibile') return ['COMPATIBILE · REQUISITI DA CONFERMARE', 'amber'];
  return ['DA APPROFONDIRE', 'amber'];
}
function amountText(b) {
  if (b.amount === 'spetta') return 'Spettanza riconoscibile in base ai requisiti dichiarati';
  if (b.amount === 'compatibile') return 'Profilo compatibile';
  if (Number.isFinite(Number(b.amount))) return `${euro(Number(b.amount))}${b.period ? ` · ${b.period}` : ''}`;
  return 'Importo variabile / non determinabile con i soli dati disponibili';
}

export async function createBonusFattoReport(order) {
  const profile = await profileFromStripe(order);
  const input = {
    isee: Number(order.isee),
    children: Number(order.children),
    municipality: { name: order.calculation_municipality },
    profile,
  };
  const result = calculate(input);
  const doc = new PDFDocument({ size: 'A4', margins: { top: 58, bottom: 48, left: 48, right: 48 }, bufferPages: true, info: { Title: `BonusFatto - ${order.order_code}`, Author: 'BonusFatto.it' } });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise((resolve, reject) => { doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject); });

  doc.moveDown(2);
  doc.font('Helvetica-Bold').fontSize(30).fillColor(C.blue).text('Bonus', { continued: true }).fillColor(C.green).text('Fatto.it');
  doc.moveDown(.35);
  doc.font('Helvetica-Bold').fontSize(21).fillColor(C.dark).text('La tua analisi personalizzata 2026');
  doc.moveDown(.55);
  body(doc, `Relazione elaborata per ${fullName(order)} sulla base dell’ISEE e delle risposte integrative fornite durante l’analisi.`);
  kv(doc, [
    ['Codice relazione', order.order_code],
    ['Data elaborazione', dateIt(new Date())],
    ['Cliente', fullName(order)],
    ['Comune', order.calculation_municipality],
    ['ISEE', euro(order.isee)],
    ['Figli a carico', String(order.children ?? 0)],
  ]);
  infoBox(doc, 'RISULTATO IN SINTESI', `${result.benefits.length} agevolazioni individuate per il profilo dichiarato. Le misure con importo determinabile riportano una cifra; quelle soggette a graduatoria, spesa effettiva o verifiche dell’ente vengono indicate come compatibili o potenzialmente assegnabili.`, 'green');
  body(doc, 'La relazione utilizza esclusivamente i dati della pratica corrente. Non vengono riutilizzate risposte di analisi precedenti.');

  doc.addPage();
  title(doc, '1. TARI');
  if (result.tariNationalEligible) {
    infoBox(doc, 'BONUS SOCIALE RIFIUTI NAZIONALE', 'Profilo economico compatibile con la riduzione del 25% della TARI dovuta. La relazione non trasforma la percentuale in una cifra convenzionale: l’importo effettivo dipende dalla TARI reale dell’utenza.', 'green');
  } else {
    infoBox(doc, 'BONUS SOCIALE RIFIUTI NAZIONALE', 'Dai dati economici inseriti non emerge il requisito ISEE per la riduzione nazionale del 25%.', 'amber');
  }
  if (result.tariLocalPercent > 0 && result.tariLocalRule?.status === 'VERIFIED_2026') {
    infoBox(doc, `RIDUZIONE COMUNALE · ${order.calculation_municipality}`, `Per la fascia ISEE indicata il database BonusFatto riporta una riduzione comunale 2026 del ${result.tariLocalPercent}%.${result.tariLocalRule.applicationRequired ? ' La misura richiede una domanda al Comune.' : ''} Non riportiamo scadenze non certe né stime in euro basate su importi TARI convenzionali.`, 'green');
  } else {
    infoBox(doc, `RIDUZIONE COMUNALE · ${order.calculation_municipality}`, 'Nessuna riduzione comunale viene indicata come certa perché il dato 2026 non risulta verificato nel database BonusFatto per questa pratica.', 'blue');
  }
  body(doc, 'Il bonus nazionale e l’eventuale riduzione comunale non vengono sommati automaticamente: l’applicazione concreta dipende dalla posizione TARI e dalle regole dell’ente.');

  doc.addPage();
  title(doc, '2. Bonus e agevolazioni individuate');
  body(doc, 'Di seguito trovi soltanto le misure emerse dal profilo corrente. Per ogni voce indichiamo l’esito e il motivo principale.');
  const otherBenefits = result.benefits.filter((b) => b.id !== 'tari' && !String(b.id).startsWith('tari-local-'));
  for (const b of otherBenefits) {
    ensure(doc, 145);
    const [level, kind] = benefitLevel(b);
    badge(doc, level, kind);
    h2(doc, b.name);
    kv(doc, [['Esito / importo', amountText(b)], ['Perché compare', b.description]]);
    doc.moveDown(.15);
  }

  doc.addPage();
  title(doc, '3. Profilo utilizzato per il calcolo');
  body(doc, 'Questi sono i dati della pratica corrente utilizzati dal motore. Li riportiamo in forma leggibile per consentirti di controllare l’analisi.');
  kv(doc, [
    ['Componenti del nucleo', profile.household ? String(profile.household) : 'Non indicato'],
    ['Età figli', Array.isArray(profile.childAges) && profile.childAges.length ? profile.childAges.join(', ') : 'Nessun figlio / non applicabile'],
    ['Disabilità nel nucleo', yesNo(profile.disability)],
    ['Presenza persona 60+', yesNo(profile.over60)],
    ['Presenza persona 65+', yesNo(profile.over65)],
    ['Persona 18–59 senza lavoro disponibile a formazione', yesNo(profile.unemployed)],
    ['Abitazione', housing(profile.housing)],
    ['Utenza luce idonea', yesNo(profile.electricitySupply)],
    ['Utenza gas idonea', yesNo(profile.gasSupply)],
    ['Utenza acqua idonea', yesNo(profile.waterSupply)],
    ['Tutti i componenti residenti in Italia', yesNo(profile.residentAllItaly)],
    ['Prestazioni incompatibili Carta Dedicata', yesNo(profile.dedicatedIncompatible)],
    ['Frequenza asilo nido', yesNo(profile.nursery)],
    ['Spese ristrutturazione 2026', profile.renovation === 'yes' ? euro(profile.renovationAmount || 0) : 'No'],
  ]);
  if (profile.adiFamilyIncome !== '' && profile.adiFamilyIncome != null) {
    h2(doc, 'Dati utilizzati per la verifica ADI');
    kv(doc, [
      ['Requisiti soggiorno/residenza', yesNo(profile.adiResidence)],
      ['Reddito familiare annuo', euro(profile.adiFamilyIncome)],
      ['Patrimonio mobiliare', euro(profile.adiMovableAssets)],
      ['Patrimonio immobiliare rilevante', euro(profile.adiRealEstateAssets)],
      ['Veicoli incompatibili', yesNo(profile.adiVehicles)],
      ['Dimissioni volontarie rilevanti', yesNo(profile.adiResignation)],
    ]);
  }

  doc.addPage();
  title(doc, '4. Cosa fare adesso');
  body(doc, '1. Conserva l’attestazione ISEE 2026 utilizzata per questa analisi.');
  if (result.tariNationalEligible) body(doc, '2. Controlla che la posizione TARI sia correttamente associata al nucleo: il bonus sociale rifiuti nazionale è collegato alla DSU/ISEE e ai requisiti dell’utenza.');
  if (result.tariLocalPercent > 0) body(doc, `3. Per la riduzione comunale di ${order.calculation_municipality}, verifica la procedura di domanda prevista dal Comune prima di presentare l’istanza.`);
  body(doc, '4. Per le prestazioni INPS o soggette a graduatoria, conserva la documentazione e verifica l’effettiva lavorazione dell’ente competente.');
  if (profile.renovation === 'yes') body(doc, '5. Per le detrazioni fiscali conserva fatture, bonifici e documentazione tecnica dell’intervento.');
  infoBox(doc, 'NOTA IMPORTANTE', 'Questa relazione è uno strumento informativo personalizzato. Non sostituisce un provvedimento dell’ente, una certificazione fiscale o previdenziale, né la verifica amministrativa finale.', 'amber');
  small(doc, `Relazione generata per ${fullName(order)} · ${order.order_code}`);

  pageHeaderFooter(doc, order);
  doc.end();
  return done;
}
