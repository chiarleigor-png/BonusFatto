import { useMemo, useState } from 'react';
import { calculate, euro } from './benefits.js';
import { openBillingForm } from './billingForm.js';

const ENTRY_KEY = 'bonusfatto_report_entry';
const ANALYSIS_KEY = 'bonusfatto_report_analysis';
const PDFJS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs';
const PDFJS_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';

function safeParse(value, fallback = null) {
  try { return JSON.parse(value); } catch { return fallback; }
}

function parseEuro(value) {
  const normalized = String(value || '').replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function firstMoney(flat, patterns) {
  for (const pattern of patterns) {
    const match = flat.match(pattern);
    if (match) {
      const value = parseEuro(match[1]);
      if (value !== null) return value;
    }
  }
  return null;
}

function extractIseeFields(text) {
  const flat = String(text || '').replace(/\s+/g, ' ').trim();
  const isee = firstMoney(flat, [
    /(?:Indicatore della situazione economica equivalente|ISEE\s+ORDINARIO)[^\d]{0,180}(?:Euro|€)?\s*([0-9.]+,[0-9]{2})/i,
    /ISEE\s+ORDINARIO[^\d]{0,220}(?:Euro|€)\s*([0-9.]+,[0-9]{2})/i,
    /(?:Euro|€)\s*([0-9.]+,[0-9]{2})[^A-Z]{0,100}ISEE/i,
  ]);

  let household = null;
  const householdMatch = flat.match(/Parametro\s+calcolato\s+in\s+base\s+al\s+numero\s+di\s+componenti\s+del\s+nucleo[^0-9]{0,40}([0-9]+(?:,[0-9]+)?)/i);
  if (householdMatch) household = Math.max(1, Math.round(parseEuro(householdMatch[1]) || 0));

  const familyIncome = firstMoney(flat, [
    /Somma\s+dei\s+redditi\s+dei\s+componenti\s+del\s+nucleo\s+(?:Euro|€)?\s*\+?\s*([0-9.]+,[0-9]{2})/i,
  ]);
  const movableAssets = firstMoney(flat, [
    /Patrimonio\s+mobiliare\s+del\s+nucleo\s+(?:Euro|€)?\s*\+?\s*([0-9.]+,[0-9]{2})/i,
  ]);
  const realEstateAssets = firstMoney(flat, [
    /Patrimonio\s+immobiliare\s+del\s+nucleo\s+(?:Euro|€)?\s*\+?\s*([0-9.]+,[0-9]{2})/i,
  ]);

  return {
    isee,
    household,
    familyIncome,
    movableAssets,
    realEstateAssets,
    year2026: /\b2026\b/.test(flat),
  };
}

async function readPdfText(file) {
  const pdfjs = await import(/* @vite-ignore */ PDFJS_URL);
  pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data: bytes }).promise;
  const pages = [];
  for (let n = 1; n <= pdf.numPages; n += 1) {
    const page = await pdf.getPage(n);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => item.str || '').join(' '));
  }
  return pages.join('\n');
}

function SelectField({ label, value, onChange, children }) {
  return (
    <label className="bfq-field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} required>{children}</select>
    </label>
  );
}

function NumberField({ label, value, onChange, min = 0, max, step = '0.01', required = true }) {
  return (
    <label className="bfq-field">
      <span>{label}</span>
      <input type="number" min={min} max={max} step={step} value={value} onChange={(e) => onChange(e.target.value)} required={required} />
    </label>
  );
}

function FlowShell({ children }) {
  return (
    <div className="app-shell bfq-shell">
      <header className="site-header"><span className="brand"><span className="brand-mark">B</span><span>BonusFatto<span className="brand-dot">.it</span></span></span></header>
      <main>{children}</main>
      <footer className="site-footer"><span>© {new Date().getFullYear()} BonusFatto.it</span><span>Analisi con relazione</span></footer>
    </div>
  );
}

