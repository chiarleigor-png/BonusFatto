import { useEffect, useState } from 'react';
import TariPecTestFlow from './TariPecTestFlow.jsx';

export default function TariPecTestFlowConnected() {
  const [status, setStatus] = useState({ state: 'checking', message: 'Verifica connessione PEC LU.CA.…' });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch('/api/pec-health', { method: 'POST' });
        const data = await response.json();
        if (!active) return;
        if (response.ok && data?.ok) {
          setStatus({ state: 'ok', message: `PEC LU.CA. collegata · ${data.account}` });
        } else {
          setStatus({ state: 'error', message: data?.error || 'Connessione PEC LU.CA. non riuscita.' });
        }
      } catch {
        if (active) setStatus({ state: 'error', message: 'Connessione PEC LU.CA. non verificabile.' });
      }
    })();
    return () => { active = false; };
  }, []);

  const bg = status.state === 'ok' ? '#ecfdf3' : status.state === 'error' ? '#fff1f2' : '#f5f3ff';
  const border = status.state === 'ok' ? '#b7e4c7' : status.state === 'error' ? '#fecdd3' : '#ddd6fe';
  const color = status.state === 'ok' ? '#166534' : status.state === 'error' ? '#b42318' : '#5b43c8';

  return <>
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 20px' }}>
      <div style={{ marginTop: 8, marginBottom: 4, padding: '10px 14px', borderRadius: 14, background: bg, border: `1px solid ${border}`, color, fontWeight: 800, fontSize: '.86rem' }}>
        {status.state === 'ok' ? '✓ ' : status.state === 'error' ? '⚠ ' : '• '}{status.message}
      </div>
    </div>
    <TariPecTestFlow />
  </>;
}
