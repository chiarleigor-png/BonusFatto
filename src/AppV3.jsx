import { useEffect, useState } from 'react';
import AppV2 from './AppV2.jsx';
import { calculate, euro } from './benefits.js';

const PDFJS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs';
const PDFJS_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';

function parseEuro(value) {
  const normalized = String(value || '').replace(/\./g, '').replace(',', '.');
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function extractIseeFields(text) {
  const flat = String(text || '').replace(/\s+/g, ' ').trim();
  const iseePatterns = [
    /(?:Indicatore della Situazione Economica Equivalente|ISEE(?:\s+ORDINARIO)?)[^\d]{0,140}(?:Euro|€)?\s*([0-9.]+,[0-9]{2})/i,
    /(?:Euro|€)\s*([0-9.]+,[0-9]{2})[^A-Z]{0,80}ISEE/i,
  ];
  let isee = null;
  for (const pattern of iseePatterns) {
    const match = flat.match(pattern);
    if (match) {
      isee = parseEuro(match[1]);
      if (isee !== null) break;
    }
  }

  const householdMatch = flat.match(/(?:numero\s+(?:dei\s+)?componenti|componenti\s+(?:del\s+)?nucleo)[^0-9]{0,40}([1-9][0-9]?)/i);
  const year2026 = /\b2026\b/.test(flat);

  return {
    isee,
    householdSize: householdMatch ? Number(householdMatch[1]) : null,
    year2026,
  };
}

async function readPdfText(file) {
  const pdfjs = await import(/* @vite-ignore */ PDFJS_URL);
  pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data: bytes }).promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => item.str || '').join(' '));
  }
  return pages.join('\n');
}

function formatEuro(value) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
}

function selectValue(options, value, onChange) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map(([optionValue, label]) => <option value={optionValue} key={optionValue}>{label}</option>)}
    </select>
  );
}

function buildInitialAnswers(fields, checkoutData) {
  const children = Math.max(0, Number(checkoutData?.figli) || 0);
  return {
    isee: fields?.isee ?? '',
    household: fields?.householdSize ?? '',
    childAges: Array.from({ length: children }, () => ''),
    ageBand: 'none',
    disability: 'no',
    disadvantage: 'no',
    electricitySupply: 'unknown',
    gasSupply: 'unknown',
    waterSupply: 'unknown',
    residentAllItaly: 'unknown',
    dedicatedIncompatible: 'unknown',
    nursery: 'no',
    event2026: '',
    maternityBenefit: 'no',
    motherWork: 'none',
    motherIncome: 'no',
    housing: 'other',
    annualRent: '',
    adiResidence: 'unknown',
    adiFamilyIncome: '',
    adiMovableAssets: '',
    adiRealEstateAssets: '',
    adiVehicles: 'unknown',
    adiResignation: 'unknown',
    renovation: 'no',
    renovationAmount: '',
    renovationEligible: 'no',
  };
}

function ImmediateResults({ data }) {
  const { result, input } = data;
  return (
    <section className="results page-enter">
      <div className="paid-banner">✓ Pagamento verificato · Analisi con relazione completata</div>
      <div className="result-heading">
        <div>
          <span className="eyebrow">RISULTATO IMMEDIATO</span>
          <h1><span>{result.benefits.length} agevolazioni</span><br />individuate per il tuo profilo.</h1>
          <p className="lead">{input.municipality.name} · ISEE {euro(input.isee)} · {input.children} {input.children === 1 ? 'figlio' : 'figli'} a carico</p>
        </div>
      </div>
      <div className="model-notice"><span>ℹ</span><p><strong>Analisi orientativa basata sui dati disponibili.</strong> Gli esiti indicati come compatibili o potenziali dipendono dalle verifiche previste dai singoli enti e dalle fonti ufficiali.</p></div>
      <div className="bonus-list">
        {result.benefits.map((benefit, index) => (
          <article className="bonus-card" key={benefit.id || `${benefit.name}-${index}`}>
            <div className={`bonus-icon color-${index % 3}`}>✓</div>
            <div className="bonus-body">
              <span className="category">{benefit.category}</span>
              <h3>{benefit.name}</h3>
              <p>{benefit.description}</p>
            </div>
            <div className="bonus-amount">
              <strong>{euro(benefit.amount)}</strong>
              <span>{benefit.period || ''}</span>
            </div>
          </article>
        ))}
      </div>
      <div className="white-card" style={{ marginTop: 24 }}>
        <h3>Analisi completata</h3>
        <p>I dati dell’attestazione sono stati integrati solo con le informazioni che l’ISEE normalmente non contiene. Non sono stati inventati dati mancanti.</p>
      </div>
    </section>
  );
}

