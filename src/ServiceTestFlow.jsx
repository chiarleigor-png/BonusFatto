import { useMemo, useState } from 'react';
import { calculate, euro } from './benefits.js';

const ENTRY_KEY = 'bonusfatto_service_test_entry';

function safeParse(value, fallback = {}) {
  try { return JSON.parse(value) || fallback; } catch { return fallback; }
}

function Shell({ children, label }) {
  return <div className="bfs-shell">
    <header className="bfs-header">
      <a className="bfs-brand" href="/"><span className="bfs-mark">B</span><span>Bonus<span>Fatto</span><em>.it</em></span></a>
      <span className="bfs-test-pill">TEST GRATUITO · 0 €</span>
    </header>
    <main className="bfs-main">{children}</main>
    <footer className="bfs-footer"><span>© {new Date().getFullYear()} BonusFatto.it</span><span>{label}</span></footer>
  </div>;
}

function amountLabel(benefit) {
  if (benefit.displayAmount) return benefit.displayAmount;
  if (Number.isFinite(Number(benefit.amount))) return euro(Number(benefit.amount));
  if (benefit.amount === 'spetta') return 'Spetta';
  if (benefit.amount === 'compatibile') return 'Compatibile';
  return 'Importo variabile';
}

function statusLabel(benefit) {
  if (benefit.eligibility === 'graduatoria' || benefit.eligibility === 'potenzialmente-assegnabile') return 'POTENZIALMENTE ASSEGNABILE';
  if (benefit.eligibility === 'spetta-profilo') return 'SPETTA AL PROFILO';
  return 'DA VERIFICARE';
}

function QuickAnalysis({ entry }) {
  const input = useMemo(() => ({
    isee: Number(entry.isee) || 0,
    children: Number(entry.figli) || 0,
    municipality: { name: entry.comune || '' },
    profile: { children: Number(entry.figli) || 0, childAges: [] },
  }), [entry]);

  const result = useMemo(() => {
    try { return calculate(input); } catch { return { benefits: [] }; }
  }, [input]);

  return <Shell label="Analisi veloce in 30 secondi">
    <section className="bfs-result">
      <div className="bfs-top-actions"><a href="/">← Torna alla Home</a><span>Analisi veloce · 0 €</span></div>
      <div className="bfs-result-hero">
        <div><span className="bfs-eyebrow">ANALISI VELOCE IN 30 SECONDI</span><h1>Il tuo risultato è pronto.</h1><p>Con i dati essenziali inseriti abbiamo individuato <strong>{result.benefits.length} agevolazioni</strong> compatibili o da approfondire.</p></div>
        <div className="bfs-mini-stats"><div><span>COMUNE</span><strong>{entry.comune || '—'}</strong></div><div><span>ISEE</span><strong>{euro(input.isee)}</strong></div><div><span>FIGLI</span><strong>{input.children}</strong></div></div>
      </div>
      <div className="bfs-note">Questa è l’analisi rapida: utilizza solo Comune, ISEE e numero di figli. Le misure che richiedono ulteriori requisiti vanno confermate con l’analisi completa.</div>
      <div className="bfs-benefit-grid">{result.benefits.map((benefit, index) => <article className={`bfs-benefit-card tone-${index % 4}`} key={benefit.id || index}>
        <div className="bfs-benefit-head"><span className="bfs-index">{String(index + 1).padStart(2, '0')}</span><span className="bfs-status">{statusLabel(benefit)}</span></div>
        <span className="bfs-category">{benefit.category || 'Agevolazione'}</span>
        <h2>{benefit.name}</h2>
        <div className="bfs-amount"><strong>{amountLabel(benefit)}</strong>{benefit.period && <span>{benefit.period}</span>}</div>
        <p>{benefit.description}</p>
      </article>)}</div>
      {!result.benefits.length && <div className="bfs-empty">Nessuna agevolazione è stata individuata con i soli dati essenziali inseriti.</div>}
    </section>
  </Shell>;
}

function Field({ label, children, full = false }) {
  return <label className={`bfs-field${full ? ' full' : ''}`}><span>{label}</span>{children}</label>;
}

