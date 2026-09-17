import { useEffect, useMemo, useState } from 'react';
import { euro } from './benefits.js';

const ENTRY_KEY = 'bonusfatto_service_entry';
const MAX_UPLOAD_BYTES = 2_700_000;

function safeParse(value, fallback = {}) {
  try { return JSON.parse(value) || fallback; } catch { return fallback; }
}

function Shell({ children }) {
  return <div className="bfs-shell">
    <header className="bfs-header">
      <a className="bfs-brand" href="/"><span className="bfs-mark">B</span><span>Bonus<span>Fatto</span><em>.it</em></span></a>
      <span className="bfs-test-pill">PRATICA TARI · SERVIZIO ACQUISTATO</span>
    </header>
    <main className="bfs-main">{children}</main>
    <footer className="bfs-footer"><span>© {new Date().getFullYear()} BonusFatto.it</span><span>Invio pratica TARI</span></footer>
  </div>;
}

function Field({ label, children, full = false }) {
  return <label className={`bfs-field${full ? ' full' : ''}`}><span>{label}</span>{children}</label>;
}

function FileField({ title, description, accept, file, onChange, required = true, multiple = false }) {
  const hasFile = Array.isArray(file) ? file.length > 0 : Boolean(file);
  return <div className="bfs-upload-box">
    <div className="bfs-upload-copy"><strong>{title}{required ? ' *' : ''}</strong><span>{description}</span></div>
    <label className="bfs-upload-control">
      <input type="file" required={required} accept={accept} multiple={multiple} onChange={onChange} />
      <span>{hasFile ? '✓' : '+'}</span>
      <strong>{hasFile ? (Array.isArray(file) ? `${file.length} file selezionati` : file.name) : 'Seleziona file'}</strong>
    </label>
  </div>;
}

function PecStatus({ lookup, loading }) {
  if (loading) return <div className="bfs-pec-status"><span className="bfs-pec-dot searching" /><div><strong>Ricerca PEC del Comune…</strong><small>Consultazione automatica IndicePA.</small></div></div>;
  if (!lookup) return null;
  const high = lookup.found && lookup.confidence === 'high';
  const medium = lookup.found && lookup.confidence === 'medium';
  return <div className={`bfs-pec-status ${high ? 'good' : medium ? 'review' : 'manual'}`}>
    <span className="bfs-pec-dot" />
    <div>
      <strong>{high ? 'PEC ufficio individuata automaticamente' : medium ? 'PEC comunale individuata · da verificare in backoffice' : 'PEC non individuata automaticamente'}</strong>
      {lookup.found && <><span>{lookup.pec}</span><small>{lookup.office || lookup.entity || 'Comune'} · Fonte: IndicePA{lookup.updatedAt ? ` · aggiornamento ${lookup.updatedAt}` : ''}</small></>}
      {!lookup.found && <small>{lookup.message || 'La pratica verrà verificata manualmente dal backoffice prima dell’invio.'}</small>}
    </div>
  </div>;
}