function IseeQuestions({ fields, checkoutData, onBack, onComplete }) {
  const [answers, setAnswers] = useState(() => buildInitialAnswers(fields, checkoutData));
  const [error, setError] = useState('');
  const children = Math.max(0, Number(checkoutData?.figli) || 0);
  const iseeNumber = Number(answers.isee);
  const showAdi = Number.isFinite(iseeNumber) && iseeNumber <= 10140 && (
    children > 0 || answers.disability === 'yes' || answers.ageBand !== 'none' || answers.disadvantage === 'yes'
  );

  function set(name, value) {
    setAnswers((current) => ({ ...current, [name]: value }));
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
    if (!Number.isFinite(effectiveIsee) || effectiveIsee < 0) {
      setError('Inserisci un valore ISEE valido.');
      return;
    }
    if (!Number.isInteger(household) || household < 1) {
      setError('Indica il numero dei componenti del nucleo familiare.');
      return;
    }
    const childAges = answers.childAges.map((value) => Number(value));
    if (children > 0 && childAges.some((age) => !Number.isFinite(age) || age < 0 || age > 40)) {
      setError('Indica l’età di ciascun figlio a carico.');
      return;
    }

    const profile = {
      children,
      childAges,
      household,
      over60: answers.ageBand === '60-64' || answers.ageBand === '65plus' ? 'yes' : 'no',
      over65: answers.ageBand === '65plus' ? 'yes' : 'no',
      disability: answers.disability,
      disadvantage: answers.disadvantage,
      electricitySupply: answers.electricitySupply,
      gasSupply: answers.gasSupply,
      waterSupply: answers.waterSupply,
      residentAllItaly: answers.residentAllItaly,
      dedicatedIncompatible: answers.dedicatedIncompatible,
      nursery: answers.nursery,
      event2026: answers.event2026,
      maternityBenefit: answers.maternityBenefit,
      motherWork: answers.motherWork === 'none' ? '' : answers.motherWork,
      motherIncome: answers.motherIncome,
      housing: answers.housing,
      annualRent: answers.housing === 'rent' ? Number(answers.annualRent) || 0 : 0,
      adiResidence: answers.adiResidence,
      adiFamilyIncome: answers.adiFamilyIncome === '' ? '' : Number(answers.adiFamilyIncome),
      adiMovableAssets: answers.adiMovableAssets === '' ? '' : Number(answers.adiMovableAssets),
      adiRealEstateAssets: answers.adiRealEstateAssets === '' ? '' : Number(answers.adiRealEstateAssets),
      adiVehicles: answers.adiVehicles,
      adiResignation: answers.adiResignation,
      renovation: answers.renovation,
      renovationAmount: answers.renovation === 'yes' ? Number(answers.renovationAmount) || 0 : 0,
      renovationEligible: answers.renovationEligible,
    };

    try {
      localStorage.setItem('bonusfatto_profile_2026', JSON.stringify(profile));
      window.__bonusFattoProfile2026 = profile;
      const input = {
        isee: effectiveIsee,
        children,
        municipality: { name: checkoutData.comune },
        profile,
      };
      const result = calculate(input);
      onComplete({ input, result, profile });
    } catch (err) {
      setError(err?.message || 'Non è stato possibile completare l’analisi.');
    }
  }

  return (
    <section className="paywall-shell page-enter">
      <button className="text-button" type="button" onClick={onBack}>← Torna al PDF</button>
      <div className="paywall-heading">
        <span className="eyebrow">PASSAGGIO 2 DI 3</span>
        <h1>Solo le informazioni <span>che mancano</span>.</h1>
        <p className="lead">Niente DSU e niente questionario lungo: chiediamo soltanto ciò che serve per rendere l’analisi più precisa.</p>
      </div>
      <form onSubmit={submit} className="form-card" style={{ maxWidth: 820, margin: '0 auto' }}>
        <div className="field-grid">
          {fields.isee === null && (
            <label>Valore ISEE 2026<input type="number" min="0" step="0.01" value={answers.isee} onChange={(event) => set('isee', event.target.value)} required /></label>
          )}
          {fields.householdSize === null && (
            <label>Componenti del nucleo<input type="number" min="1" max="20" value={answers.household} onChange={(event) => set('household', event.target.value)} required /></label>
          )}
        </div>

        {children > 0 && (
          <div className="white-card" style={{ marginTop: 18 }}>
            <h3>Età dei figli a carico</h3>
            <p>Serve per distinguere AUU, bonus nido, nuovi nati e altre misure legate all’età.</p>
            <div className="field-grid">
              {answers.childAges.map((age, index) => (
                <label key={index}>Figlio {index + 1}<input type="number" min="0" max="40" value={age} onChange={(event) => setChildAge(index, event.target.value)} required /></label>
              ))}
            </div>
          </div>
        )}

        <div className="white-card" style={{ marginTop: 18 }}>
          <h3>Nucleo familiare</h3>
          <div className="field-grid">
            <label>Età più elevata nel nucleo{selectValue([
              ['none', 'Nessuno ha 60 anni'],
              ['60-64', 'Almeno una persona ha 60–64 anni'],
              ['65plus', 'Almeno una persona ha 65 anni o più'],
            ], answers.ageBand, (value) => set('ageBand', value))}</label>
            <label>Disabilità nel nucleo{selectValue([['no', 'No'], ['yes', 'Sì']], answers.disability, (value) => set('disability', value))}</label>
            <label>Condizione di svantaggio rilevante per ADI{selectValue([['no', 'No'], ['yes', 'Sì']], answers.disadvantage, (value) => set('disadvantage', value))}</label>
            <label>Abitazione{selectValue([['owned', 'Abitazione principale di proprietà / diritto reale'], ['rent', 'In affitto'], ['other', 'Altro']], answers.housing, (value) => set('housing', value))}</label>
          </div>
          {answers.housing === 'rent' && <label style={{ marginTop: 12 }}>Canone annuo di affitto<input type="number" min="0" step="0.01" value={answers.annualRent} onChange={(event) => set('annualRent', event.target.value)} /></label>}
        </div>

        <div className="white-card" style={{ marginTop: 18 }}>
          <h3>Utenze domestiche</h3>
          <p>Considera anche una fornitura condominiale quando il bonus può essere riconosciuto in forma indiretta.</p>
          <div className="field-grid">
            <label>Luce{selectValue([['unknown', 'Non so'], ['yes', 'Requisito fornitura presente'], ['no', 'Requisito non presente']], answers.electricitySupply, (value) => set('electricitySupply', value))}</label>
            <label>Gas{selectValue([['unknown', 'Non so'], ['yes', 'Diretta o condominiale idonea'], ['no', 'Requisito non presente']], answers.gasSupply, (value) => set('gasSupply', value))}</label>
            <label>Acqua{selectValue([['unknown', 'Non so'], ['yes', 'Diretta o condominiale idonea'], ['no', 'Requisito non presente']], answers.waterSupply, (value) => set('waterSupply', value))}</label>
          </div>
        </div>

        {Number.isFinite(iseeNumber) && iseeNumber <= 15000 && (
          <div className="white-card" style={{ marginTop: 18 }}>
            <h3>Carta Dedicata a Te</h3>
            <div className="field-grid">
              <label>Tutti i componenti residenti in Italia?{selectValue([['unknown', 'Non so / da verificare'], ['yes', 'Sì'], ['no', 'No']], answers.residentAllItaly, (value) => set('residentAllItaly', value))}</label>
              <label>Prestazioni incompatibili già percepite?{selectValue([['unknown', 'Non so / da verificare'], ['no', 'No'], ['yes', 'Sì']], answers.dedicatedIncompatible, (value) => set('dedicatedIncompatible', value))}</label>
            </div>
          </div>
        )}

        {children > 0 && (
          <div className="white-card" style={{ marginTop: 18 }}>
            <h3>Famiglia</h3>
            <div className="field-grid">
              <label>Evento nel 2026{selectValue([['', 'Nessuno'], ['birth', 'Nascita'], ['adoption', 'Adozione'], ['foster', 'Affidamento']], answers.event2026, (value) => set('event2026', value))}</label>
              <label>Frequenza asilo nido?{selectValue([['no', 'No'], ['yes', 'Sì']], answers.nursery, (value) => set('nursery', value))}</label>
              <label>Situazione lavorativa della madre{selectValue([['none', 'Non applicabile / non lavora'], ['employee', 'Lavoratrice dipendente'], ['self', 'Lavoratrice autonoma']], answers.motherWork, (value) => set('motherWork', value))}</label>
              {answers.motherWork !== 'none' && <label>Reddito personale da lavoro entro 40.000 €?{selectValue([['no', 'No'], ['yes', 'Sì']], answers.motherIncome, (value) => set('motherIncome', value))}</label>}
              {answers.event2026 && <label>Indennità economica di maternità già percepita?{selectValue([['no', 'No'], ['yes', 'Sì']], answers.maternityBenefit, (value) => set('maternityBenefit', value))}</label>}
            </div>
          </div>
        )}

        {showAdi && (
          <div className="white-card" style={{ marginTop: 18 }}>
            <h3>Verifica ADI</h3>
            <p>Questa sezione compare solo perché il profilo può rientrare nella platea ADI. Se non conosci un importo puoi lasciarlo vuoto: l’esito resterà da approfondire.</p>
            <div className="field-grid">
              <label>Requisiti di soggiorno/residenza{selectValue([['unknown', 'Da verificare'], ['yes', 'Soddisfatti'], ['no', 'Non soddisfatti']], answers.adiResidence, (value) => set('adiResidence', value))}</label>
              <label>Reddito familiare annuo<input type="number" min="0" step="0.01" value={answers.adiFamilyIncome} onChange={(event) => set('adiFamilyIncome', event.target.value)} /></label>
              <label>Patrimonio mobiliare<input type="number" min="0" step="0.01" value={answers.adiMovableAssets} onChange={(event) => set('adiMovableAssets', event.target.value)} /></label>
              <label>Patrimonio immobiliare rilevante<input type="number" min="0" step="0.01" value={answers.adiRealEstateAssets} onChange={(event) => set('adiRealEstateAssets', event.target.value)} /></label>
              <label>Veicoli incompatibili?{selectValue([['unknown', 'Da verificare'], ['no', 'No'], ['yes', 'Sì']], answers.adiVehicles, (value) => set('adiVehicles', value))}</label>
              <label>Dimissioni volontarie rilevanti?{selectValue([['unknown', 'Da verificare'], ['no', 'No'], ['yes', 'Sì']], answers.adiResignation, (value) => set('adiResignation', value))}</label>
            </div>
          </div>
        )}

        <div className="white-card" style={{ marginTop: 18 }}>
          <h3>Ristrutturazioni</h3>
          <label>Hai sostenuto spese di ristrutturazione agevolabili nel 2026?{selectValue([['no', 'No'], ['yes', 'Sì']], answers.renovation, (value) => set('renovation', value))}</label>
          {answers.renovation === 'yes' && (
            <div className="field-grid" style={{ marginTop: 12 }}>
              <label>Spesa sostenuta<input type="number" min="0" step="0.01" value={answers.renovationAmount} onChange={(event) => set('renovationAmount', event.target.value)} /></label>
              <label>Intervento agevolabile e documentato?{selectValue([['no', 'No / da verificare'], ['yes', 'Sì']], answers.renovationEligible, (value) => set('renovationEligible', value))}</label>
            </div>
          )}
        </div>

        {error && <p className="checkout-error" role="alert">{error}</p>}
        <button className="primary" type="submit" style={{ width: '100%', marginTop: 20 }}>Genera il risultato immediato</button>
      </form>
    </section>
  );
}