function TariTest({ entry }) {
  const [submitted, setSubmitted] = useState(false);
  const [files, setFiles] = useState([]);
  const [form, setForm] = useState({
    nome: '', cognome: '', email: '', codiceFiscale: '', comune: entry.comune || '',
    isee: Number(entry.isee) || 0, pecComune: '', codiceUtenza: '',
    oggetto: `Richiesta riduzione TARI 2026 – ${entry.comune || 'Comune'}`,
    messaggio: `Gentile Ufficio Tributi del Comune di ${entry.comune || '[Comune]'},\n\nchiedo la verifica e l’applicazione delle riduzioni TARI 2026 eventualmente spettanti in base alla mia situazione ISEE.\n\nResto a disposizione per integrare la documentazione necessaria.\n\nCordiali saluti.`,
  });
  const set = (name, value) => setForm(current => ({ ...current, [name]: value }));

  function submit(event) {
    event.preventDefault();
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (submitted) return <Shell label="Invio PEC TARI"><section className="bfs-confirmation">
    <div className="bfs-success-icon">✓</div><span className="bfs-eyebrow">TEST COMPLETATO · NESSUN INVIO REALE</span><h1>La pratica PEC è pronta.</h1>
    <p>Abbiamo verificato l’intero percorso di raccolta dati. In modalità test la PEC non viene trasmessa al Comune.</p>
    <div className="bfs-summary"><div><span>Comune</span><strong>{form.comune}</strong></div><div><span>PEC destinataria</span><strong>{form.pecComune}</strong></div><div><span>ISEE</span><strong>{euro(form.isee)}</strong></div><div><span>Allegati</span><strong>{files.length}</strong></div></div>
    <div className="bfs-confirm-actions"><button className="bfs-secondary" type="button" onClick={() => setSubmitted(false)}>Modifica i dati</button><a className="bfs-primary-link" href="/">Torna alla Home</a></div>
  </section></Shell>;

  return <Shell label="Invio PEC TARI"><section className="bfs-form-page">
    <div className="bfs-form-intro"><span className="bfs-eyebrow">INVIO PEC TARI · TEST GRATUITO</span><h1>Prepariamo la richiesta da inviare al Comune.</h1><p>Compila i dati della pratica. In questa fase di test verifichiamo il percorso senza effettuare alcun invio reale.</p></div>
    <form className="bfs-card-form" onSubmit={submit}>
      <div className="bfs-section-title"><span>1</span><div><h2>Dati del richiedente</h2><p>Servono per intestare correttamente la richiesta.</p></div></div>
      <div className="bfs-grid"><Field label="Nome"><input required value={form.nome} onChange={e => set('nome', e.target.value)} /></Field><Field label="Cognome"><input required value={form.cognome} onChange={e => set('cognome', e.target.value)} /></Field><Field label="Email"><input type="email" required value={form.email} onChange={e => set('email', e.target.value)} /></Field><Field label="Codice fiscale"><input required maxLength="16" value={form.codiceFiscale} onChange={e => set('codiceFiscale', e.target.value.toUpperCase())} /></Field></div>

      <div className="bfs-divider" />
      <div className="bfs-section-title"><span>2</span><div><h2>Dati TARI e destinatario</h2><p>Il Comune e l’ISEE arrivano dal calcolo appena effettuato.</p></div></div>
      <div className="bfs-grid"><Field label="Comune"><input required value={form.comune} onChange={e => set('comune', e.target.value)} /></Field><Field label="ISEE 2026"><input type="number" min="0" step="0.01" required value={form.isee} onChange={e => set('isee', e.target.value)} /></Field><Field label="PEC dell’Ufficio Tributi"><input type="email" required placeholder="tributi@pec.comune.it" value={form.pecComune} onChange={e => set('pecComune', e.target.value)} /></Field><Field label="Codice utenza TARI (se disponibile)"><input value={form.codiceUtenza} onChange={e => set('codiceUtenza', e.target.value)} /></Field></div>

      <div className="bfs-divider" />
      <div className="bfs-section-title"><span>3</span><div><h2>PEC da inviare</h2><p>Puoi controllare e modificare oggetto e testo prima dell’invio definitivo.</p></div></div>
      <div className="bfs-grid"><Field label="Oggetto" full><input required value={form.oggetto} onChange={e => set('oggetto', e.target.value)} /></Field><Field label="Testo della richiesta" full><textarea required rows="9" value={form.messaggio} onChange={e => set('messaggio', e.target.value)} /></Field><Field label="Allegati" full><input type="file" multiple accept="application/pdf,image/jpeg,image/png" onChange={e => setFiles(Array.from(e.target.files || []))} /><small>PDF, JPG o PNG. In modalità test i file restano solo nel browser.</small></Field></div>
      {files.length > 0 && <div className="bfs-files">{files.map(file => <span key={`${file.name}-${file.size}`}>✓ {file.name}</span>)}</div>}
      <div className="bfs-test-warning"><strong>Modalità test:</strong> il pulsante verifica il flusso e prepara la pratica, ma non invia alcuna PEC reale.</div>
      <button className="bfs-primary" type="submit">Prepara pratica PEC di test <strong>→</strong></button>
    </form>
  </section></Shell>;
}

function ContinuousTest() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ nome: '', cognome: '', email: '', whatsapp: '', channel: 'email', consent: false });
  const set = (name, value) => setForm(current => ({ ...current, [name]: value }));

  function submit(event) {
    event.preventDefault();
    if ((form.channel === 'whatsapp' || form.channel === 'both') && !form.whatsapp.trim()) return;
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (submitted) return <Shell label="Servizio continuativo"><section className="bfs-confirmation">
    <div className="bfs-success-icon">✓</div><span className="bfs-eyebrow">TEST COMPLETATO · 0 €</span><h1>Preferenze registrate per il test.</h1>
    <p>Il flusso del servizio continuativo è completo. Durante il test non vengono inviati aggiornamenti reali.</p>
    <div className="bfs-summary"><div><span>Email</span><strong>{form.email}</strong></div><div><span>Canale scelto</span><strong>{form.channel === 'email' ? 'Email' : form.channel === 'whatsapp' ? 'WhatsApp' : 'Email + WhatsApp'}</strong></div>{form.whatsapp && <div><span>WhatsApp</span><strong>{form.whatsapp}</strong></div>}</div>
    <div className="bfs-confirm-actions"><button className="bfs-secondary" type="button" onClick={() => setSubmitted(false)}>Modifica preferenze</button><a className="bfs-primary-link" href="/">Torna alla Home</a></div>
  </section></Shell>;

  const needsWhatsapp = form.channel === 'whatsapp' || form.channel === 'both';
  return <Shell label="Servizio continuativo"><section className="bfs-form-page">
    <div className="bfs-form-intro"><span className="bfs-eyebrow">SERVIZIO CONTINUATIVO · TEST GRATUITO</span><h1>Ricevi gli aggiornamenti nel canale che preferisci.</h1><p>Invio aggiornamenti periodici via mail o whatsapp.</p></div>
    <form className="bfs-card-form" onSubmit={submit}>
      <div className="bfs-section-title"><span>1</span><div><h2>I tuoi recapiti</h2><p>Inserisci i dati necessari per attivare il servizio.</p></div></div>
      <div className="bfs-grid"><Field label="Nome"><input required value={form.nome} onChange={e => set('nome', e.target.value)} /></Field><Field label="Cognome"><input required value={form.cognome} onChange={e => set('cognome', e.target.value)} /></Field><Field label="Email"><input type="email" required value={form.email} onChange={e => set('email', e.target.value)} /></Field>{needsWhatsapp && <Field label="Numero WhatsApp"><input type="tel" required placeholder="+39 333 1234567" value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} /></Field>}</div>
      <div className="bfs-divider" />
      <div className="bfs-section-title"><span>2</span><div><h2>Come vuoi ricevere gli aggiornamenti?</h2><p>Potrai modificare la preferenza anche in seguito.</p></div></div>
      <div className="bfs-channel-grid"><label className={form.channel === 'email' ? 'selected' : ''}><input type="radio" name="channel" value="email" checked={form.channel === 'email'} onChange={e => set('channel', e.target.value)} /><strong>Email</strong><span>Aggiornamenti nella tua casella di posta.</span></label><label className={form.channel === 'whatsapp' ? 'selected' : ''}><input type="radio" name="channel" value="whatsapp" checked={form.channel === 'whatsapp'} onChange={e => set('channel', e.target.value)} /><strong>WhatsApp</strong><span>Avvisi direttamente sul numero indicato.</span></label><label className={form.channel === 'both' ? 'selected' : ''}><input type="radio" name="channel" value="both" checked={form.channel === 'both'} onChange={e => set('channel', e.target.value)} /><strong>Email + WhatsApp</strong><span>Ricevi gli aggiornamenti su entrambi i canali.</span></label></div>
      <label className="bfs-consent"><input type="checkbox" required checked={form.consent} onChange={e => set('consent', e.target.checked)} /><span>Acconsento a ricevere aggiornamenti periodici su novità bonus e TARI tramite i canali selezionati.</span></label>
      <div className="bfs-test-warning"><strong>Modalità test:</strong> registriamo soltanto la prova nel browser; non partiranno email o messaggi WhatsApp reali.</div>
      <button className="bfs-primary" type="submit">Attiva servizio di test · 0 € <strong>→</strong></button>
    </form>
  </section></Shell>;
}

export default function ServiceTestFlow({ service }) {
  const entry = useMemo(() => safeParse(window.sessionStorage.getItem(ENTRY_KEY), {}), []);
  if (!entry?.comune && service !== 'whatsapp') return <Shell label="Servizio test"><section className="bfs-confirmation"><span className="bfs-eyebrow">DATI NON DISPONIBILI</span><h1>Riparti dalla Home.</h1><p>Per provare questo servizio completa prima il calcolo iniziale.</p><a className="bfs-primary-link" href="/">Torna alla Home</a></section></Shell>;
  if (service === 'base') return <QuickAnalysis entry={entry} />;
  if (service === 'tari') return <TariTest entry={entry} />;
  if (service === 'whatsapp') return <ContinuousTest />;
  return <Shell label="Servizio test"><section className="bfs-confirmation"><h1>Servizio non disponibile.</h1><a className="bfs-primary-link" href="/">Torna alla Home</a></section></Shell>;
}
