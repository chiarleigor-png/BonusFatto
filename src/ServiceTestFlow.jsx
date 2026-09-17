import { useMemo, useState } from 'react';
import { euro } from './benefits.js';

const ENTRY_KEY = 'bonusfatto_service_entry';

function safeParse(value, fallback = {}) {
  try { return JSON.parse(value) || fallback; } catch { return fallback; }
}

function Shell({ children }) {
  return <div className="bfs-shell">
    <header className="bfs-header">
      <a className="bfs-brand" href="/"><span className="bfs-mark">B</span><span>Bonus<span>Fatto</span><em>.it</em></span></a>
      <span className="bfs-test-pill">SERVIZIO CONTINUATIVO · 12 MESI</span>
    </header>
    <main className="bfs-main">{children}</main>
    <footer className="bfs-footer"><span>© {new Date().getFullYear()} BonusFatto.it</span><span>Servizio continuativo</span></footer>
  </div>;
}

function Field({ label, children, full = false }) {
  return <label className={`bfs-field${full ? ' full' : ''}`}><span>{label}</span>{children}</label>;
}

function channelLabel(channel) {
  if (channel === 'whatsapp') return 'WhatsApp';
  if (channel === 'both') return 'Email + WhatsApp';
  return 'Email';
}

export default function ServiceTestFlow() {
  const entry = useMemo(() => safeParse(window.sessionStorage.getItem(ENTRY_KEY), {}), []);
  const [form, setForm] = useState({
    nome: entry.customerName || '',
    cognome: entry.customerSurname || '',
    email: entry.customerEmail || '',
    whatsapp: '',
    channel: 'email',
    consent: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submission, setSubmission] = useState(null);

  const set = (name, value) => setForm(current => ({ ...current, [name]: value }));
  const needsWhatsapp = form.channel === 'whatsapp' || form.channel === 'both';

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (needsWhatsapp && !form.whatsapp.trim()) {
      setError('Inserisci il numero WhatsApp per il canale selezionato.');
      return;
    }
    if (!form.consent) {
      setError('Conferma il consenso per attivare il servizio continuativo.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/continuous-service-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form, entry, sessionId: entry.sessionId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) throw new Error(data?.error || 'Attivazione del servizio non riuscita.');
      setSubmission(data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err?.message || 'Attivazione del servizio non riuscita.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!entry?.sessionId) return <Shell><section className="bfs-confirmation"><span className="bfs-eyebrow">ACCESSO NON DISPONIBILE</span><h1>Completa prima l’acquisto del servizio.</h1><a className="bfs-primary-link" href="/">Torna alla Home</a></section></Shell>;

  if (submission) return <Shell><section className="bfs-confirmation">
    <div className="bfs-success-icon">✓</div>
    <span className="bfs-eyebrow">SERVIZIO ATTIVATO</span>
    <h1>Il Servizio continuativo è attivo.</h1>
    <p>La richiesta è stata registrata e inviata a <strong>pratiche@bonusfatto.it</strong>{submission.confirmationSent ? ' e ti abbiamo inviato anche una mail di conferma.' : '.'}</p>
    <div className="bfs-summary">
      <div><span>Codice attivazione</span><strong>{submission.activationCode}</strong></div>
      <div><span>Cliente</span><strong>{form.nome} {form.cognome}</strong></div>
      <div><span>Email</span><strong>{form.email}</strong></div>
      <div><span>Canale scelto</span><strong>{channelLabel(form.channel)}</strong></div>
      {form.whatsapp && <div><span>WhatsApp</span><strong>{form.whatsapp}</strong></div>}
      {entry?.comune && <div><span>Comune di riferimento</span><strong>{entry.comune}</strong></div>}
      {Number.isFinite(Number(entry?.isee)) && <div><span>ISEE di partenza</span><strong>{euro(Number(entry.isee))}</strong></div>}
      <div><span>Conferma email cliente</span><strong>{submission.confirmationSent ? 'Inviata ✓' : 'Da verificare'}</strong></div>
    </div>
    <div className="bfs-test-warning"><strong>Durata del servizio:</strong> 12 mesi. Gli aggiornamenti su novità, scadenze, bonus e TARI verranno gestiti attraverso i canali che hai selezionato. Potrai modificare la preferenza o revocare il consenso in qualsiasi momento.</div>
    <div className="bfs-confirm-actions"><a className="bfs-primary-link" href="/">Torna alla Home</a></div>
  </section></Shell>;

  return <Shell><section className="bfs-form-page">
    <div className="bfs-form-intro">
      <span className="bfs-eyebrow">SERVIZIO CONTINUATIVO · 12 MESI</span>
      <h1>Ricevi gli aggiornamenti nel canale che preferisci.</h1>
      <p>Completa l’attivazione scegliendo come ricevere gli aggiornamenti periodici su novità, scadenze, bonus e TARI.</p>
    </div>

    {entry?.comune && <div className="bfs-note">Profilo di partenza: <strong>{entry.comune}</strong> · ISEE <strong>{euro(Number(entry.isee) || 0)}</strong>{Number.isFinite(Number(entry.figli)) ? <> · Figli <strong>{Number(entry.figli)}</strong></> : null}</div>}

    <form className="bfs-card-form" onSubmit={submit}>
      <div className="bfs-section-title"><span>1</span><div><h2>I tuoi recapiti</h2><p>Inserisci i dati necessari per associare correttamente gli aggiornamenti al tuo profilo.</p></div></div>
      <div className="bfs-grid">
        <Field label="Nome"><input required value={form.nome} onChange={e => set('nome', e.target.value)} /></Field>
        <Field label="Cognome"><input required value={form.cognome} onChange={e => set('cognome', e.target.value)} /></Field>
        <Field label="Email"><input type="email" required value={form.email} onChange={e => set('email', e.target.value)} /></Field>
        {needsWhatsapp && <Field label="Numero WhatsApp"><input type="tel" required placeholder="+39 333 1234567" value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} /></Field>}
      </div>

      <div className="bfs-divider" />
      <div className="bfs-section-title"><span>2</span><div><h2>Come vuoi ricevere gli aggiornamenti?</h2><p>La preferenza potrà essere modificata successivamente.</p></div></div>
      <div className="bfs-channel-grid">
        <label className={form.channel === 'email' ? 'selected' : ''}><input type="radio" name="channel" value="email" checked={form.channel === 'email'} onChange={e => set('channel', e.target.value)} /><strong>Email</strong><span>Aggiornamenti nella tua casella di posta.</span></label>
        <label className={form.channel === 'whatsapp' ? 'selected' : ''}><input type="radio" name="channel" value="whatsapp" checked={form.channel === 'whatsapp'} onChange={e => set('channel', e.target.value)} /><strong>WhatsApp</strong><span>Avvisi direttamente sul numero indicato.</span></label>
        <label className={form.channel === 'both' ? 'selected' : ''}><input type="radio" name="channel" value="both" checked={form.channel === 'both'} onChange={e => set('channel', e.target.value)} /><strong>Email + WhatsApp</strong><span>Ricevi gli aggiornamenti su entrambi i canali.</span></label>
      </div>

      <label className="bfs-consent"><input type="checkbox" required checked={form.consent} onChange={e => set('consent', e.target.checked)} /><span>Acconsento a ricevere aggiornamenti periodici su novità, scadenze, bonus e TARI tramite i canali selezionati. Potrò revocare il consenso in qualsiasi momento.</span></label>

      {error && <div className="checkout-error" role="alert">{error}</div>}
      <div className="bfs-test-warning"><strong>Attivazione:</strong> la preferenza e il consenso vengono registrati nel backoffice. Riceverai una mail di conferma dell’attivazione.</div>
      <button className="bfs-primary" type="submit" disabled={submitting}>{submitting ? 'Registrazione in corso…' : <>Attiva servizio <strong>→</strong></>}</button>
    </form>
  </section></Shell>;
}
