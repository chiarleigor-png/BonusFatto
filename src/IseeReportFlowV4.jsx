import { useMemo, useState } from 'react';
import { calculate, euro } from './benefits.js';

const ENTRY_KEY = 'bonusfatto_report_entry';
const ANALYSIS_KEY = 'bonusfatto_report_analysis';
const PDFJS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs';
const PDFJS_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';

function safeParse(value, fallback = null) {
  try { return JSON.parse(value); } catch { return fallback; }
}

function parseEuro(value) {
  const n = Number(String(value ?? '').replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function firstMoney(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const value = parseEuro(match[1]);
      if (value !== null) return value;
    }
  }
  return null;
}

function fiscalCodeBirthDate(cf, now = new Date()) {
  if (!/^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/i.test(cf || '')) return null;
  const c = cf.toUpperCase();
  const yy = Number(c.slice(6, 8));
  const month = { A:0,B:1,C:2,D:3,E:4,H:5,L:6,M:7,P:8,R:9,S:10,T:11 }[c[8]];
  let day = Number(c.slice(9, 11));
  if (!Number.isInteger(month) || !Number.isFinite(day)) return null;
  if (day > 40) day -= 40;
  const currentYear = now.getFullYear() % 100;
  let year = yy <= currentYear ? 2000 + yy : 1900 + yy;
  let date = new Date(year, month, day);
  if (date > now || now.getFullYear() - year > 110) {
    year -= 100;
    date = new Date(year, month, day);
  }
  return date;
}

function ageAt(date, now = new Date()) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  let age = now.getFullYear() - date.getFullYear();
  if (now.getMonth() < date.getMonth() || (now.getMonth() === date.getMonth() && now.getDate() < date.getDate())) age -= 1;
  return age;
}

