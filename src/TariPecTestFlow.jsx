import { useEffect, useMemo, useState } from 'react';
import { euro } from './benefits.js';

const ENTRY_KEY = 'bonusfatto_service_test_entry';

function safeParse(value, fallback = {}) {
  try { return JSON.parse(value) || fallback; } catch { return fallback; }
}

function Shell({ children }) {
  return <div className="bfs-shell">
    <header className="bfs-header">
      <a className="bfs-brand" href="/"><span className="bfs-mark">B</span><span>Bonus<span>Fatto</span><em>.it</em></span></a>
      <span className="bfs-test-pill">TEST GRATUITO · 0 €</span>
    </header>
    <main className="bfs-main">{children}</main>
    <footer className="bfs-footer"><span>© {new Date().getFullYear()} BonusFatto.it</span><span>Invio PEC TARI</span></footer>
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
      <strong>{high ? 'PEC ufficio individuata automaticamente' : medium ? 'PEC comunale individuata · da verificare prima dell’invio' : 'PEC non individuata automaticamente'}</strong>
      {lookup.found && <><span>{lookup.pec}</span><small>{lookup.office || lookup.entity || 'Comune'} · Fonte: IndicePA{lookup.updatedAt ? ` · aggiornamento ${lookup.updatedAt}` : ''}</small></>}
      {!lookup.found && <small>{lookup.message || 'La pratica verrà messa in verifica manuale prima dell’invio.'}</small>}
    </div>
  </div>;
}

