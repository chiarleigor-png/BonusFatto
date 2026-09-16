import { useEffect, useState } from 'react';
import AppV2 from './AppV2.jsx';

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

function IseeUploadStep({ sessionId }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  const [fields, setFields] = useState(null);

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

  return (
    <div className="app-shell">
      <header className="site-header">
        <span className="brand" aria-label="BonusFatto.it">
          <span className="brand-mark">B</span><span>BonusFatto<span className="brand-dot">.it</span></span>
        </span>
      </header>
      <main>
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
                <button className="primary" type="button" style={{ width: '100%', marginTop: 18 }} disabled>
                  Continua con le poche domande mancanti
                </button>
              </div>
            )}
            <p className="checkout-note">Il contenuto del PDF non viene inviato a BonusFatto in questa fase di lettura.</p>
          </article>
        </section>
      </main>
      <footer className="site-footer"><span>© {new Date().getFullYear()} BonusFatto.it</span><span>Sessione pagamento verificata</span><span>{sessionId ? 'Pagamento associato' : ''}</span></footer>
    </div>
  );
}

export default function AppV3() {
  const [reportSession, setReportSession] = useState('');
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
        if (data.paid && data.plan === 'report') setReportSession(sessionId);
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  if (reportSession) return <IseeUploadStep sessionId={reportSession} />;
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
