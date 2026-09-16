import { useEffect, useMemo, useState } from 'react';
import AppV3 from './AppV3.jsx';
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
  const normalized = String(value || '').replace(/\./g, '').replace(',', '.');
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function extractIseeFields(text) {
  const flat = String(text || '').replace(/\s+/g, ' ').trim();
  const patterns = [
    /(?:Indicatore della Situazione Economica Equivalente|ISEE(?:\s+ORDINARIO)?)[^\d]{0,140}(?:Euro|€)?\s*([0-9.]+,[0-9]{2})/i,
    /(?:Euro|€)\s*([0-9.]+,[0-9]{2})[^A-Z]{0,80}ISEE/i,
  ];
  let isee = null;
  for (const pattern of patterns) {
    const match = flat.match(pattern);
    if (match) { isee = parseEuro(match[1]); if (isee !== null) break; }
  }
  const household = flat.match(/(?:numero\s+(?:dei\s+)?componenti|componenti\s+(?:del\s+)?nucleo)[^0-9]{0,40}([1-9][0-9]?)/i);
  return { isee, householdSize: household ? Number(household[1]) : null, year2026: /\b2026\b/.test(flat) };
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

function shell(content, footer = 'Analisi con relazione') {
  return (
    <div className="app-shell">
      <header className="site-header"><span className="brand"><span className="brand-mark">B</span><span>BonusFatto<span className="brand-dot">.it</span></span></span></header>
      <main>{content}</main>
      <footer className="site-footer"><span>© {new Date().getFullYear()} BonusFatto.it</span><span>{footer}</span></footer>
    </div>
  );
}

function Preview({ entry, fields, onReset }) {
  const effectiveIsee = fields.isee ?? Number(entry.isee) ?? 0;
  const profile = entry.profile && typeof entry.profile === 'object' ? entry.profile : {};
  const input = useMemo(() => ({
    isee: Number(effectiveIsee) || 0,
    children: Math.max(0, Number(entry.figli) || 0),
    municipality: { name: entry.comune },
    profile,
  }), [effectiveIsee, entry, profile]);
  const result = useMemo(() => calculate(input), [input]);

  function pay() {
    sessionStorage.setItem(ANALYSIS_KEY, JSON.stringify({ input, profile }));
    openBillingForm('report', { comune: entry.comune, isee: input.isee, figli: input.children, profile });
  }

  return (
    <section className="paywall-shell page-enter">
      <button className="text-button" type="button" onClick={onReset}>← Cambia PDF</button>
      <div className="paywall-heading">
        <span className="eyebrow">ANTEPRIMA PRONTA</span>
        <h1>Abbiamo individuato <span>{result.benefits.length} agevolazioni</span>.</h1>
        <p className="lead">Il dettaglio completo è pronto: importi, requisiti e prossimi passi restano bloccati fino allo sblocco.</p>
      </div>
      <section className="bf-preview-section-v3">
        <div className="bf-preview-heading"><div><span className="eyebrow">RISULTATI TROVATI</span><h2>La tua analisi è pronta</h2></div><span className="bf-preview-count">{result.benefits.length} trovati</span></div>
        <div className="bf-preview-list-v3">
          {result.benefits.map((benefit, index) => (
            <article className="bf-preview-card-v3" key={benefit.id || index}>
              <div className="bf-card-blurred"><div className="bf-card-index">{String(index + 1).padStart(2, '0')}</div><div><span className="category">AGEVOLAZIONE INDIVIDUATA</span><h3>{benefit.name}</h3><p>{benefit.description}</p></div><div className="bf-card-amount">€ —</div></div>
              <div className="bf-preview-lock-overlay"><span className="bf-preview-lock-pill">🔒 Dettagli bloccati</span></div>
            </article>
          ))}
        </div>
      </section>
      <article className="plan-card featured" style={{ maxWidth: 720, margin: '24px auto 0' }}>
        <span className="plan-badge">ANALISI CON RELAZIONE</span>
        <h2>Sblocca il risultato completo</h2>
        <div className="plan-price">6,90 € <small>prezzo servizio</small></div>
        <p>Per il test il checkout sarà temporaneamente impostato a 1,00 €.</p>
        <button className="primary" type="button" onClick={pay} style={{ width: '100%' }}>Sblocca l’analisi · TEST 1,00 €</button>
      </article>
    </section>
  );
}

function PreCheckoutReport() {
  const [entry] = useState(() => safeParse(sessionStorage.getItem(ENTRY_KEY), null));
  const [file, setFile] = useState(null);
  const [fields, setFields] = useState(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');

  if (!entry?.comune) return shell(<section className="paywall-shell"><div className="paywall-heading"><h1>Dati del calcolo non disponibili.</h1><p className="lead">Torna alla home e avvia di nuovo l’Analisi con relazione.</p></div></section>);
  if (fields) return shell(<Preview entry={entry} fields={fields} onReset={() => { setFields(null); setFile(null); setError(''); }} />);

  async function analyse() {
    if (!file) return;
    setReading(true); setError('');
    try {
      const text = await readPdfText(file);
      if (!text.trim()) throw new Error('Il PDF non contiene testo leggibile.');
      setFields(extractIseeFields(text));
    } catch (err) { setError(err?.message || 'Non è stato possibile leggere il PDF.'); }
    finally { setReading(false); }
  }

  return shell(
    <section className="paywall-shell page-enter">
      <div className="paywall-heading"><span className="eyebrow">ANALISI CON RELAZIONE</span><h1>Carica prima il tuo <span>ISEE 2026</span>.</h1><p className="lead">Carica soltanto l’attestazione ISEE in PDF. Non serve la DSU e non paghi ancora nulla.</p></div>
      <article className="plan-card featured" style={{ maxWidth: 680, margin: '0 auto' }}>
        <span className="plan-badge">PASSAGGIO 1</span><h2>Attestazione ISEE 2026</h2>
        <p>Leggiamo i dati presenti nel documento e prepariamo subito un’anteprima dei bonus individuati.</p>
        <label style={{ display: 'block', marginTop: 20 }}>Seleziona il PDF<input type="file" accept="application/pdf,.pdf" onChange={(e) => {
          const selected = e.target.files?.[0] || null; setError(''); setFields(null); setFile(null);
          if (!selected) return; if (!(selected.type === 'application/pdf' || selected.name.toLowerCase().endsWith('.pdf'))) { setError('Carica un PDF.'); e.target.value=''; return; }
          if (selected.size > 10 * 1024 * 1024) { setError('Il PDF supera 10 MB.'); e.target.value=''; return; }
          setFile(selected);
        }} style={{ marginTop: 10 }} /></label>
        {file && <p className="tari-local-status"><strong>PDF selezionato:</strong> {file.name}</p>}
        {error && <p className="checkout-error" role="alert">{error}</p>}
        <button className="primary" type="button" disabled={!file || reading} onClick={analyse} style={{ width: '100%', marginTop: 18 }}>{reading ? 'Analisi in corso…' : 'Analizza e mostrami l’anteprima'}</button>
        <p className="checkout-note">Il PDF viene letto nel browser per preparare l’anteprima.</p>
      </article>
    </section>
  );
}

function PaidUnlock({ sessionId }) {
  const [state, setState] = useState({ loading: true, error: '', paid: false });
  const stored = useMemo(() => safeParse(sessionStorage.getItem(ANALYSIS_KEY), null), []);

  useEffect(() => {
    fetch(`/api/verify-checkout?session_id=${encodeURIComponent(sessionId)}`)
      .then(async (r) => { const data = await r.json(); if (!r.ok) throw new Error(data.error || 'Verifica pagamento non riuscita.'); return data; })
      .then((data) => setState({ loading: false, error: '', paid: data.paid && data.plan === 'report' }))
      .catch((err) => setState({ loading: false, error: err.message, paid: false }));
  }, [sessionId]);

  if (state.loading) return shell(<section className="paywall-shell"><div className="paywall-heading"><h1>Verifica del pagamento…</h1></div></section>);
  if (!state.paid || !stored?.input) return <AppV3 />;
  const result = calculate(stored.input);
  return shell(
    <section className="results page-enter">
      <div className="paid-banner">✓ Pagamento verificato · Analisi con relazione</div>
      <div className="result-heading"><div><span className="eyebrow">RISULTATO SBLOCCATO</span><h1><span>{result.benefits.length} agevolazioni</span><br />individuate per il tuo profilo.</h1><p className="lead">{stored.input.municipality.name} · ISEE {euro(stored.input.isee)}</p></div></div>
      <div className="bonus-list">{result.benefits.map((benefit, index) => <article className="bonus-card" key={benefit.id || index}><div className={`bonus-icon color-${index % 3}`}>✓</div><div className="bonus-body"><span className="category">{benefit.category}</span><h3>{benefit.name}</h3><p>{benefit.description}</p></div><div className="bonus-amount"><strong>{euro(benefit.amount)}</strong><span>{benefit.period || ''}</span></div></article>)}</div>
      <a className="primary" href={`/api/report?session_id=${encodeURIComponent(sessionId)}`} style={{ display:'inline-flex', marginTop:24, textDecoration:'none' }}>Scarica la relazione PDF</a>
    </section>,
    'Analisi con relazione · pagamento verificato'
  );
}

export default function AppV4() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('session_id');
  if (params.get('isee_preview') === '1') return <PreCheckoutReport />;
  if (sessionId && sessionStorage.getItem(ANALYSIS_KEY)) return <PaidUnlock sessionId={sessionId} />;
  return <AppV3 />;
}
