import { useState } from 'react';

async function fileToAttachment(file) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return {
    filename: file.name,
    contentType: file.type || 'application/octet-stream',
    data: btoa(binary),
  };
}

export default function PecSendTestPanel({ form, lookup, iseeFile, idFiles, delegationFile, tariFiles }) {
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  async function sendTest() {
    setStatus('loading');
    setMessage('');
    try {
      const files = [
        iseeFile,
        ...(Array.isArray(idFiles) ? idFiles : []),
        delegationFile,
        ...(Array.isArray(tariFiles) ? tariFiles : []),
      ].filter(Boolean);
      const attachments = [];
      for (const file of files) attachments.push(await fileToAttachment(file));

      const response = await fetch('/api/pec-send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: form.email,
          comune: form.comuneTari,
          isee: Number(form.isee),
          municipalPec: lookup?.found ? lookup.pec : '',
          attachments,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || 'Invio PEC di test non riuscito.');
      setStatus('success');
      setMessage(`PEC di test inviata correttamente a ${data.recipient} con ${data.attachmentCount} allegati.`);
    } catch (error) {
      setStatus('error');
      setMessage(error?.message || 'Invio PEC di test non riuscito.');
    }
  }

  return <div className="bfs-test-warning" style={{ textAlign: 'left' }}>
    <strong>Test reale PEC LU.CA.</strong>
    <p style={{ margin: '7px 0 12px' }}>La PEC del Comune resta solo come riferimento. In questo test il messaggio viene spedito esclusivamente all’indirizzo email inserito nel campo Email del richiedente, se autorizzato.</p>
    <div className="bfs-summary" style={{ margin: '0 0 12px' }}>
      <div><span>Destinatario test</span><strong>{form.email || '—'}</strong></div>
      <div><span>PEC Comune non utilizzata</span><strong>{lookup?.found ? lookup.pec : 'Non disponibile'}</strong></div>
    </div>
    {message && <div className={status === 'success' ? 'bfs-ok-note' : 'checkout-error'} role="status">{message}</div>}
    <button className="bfs-primary" type="button" onClick={sendTest} disabled={status === 'loading'} style={{ width: '100%', marginTop: 8 }}>
      {status === 'loading' ? 'Invio PEC di test…' : status === 'success' ? '✓ PEC di test inviata' : 'Invia PEC di test alla mia Gmail →'}
    </button>
  </div>;
}