function fileToPayload(file, role) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || '');
      const comma = value.indexOf(',');
      resolve({ role, filename: file.name, contentType: file.type || 'application/octet-stream', data: comma >= 0 ? value.slice(comma + 1) : value });
    };
    reader.onerror = () => reject(new Error(`Impossibile leggere il file ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

export default function TariPecTestFlow() {
  const entry = useMemo(() => safeParse(window.sessionStorage.getItem(ENTRY_KEY), {}), []);
  const [form, setForm] = useState({
    nome: entry.customerName || '',
    cognome: entry.customerSurname || '',
    email: entry.customerEmail || '',
    codiceFiscale: entry.fiscalCode || '',
    indirizzo: entry.billingAddress || '',
    cap: entry.billingZip || '',
    comuneResidenza: entry.billingCity || entry.comune || '',
    provinciaResidenza: entry.billingProvince || '',
    comuneTari: entry.comune || '',
    isee: Number(entry.isee) || 0,
    indirizzoImmobile: '',
    codiceUtenza: '',
  });
  const [iseeFile, setIseeFile] = useState(null);
  const [idFiles, setIdFiles] = useState([]);
  const [delegationFile, setDelegationFile] = useState(null);
  const [tariFiles, setTariFiles] = useState([]);
  const [delegationDownloaded, setDelegationDownloaded] = useState(false);
  const [delegationLoading, setDelegationLoading] = useState(false);
  const [lookup, setLookup] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submission, setSubmission] = useState(null);

  const set = (name, value) => setForm(current => ({ ...current, [name]: value }));

  useEffect(() => {
    const comune = String(form.comuneResidenza || '').trim();
    if (!comune) return undefined;
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/ipa-pec-test?comune=${encodeURIComponent(comune)}&metadata=1`);
        const data = await response.json();
        if (!response.ok || !data?.found) return;
        setForm(current => {
          if (String(current.comuneResidenza || '').trim().toLowerCase() !== comune.toLowerCase()) return current;
          return {
            ...current,
            cap: String(data.cap || current.cap || '').trim(),
            provinciaResidenza: String(data.provincia || current.provinciaResidenza || '').trim().toUpperCase(),
          };
        });
      } catch {
        // CAP e provincia restano modificabili manualmente se IndicePA non risponde.
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [form.comuneResidenza]);

  useEffect(() => {
    const comune = String(form.comuneTari || '').trim();
    if (!comune) { setLookup(null); return undefined; }
    const timer = setTimeout(async () => {
      setLookupLoading(true);
      try {
        const response = await fetch(`/api/ipa-pec-test?comune=${encodeURIComponent(comune)}`);
        const data = await response.json();
        setLookup(data);
      } catch {
        setLookup({ found: false, confidence: 'error', message: 'Ricerca automatica non disponibile. La pratica richiederà verifica manuale.' });
      } finally {
        setLookupLoading(false);
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [form.comuneTari]);

  const anagraphicReady = ['nome','cognome','email','codiceFiscale','indirizzo','cap','comuneResidenza','provinciaResidenza','comuneTari']
    .every(key => String(form[key] ?? '').trim()) && Number.isFinite(Number(form.isee));

  async function downloadDelegation() {
    setError('');
    if (!anagraphicReady) {
      setError('Completa prima i dati del richiedente e della pratica: servono per precompilare la delega.');
      return;
    }
    setDelegationLoading(true);
    try {
      const response = await fetch('/api/tari-delegation-test', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ form, sessionId: entry.sessionId }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Impossibile generare la delega.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BonusFatto_Delega_TARI_${entry.orderCode || 'pratica'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1200);
      setDelegationDownloaded(true);
    } catch (err) {
      setError(err?.message || 'Impossibile generare la delega.');
    } finally {
      setDelegationLoading(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (!iseeFile) return setError('Allega l’attestazione ISEE 2026.');
    if (!idFiles.length) return setError('Allega il documento di identità dell’intestatario TARI.');
    if (!delegationDownloaded) return setError('Scarica prima la delega precompilata.');
    if (!delegationFile) return setError('Allega la delega firmata.');
    if (lookupLoading) return setError('Attendi il completamento della ricerca automatica della PEC del Comune.');

    const descriptors = [
      { file: iseeFile, role: 'Attestazione ISEE 2026' },
      ...idFiles.map((file, index) => ({ file, role: `Documento identità ${index + 1}` })),
      { file: delegationFile, role: 'Delega firmata' },
      ...tariFiles.map((file, index) => ({ file, role: `Documentazione TARI ${index + 1}` })),
    ];
    const totalBytes = descriptors.reduce((sum, item) => sum + Number(item.file?.size || 0), 0);
    if (totalBytes > MAX_UPLOAD_BYTES) return setError('Gli allegati superano circa 2,7 MB complessivi. Riduci la dimensione dei file e riprova.');

    setSubmitting(true);
    try {
      const attachments = await Promise.all(descriptors.map(item => fileToPayload(item.file, item.role)));
      const response = await fetch('/api/tari-practice-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form, lookup, attachments, sessionId: entry.sessionId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) throw new Error(data?.error || 'Invio pratica al backoffice non riuscito.');
      setSubmission(data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err?.message || 'Invio pratica al backoffice non riuscito.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!entry?.comune || !entry?.sessionId) return <Shell><section className="bfs-confirmation"><span className="bfs-eyebrow">ACCESSO NON DISPONIBILE</span><h1>Completa prima l’acquisto del servizio.</h1><a className="bfs-primary-link" href="/">Torna alla Home</a></section></Shell>;

  if (submission) return <Shell><section className="bfs-confirmation">
    <div className="bfs-success-icon">✓</div>
    <span className="bfs-eyebrow">PRATICA RICEVUTA DAL BACKOFFICE</span>
    <h1>La pratica TARI è stata presa in carico.</h1>
    <p>Dati, delega firmata e allegati sono stati inviati a <strong>pratiche@bonusfatto.it</strong>. Il backoffice verificherà la documentazione e procederà all’invio della PEC al Comune.</p>
    <div className="bfs-summary">
      <div><span>Codice pratica</span><strong>{submission.practiceCode}</strong></div>
      <div><span>Comune</span><strong>{form.comuneTari}</strong></div>
      <div><span>PEC Comune individuata</span><strong>{lookup?.found ? lookup.pec : 'Da verificare in backoffice'}</strong></div>
      <div><span>ISEE</span><strong>{euro(Number(form.isee))}</strong></div>
      <div><span>Attestazione ISEE</span><strong>{iseeFile.name}</strong></div>
      <div><span>Documento identità</span><strong>{idFiles.map(file => file.name).join(' · ')}</strong></div>
      <div><span>Delega firmata</span><strong>{delegationFile.name}</strong></div>
      <div><span>Allegati TARI facoltativi</span><strong>{tariFiles.length}</strong></div>
    </div>
    <PecStatus lookup={lookup} loading={false} />
    <div className="bfs-test-warning"><strong>Gestione pratica:</strong> la PEC viene inviata dal backoffice dopo la verifica dei documenti e dell’indirizzo dell’Ufficio Tributi. Le ricevute di accettazione e consegna vengono conservate nella pratica.</div>
    <div className="bfs-confirm-actions"><a className="bfs-primary-link" href="/">Torna alla Home</a></div>
  </section></Shell>;

  return <Shell><section className="bfs-form-page">
    <div className="bfs-form-intro"><span className="bfs-eyebrow">INVIO PRATICA TARI</span><h1>Completiamo la pratica TARI.</h1><p>Non devi conoscere la PEC del Comune: la cerchiamo automaticamente. Inserisci o verifica i dati, scarica la delega, firmala e allega i documenti richiesti.</p></div>

    <form className="bfs-card-form" onSubmit={submit}>
      <div className="bfs-section-title"><span>1</span><div><h2>Dati del richiedente</h2><p>Servono per precompilare la delega e intestare correttamente la richiesta.</p></div></div>
      <div className="bfs-grid">
        <Field label="Nome"><input required value={form.nome} onChange={e => set('nome', e.target.value)} /></Field>
        <Field label="Cognome"><input required value={form.cognome} onChange={e => set('cognome', e.target.value)} /></Field>
        <Field label="Email"><input type="email" required value={form.email} onChange={e => set('email', e.target.value)} /></Field>
        <Field label="Codice fiscale"><input required maxLength="16" value={form.codiceFiscale} onChange={e => set('codiceFiscale', e.target.value.toUpperCase())} /></Field>
        <Field label="Indirizzo di residenza" full><input required value={form.indirizzo} onChange={e => set('indirizzo', e.target.value)} /></Field>
        <Field label="CAP"><input required maxLength="5" value={form.cap} onChange={e => set('cap', e.target.value)} /></Field>
        <Field label="Comune di residenza"><input required value={form.comuneResidenza} onChange={e => setForm(current => ({ ...current, comuneResidenza: e.target.value, cap: '', provinciaResidenza: '' }))} /></Field>
        <Field label="Provincia"><input required maxLength="2" placeholder="TO" value={form.provinciaResidenza} onChange={e => set('provinciaResidenza', e.target.value.toUpperCase())} /></Field>
      </div>
      <p className="bfs-help-line">CAP e provincia vengono compilati automaticamente in base al Comune di residenza e restano modificabili.</p>

      <div className="bfs-divider" />
      <div className="bfs-section-title"><span>2</span><div><h2>Dati della pratica TARI</h2><p>Comune e ISEE arrivano dal calcolo precedente ma restano verificabili.</p></div></div>
      <div className="bfs-grid">
        <Field label="Comune TARI"><input required value={form.comuneTari} onChange={e => set('comuneTari', e.target.value)} /></Field>
        <Field label="ISEE 2026"><input type="number" min="0" step="0.01" required value={form.isee} onChange={e => set('isee', e.target.value)} /></Field>
        <Field label="Indirizzo immobile / utenza TARI" full><input placeholder="Se diverso dalla residenza" value={form.indirizzoImmobile} onChange={e => set('indirizzoImmobile', e.target.value)} /></Field>
        <Field label="Codice utenza TARI (se disponibile)" full><input value={form.codiceUtenza} onChange={e => set('codiceUtenza', e.target.value)} /></Field>
      </div>
      <PecStatus lookup={lookup} loading={lookupLoading} />
      <p className="bfs-help-line">La PEC non viene richiesta al cittadino. L’indirizzo individuato viene trasmesso al backoffice e verificato prima dell’invio.</p>

      <div className="bfs-divider" />
      <div className="bfs-section-title"><span>3</span><div><h2>Scarica e firma la delega</h2><p>La delega viene compilata automaticamente con i dati inseriti sopra.</p></div></div>
      <button className="bfs-secondary bfs-delegation-button" type="button" onClick={downloadDelegation} disabled={delegationLoading}>{delegationLoading ? 'Generazione delega…' : delegationDownloaded ? '✓ Scarica nuovamente la delega' : '↓ Scarica delega precompilata PDF'}</button>
      {delegationDownloaded && <div className="bfs-ok-note">Delega generata. Stampala, firmala e ricaricala qui sotto.</div>}

      <div className="bfs-divider" />
      <div className="bfs-section-title"><span>4</span><div><h2>Allegati della pratica</h2><p>I primi tre documenti sono obbligatori. Gli altri allegati TARI sono facoltativi.</p></div></div>
      <div className="bfs-upload-grid">
        <FileField title="Attestazione ISEE 2026" description="Obbligatoria · PDF" accept="application/pdf,.pdf" file={iseeFile} onChange={e => setIseeFile(e.target.files?.[0] || null)} />
        <FileField title="Documento di identità" description="Obbligatorio · 1 PDF oppure immagini separate fronte/retro" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" file={idFiles} multiple onChange={e => setIdFiles(Array.from(e.target.files || []))} />
        <FileField title="Delega firmata" description="Obbligatoria · firma autografa leggibile" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" file={delegationFile} onChange={e => setDelegationFile(e.target.files?.[0] || null)} />
        <FileField title="Documentazione TARI" description="Facoltativa · avviso, bolletta o comunicazioni del Comune" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" file={tariFiles} multiple required={false} onChange={e => setTariFiles(Array.from(e.target.files || []))} />
      </div>

      {error && <div className="checkout-error" role="alert">{error}</div>}
      <div className="bfs-test-warning"><strong>Invio al Comune:</strong> la documentazione viene ricevuta da <strong>pratiche@bonusfatto.it</strong>, verificata e quindi trasmessa manualmente tramite PEC all’Ufficio Tributi competente.</div>
      <button className="bfs-primary" type="submit" disabled={submitting}>{submitting ? 'Invio pratica al backoffice…' : <>Invia pratica al backoffice <strong>→</strong></>}</button>
    </form>
  </section></Shell>;
}