function IseeFlow({ checkoutData }) {
  const [stage, setStage] = useState('upload');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  const [fields, setFields] = useState(null);
  const [completed, setCompleted] = useState(null);

  function handleFile(event) {
    const selected = event.target.files?.[0] || null;
    setError('');
    setFile(null);
    setFields(null);
    if (!selected) return;
    const isPdf = selected.type === 'application/pdf' || selected.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setError('Carica esclusivamente l’attestazione ISEE 2026 in formato PDF.');
      event.target.value = '';
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setError('Il PDF supera 10 MB. Carica una versione più leggera dell’attestazione ISEE.');
      event.target.value = '';
      return;
    }
    setFile(selected);
  }

  async function analysePdf() {
    if (!file || reading) return;
    setReading(true);
    setError('');
    setFields(null);
    try {
      const text = await readPdfText(file);
      if (!text.trim()) throw new Error('Non è stato possibile leggere testo dal PDF.');
      const extracted = extractIseeFields(text);
      setFields(extracted);
      if (!extracted.isee) {
        setError('Il PDF è stato letto, ma il valore ISEE non è stato riconosciuto automaticamente. Te lo chiederemo nel passaggio successivo.');
      }
    } catch (err) {
      setError(err?.message || 'Non è stato possibile leggere automaticamente il PDF.');
    } finally {
      setReading(false);
    }
  }

  if (completed) return <ImmediateResults data={completed} />;
  if (stage === 'questions' && fields) {
    return <IseeQuestions fields={fields} checkoutData={checkoutData} onBack={() => setStage('upload')} onComplete={setCompleted} />;
  }

  return (
    <section className="paywall-shell page-enter">
      <div className="paywall-heading">
        <span className="eyebrow">PAGAMENTO VERIFICATO · ANALISI CON RELAZIONE</span>
        <h1>Carica il tuo <span>ISEE 2026</span>.</h1>
        <p className="lead">Ci serve soltanto l’attestazione ISEE in PDF. Non caricare la DSU.</p>
      </div>
      <article className="plan-card featured" style={{ maxWidth: 680, margin: '0 auto' }}>
        <span className="plan-badge">PASSAGGIO 1 DI 3</span>
        <h2>Attestazione ISEE 2026</h2>
        <p>Il PDF viene letto direttamente nel browser. BonusFatto usa soltanto i dati che riesce realmente a individuare nell’attestazione; ciò che manca verrà chiesto dopo.</p>
        <label style={{ display: 'block', marginTop: 20 }}>
          Seleziona il PDF dell’attestazione
          <input type="file" accept="application/pdf,.pdf" onChange={handleFile} style={{ marginTop: 10 }} />
        </label>
        {file && <p className="tari-local-status"><strong>PDF selezionato:</strong> {file.name}</p>}
        {error && <p className="checkout-error" role="alert">{error}</p>}
        {!fields && (
          <button className="primary" type="button" disabled={!file || reading} onClick={analysePdf} style={{ width: '100%', marginTop: 18 }}>
            {reading ? 'Lettura dell’attestazione…' : 'Leggi automaticamente l’ISEE'}
          </button>
        )}
        {fields && (
          <div style={{ marginTop: 18 }}>
            <div className="tari-local-status">
              <strong>Dati riconosciuti nel documento</strong><br />
              Valore ISEE: <b>{fields.isee !== null ? formatEuro(fields.isee) : 'non riconosciuto'}</b><br />
              Componenti del nucleo: <b>{fields.householdSize ?? 'non presenti/riconosciuti'}</b><br />
              Riferimento al 2026: <b>{fields.year2026 ? 'rilevato' : 'non rilevato'}</b>
            </div>
            <button className="primary" type="button" style={{ width: '100%', marginTop: 18 }} onClick={() => setStage('questions')}>
              Continua con le poche domande mancanti
            </button>
          </div>
        )}
        <p className="checkout-note">Il contenuto del PDF non viene inviato a BonusFatto in questa fase di lettura.</p>
      </article>
    </section>
  );
}

export default function AppV3() {
  const [reportData, setReportData] = useState(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (!sessionId) return;
    setChecking(true);
    fetch(`/api/verify-checkout?session_id=${encodeURIComponent(sessionId)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Verifica pagamento non riuscita.');
        if (data.paid && data.plan === 'report') setReportData({ ...data, sessionId });
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  if (reportData) {
    return (
      <div className="app-shell">
        <header className="site-header">
          <span className="brand" aria-label="BonusFatto.it"><span className="brand-mark">B</span><span>BonusFatto<span className="brand-dot">.it</span></span></span>
        </header>
        <main><IseeFlow checkoutData={reportData} /></main>
        <footer className="site-footer"><span>© {new Date().getFullYear()} BonusFatto.it</span><span>Analisi con relazione</span><span>Pagamento verificato</span></footer>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="app-shell">
        <main>
          <section className="paywall-shell page-enter">
            <div className="paywall-heading"><span className="eyebrow">BONUSFATTO</span><h1>Verifica del <span>pagamento</span>…</h1><p className="lead">Attendi qualche secondo.</p></div>
          </section>
        </main>
      </div>
    );
  }
  return <AppV2 />;
}