function PdfSummary({ entry, fields }) {
  const manual = Number(entry?.isee);
  const pdfIsee = Number(fields.isee);
  const mismatch = Number.isFinite(manual) && Number.isFinite(pdfIsee) && Math.abs(manual - pdfIsee) > 0.01;
  const rows = [
    ['ISEE attestazione', euro(pdfIsee)],
    ['Componenti nucleo', fields.household != null ? String(fields.household) : null],
    ['Somma redditi nucleo', fields.familyIncome != null ? euro(fields.familyIncome) : null],
    ['Patrimonio mobiliare', fields.movableAssets != null ? euro(fields.movableAssets) : null],
    ['Patrimonio immobiliare', fields.realEstateAssets != null ? euro(fields.realEstateAssets) : null],
  ].filter(([, value]) => value != null);

  return (
    <div className="bfq-extracted">
      <div className="bfq-extracted-head"><span>✓</span><div><strong>Dati recuperati dall’attestazione</strong><small>Non te li chiederemo di nuovo.</small></div></div>
      <div className="bfq-data-grid">{rows.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
      {mismatch ? (
        <div className="bfq-isee-warning"><strong>ISEE corretto dall’attestazione.</strong> Hai inserito {euro(manual)}, ma il PDF riporta {euro(pdfIsee)}. Per l’analisi useremo {euro(pdfIsee)}.</div>
      ) : (
        <div className="bfq-isee-ok">Il valore ISEE inserito coincide con quello dell’attestazione.</div>
      )}
    </div>
  );
}

function Questions({ entry, fields, onBack, onComplete }) {
  const childrenInitial = Math.max(0, Math.min(5, Number(entry?.figli) || 0));
  const [answers, setAnswers] = useState({
    household: fields.household ?? '',
    children: childrenInitial,
    childAges: Array.from({ length: childrenInitial }, () => ''),
    ageBand: '', disability: '', unemployed: '', disadvantage: '', housing: '', annualRent: '',
    electricitySupply: '', gasSupply: '', waterSupply: '', residentAllItaly: '', dedicatedIncompatible: '',
    nursery: '', event2026: '', motherWork: '', motherIncome: '', maternityBenefit: '',
    adiResidence: '', adiFamilyIncome: fields.familyIncome ?? '', adiMovableAssets: fields.movableAssets ?? '', adiRealEstateAssets: fields.realEstateAssets ?? '',
    adiVehicles: '', adiResignation: '', renovation: '', renovationAmount: '', renovationEligible: '',
  });
  const [error, setError] = useState('');
  const effectiveIsee = Number(fields.isee);
  const childAgesNumeric = answers.childAges.map(Number).filter(Number.isFinite);
  const hasYoung = childAgesNumeric.some((age) => age <= 3);
  const showAdi = Number.isFinite(effectiveIsee) && effectiveIsee <= 10140 && (
    Number(answers.children) > 0 || answers.disability === 'yes' || answers.ageBand === '60-64' || answers.ageBand === '65plus' || answers.disadvantage === 'yes'
  );

  const set = (name, value) => setAnswers((current) => ({ ...current, [name]: value }));
  function setChildren(value) {
    const count = Math.max(0, Math.min(5, Number(value) || 0));
    setAnswers((current) => ({ ...current, children: count, childAges: Array.from({ length: count }, (_, i) => current.childAges[i] ?? '') }));
  }
  function setChildAge(index, value) {
    setAnswers((current) => {
      const childAges = [...current.childAges]; childAges[index] = value;
      return { ...current, childAges };
    });
  }

  function submit(event) {
    event.preventDefault(); setError('');
    const household = Number(answers.household);
    const children = Number(answers.children);
    const childAges = answers.childAges.map(Number);
    if (!Number.isFinite(effectiveIsee)) return setError('Non siamo riusciti a leggere il valore ISEE dall’attestazione.');
    if (!Number.isInteger(household) || household < 1) return setError('Indica il numero dei componenti del nucleo.');
    if (children > 0 && childAges.some((age) => !Number.isFinite(age) || age < 0 || age > 40)) return setError('Indica l’età di tutti i figli a carico.');
    if (![answers.electricitySupply, answers.gasSupply, answers.waterSupply].every((v) => v === 'yes' || v === 'no')) return setError('Completa le domande sulle utenze domestiche.');
    if (!answers.ageBand || !answers.disability || !answers.unemployed || !answers.disadvantage || !answers.housing) return setError('Completa i dati principali del nucleo.');
    if (effectiveIsee <= 15000 && (!answers.residentAllItaly || !answers.dedicatedIncompatible)) return setError('Completa le domande per la Carta Dedicata a Te.');
    if (children > 0 && (!answers.event2026 || !answers.nursery || !answers.motherWork || !answers.maternityBenefit)) return setError('Completa le domande dedicate alla famiglia.');
    if (answers.motherWork && answers.motherWork !== 'none' && !answers.motherIncome) return setError('Completa il dato sul reddito da lavoro della madre.');
    if (answers.housing === 'rent' && !Number.isFinite(Number(answers.annualRent))) return setError('Inserisci il canone annuo di affitto.');
    if (!answers.renovation) return setError('Indica se hai sostenuto spese di ristrutturazione nel 2026.');
    if (answers.renovation === 'yes' && (!Number.isFinite(Number(answers.renovationAmount)) || !answers.renovationEligible)) return setError('Completa i dati sulle ristrutturazioni.');
    if (showAdi) {
      const adiNumbers = [answers.adiFamilyIncome, answers.adiMovableAssets, answers.adiRealEstateAssets].map(Number);
      if (adiNumbers.some((v) => !Number.isFinite(v) || v < 0) || !answers.adiResidence || !answers.adiVehicles || !answers.adiResignation) return setError('Completa i dati mancanti per la verifica ADI.');
    }

    const profile = {
      children, childAges, household,
      over60: answers.ageBand === '60-64' || answers.ageBand === '65plus' ? 'yes' : 'no',
      over65: answers.ageBand === '65plus' ? 'yes' : 'no',
      disability: answers.disability, unemployed: answers.unemployed, disadvantage: answers.disadvantage,
      housing: answers.housing, annualRent: answers.housing === 'rent' ? Number(answers.annualRent) : 0,
      electricitySupply: answers.electricitySupply, gasSupply: answers.gasSupply, waterSupply: answers.waterSupply,
      residentAllItaly: answers.residentAllItaly || 'no', dedicatedIncompatible: answers.dedicatedIncompatible || 'yes',
      nursery: answers.nursery || 'no', event2026: answers.event2026 === 'none' ? '' : answers.event2026,
      motherWork: answers.motherWork === 'none' ? '' : answers.motherWork, motherIncome: answers.motherIncome || 'no', maternityBenefit: answers.maternityBenefit || 'no',
      adiResidence: showAdi ? answers.adiResidence : '', adiFamilyIncome: showAdi ? Number(answers.adiFamilyIncome) : '',
      adiMovableAssets: showAdi ? Number(answers.adiMovableAssets) : '', adiRealEstateAssets: showAdi ? Number(answers.adiRealEstateAssets) : '',
      adiVehicles: showAdi ? answers.adiVehicles : '', adiResignation: showAdi ? answers.adiResignation : '',
      renovation: answers.renovation, renovationAmount: answers.renovation === 'yes' ? Number(answers.renovationAmount) : 0,
      renovationEligible: answers.renovation === 'yes' ? answers.renovationEligible : 'no',
    };
    const input = { isee: effectiveIsee, children, municipality: { name: entry.comune }, profile };
    onComplete({ input, profile });
  }

  return (
    <section className="bfq-page page-enter">
      <button className="text-button" type="button" onClick={onBack}>← Cambia attestazione</button>
      <div className="bfq-title"><span className="eyebrow">PASSAGGIO 2</span><h1>Completiamo il tuo profilo.</h1><p>Abbiamo già letto i dati economici presenti nell’ISEE. Ti chiediamo solo ciò che manca per individuare meglio i bonus.</p></div>
      <PdfSummary entry={entry} fields={fields} />

      <form onSubmit={submit} className="bfq-form">
        <section className="bfq-section"><div className="bfq-section-head"><span>1</span><div><h2>Nucleo familiare</h2><p>Composizione e condizioni personali.</p></div></div><div className="bfq-fields">
          {fields.household == null && <NumberField label="Componenti del nucleo" value={answers.household} onChange={(v) => set('household', v)} min={1} max={20} step="1" />}
          <SelectField label="Figli a carico" value={answers.children} onChange={setChildren}>{[0,1,2,3,4,5].map((n) => <option value={n} key={n}>{n}</option>)}</SelectField>
          <SelectField label="Età più elevata nel nucleo" value={answers.ageBand} onChange={(v) => set('ageBand', v)}><option value="">Seleziona</option><option value="none">Nessuno ha 60 anni</option><option value="60-64">Almeno una persona ha 60–64 anni</option><option value="65plus">Almeno una persona ha 65 anni o più</option></SelectField>
          <SelectField label="Disabilità nel nucleo" value={answers.disability} onChange={(v) => set('disability', v)}><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No</option></SelectField>
          <SelectField label="Persona 18–59 senza lavoro, disponibile a formazione" value={answers.unemployed} onChange={(v) => set('unemployed', v)}><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No</option></SelectField>
          <SelectField label="Condizione di svantaggio rilevante per ADI" value={answers.disadvantage} onChange={(v) => set('disadvantage', v)}><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No</option></SelectField>
          <SelectField label="Abitazione" value={answers.housing} onChange={(v) => set('housing', v)}><option value="">Seleziona</option><option value="owner">Abitazione principale di proprietà / diritto reale</option><option value="rent">In affitto</option><option value="other">Altro</option></SelectField>
          {answers.housing === 'rent' && <NumberField label="Canone annuo di affitto" value={answers.annualRent} onChange={(v) => set('annualRent', v)} />}
        </div>
        {answers.children > 0 && <div className="bfq-child-row">{answers.childAges.map((age, i) => <NumberField key={i} label={`Età figlio ${i + 1}`} value={age} onChange={(v) => setChildAge(i, v)} min={0} max={40} step="1" />)}</div>}</section>

        <section className="bfq-section"><div className="bfq-section-head"><span>2</span><div><h2>Utenze domestiche</h2><p>Tre risposte rapide per luce, gas e acqua.</p></div></div><div className="bfq-fields bfq-three">
          <SelectField label="Luce idonea" value={answers.electricitySupply} onChange={(v) => set('electricitySupply', v)}><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No</option></SelectField>
          <SelectField label="Gas idoneo" value={answers.gasSupply} onChange={(v) => set('gasSupply', v)}><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No</option></SelectField>
          <SelectField label="Acqua idonea" value={answers.waterSupply} onChange={(v) => set('waterSupply', v)}><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No</option></SelectField>
        </div></section>

        {effectiveIsee <= 15000 && <section className="bfq-section"><div className="bfq-section-head"><span>3</span><div><h2>Carta Dedicata a Te</h2><p>Verifichiamo i requisiti non presenti nell’attestazione.</p></div></div><div className="bfq-fields">
          <SelectField label="Tutti i componenti residenti in Italia" value={answers.residentAllItaly} onChange={(v) => set('residentAllItaly', v)}><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No</option></SelectField>
          <SelectField label="Il nucleo percepisce prestazioni incompatibili" value={answers.dedicatedIncompatible} onChange={(v) => set('dedicatedIncompatible', v)}><option value="">Seleziona</option><option value="no">No</option><option value="yes">Sì</option></SelectField>
        </div></section>}

        {answers.children > 0 && <section className="bfq-section"><div className="bfq-section-head"><span>4</span><div><h2>Famiglia</h2><p>Solo le informazioni che possono attivare bonus specifici.</p></div></div><div className="bfq-fields">
          <SelectField label="Evento nel 2026" value={answers.event2026} onChange={(v) => set('event2026', v)}><option value="">Seleziona</option><option value="none">Nessuno</option><option value="birth">Nascita</option><option value="adoption">Adozione</option><option value="foster">Affidamento</option></SelectField>
          <SelectField label="Frequenza asilo nido" value={answers.nursery} onChange={(v) => set('nursery', v)}><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No</option></SelectField>
          <SelectField label="Situazione lavorativa della madre" value={answers.motherWork} onChange={(v) => set('motherWork', v)}><option value="">Seleziona</option><option value="none">Non applicabile / non lavora</option><option value="employee">Lavoratrice dipendente</option><option value="self">Lavoratrice autonoma</option></SelectField>
          {answers.motherWork && answers.motherWork !== 'none' && <SelectField label="Reddito personale da lavoro entro 40.000 €" value={answers.motherIncome} onChange={(v) => set('motherIncome', v)}><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No</option></SelectField>}
          <SelectField label="Indennità economica di maternità già percepita" value={answers.maternityBenefit} onChange={(v) => set('maternityBenefit', v)}><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No</option></SelectField>
        </div>{hasYoung && <p className="bfq-inline-note">Nel nucleo c’è almeno un figlio fino a 3 anni: il motore potrà valutare anche il bonus nido.</p>}</section>}

        {showAdi && <section className="bfq-section"><div className="bfq-section-head"><span>5</span><div><h2>Assegno di Inclusione</h2><p>I dati economici letti dall’ISEE sono già compilati. Restano solo i requisiti amministrativi mancanti.</p></div></div><div className="bfq-fields">
          <SelectField label="Requisiti di soggiorno/residenza soddisfatti" value={answers.adiResidence} onChange={(v) => set('adiResidence', v)}><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No</option></SelectField>
          {fields.familyIncome == null && <NumberField label="Reddito familiare annuo" value={answers.adiFamilyIncome} onChange={(v) => set('adiFamilyIncome', v)} />}
          {fields.movableAssets == null && <NumberField label="Patrimonio mobiliare" value={answers.adiMovableAssets} onChange={(v) => set('adiMovableAssets', v)} />}
          {fields.realEstateAssets == null && <NumberField label="Patrimonio immobiliare rilevante" value={answers.adiRealEstateAssets} onChange={(v) => set('adiRealEstateAssets', v)} />}
          <SelectField label="Veicoli incompatibili" value={answers.adiVehicles} onChange={(v) => set('adiVehicles', v)}><option value="">Seleziona</option><option value="no">No</option><option value="yes">Sì</option></SelectField>
          <SelectField label="Dimissioni volontarie rilevanti" value={answers.adiResignation} onChange={(v) => set('adiResignation', v)}><option value="">Seleziona</option><option value="no">No</option><option value="yes">Sì</option></SelectField>
        </div></section>}

        <section className="bfq-section"><div className="bfq-section-head"><span>6</span><div><h2>Ristrutturazioni</h2><p>Ultima verifica prima dell’anteprima.</p></div></div><div className="bfq-fields">
          <SelectField label="Spese di ristrutturazione agevolabili nel 2026" value={answers.renovation} onChange={(v) => set('renovation', v)}><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No</option></SelectField>
          {answers.renovation === 'yes' && <><NumberField label="Spesa sostenuta" value={answers.renovationAmount} onChange={(v) => set('renovationAmount', v)} /><SelectField label="Intervento agevolabile e documentato" value={answers.renovationEligible} onChange={(v) => set('renovationEligible', v)}><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No / da verificare</option></SelectField></>}
        </div></section>

        {error && <p className="checkout-error bfq-error" role="alert">{error}</p>}
        <button className="primary bfq-submit" type="submit">Prepara la mia anteprima</button>
      </form>
    </section>
  );
}

function Preview({ data, onBack }) {
  const result = useMemo(() => calculate(data.input), [data]);
  function pay() {
    sessionStorage.setItem(ANALYSIS_KEY, JSON.stringify(data));
    openBillingForm('report', { comune: data.input.municipality.name, isee: data.input.isee, figli: data.input.children, profile: data.profile });
  }
  return (
    <section className="paywall-shell page-enter">
      <button className="text-button" type="button" onClick={onBack}>← Modifica le risposte</button>
      <div className="paywall-heading"><span className="eyebrow">ANTEPRIMA PRONTA</span><h1>Abbiamo individuato <span>{result.benefits.length} agevolazioni</span>.</h1><p className="lead">Il conteggio usa il valore ISEE dell’attestazione e le risposte appena fornite.</p></div>
      <section className="bf-preview-section-v3"><div className="bf-preview-heading"><div><span className="eyebrow">RISULTATI TROVATI</span><h2>La tua analisi è pronta</h2></div><span className="bf-preview-count">{result.benefits.length} trovati</span></div><div className="bf-preview-list-v3">{result.benefits.map((benefit, index) => <article className="bf-preview-card-v3" key={benefit.id || index}><div className="bf-card-blurred"><div className="bf-card-index">{String(index + 1).padStart(2, '0')}</div><div><span className="category">AGEVOLAZIONE INDIVIDUATA</span><h3>{benefit.name}</h3><p>Importo, motivazione e dettagli disponibili dopo lo sblocco.</p></div><div className="bf-card-amount">€ —</div></div><div className="bf-preview-lock-overlay"><span className="bf-preview-lock-pill">🔒 Dettagli bloccati</span></div></article>)}</div></section>
      <article className="plan-card featured" style={{ maxWidth: 720, margin: '24px auto 0' }}><span className="plan-badge">ANALISI CON RELAZIONE</span><h2>Sblocca risultato e relazione</h2><div className="plan-price">6,90 € <small>prezzo servizio</small></div><p>Durante i test il checkout resta temporaneamente a 1,00 €.</p><button className="primary" type="button" onClick={pay} style={{ width: '100%' }}>Sblocca · TEST 1,00 €</button></article>
    </section>
  );
}

export default function IseeReportFlow() {
  const [entry, setEntry] = useState(() => safeParse(sessionStorage.getItem(ENTRY_KEY), null));
  const [stage, setStage] = useState('upload');
  const [file, setFile] = useState(null);
  const [fields, setFields] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');

  if (!entry?.comune) return <FlowShell><section className="paywall-shell"><div className="paywall-heading"><h1>Dati del calcolo non disponibili.</h1><p className="lead">Torna alla home e avvia nuovamente l’Analisi con relazione.</p></div></section></FlowShell>;
  if (stage === 'questions' && fields) return <FlowShell><Questions entry={entry} fields={fields} onBack={() => setStage('upload')} onComplete={(data) => { setAnalysis(data); setStage('preview'); }} /></FlowShell>;
  if (stage === 'preview' && analysis) return <FlowShell><Preview data={analysis} onBack={() => setStage('questions')} /></FlowShell>;

  async function analyse() {
    if (!file) return;
    setReading(true); setError('');
    try {
      const text = await readPdfText(file);
      if (!text.trim()) throw new Error('Il PDF non contiene testo leggibile.');
      const extracted = extractIseeFields(text);
      if (!extracted.year2026) throw new Error('Non risulta un’attestazione ISEE riferita al 2026.');
      if (!Number.isFinite(Number(extracted.isee))) throw new Error('Non siamo riusciti a leggere il valore ISEE dall’attestazione.');
      const correctedEntry = { ...entry, isee: Number(extracted.isee) };
      sessionStorage.setItem(ENTRY_KEY, JSON.stringify(correctedEntry));
      setEntry(correctedEntry);
      setFields(extracted);
      setStage('questions');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) { setError(err?.message || 'Non è stato possibile leggere il PDF.'); }
    finally { setReading(false); }
  }

  return <FlowShell><section className="bfq-upload page-enter"><div className="bfq-title"><span className="eyebrow">ANALISI CON RELAZIONE</span><h1>Carica il tuo <span>ISEE 2026</span>.</h1><p>Leggiamo automaticamente i dati già presenti nell’attestazione e ti chiediamo soltanto ciò che manca.</p></div><article className="bfq-upload-card"><span className="bfq-step">PASSAGGIO 1</span><h2>Attestazione ISEE 2026</h2><p>Carica soltanto l’attestazione in PDF. Non serve la DSU.</p><label className="bfq-file"><span>Seleziona il PDF</span><input type="file" accept="application/pdf,.pdf" onChange={(e) => { const selected = e.target.files?.[0] || null; setError(''); setFields(null); setFile(null); setAnalysis(null); if (!selected) return; if (!(selected.type === 'application/pdf' || selected.name.toLowerCase().endsWith('.pdf'))) { setError('Carica un file PDF.'); e.target.value=''; return; } if (selected.size > 10 * 1024 * 1024) { setError('Il PDF supera 10 MB.'); e.target.value=''; return; } setFile(selected); }} /></label>{file && <div className="bfq-file-ok"><span>✓</span><div><strong>PDF selezionato</strong><small>{file.name}</small></div></div>}{error && <p className="checkout-error bfq-error" role="alert">{error}</p>}<button className="primary bfq-submit" type="button" disabled={!file || reading} onClick={analyse}>{reading ? 'Lettura dell’attestazione…' : 'Leggi ISEE e continua'}</button></article></section></FlowShell>;
}
