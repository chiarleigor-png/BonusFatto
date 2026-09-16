import { useEffect, useState } from 'react';
import AppV2 from './AppV2.jsx';

function IseeUploadStep({ sessionId }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');

  function handleFile(event) {
    const selected = event.target.files?.[0] || null;
    setError('');
    setFile(null);
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
            <p>BonusFatto userà esclusivamente i dati realmente presenti nell’attestazione. Le informazioni che il documento non contiene verranno richieste con poche domande successive.</p>
            <label style={{ display: 'block', marginTop: 20 }}>
              Seleziona il PDF dell’attestazione
              <input type="file" accept="application/pdf,.pdf" onChange={handleFile} style={{ marginTop: 10 }} />
            </label>
            {file && <p className="tari-local-status"><strong>PDF selezionato:</strong> {file.name}</p>}
            {error && <p className="checkout-error" role="alert">{error}</p>}
            <button className="primary" type="button" disabled={!file} style={{ width: '100%', marginTop: 18 }}>
              Continua alla lettura automatica
            </button>
            <p className="checkout-note">Il documento non viene ancora elaborato in questo passaggio tecnico.</p>
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