export default function TariPecTestFlow() {
  const entry = useMemo(() => safeParse(window.sessionStorage.getItem(ENTRY_KEY), {}), []);
  const [form, setForm] = useState({
    nome: '', cognome: '', email: '', codiceFiscale: '',
    indirizzo: '', cap: '', comuneResidenza: entry.comune || '', provinciaResidenza: '',
    comuneTari: entry.comune || '', isee: Number(entry.isee) || 0,
    indirizzoImmobile: '', codiceUtenza: '',
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
  const [submitted, setSubmitted] = useState(false);

  const set = (name, value) => setForm(current => ({ ...current, [name]: value }));

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
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ form }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Impossibile generare la delega.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'BonusFatto_Delega_TARI_TEST.pdf';
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

  function submit(event) {
    event.preventDefault();
    setError('');
    if (!iseeFile) return setError('Allega l’attestazione ISEE 2026.');
    if (!idFiles.length) return setError('Allega il documento di identità dell’intestatario TARI.');
    if (!delegationDownloaded) return setError('Scarica prima la delega precompilata.');
    if (!delegationFile) return setError('Allega la delega firmata.');
    if (lookupLoading) return setError('Attendi il completamento della ricerca automatica della PEC del Comune.');
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (!entry?.comune) return <Shell><section className="bfs-confirmation"><span className="bfs-eyebrow">DATI NON DISPONIBILI</span><h1>Avvia prima il calcolo dalla Home.</h1><a className="bfs-primary-link" href="/">Torna alla Home</a></section></Shell>;

  if (submitted) return <Shell><section className="bfs-confirmation">
    <div className="bfs-success-icon">✓</div>
    <span className="bfs-eyebrow">TEST COMPLETATO · NESSUN INVIO REALE</span>
    <h1>La pratica TARI è completa.</h1>
    <p>Il test ha verificato dati, delega e allegati obbligatori. Nessuna PEC è stata trasmessa.</p>
    <div className="bfs-summary">
      <div><span>Comune</span><strong>{form.comuneTari}</strong></div>
      <div><span>ISEE</span><strong>{euro(Number(form.isee))}</strong></div>
      <div><span>Attestazione ISEE</span><strong>{iseeFile.name}</strong></div>
      <div><span>Documento identità</span><strong>{idFiles.map(file => file.name).join(' · ')}</strong></div>
      <div><span>Delega firmata</span><strong>{delegationFile.name}</strong></div>
      <div><span>Allegati TARI facoltativi</span><strong>{tariFiles.length}</strong></div>
    </div>
    <PecStatus lookup={lookup} loading={false} />
    <div className="bfs-test-warning"><strong>Passaggio successivo, dopo i test:</strong> collegheremo l’invio dalla PEC LU.CA. solo per gli indirizzi verificati; i casi dubbi resteranno in coda per controllo manuale.</div>
    <div className="bfs-confirm-actions"><button className="bfs-secondary" type="button" onClick={() => setSubmitted(false)}>Modifica pratica</button><a className="bfs-primary-link" href="/">Torna alla Home</a></div>
  </section></Shell>;

  return <Shell><section className="bfs-form-page">
    <div className="bfs-form-intro"><span className="bfs-eyebrow">INVIO PEC TARI · TEST GRATUITO</span><h1>Prepariamo la pratica TARI completa.</h1><p>Non devi conoscere la PEC del Comune: la cerchiamo automaticamente. Tu inserisci i dati, scarichi la delega, la firmi e alleghi i tre documenti obbligatori.</p></div>

    <form className="bfs-card-form" onSubmit={submit}>
      <div className="bfs-section-title"><span>1</span><div><h2>Dati del richiedente</h2><p>Servono per precompilare la delega e intestare correttamente la richiesta.</p></div></div>
      <div className="bfs-grid">
        <Field label="Nome"><input required value={form.nome} onChange={e => set('nome', e.target.value)} /></Field>
        <Field label="Cognome"><input required value={form.cognome} onChange={e => set('cognome', e.target.value)} /></Field>
        <Field label="Email"><input type="email" required value={form.email} onChange={e => set('email', e.target.value)} /></Field>
        <Field label="Codice fiscale"><input required maxLength="16" value={form.codiceFiscale} onChange={e => set('codiceFiscale', e.target.value.toUpperCase())} /></Field>
        <Field label="Indirizzo di residenza" full><input required value={form.indirizzo} onChange={e => set('indirizzo', e.target.value)} /></Field>
        <Field label="CAP"><input required maxLength="5" value={form.cap} onChange={e => set('cap', e.target.value)} /></Field>
        <Field label="Comune di residenza"><input required value={form.comuneResidenza} onChange={e => set('comuneResidenza', e.target.value)} /></Field>
        <Field label="Provincia"><input required maxLength="2" placeholder="TO" value={form.provinciaResidenza} onChange={e => set('provinciaResidenza', e.target.value.toUpperCase())} /></Field>
      </div>

      <div className="bfs-divider" />
      <div className="bfs-section-title"><span>2</span><div><h2>Dati della pratica TARI</h2><p>Comune e ISEE arrivano dal calcolo precedente ma restano verificabili.</p></div></div>
      <div className="bfs-grid">
        <Field label="Comune TARI"><input required value={form.comuneTari} onChange={e => set('comuneTari', e.target.value)} /></Field>
        <Field label="ISEE 2026"><input type="number" min="0" step="0.01" required value={form.isee} onChange={e => set('isee', e.target.value)} /></Field>
        <Field label="Indirizzo immobile / utenza TARI" full><input placeholder="Se diverso dalla residenza" value={form.indirizzoImmobile} onChange={e => set('indirizzoImmobile', e.target.value)} /></Field>
        <Field label="Codice utenza TARI (se disponibile)" full><input value={form.codiceUtenza} onChange={e => set('codiceUtenza', e.target.value)} /></Field>
      </div>
      <PecStatus lookup={lookup} loading={lookupLoading} />
      <p className="bfs-help-line">La PEC non viene richiesta al cittadino. In produzione l’indirizzo individuato sarà sempre verificato prima dell’invio automatico.</p>

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
      <div className="bfs-test-warning"><strong>Modalità test:</strong> i file restano nel browser e nessuna PEC viene inviata. Stiamo verificando il percorso completo prima di collegare la PEC LU.CA.</div>
      <button className="bfs-primary" type="submit">Verifica pratica completa · 0 € <strong>→</strong></button>
    </form>
  </section></Shell>;
}
