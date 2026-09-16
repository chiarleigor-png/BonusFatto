import { useMemo, useState } from 'react';
import AppV4 from './AppV4.jsx';
import { calculate } from './benefits.js';
import { openBillingForm } from './billingForm.js';

const ENTRY_KEY = 'bonusfatto_report_entry';
const ANALYSIS_KEY = 'bonusfatto_report_analysis';
const PDFJS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs';
const PDFJS_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';

function safeParse(value, fallback = null) {
  try { return JSON.parse(value); } catch { return fallback; }
}

function parseEuro(value) {
  const normalized = String(value || '').replace(/\./g, '').replace(',', '.');
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function extractIseeFields(text) {
  const flat = String(text || '').replace(/\s+/g, ' ').trim();
  const patterns = [
    /(?:Indicatore della Situazione Economica Equivalente|ISEE(?:\s+ORDINARIO)?)[^\d]{0,140}(?:Euro|€)?\s*([0-9.]+,[0-9]{2})/i,
    /ISEE\s+ORDINARIO[^\d]{0,180}(?:Euro|€)\s*([0-9.]+,[0-9]{2})/i,
    /(?:Euro|€)\s*([0-9.]+,[0-9]{2})[^A-Z]{0,80}ISEE/i,
  ];
  let isee = null;
  for (const pattern of patterns) {
    const match = flat.match(pattern);
    if (match) {
      isee = parseEuro(match[1]);
      if (isee !== null) break;
    }
  }
  return { isee, year2026: /\b2026\b/.test(flat) };
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

function shell(content) {
  return (
    <div className="app-shell">
      <header className="site-header">
        <span className="brand"><span className="brand-mark">B</span><span>BonusFatto<span className="brand-dot">.it</span></span></span>
      </header>
      <main>{content}</main>
      <footer className="site-footer"><span>© {new Date().getFullYear()} BonusFatto.it</span><span>Analisi con relazione</span></footer>
    </div>
  );
}

function Select({ value, onChange, children, required = false }) {
  return <select value={value} onChange={(e) => onChange(e.target.value)} required={required}>{children}</select>;
}

function buildFreshAnswers(entry, fields) {
  const children = Math.max(0, Math.min(5, Number(entry?.figli) || 0));
  return {
    isee: fields?.isee ?? Number(entry?.isee) ?? '',
    household: '',
    children,
    childAges: Array.from({ length: children }, () => ''),
    ageBand: '',
    disability: '',
    unemployed: '',
    disadvantage: '',
    housing: '',
    annualRent: '',
    electricitySupply: '',
    gasSupply: '',
    waterSupply: '',
    residentAllItaly: '',
    dedicatedIncompatible: '',
    nursery: '',
    event2026: '',
    motherWork: '',
    motherIncome: '',
    maternityBenefit: '',
    adiResidence: '',
    adiFamilyIncome: '',
    adiMovableAssets: '',
    adiRealEstateAssets: '',
    adiVehicles: '',
    adiResignation: '',
    renovation: '',
    renovationAmount: '',
    renovationEligible: '',
  };
}

function Questions({ entry, fields, onBack, onComplete }) {
  const [answers, setAnswers] = useState(() => buildFreshAnswers(entry, fields));
  const [error, setError] = useState('');
  const iseeNumber = Number(answers.isee);
  const childAgesNumeric = answers.childAges.map((v) => Number(v)).filter(Number.isFinite);
  const hasYoung = childAgesNumeric.some((age) => age <= 3);
  const showAdi = Number.isFinite(iseeNumber) && iseeNumber <= 10140 && (
    Number(answers.children) > 0 || answers.disability === 'yes' || answers.ageBand === '60-64' || answers.ageBand === '65plus' || answers.disadvantage === 'yes'
  );

  function set(name, value) {
    setAnswers((current) => ({ ...current, [name]: value }));
  }

  function setChildren(value) {
    const count = Math.max(0, Math.min(5, Number(value) || 0));
    setAnswers((current) => ({
      ...current,
      children: count,
      childAges: Array.from({ length: count }, (_, index) => current.childAges[index] ?? ''),
    }));
  }

  function setChildAge(index, value) {
    setAnswers((current) => {
      const childAges = [...current.childAges];
      childAges[index] = value;
      return { ...current, childAges };
    });
  }

  function submit(event) {
    event.preventDefault();
    setError('');
    const effectiveIsee = Number(answers.isee);
    const household = Number(answers.household);
    const children = Number(answers.children);
    const childAges = answers.childAges.map((v) => Number(v));

    if (!Number.isFinite(effectiveIsee) || effectiveIsee < 0) return setError('Inserisci un valore ISEE valido.');
    if (!Number.isInteger(household) || household < 1) return setError('Indica il numero dei componenti del nucleo.');
    if (children > 0 && childAges.some((age) => !Number.isFinite(age) || age < 0 || age > 40)) return setError('Indica l’età di tutti i figli a carico.');
    if (![answers.electricitySupply, answers.gasSupply, answers.waterSupply].every((v) => v === 'yes' || v === 'no')) return setError('Conferma i requisiti delle utenze luce, gas e acqua.');
    if (!answers.ageBand || !answers.disability || !answers.unemployed || !answers.disadvantage || !answers.housing) return setError('Completa i dati principali del nucleo.');
    if (iseeNumber <= 15000 && (!answers.residentAllItaly || !answers.dedicatedIncompatible)) return setError('Completa le domande per la Carta Dedicata a Te.');
    if (children > 0 && (!answers.event2026 || !answers.nursery || !answers.motherWork || !answers.maternityBenefit)) return setError('Completa le domande dedicate alla famiglia.');
    if (answers.motherWork && answers.motherWork !== 'none' && !answers.motherIncome) return setError('Indica se il reddito personale da lavoro della madre è entro 40.000 €.');
    if (answers.housing === 'rent' && (!Number.isFinite(Number(answers.annualRent)) || Number(answers.annualRent) < 0)) return setError('Inserisci il canone annuo di affitto.');
    if (!answers.renovation) return setError('Indica se hai sostenuto spese di ristrutturazione nel 2026.');
    if (answers.renovation === 'yes' && (!Number.isFinite(Number(answers.renovationAmount)) || !answers.renovationEligible)) return setError('Completa i dati sulle spese di ristrutturazione.');
    if (showAdi) {
      const numericAdi = [answers.adiFamilyIncome, answers.adiMovableAssets, answers.adiRealEstateAssets].map(Number);
      if (!answers.adiResidence || !answers.adiVehicles || !answers.adiResignation || numericAdi.some((v) => !Number.isFinite(v) || v < 0)) {
        return setError('Completa i dati richiesti per verificare l’Assegno di Inclusione.');
      }
    }

    const profile = {
      children,
      childAges,
      household,
      over60: answers.ageBand === '60-64' || answers.ageBand === '65plus' ? 'yes' : 'no',
      over65: answers.ageBand === '65plus' ? 'yes' : 'no',
      disability: answers.disability,
      unemployed: answers.unemployed,
      disadvantage: answers.disadvantage,
      housing: answers.housing,
      annualRent: answers.housing === 'rent' ? Number(answers.annualRent) : 0,
      electricitySupply: answers.electricitySupply,
      gasSupply: answers.gasSupply,
      waterSupply: answers.waterSupply,
      residentAllItaly: answers.residentAllItaly || 'no',
      dedicatedIncompatible: answers.dedicatedIncompatible || 'yes',
      nursery: answers.nursery || 'no',
      event2026: answers.event2026 === 'none' ? '' : answers.event2026,
      motherWork: answers.motherWork === 'none' ? '' : answers.motherWork,
      motherIncome: answers.motherIncome || 'no',
      maternityBenefit: answers.maternityBenefit || 'no',
      adiResidence: showAdi ? answers.adiResidence : '',
      adiFamilyIncome: showAdi ? Number(answers.adiFamilyIncome) : '',
      adiMovableAssets: showAdi ? Number(answers.adiMovableAssets) : '',
      adiRealEstateAssets: showAdi ? Number(answers.adiRealEstateAssets) : '',
      adiVehicles: showAdi ? answers.adiVehicles : '',
      adiResignation: showAdi ? answers.adiResignation : '',
      renovation: answers.renovation,
      renovationAmount: answers.renovation === 'yes' ? Number(answers.renovationAmount) : 0,
      renovationEligible: answers.renovation === 'yes' ? answers.renovationEligible : 'no',
    };

    const input = {
      isee: effectiveIsee,
      children,
      municipality: { name: entry.comune },
      profile,
    };
    onComplete({ input, profile });
  }

  return (
    <section className="paywall-shell page-enter">
      <button className="text-button" type="button" onClick={onBack}>← Torna al PDF</button>
      <div className="paywall-heading">
        <span className="eyebrow">PASSAGGIO 2</span>
        <h1>Completiamo solo i dati <span>che l’ISEE non contiene</span>.</h1>
        <p className="lead">Queste risposte servono per evitare risultati generici o campi “Non so” nella relazione.</p>
      </div>

      <form className="form-card" onSubmit={submit} style={{ maxWidth: 860, margin: '0 auto' }}>
        <div className="field-grid">
          <label>Valore ISEE 2026<input type="number" min="0" step="0.01" value={answers.isee} onChange={(e) => set('isee', e.target.value)} required /></label>
          <label>Componenti del nucleo<input type="number" min="1" max="20" value={answers.household} onChange={(e) => set('household', e.target.value)} required /></label>
          <label>Figli a carico<Select value={answers.children} onChange={setChildren}>{[0,1,2,3,4,5].map((n) => <option value={n} key={n}>{n}</option>)}</Select></label>
          <label>Età più elevata nel nucleo<Select value={answers.ageBand} onChange={(v) => set('ageBand', v)} required><option value="">Seleziona</option><option value="none">Nessuno ha 60 anni</option><option value="60-64">Almeno una persona ha 60–64 anni</option><option value="65plus">Almeno una persona ha 65 anni o più</option></Select></label>
          <label>Disabilità nel nucleo<Select value={answers.disability} onChange={(v) => set('disability', v)} required><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No</option></Select></label>
          <label>Persona 18–59 senza lavoro e disponibile a formazione?<Select value={answers.unemployed} onChange={(v) => set('unemployed', v)} required><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No</option></Select></label>
          <label>Condizione di svantaggio rilevante per ADI<Select value={answers.disadvantage} onChange={(v) => set('disadvantage', v)} required><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No</option></Select></label>
          <label>Abitazione<Select value={answers.housing} onChange={(v) => set('housing', v)} required><option value="">Seleziona</option><option value="owner">Abitazione principale di proprietà / diritto reale</option><option value="rent">In affitto</option><option value="other">Altro</option></Select></label>
        </div>

        {answers.housing === 'rent' && <label style={{ marginTop: 14 }}>Canone annuo di affitto<input type="number" min="0" step="0.01" value={answers.annualRent} onChange={(e) => set('annualRent', e.target.value)} required /></label>}

        {answers.children > 0 && (
          <div className="white-card" style={{ marginTop: 18 }}>
            <h3>Età dei figli a carico</h3>
            <div className="field-grid">{answers.childAges.map((age, index) => <label key={index}>Figlio {index + 1}<input type="number" min="0" max="40" value={age} onChange={(e) => setChildAge(index, e.target.value)} required /></label>)}</div>
          </div>
        )}

        <div className="white-card" style={{ marginTop: 18 }}>
          <h3>Utenze domestiche</h3>
          <p>Qui non lasciamo più “Non so”: serve una risposta per stabilire quali bonus sociali possono essere riconosciuti.</p>
          <div className="field-grid">
            <label>Luce: fornitura idonea?<Select value={answers.electricitySupply} onChange={(v) => set('electricitySupply', v)} required><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No</option></Select></label>
            <label>Gas: fornitura diretta o condominiale idonea?<Select value={answers.gasSupply} onChange={(v) => set('gasSupply', v)} required><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No</option></Select></label>
            <label>Acqua: fornitura diretta o condominiale idonea?<Select value={answers.waterSupply} onChange={(v) => set('waterSupply', v)} required><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No</option></Select></label>
          </div>
        </div>

        {Number.isFinite(iseeNumber) && iseeNumber <= 15000 && (
          <div className="white-card" style={{ marginTop: 18 }}>
            <h3>Carta Dedicata a Te</h3>
            <div className="field-grid">
              <label>Tutti i componenti sono residenti in Italia?<Select value={answers.residentAllItaly} onChange={(v) => set('residentAllItaly', v)} required><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No</option></Select></label>
              <label>Il nucleo percepisce prestazioni incompatibili?<Select value={answers.dedicatedIncompatible} onChange={(v) => set('dedicatedIncompatible', v)} required><option value="">Seleziona</option><option value="no">No</option><option value="yes">Sì</option></Select></label>
            </div>
          </div>
        )}

        {answers.children > 0 && (
          <div className="white-card" style={{ marginTop: 18 }}>
            <h3>Famiglia</h3>
            <div className="field-grid">
              <label>Evento nel 2026<Select value={answers.event2026} onChange={(v) => set('event2026', v)} required><option value="">Seleziona</option><option value="none">Nessuno</option><option value="birth">Nascita</option><option value="adoption">Adozione</option><option value="foster">Affidamento</option></Select></label>
              <label>Frequenza asilo nido<Select value={answers.nursery} onChange={(v) => set('nursery', v)} required><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No</option></Select></label>
              <label>Situazione lavorativa della madre<Select value={answers.motherWork} onChange={(v) => set('motherWork', v)} required><option value="">Seleziona</option><option value="none">Non applicabile / non lavora</option><option value="employee">Lavoratrice dipendente</option><option value="self">Lavoratrice autonoma</option></Select></label>
              {answers.motherWork && answers.motherWork !== 'none' && <label>Reddito personale da lavoro entro 40.000 €?<Select value={answers.motherIncome} onChange={(v) => set('motherIncome', v)} required><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No</option></Select></label>}
              <label>Indennità economica di maternità già percepita?<Select value={answers.maternityBenefit} onChange={(v) => set('maternityBenefit', v)} required><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No</option></Select></label>
            </div>
            {hasYoung && <p className="field-hint">Nel nucleo risulta almeno un figlio fino a 3 anni: il motore potrà valutare anche il bonus nido se hai indicato la frequenza.</p>}
          </div>
        )}

        {showAdi && (
          <div className="white-card" style={{ marginTop: 18 }}>
            <h3>Verifica Assegno di Inclusione</h3>
            <p>Con questo ISEE e la composizione indicata il profilo può rientrare nella platea ADI. Per non dare un esito generico servono questi dati.</p>
            <div className="field-grid">
              <label>Requisiti di soggiorno/residenza soddisfatti?<Select value={answers.adiResidence} onChange={(v) => set('adiResidence', v)} required><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No</option></Select></label>
              <label>Reddito familiare annuo<input type="number" min="0" step="0.01" value={answers.adiFamilyIncome} onChange={(e) => set('adiFamilyIncome', e.target.value)} required /></label>
              <label>Patrimonio mobiliare<input type="number" min="0" step="0.01" value={answers.adiMovableAssets} onChange={(e) => set('adiMovableAssets', e.target.value)} required /></label>
              <label>Patrimonio immobiliare rilevante<input type="number" min="0" step="0.01" value={answers.adiRealEstateAssets} onChange={(e) => set('adiRealEstateAssets', e.target.value)} required /></label>
              <label>Veicoli incompatibili?<Select value={answers.adiVehicles} onChange={(v) => set('adiVehicles', v)} required><option value="">Seleziona</option><option value="no">No</option><option value="yes">Sì</option></Select></label>
              <label>Dimissioni volontarie rilevanti?<Select value={answers.adiResignation} onChange={(v) => set('adiResignation', v)} required><option value="">Seleziona</option><option value="no">No</option><option value="yes">Sì</option></Select></label>
            </div>
          </div>
        )}

        <div className="white-card" style={{ marginTop: 18 }}>
          <h3>Ristrutturazioni</h3>
          <label>Hai sostenuto spese di ristrutturazione agevolabili nel 2026?<Select value={answers.renovation} onChange={(v) => set('renovation', v)} required><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No</option></Select></label>
          {answers.renovation === 'yes' && <div className="field-grid" style={{ marginTop: 12 }}><label>Spesa sostenuta<input type="number" min="0" step="0.01" value={answers.renovationAmount} onChange={(e) => set('renovationAmount', e.target.value)} required /></label><label>Intervento agevolabile e documentato?<Select value={answers.renovationEligible} onChange={(v) => set('renovationEligible', v)} required><option value="">Seleziona</option><option value="yes">Sì</option><option value="no">No / da verificare</option></Select></label></div>}
        </div>

        {error && <p className="checkout-error" role="alert">{error}</p>}
        <button className="primary" type="submit" style={{ width: '100%', marginTop: 20 }}>Prepara la mia anteprima</button>
      </form>
    </section>
  );
}

function Preview({ data, onBack }) {
  const result = useMemo(() => calculate(data.input), [data]);
  function pay() {
    sessionStorage.setItem(ANALYSIS_KEY, JSON.stringify(data));
    openBillingForm('report', {
      comune: data.input.municipality.name,
      isee: data.input.isee,
      figli: data.input.children,
      profile: data.profile,
    });
  }
  return (
    <section className="paywall-shell page-enter">
      <button className="text-button" type="button" onClick={onBack}>← Modifica le risposte</button>
      <div className="paywall-heading">
        <span className="eyebrow">ANTEPRIMA PRONTA</span>
        <h1>Abbiamo individuato <span>{result.benefits.length} agevolazioni</span>.</h1>
        <p className="lead">Ora il conteggio utilizza l’ISEE caricato e le risposte appena fornite, non dati di sessioni precedenti.</p>
      </div>
      <section className="bf-preview-section-v3">
        <div className="bf-preview-heading"><div><span className="eyebrow">RISULTATI TROVATI</span><h2>La tua analisi è pronta</h2></div><span className="bf-preview-count">{result.benefits.length} trovati</span></div>
        <div className="bf-preview-list-v3">{result.benefits.map((benefit, index) => <article className="bf-preview-card-v3" key={benefit.id || index}><div className="bf-card-blurred"><div className="bf-card-index">{String(index + 1).padStart(2, '0')}</div><div><span className="category">AGEVOLAZIONE INDIVIDUATA</span><h3>{benefit.name}</h3><p>Importo, motivazione e dettagli sono disponibili dopo lo sblocco.</p></div><div className="bf-card-amount">€ —</div></div><div className="bf-preview-lock-overlay"><span className="bf-preview-lock-pill">🔒 Dettagli bloccati</span></div></article>)}</div>
      </section>
      <article className="plan-card featured" style={{ maxWidth: 720, margin: '24px auto 0' }}>
        <span className="plan-badge">ANALISI CON RELAZIONE</span>
        <h2>Sblocca risultato e relazione</h2>
        <div className="plan-price">6,90 € <small>prezzo servizio</small></div>
        <p>Durante i test il checkout resta temporaneamente a 1,00 €.</p>
        <button className="primary" type="button" onClick={pay} style={{ width: '100%' }}>Sblocca · TEST 1,00 €</button>
      </article>
    </section>
  );
}

function PreCheckoutReport() {
  const [entry] = useState(() => safeParse(sessionStorage.getItem(ENTRY_KEY), null));
  const [stage, setStage] = useState('upload');
  const [file, setFile] = useState(null);
  const [fields, setFields] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');

  if (!entry?.comune) return shell(<section className="paywall-shell"><div className="paywall-heading"><h1>Dati del calcolo non disponibili.</h1><p className="lead">Torna alla home e avvia di nuovo l’Analisi con relazione.</p></div></section>);
  if (stage === 'questions' && fields) return shell(<Questions entry={entry} fields={fields} onBack={() => setStage('upload')} onComplete={(data) => { setAnalysis(data); setStage('preview'); }} />);
  if (stage === 'preview' && analysis) return shell(<Preview data={analysis} onBack={() => setStage('questions')} />);

  async function analyse() {
    if (!file) return;
    setReading(true);
    setError('');
    try {
      const text = await readPdfText(file);
      if (!text.trim()) throw new Error('Il PDF non contiene testo leggibile.');
      const extracted = extractIseeFields(text);
      if (!extracted.year2026) throw new Error('Non risulta un’attestazione ISEE riferita al 2026.');
      setFields(extracted);
      setStage('questions');
    } catch (err) {
      setError(err?.message || 'Non è stato possibile leggere il PDF.');
    } finally {
      setReading(false);
    }
  }

  return shell(
    <section className="paywall-shell page-enter">
      <div className="paywall-heading"><span className="eyebrow">ANALISI CON RELAZIONE</span><h1>Carica il tuo <span>ISEE 2026</span>.</h1><p className="lead">Dopo la lettura ti faremo solo le domande necessarie per completare correttamente l’analisi.</p></div>
      <article className="plan-card featured" style={{ maxWidth: 680, margin: '0 auto' }}>
        <span className="plan-badge">PASSAGGIO 1</span><h2>Attestazione ISEE 2026</h2>
        <p>Carica soltanto l’attestazione in PDF. Non serve la DSU.</p>
        <label style={{ display: 'block', marginTop: 20 }}>Seleziona il PDF<input type="file" accept="application/pdf,.pdf" onChange={(e) => {
          const selected = e.target.files?.[0] || null;
          setError(''); setFields(null); setFile(null); setAnalysis(null);
          if (!selected) return;
          if (!(selected.type === 'application/pdf' || selected.name.toLowerCase().endsWith('.pdf'))) { setError('Carica un PDF.'); e.target.value = ''; return; }
          if (selected.size > 10 * 1024 * 1024) { setError('Il PDF supera 10 MB.'); e.target.value = ''; return; }
          setFile(selected);
        }} style={{ marginTop: 10 }} /></label>
        {file && <p className="tari-local-status"><strong>PDF selezionato:</strong> {file.name}</p>}
        {error && <p className="checkout-error" role="alert">{error}</p>}
        <button className="primary" type="button" disabled={!file || reading} onClick={analyse} style={{ width: '100%', marginTop: 18 }}>{reading ? 'Lettura dell’attestazione…' : 'Leggi ISEE e continua'}</button>
      </article>
    </section>
  );
}

export default function AppV5() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('isee_preview') === '1') return <PreCheckoutReport />;
  return <AppV4 />;
}