function normalize(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function extractHouseholdSection(flat) {
  const start = flat.search(/NUCLEO\s+FAMILIARE\s+DEL\s+DICHIARANTE/i);
  if (start < 0) return '';
  const tail = flat.slice(start);
  const stopMatch = tail.search(/(?:è\s+stato\s+calcolato\s+il\s+seguente\s+indicatore|ISEE\s+ORDINARIO)/i);
  return stopMatch > 0 ? tail.slice(0, stopMatch) : tail.slice(0, 3000);
}

function extractMembers(flat) {
  const section = extractHouseholdSection(flat);
  const cfRegex = /[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]/gi;
  const codes = [...new Set((section.match(cfRegex) || []).map(v => v.toUpperCase()))];
  return codes.map(cf => {
    const index = section.toUpperCase().indexOf(cf);
    const before = index >= 0 ? section.slice(Math.max(0, index - 100), index) : '';
    const relationMatch = before.match(/(?:^|\s)([DFCGNAP])\s+[A-ZÀ-Ù'’-]+\s+[A-ZÀ-Ù'’-]+\s*$/i);
    const relation = relationMatch ? relationMatch[1].toUpperCase() : null;
    const birthDate = fiscalCodeBirthDate(cf);
    return { cf, relation, birthDate, age: ageAt(birthDate) };
  });
}

function sectionAfter(flat, marker, length = 1800) {
  const idx = flat.search(marker);
  return idx >= 0 ? flat.slice(idx, idx + length) : '';
}

function extractIseeFields(text) {
  const flat = normalize(text);
  const ordinarySection = sectionAfter(flat, /ISEE\s+ORDINARIO/i, 3000) || flat;
  const ordinaryIsee = firstMoney(ordinarySection, [
    /l['’]indicatore\s+della\s+situazione\s+economica\s+equivalente\s*\(ISEE\)\s+è\s+il\s+seguente\s*:?\s*(?:Euro|€)?\s*([0-9.]+,[0-9]{2})/i,
    /ISEE\s+ORDINARIO[^\d]{0,220}(?:Euro|€)?\s*([0-9.]+,[0-9]{2})/i
  ]);

  const familyMarker = /SPECIFICHE\s+PRESTAZIONI\s+FAMILIARI\s+E\s+PER\s+L['’]INCLUSIONE/i;
  const familySection = sectionAfter(flat, familyMarker, 2800);
  const hasSpecificFamilySection = Boolean(familySection);
  const specificFamilyIsee = hasSpecificFamilySection ? firstMoney(familySection, [
    /l['’]indicatore\s+della\s+situazione\s+economica\s+equivalente\s*\(ISEE\)\s+è\s+il\s+seguente\s*:?\s*(?:Euro|€)?\s*([0-9.]+,[0-9]{2})/i
  ]) : null;

  const familyIncome = firstMoney(ordinarySection, [
    /Somma\s+dei\s+redditi\s+dei\s+componenti\s+del\s+nucleo\s+(?:Euro|€)?\s*\+?\s*([0-9.]+,[0-9]{2})/i
  ]);
  const afterIsr = sectionAfter(ordinarySection, /Indicatore\s+Situazione\s+Reddituale\s*\(ISR\)/i, 1500) || ordinarySection;
  const movableAssets = firstMoney(afterIsr, [
    /Patrimonio\s+mobiliare\s+del\s+nucleo\s+(?:Euro|€)?\s*\+?\s*([0-9.]+,[0-9]{2})/i
  ]);
  const realEstateAssets = firstMoney(afterIsr, [
    /Patrimonio\s+immobiliare\s+del\s+nucleo\s+(?:Euro|€)?\s*\+?\s*([0-9.]+,[0-9]{2})/i
  ]);

  const members = extractMembers(flat);
  const ages = members.map(m => m.age).filter(Number.isFinite);
  const minors = members.filter(m => Number.isFinite(m.age) && m.age < 18);
  const youngAdultChildren = members.filter(m => m.relation === 'F' && Number.isFinite(m.age) && m.age >= 18 && m.age <= 20);
  const childAges = minors.map(m => m.age).sort((a, b) => a - b);
  const ordinaryAppliesToMinors = /si\s+applica\s+alle\s+PRESTAZIONI\s+AGEVOLATE\s+RIVOLTE\s+A\s+MINORENNI/i.test(flat);

  return {
    isee: ordinaryIsee,
    familyIsee: hasSpecificFamilySection ? specificFamilyIsee : null,
    familyIseeMode: hasSpecificFamilySection ? 'specific' : (ordinaryAppliesToMinors ? 'ordinary-applicable' : 'not-distinct'),
    familyIncome,
    movableAssets,
    realEstateAssets,
    members,
    ages,
    childAges,
    youngAdultChildren,
    household: members.length || null,
    demographicsKnown: members.length > 0,
    hasOver60: ages.some(a => a >= 60),
    hasOver65: ages.some(a => a >= 65),
    hasAdult18to59: ages.some(a => a >= 18 && a <= 59),
    year2026: /\b2026\b/.test(flat)
  };
}

async function readPdfText(file) {
  const pdfjs = await import(/* @vite-ignore */ PDFJS_URL);
  pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages = [];
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent();
    pages.push(content.items.map(item => item.str || '').join(' '));
  }
  return pages.join('\n');
}

function SelectField({ label, value, onChange, children }) {
  return <label className="bfq-field"><span>{label}</span><select value={value} onChange={e => onChange(e.target.value)}>{children}</select></label>;
}

function NumberField({ label, value, onChange, min = 0, max, step = '0.01' }) {
  return <label className="bfq-field"><span>{label}</span><input type="number" min={min} max={max} step={step} value={value} onChange={e => onChange(e.target.value)} /></label>;
}

function FlowShell({ children }) {
  return <div className="app-shell bfq-shell">
    <header className="site-header bfq-header"><div className="bfq-brand"><span className="bfq-brand-b">B</span><span>Bonus<span>Fatto</span><em>.it</em></span></div><div className="bfq-test-pill">TEST · 0 €</div></header>
    <main>{children}</main>
    <footer className="site-footer"><span>© {new Date().getFullYear()} BonusFatto.it</span><span>Analisi con relazione</span></footer>
  </div>;
}

function familyIseeLabel(fields) {
  if (fields.familyIseeMode === 'specific' && fields.familyIsee != null) return euro(fields.familyIsee);
  if (fields.familyIseeMode === 'ordinary-applicable') return `${euro(fields.isee)} · ordinario applicabile`;
  return 'Non distinto nell’attestazione';
}

function PdfSummary({ entry, fields }) {
  const manual = Number(entry?.isee);
  const pdf = Number(fields.isee);
  const mismatch = Number.isFinite(manual) && Number.isFinite(pdf) && Math.abs(manual - pdf) > .01;
  const rows = [
    ['ISEE ordinario', fields.isee != null ? euro(fields.isee) : null],
    ['ISEE famiglia/inclusione', familyIseeLabel(fields)],
    ['Componenti', fields.household != null ? String(fields.household) : null],
    ['Minori', fields.demographicsKnown ? String(fields.childAges.length) : null],
    ['Età minori', fields.childAges.length ? fields.childAges.join(', ') : fields.demographicsKnown ? 'Nessuno' : null],
    ['Figli 18–20', fields.youngAdultChildren.length ? fields.youngAdultChildren.map(m => `${m.age} anni`).join(', ') : 'Nessuno'],
    ['Redditi nucleo', fields.familyIncome != null ? euro(fields.familyIncome) : null],
    ['Patrimonio mobiliare', fields.movableAssets != null ? euro(fields.movableAssets) : null],
    ['Patrimonio immobiliare', fields.realEstateAssets != null ? euro(fields.realEstateAssets) : null]
  ].filter(([, value]) => value != null);

  return <section className="bfq-extracted">
    <div className="bfq-extracted-head"><span>✓</span><div><strong>Dati letti dall’attestazione</strong><small>Non te li chiediamo una seconda volta.</small></div></div>
    <div className="bfq-data-grid">{rows.map(([k, v]) => <div key={k}><span>{k}</span><strong>{v}</strong></div>)}</div>
    {mismatch
      ? <div className="bfq-isee-warning"><strong>ISEE aggiornato.</strong> Nel form avevi indicato {euro(manual)}, mentre l’attestazione riporta {euro(pdf)}. Per il calcolo usiamo il valore dell’attestazione.</div>
      : <div className="bfq-isee-ok">Il valore ISEE inserito coincide con quello dell’attestazione.</div>}
  </section>;
}

function Questions({ entry, fields, onBack, onComplete }) {
  const knownMinorCount = fields.demographicsKnown ? fields.childAges.length : Math.max(0, Math.min(5, Number(entry?.figli) || 0));
  const [answers, setAnswers] = useState({
    household: fields.household ?? '', children: knownMinorCount,
    childAges: fields.demographicsKnown ? fields.childAges : Array.from({ length: knownMinorCount }, () => ''),
    youngAdultEligibleCount: 0,
    ageBand: fields.demographicsKnown ? (fields.hasOver65 ? '65plus' : fields.hasOver60 ? '60-64' : 'none') : '',
    disability: '', unemployed: '', disadvantage: '', housing: '', annualRent: '',
    electricitySupply: '', gasSupply: '', waterSupply: '', residentAllItaly: '', dedicatedIncompatible: '',
    nursery: '', event2026: '', motherWork: '', motherIncome: '', maternityBenefit: '',
    adiResidence: '', adiFamilyIncome: fields.familyIncome ?? '', adiMovableAssets: fields.movableAssets ?? '', adiRealEstateAssets: fields.realEstateAssets ?? '', adiVehicles: '', adiResignation: '',
    renovation: '', renovationAmount: '', renovationEligible: ''
  });
  const [error, setError] = useState('');
  const effectiveIsee = Number(fields.isee);
  const familyIseeForBenefits = fields.familyIseeMode === 'specific' && Number.isFinite(Number(fields.familyIsee)) ? Number(fields.familyIsee) : effectiveIsee;
  const children = Number(answers.children);
  const childAges = answers.childAges.map(Number).filter(Number.isFinite);
  const hasYoung = childAges.some(a => a <= 3);
  const hasFamilyEvent = ['birth', 'adoption', 'foster'].includes(answers.event2026);
  const showAdi = Number.isFinite(familyIseeForBenefits) && familyIseeForBenefits <= 10140 && (children > 0 || answers.disability === 'yes' || answers.ageBand === '60-64' || answers.ageBand === '65plus' || answers.disadvantage === 'yes');
  const set = (name, value) => setAnswers(current => ({ ...current, [name]: value }));

  function setChildren(value) {
    const count = Math.max(0, Math.min(5, Number(value) || 0));
    setAnswers(current => ({ ...current, children: count, childAges: Array.from({ length: count }, (_, i) => current.childAges[i] ?? '') }));
  }
  function setChildAge(index, value) {
    setAnswers(current => { const arr = [...current.childAges]; arr[index] = value; return { ...current, childAges: arr }; });
  }
  function fail(message) {
    setError(message);
    requestAnimationFrame(() => document.querySelector('.checkout-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    return false;
  }

  function submit(event) {
    event.preventDefault();
    setError('');
    const household = Number(answers.household);
    const allChildAges = answers.childAges.map(Number);
    if (!Number.isFinite(effectiveIsee)) return fail('Non siamo riusciti a leggere il valore ISEE dall’attestazione.');
    if (!Number.isInteger(household) || household < 1) return fail('Indica il numero dei componenti del nucleo.');
    if (!fields.demographicsKnown && children > 0 && allChildAges.some(a => !Number.isFinite(a) || a < 0 || a > 40)) return fail('Indica l’età dei figli.');
    if (!answers.disability || !answers.housing) return fail('Completa i dati personali mancanti.');
    if (fields.hasAdult18to59 && !answers.unemployed) return fail('Indica la situazione lavorativa/formativa richiesta.');
    if (!answers.disadvantage) return fail('Indica se ricorre una condizione di svantaggio rilevante.');
    if (![answers.electricitySupply, answers.gasSupply, answers.waterSupply].every(v => v === 'yes' || v === 'no')) return fail('Indica quali utenze domestiche risultano attive.');
    if (effectiveIsee <= 15000 && (!answers.residentAllItaly || !answers.dedicatedIncompatible)) return fail('Completa le domande per Carta Dedicata a Te.');
    if (children > 0) {
      if (!answers.event2026 || !answers.motherWork || (hasYoung && !answers.nursery)) return fail('Completa le domande dedicate alla famiglia.');
      if (hasFamilyEvent && !answers.maternityBenefit) return fail('Indica se è stata percepita un’indennità economica di maternità.');
    }
    if (answers.motherWork && answers.motherWork !== 'none' && !answers.motherIncome) return fail('Completa il dato sul reddito della madre.');
    if (answers.housing === 'rent' && !Number.isFinite(Number(answers.annualRent))) return fail('Inserisci il canone annuo di affitto.');
    if (!answers.renovation) return fail('Indica se hai sostenuto spese di ristrutturazione nel 2026.');
    if (answers.renovation === 'yes' && (!Number.isFinite(Number(answers.renovationAmount)) || !answers.renovationEligible)) return fail('Completa i dati sulle ristrutturazioni.');
    if (showAdi) {
      const nums = [answers.adiFamilyIncome, answers.adiMovableAssets, answers.adiRealEstateAssets].map(Number);
      if (nums.some(v => !Number.isFinite(v) || v < 0) || !answers.adiResidence || !answers.adiVehicles || !answers.adiResignation) return fail('Completa le domande mancanti per verificare l’Assegno di Inclusione.');
    }

    const profile = {
      children, childAges: allChildAges, household,
      over60: answers.ageBand === '60-64' || answers.ageBand === '65plus' ? 'yes' : 'no',
      over65: answers.ageBand === '65plus' ? 'yes' : 'no',
      disability: answers.disability,
      unemployed: answers.unemployed || 'no', disadvantage: answers.disadvantage,
      housing: answers.housing, annualRent: answers.housing === 'rent' ? Number(answers.annualRent) : 0,
      electricitySupply: answers.electricitySupply, gasSupply: answers.gasSupply, waterSupply: answers.waterSupply,
      residentAllItaly: answers.residentAllItaly || 'no', dedicatedIncompatible: answers.dedicatedIncompatible || 'yes',
      nursery: answers.nursery || 'no',
      event2026: answers.event2026 === 'none' ? '' : answers.event2026,
      motherWork: answers.motherWork === 'none' ? '' : answers.motherWork,
      motherIncome: answers.motherIncome || 'no',
      maternityBenefit: hasFamilyEvent ? (answers.maternityBenefit || 'no') : 'no',
      familyIsee: familyIseeForBenefits, familyIseeMode: fields.familyIseeMode,
      auuYoungAdultEligibleCount: Number(answers.youngAdultEligibleCount) || 0,
      auuYoungAdultAges: fields.youngAdultChildren.map(m => m.age),
      adiResidence: showAdi ? answers.adiResidence : '',
      adiFamilyIncome: showAdi ? Number(answers.adiFamilyIncome) : '',
      adiMovableAssets: showAdi ? Number(answers.adiMovableAssets) : '',
      adiRealEstateAssets: showAdi ? Number(answers.adiRealEstateAssets) : '',
      adiVehicles: showAdi ? answers.adiVehicles : '', adiResignation: showAdi ? answers.adiResignation : '',
      renovation: answers.renovation,
      renovationAmount: answers.renovation === 'yes' ? Number(answers.renovationAmount) : 0,
      renovationEligible: answers.renovation === 'yes' ? answers.renovationEligible : 'no'
    };
    onComplete({ input: { isee: effectiveIsee, children, municipality: { name: entry.comune }, profile }, profile, extracted: fields });
  }

  return <section className="bfq-page page-enter">
    <button className="bfq-link-button" type="button" onClick={onBack}>← Cambia attestazione</button>
    <div className="bfq-title"><span className="eyebrow">PASSAGGIO 2</span><h1>Completiamo solo ciò che manca.</h1><p>I dati già presenti nell’attestazione sono stati acquisiti. Qui chiediamo soltanto le informazioni necessarie che l’ISEE non contiene.</p></div>
    <PdfSummary entry={entry} fields={fields} />
    <form onSubmit={submit} noValidate className="bfq-form">
      <section className="bfq-section"><div className="bfq-section-head"><span>1</span><div><h2>Dati personali</h2><p>Informazioni non certificabili dall’attestazione.</p></div></div><div className="bfq-fields">
        {fields.household == null && <NumberField label="Componenti del nucleo" value={answers.household} onChange={v => set('household', v)} min={1} max={20} step="1" />}
        {!fields.demographicsKnown && <><SelectField label="Figli a carico" value={answers.children} onChange={setChildren}>{[0,1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}</SelectField>{answers.childAges.map((age, i) => <NumberField key={i} label={`Età figlio ${i + 1}`} value={age} onChange={v => setChildAge(i, v)} min={0} max={40} step="1" />)}<SelectField label="Età più elevata nel nucleo" value={answers.ageBand} onChange={v => set('ageBand', v)}><option value="">Seleziona</option><option value="none">Nessuna persona 60+</option><option value="60-64">Almeno una persona 60–64</option><option value="65plus">Almeno una persona 65+</option></SelectField></>}
        <SelectField label="Disabilità nel nucleo" value={answers.disability} onChange={v => set('disability', v)}><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No</option></SelectField>
        {fields.hasAdult18to59 && <SelectField label="Persona 18–59 senza lavoro disponibile a formazione" value={answers.unemployed} onChange={v => set('unemployed', v)}><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No</option></SelectField>}
        <SelectField label="Condizione di svantaggio rilevante" value={answers.disadvantage} onChange={v => set('disadvantage', v)}><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No</option></SelectField>
        <SelectField label="Abitazione" value={answers.housing} onChange={v => set('housing', v)}><option value="">Seleziona</option><option value="owner">Abitazione principale di proprietà / diritto reale</option><option value="rent">In affitto</option><option value="other">Altra situazione</option></SelectField>
        {answers.housing === 'rent' && <NumberField label="Canone annuo di affitto" value={answers.annualRent} onChange={v => set('annualRent', v)} />}
      </div></section>

      {fields.youngAdultChildren.length > 0 && <section className="bfq-section"><div className="bfq-section-head"><span>2</span><div><h2>Figli 18–20 anni</h2><p>Verifichiamo l’eventuale quota AUU.</p></div></div><div className="bfq-fields"><SelectField label={`Quanti dei ${fields.youngAdultChildren.length} figli 18–20 anni soddisfano i requisiti AUU?`} value={answers.youngAdultEligibleCount} onChange={v => set('youngAdultEligibleCount', v)}>{Array.from({ length: fields.youngAdultChildren.length + 1 }, (_, n) => <option key={n} value={n}>{n}</option>)}</SelectField></div><p className="bfq-help">Studio/formazione, tirocinio o lavoro con reddito annuo sotto 8.000 €, disoccupazione con ricerca attiva o servizio civile.</p></section>}

      <section className="bfq-section"><div className="bfq-section-head"><span>3</span><div><h2>Utenze domestiche</h2><p>Quali utenze risultano attive?</p></div></div><div className="bfq-fields bfq-three"><SelectField label="Luce" value={answers.electricitySupply} onChange={v => set('electricitySupply', v)}><option value="">Seleziona</option><option value="yes">Attiva</option><option value="no">Non attiva</option></SelectField><SelectField label="Gas" value={answers.gasSupply} onChange={v => set('gasSupply', v)}><option value="">Seleziona</option><option value="yes">Attiva</option><option value="no">Non attiva</option></SelectField><SelectField label="Acqua" value={answers.waterSupply} onChange={v => set('waterSupply', v)}><option value="">Seleziona</option><option value="yes">Attiva</option><option value="no">Non attiva</option></SelectField></div></section>

      {effectiveIsee <= 15000 && <section className="bfq-section"><div className="bfq-section-head"><span>4</span><div><h2>Carta Dedicata a Te</h2><p>Due controlli che non risultano dall’ISEE.</p></div></div><div className="bfq-fields"><SelectField label="Tutti i componenti residenti in Italia" value={answers.residentAllItaly} onChange={v => set('residentAllItaly', v)}><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No</option></SelectField><SelectField label="Prestazioni incompatibili nel nucleo" value={answers.dedicatedIncompatible} onChange={v => set('dedicatedIncompatible', v)}><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No</option></SelectField></div></section>}

      {children > 0 && <section className="bfq-section"><div className="bfq-section-head"><span>5</span><div><h2>Famiglia</h2><p>Mostriamo solo le domande pertinenti al profilo.</p></div></div><div className="bfq-fields"><SelectField label="Nascita, adozione o affidamento nel 2026" value={answers.event2026} onChange={v => set('event2026', v)}><option value="">Seleziona</option><option value="none">No</option><option value="birth">Nascita</option><option value="adoption">Adozione</option><option value="foster">Affidamento</option></SelectField>{hasYoung && <SelectField label="Frequenza asilo nido" value={answers.nursery} onChange={v => set('nursery', v)}><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No</option></SelectField>}<SelectField label="Situazione lavorativa della madre" value={answers.motherWork} onChange={v => set('motherWork', v)}><option value="">Seleziona</option><option value="none">Nessuna / non rilevante</option><option value="employee">Dipendente</option><option value="self">Autonoma</option></SelectField>{answers.motherWork && answers.motherWork !== 'none' && <SelectField label="Reddito personale da lavoro entro 40.000 €" value={answers.motherIncome} onChange={v => set('motherIncome', v)}><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No</option></SelectField>}{hasFamilyEvent && <SelectField label="Indennità economica di maternità già percepita" value={answers.maternityBenefit} onChange={v => set('maternityBenefit', v)}><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No</option></SelectField>}</div></section>}

      {showAdi && <section className="bfq-section"><div className="bfq-section-head"><span>6</span><div><h2>Assegno di Inclusione</h2><p>I dati economici già letti dall’ISEE non vengono richiesti di nuovo.</p></div></div><div className="bfq-fields"><SelectField label="Hai i requisiti di residenza in Italia e, se richiesto, un titolo di soggiorno valido per l’ADI?" value={answers.adiResidence} onChange={v => set('adiResidence', v)}><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No</option></SelectField>{fields.familyIncome == null && <NumberField label="Reddito familiare annuo" value={answers.adiFamilyIncome} onChange={v => set('adiFamilyIncome', v)} />}{fields.movableAssets == null && <NumberField label="Patrimonio mobiliare" value={answers.adiMovableAssets} onChange={v => set('adiMovableAssets', v)} />}{fields.realEstateAssets == null && <NumberField label="Patrimonio immobiliare rilevante" value={answers.adiRealEstateAssets} onChange={v => set('adiRealEstateAssets', v)} />}<SelectField label="Veicoli incompatibili" value={answers.adiVehicles} onChange={v => set('adiVehicles', v)}><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No</option></SelectField><SelectField label="Dimissioni volontarie rilevanti" value={answers.adiResignation} onChange={v => set('adiResignation', v)}><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No</option></SelectField></div>{fields.familyIncome != null && fields.movableAssets != null && fields.realEstateAssets != null && <div className="bfq-inline-note">Dati economici acquisiti: reddito {euro(fields.familyIncome)} · patrimonio mobiliare {euro(fields.movableAssets)} · patrimonio immobiliare {euro(fields.realEstateAssets)}.</div>}</section>}

      <section className="bfq-section"><div className="bfq-section-head"><span>7</span><div><h2>Ristrutturazioni</h2><p>Solo se hai sostenuto spese agevolabili nel 2026.</p></div></div><div className="bfq-fields"><SelectField label="Spese agevolabili nel 2026" value={answers.renovation} onChange={v => set('renovation', v)}><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No</option></SelectField>{answers.renovation === 'yes' && <><NumberField label="Importo spese" value={answers.renovationAmount} onChange={v => set('renovationAmount', v)} /><SelectField label="Intervento agevolabile" value={answers.renovationEligible} onChange={v => set('renovationEligible', v)}><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No / da verificare</option></SelectField></>}</div></section>

      {error && <div className="checkout-error" role="alert">{error}</div>}
      <button className="bfq-btn-primary bfq-submit-final" type="submit"><span>Prepara il risultato gratuito</span><strong>→</strong></button>
    </form>
  </section>;
}

function statusLabel(benefit) {
  if (benefit.eligibility === 'graduatoria' || benefit.eligibility === 'potenzialmente-assegnabile') return 'POTENZIALMENTE ASSEGNABILE';
  if (benefit.amount === 'spetta') return 'SPETTA AL PROFILO';
  return 'PROFILO COMPATIBILE';
}

function amountLabel(benefit) {
  if (benefit.displayAmount) return benefit.displayAmount;
  if (Number.isFinite(Number(benefit.amount))) return euro(Number(benefit.amount));
  if (benefit.amount === 'spetta') return 'Spetta';
  if (benefit.amount === 'compatibile') return 'Compatibile';
  return 'Importo variabile';
}

function Result({ analysis, onBack, onReset }) {
  const result = useMemo(() => calculate(analysis.input), [analysis]);
  const [downloadError, setDownloadError] = useState('');
  const [downloading, setDownloading] = useState(false);

  async function downloadReport() {
    setDownloadError('');
    setDownloading(true);
    try {
      const response = await fetch('/api/report-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: analysis.input, profile: analysis.profile })
      });
      if (!response.ok) throw new Error('Impossibile generare la relazione.');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'BonusFatto_Relazione_TEST.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1200);
    } catch (err) {
      setDownloadError(err?.message || 'Relazione non disponibile.');
    } finally {
      setDownloading(false);
    }
  }

  return <section className="bfq-result-page page-enter">
    <div className="bfq-result-topbar"><button className="bfq-link-button" type="button" onClick={onBack}>← Modifica risposte</button><button className="bfq-link-button" type="button" onClick={onReset}>Nuova analisi</button></div>
    <div className="bfq-result-hero">
      <div><span className="eyebrow">RISULTATO COMPLETO · TEST GRATUITO</span><h1>La tua analisi è pronta.</h1><p>Abbiamo individuato <strong>{result.benefits.length} agevolazioni</strong> compatibili con il profilo analizzato.</p></div>
      <button className="bfq-download-hero" type="button" onClick={downloadReport} disabled={downloading}><span>↓</span><div><strong>{downloading ? 'Preparazione PDF…' : 'Scarica la relazione PDF'}</strong><small>Relazione personalizzata · 0 €</small></div></button>
    </div>

    <div className="bfq-result-stats"><div><span>AGEVOLAZIONI</span><strong>{result.benefits.length}</strong></div><div><span>COMUNE</span><strong>{analysis.input.municipality.name}</strong></div><div><span>ISEE UTILIZZATO</span><strong>{euro(analysis.input.isee)}</strong></div></div>
    {downloadError && <div className="checkout-error" role="alert">{downloadError}</div>}

    <div className="bfq-benefit-grid">{result.benefits.map((benefit, index) => <article className={`bfq-benefit-card tone-${index % 4}`} key={benefit.id || index}>
      <div className="bfq-benefit-head"><div className="bfq-benefit-number">{String(index + 1).padStart(2, '0')}</div><span className="bfq-status">{statusLabel(benefit)}</span></div>
      <span className="bfq-category">{benefit.category || 'Agevolazione'}</span>
      <h2>{benefit.name}</h2>
      <div className="bfq-benefit-amount"><strong>{amountLabel(benefit)}</strong>{benefit.period && <span>{benefit.period}</span>}</div>
      <p>{benefit.description}</p>
    </article>)}</div>

    <section className="bfq-final-download"><div><span className="eyebrow">RELAZIONE PERSONALIZZATA</span><h2>Porta con te tutti i risultati.</h2><p>Il PDF riepiloga agevolazioni, importi e profilo utilizzato per il calcolo.</p></div><button className="bfq-btn-primary" type="button" onClick={downloadReport} disabled={downloading}>{downloading ? 'Preparazione PDF…' : 'Scarica relazione PDF gratuita'}</button></section>
  </section>;
}

function Upload({ file, setFile, error, reading, onRead, hasSaved, onReset }) {
  return <section className="bfq-upload-page page-enter">
    <div className="bfq-upload-intro"><span className="eyebrow">ANALISI CON RELAZIONE · TEST GRATUITO</span><h1>Partiamo dalla tua <span>attestazione ISEE.</span></h1><p>Carica il PDF 2026: leggiamo automaticamente ISEE, nucleo, età, redditi e patrimoni e ti chiediamo soltanto ciò che manca.</p></div>
    <div className="bfq-upload-panel">
      <div className="bfq-upload-icon">PDF</div>
      <h2>Carica l’attestazione ISEE 2026</h2>
      <p>Serve solo l’attestazione INPS. <strong>Non serve la DSU.</strong></p>
      <label className="bfq-dropzone"><input type="file" accept="application/pdf,.pdf" onChange={e => { setFile(e.target.files?.[0] || null); }} /><span className="bfq-drop-icon">＋</span><strong>{file ? 'Sostituisci il PDF' : 'Seleziona il PDF'}</strong><small>PDF · massimo 10 MB</small></label>
      {file && <div className="bfq-selected-file"><span>✓</span><div><strong>{file.name}</strong><small>{(file.size / 1024 / 1024).toFixed(2)} MB · pronto per la lettura</small></div></div>}
      {error && <div className="checkout-error" role="alert">{error}</div>}
      <button className="bfq-btn-primary bfq-upload-cta" type="button" onClick={onRead} disabled={!file || reading}><span>{reading ? 'Sto leggendo l’attestazione…' : 'Leggi ISEE e continua'}</span><strong>→</strong></button>
      <div className="bfq-upload-trust"><span>🔒 Nessuna registrazione</span><span>⚡ Lettura automatica</span><span>€ Test gratuito</span></div>
      {hasSaved && <button className="bfq-link-button bfq-reset-link" type="button" onClick={onReset}>Azzera il test precedente</button>}
    </div>
  </section>;
}

export default function IseeReportFlowV4() {
  const entry = useMemo(() => safeParse(window.sessionStorage.getItem(ENTRY_KEY), {}), []);
  const saved = useMemo(() => safeParse(window.sessionStorage.getItem(ANALYSIS_KEY), null), []);
  const [step, setStep] = useState(saved ? 'result' : 'upload');
  const [file, setFile] = useState(null);
  const [fields, setFields] = useState(null);
  const [analysis, setAnalysis] = useState(saved);
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);

  async function parseFile() {
    if (!file) return setError('Seleziona prima l’attestazione ISEE in PDF.');
    if (!(file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf'))) return setError('Carica un file PDF.');
    if (file.size > 10 * 1024 * 1024) return setError('Il PDF supera il limite di 10 MB.');
    setReading(true);
    setError('');
    try {
      const text = await readPdfText(file);
      const parsed = extractIseeFields(text);
      if (!parsed.year2026) throw new Error('Il documento non risulta un’attestazione ISEE 2026.');
      if (!Number.isFinite(Number(parsed.isee))) throw new Error('Valore ISEE non rilevato.');
      setFields(parsed);
      setStep('questions');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err?.message || 'Non siamo riusciti a leggere l’attestazione.');
    } finally {
      setReading(false);
    }
  }

  function complete(nextAnalysis) {
    setAnalysis(nextAnalysis);
    window.sessionStorage.setItem(ANALYSIS_KEY, JSON.stringify(nextAnalysis));
    setStep('result');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function reset() {
    window.sessionStorage.removeItem(ANALYSIS_KEY);
    setAnalysis(null);
    setFields(null);
    setFile(null);
    setStep('upload');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (!entry?.comune) return <FlowShell><section className="bfq-page"><div className="bfq-title"><h1>Dati del calcolo non disponibili.</h1><p>Torna alla home e avvia nuovamente “Analisi con relazione”.</p></div></section></FlowShell>;
  if (step === 'questions' && fields) return <FlowShell><Questions entry={entry} fields={fields} onBack={() => setStep('upload')} onComplete={complete} /></FlowShell>;
  if (step === 'result' && analysis) return <FlowShell><Result analysis={analysis} onBack={() => setStep(fields ? 'questions' : 'upload')} onReset={reset} /></FlowShell>;

  return <FlowShell><Upload file={file} setFile={next => { setFile(next); setError(''); }} error={error} reading={reading} onRead={parseFile} hasSaved={Boolean(saved)} onReset={reset} /></FlowShell>;
}
