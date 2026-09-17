import { useMemo, useState } from 'react';

export default function PecSmokeTestFlow() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const recipient = params.get('recipient') || '';
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  async function send() {
    setStatus('loading');
    setMessage('');
    try {
      const response = await fetch('/api/pec-send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient, comune: 'TEST TECNICO', isee: 0, municipalPec: '', attachments: [] }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || 'Invio non riuscito.');
      setStatus('success');
      setMessage(`PEC inviata correttamente da ${data.sender} a ${data.recipient}.`);
    } catch (error) {
      setStatus('error');
      setMessage(error?.message || 'Invio non riuscito.');
    }
  }

  return <div className="bfs-shell">
    <header className="bfs-header">
      <a className="bfs-brand" href="/"><span className="bfs-mark">B</span><span>Bonus<span>Fatto</span><em>.it</em></span></a>
      <span className="bfs-test-pill">TEST PEC</span>
    </header>
    <main className="bfs-main">
      <section className="bfs-confirmation">
        <span className="bfs-eyebrow">TEST TECNICO PEC LU.CA.</span>
        <h1>Proviamo l'invio reale.</h1>
        <p>Nessuna comunicazione viene inviata a un Comune. Il destinatario di test è autorizzato lato server.</p>
        <div className="bfs-summary">
          <div><span>Destinatario test</span><strong>{recipient || 'Non indicato'}</strong></div>
          <div><span>Mittente</span><strong>PEC LU.CA.</strong></div>
        </div>
        {message && <div className={status === 'success' ? 'bfs-ok-note' : 'checkout-error'}>{message}</div>}
        <button className="bfs-primary" type="button" onClick={send} disabled={!recipient || status === 'loading'} style={{ width: '100%', marginTop: 16 }}>
          {status === 'loading' ? 'Invio in corso…' : status === 'success' ? '✓ PEC inviata' : 'Invia PEC di test alla mia Gmail →'}
        </button>
        <a className="bfs-secondary" href="/" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', marginTop: 12 }}>Torna alla Home</a>
      </section>
    </main>
  </div>;
}
