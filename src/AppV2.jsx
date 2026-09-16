import { useEffect, useMemo, useRef, useState } from 'react';
import fallback from './fallback.json';
import {
  alphabetical,
  fetchMunicipalities,
  findCapital,
  searchMunicipalities,
  uniqueSorted,
} from './geography';
import { calculate, countdown, DEADLINES, emailTemplate, euro } from './benefits';

function Icon({ name, size = 20, ...props }) {
  const paths = {
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    pin: <><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    wallet: <><path d="M20 8H5a2 2 0 0 1 0-4h13v4M4 7v13h16V8M20 12h-6v4h6" /><path d="M16 14h.1" /></>,
    spark: <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z" />,
    lock: <><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
    search: <><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5" /></>,
    copy: <><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M16 8V3H3v13h5" /></>,
    book: <><path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1ZM12 5v15" /><path d="M12 5v15" /></>,
    file: <><path d="M6 2h8l4 4v16H6z" /><path d="M14 2v5h5M9 12h6M9 16h6" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {paths[name] || paths.spark}
    </svg>
  );
}

function Deadline({ city }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const deadline = DEADLINES[city];
  if (!deadline) return <div className="deadline"><Icon name="clock" /><span>Scadenze locali: verifica il regolamento o il bando del tuo Comune.</span></div>;
  const left = countdown(deadline.date, now);
  return (
    <div className="deadline">
      <Icon name="clock" />
      <span><strong>TARI {city}</strong> · {deadline.label}<br /><a href={deadline.url} target="_blank" rel="noreferrer">{left.expired ? 'Termine scaduto · consulta il bando' : `${left.days}g ${left.hours}h ${left.minutes}m ${left.seconds}s alla scadenza`}</a></span>
      <span className={`deadline-tag ${left.expired ? 'expired' : ''}`}>{left.expired ? 'Scaduto' : 'Live'}</span>
    </div>
  );
}

function Magazine({ close }) {
  return (
    <section className="magazine page-enter">
      <button className="text-button" onClick={close}>← Torna al calcolo</button>
      <span className="eyebrow">IL MAGAZINE DI BONUSFATTO</span>
      <h1>Più chiarezza,<br /><span>meno stime generiche.</span></h1>
      <p className="lead">BonusFatto distingue i bonus nazionali dalle agevolazioni decise dal singolo Comune.</p>
      <div className="articles">
        <article className="white-card">
          <Icon name="wallet" />
          <h2>Bonus sociale TARI 2026</h2>
          <p>La riduzione nazionale è pari al 25% della TARI dovuta ed è automatica con DSU/ISEE valido entro le soglie previste.</p>
          <a href="https://www.arera.it/comunicati-stampa/dettaglio/bonus-sociali-arera-alza-a-9796-euro-la-soglia-isee-per-laccesso-alle-agevolazioni-per-acqua-luce-gas-e-rifiuti" target="_blank" rel="noreferrer">Fonte ARERA ↗</a>
        </article>
        <article className="white-card">
          <Icon name="pin" />
          <h2>Agevolazioni comunali</h2>
          <p>Esenzioni e ulteriori riduzioni TARI possono cambiare da Comune a Comune. Quando non disponiamo di una delibera locale verificata, lo dichiariamo chiaramente.</p>
        </article>
        <article className="white-card">
          <Icon name="book" />
          <h2>7.894 Comuni nel 2026</h2>
          <p>L’elenco viene aggiornato sulle variazioni amministrative 2026, comprese l’incorporazione di Lirio e la nascita di Castegnero Nanto.</p>
          <a href="https://www.istat.it/classificazione/codici-dei-comuni-delle-province-e-delle-regioni/" target="_blank" rel="noreferrer">Fonte ISTAT ↗</a>
        </article>
      </div>
    </section>
  );
}

function PricingGate({ input, result, onCheckout, checkoutBusy, checkoutError, reset }) {
  const previewNames = result.benefits.slice(0, 4).map((b) => b.name).join(', ');
  return (
    <section className="paywall-shell page-enter">
      <button className="text-button" onClick={reset}>← Modifica i dati</button>
      <div className="paywall-heading">
        <span className="eyebrow">ANALISI COMPLETATA</span>
        <h1>Abbiamo trovato <span>{result.benefits.length} agevolazioni</span> da verificare.</h1>
        <p className="lead">{input.municipality.name} · ISEE {euro(input.isee)} · Anteprima: {previewNames}{result.benefits.length > 4 ? '…' : ''}</p>
      </div>
      <div className="teaser-summary">
        <div><span>Bonus individuati</span><strong>{result.benefits.length}</strong></div>
        <div><span>TARI nazionale</span><strong>{result.tariNationalEligible ? '25%' : 'Da verificare'}</strong></div>
        <div><span>Comune analizzato</span><strong>{input.municipality.name}</strong></div>
      </div>
      <div className="plan-grid">
        <article className="plan-card">
          <span className="plan-badge">ESSENZIALE</span>
          <h2>Analisi completa</h2>
          <div className="plan-price">4,99 € <small>una tantum</small></div>
          <p>Sblocca subito il risultato dettagliato del calcolo.</p>
          <ul className="plan-list">
            <li><Icon name="check" size={16} /> Tutte le agevolazioni individuate</li>
            <li><Icon name="check" size={16} /> Importi e stime annuali</li>
            <li><Icon name="check" size={16} /> Bonus sociale TARI e bollette</li>
            <li><Icon name="check" size={16} /> Checklist documenti e scadenze</li>
          </ul>
          <button className="primary" disabled={Boolean(checkoutBusy)} onClick={() => onCheckout('base')}>{checkoutBusy === 'base' ? 'Apertura checkout…' : 'Sblocca a 4,99 €'} <Icon name="arrow" /></button>
        </article>
        <article className="plan-card featured">
          <span className="plan-badge">PIÙ COMPLETO</span>
          <h2>Analisi + relazione PDF</h2>
          <div className="plan-price">9,90 € <small>una tantum</small></div>
          <p>Il pacchetto completo per avere anche i documenti pronti da utilizzare.</p>
          <ul className="plan-list">
            <li><Icon name="check" size={16} /> Tutto il piano da 4,99 €</li>
            <li><Icon name="check" size={16} /> Relazione personalizzata salvabile in PDF</li>
            <li><Icon name="check" size={16} /> Testo email/PEC per l’Ufficio Tributi</li>
            <li><Icon name="check" size={16} /> Riepilogo TARI e avvertenze sulle fonti</li>
          </ul>
          <button className="primary" disabled={Boolean(checkoutBusy)} onClick={() => onCheckout('report')}>{checkoutBusy === 'report' ? 'Apertura checkout…' : 'Scegli il report a 9,90 €'} <Icon name="arrow" /></button>
        </article>
      </div>
      {checkoutError && <p className="checkout-error" role="alert">{checkoutError}</p>}
      <p className="checkout-note"><Icon name="lock" size={13} /> Pagamento gestito da Stripe. Nessun abbonamento.</p>
    </section>
  );
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

function printReport(input, result, email) {
  const popup = window.open('', '_blank', 'noopener,noreferrer');
  if (!popup) return false;
  const rows = result.benefits.map((b) => `<tr><td>${escapeHtml(b.name)}</td><td>${b.amount == null ? 'Da verificare' : escapeHtml(euro(b.amount))}</td><td>${escapeHtml(b.description)}</td></tr>`).join('');
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>BonusFatto - ${escapeHtml(input.municipality.name)}</title><style>body{font-family:Arial,sans-serif;color:#252722;margin:42px;line-height:1.5}h1{font-size:28px}h2{margin-top:28px;font-size:19px}table{width:100%;border-collapse:collapse;margin-top:14px}th,td{text-align:left;vertical-align:top;border-bottom:1px solid #ddd;padding:9px;font-size:12px}pre{white-space:pre-wrap;background:#f7f6f0;padding:16px;border-radius:8px;font:12px/1.5 Arial,sans-serif}.note{font-size:11px;color:#666;margin-top:25px}@media print{button{display:none}}</style></head><body><button onclick="window.print()">Stampa / salva in PDF</button><h1>BonusFatto.it - Relazione bonus 2026</h1><p><strong>Comune:</strong> ${escapeHtml(input.municipality.name)}<br><strong>ISEE:</strong> ${escapeHtml(euro(input.isee))}<br><strong>Figli a carico:</strong> ${input.children}</p><h2>Riepilogo</h2><p>Agevolazioni potenziali individuate: <strong>${result.benefits.length}</strong><br>Totale potenziale del modello: <strong>${escapeHtml(euro(result.total))}</strong></p><h2>TARI</h2><p>${result.tariNationalEligible ? `Bonus sociale rifiuti nazionale: 25%. Risparmio stimato sulla media usata dal modello: ${escapeHtml(euro(result.tariEstimatedSaving))}.` : 'Con i dati inseriti non emerge la soglia economica del bonus sociale rifiuti nazionale.'}</p><p>Le ulteriori agevolazioni comunali devono essere confermate sul regolamento o sulla delibera vigente del Comune.</p><h2>Agevolazioni</h2><table><thead><tr><th>Bonus</th><th>Importo</th><th>Nota</th></tr></thead><tbody>${rows}</tbody></table><h2>Email / PEC pronta</h2><pre>${escapeHtml(email)}</pre><p class="note">Documento informativo generato dai dati inseriti. Non sostituisce un provvedimento dell'ente, una verifica INPS/ARERA o una consulenza professionale. Requisiti, cumulabilità, importi e scadenze vanno verificati sulle fonti ufficiali vigenti.</p></body></html>`);
  popup.document.close();
  return true;
}

function PaidResults({ input, plan, reset }) {
  const result = useMemo(() => calculate(input), [input]);
  const email = emailTemplate(input);
  const [copyStatus, setCopyStatus] = useState('');
  const emailRef = useRef(null);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(email);
      setCopyStatus('Email copiata!');
    } catch {
      emailRef.current?.focus();
      emailRef.current?.select();
      setCopyStatus('Testo selezionato: usa Copia sul tuo dispositivo.');
    }
  }

  return (
    <section className="results page-enter">
      <button className="text-button" onClick={reset}>← Nuovo calcolo</button>
      <div className="paid-banner"><Icon name="check" size={18} /> Pagamento verificato · {plan === 'report' ? 'Analisi + relazione PDF' : 'Analisi completa'}</div>
      <div className="result-heading">
        <div>
          <span className="eyebrow">IL TUO RIEPILOGO</span>
          <h1><span>{result.benefits.length} agevolazioni</span><br />da approfondire per te.</h1>
          <p className="lead">{input.municipality.name} · ISEE {euro(input.isee)} · {input.children} {input.children === 1 ? 'figlio' : 'figli'} a carico</p>
        </div>
        <div className="total-card">
          <span>TOTALE POTENZIALE DEL MODELLO</span>
          <strong>{euro(result.total)}</strong>
          <p>Stima orientativa: non è un importo certificato</p>
          <div><span>Ipotesi annuali</span><b>{euro(result.recurring)}</b></div>
          <div><span>Massimali e una tantum</span><b>{euro(result.conditional)}</b></div>
        </div>
      </div>
      <div className="model-notice"><Icon name="book" /><p><strong>Risultato orientativo.</strong> ISEE e figli non bastano a verificare tutti i requisiti. Il simulatore segnala opportunità compatibili con i dati inseriti; la spettanza finale dipende dalle condizioni previste dalle fonti ufficiali.</p></div>
      <div className="result-layout">
        <div>
          <div className="section-title"><h2>Le agevolazioni individuate</h2><span>{result.benefits.length} da verificare</span></div>
          <div className="bonus-list">
            {result.benefits.map((b, index) => (
              <article className="bonus-card" key={b.id}>
                <div className={`bonus-icon color-${index % 3}`}><Icon name={b.category === 'Casa' ? 'pin' : b.category === 'Bollette' ? 'wallet' : 'spark'} /></div>
                <div className="bonus-body"><span className="category">{b.category}</span><h3>{b.name}</h3><p>{b.description}</p></div>
                <div className="bonus-amount"><strong>{b.amount === null ? 'Da verificare' : euro(b.amount)}</strong><span>{b.period === 'annuo' ? '/ anno · stima' : b.period}</span></div>
              </article>
            ))}
          </div>
        </div>
        <aside className="result-aside">
          <div className="white-card">
            <span className="eyebrow">TARI 2026</span>
            <h2>{input.municipality.name}</h2>
            <div className="tari-number">{result.tariNationalEligible ? '25%' : '—'} <span>bonus sociale nazionale</span></div>
            {result.tariNationalEligible && <span className="tari-official">Automatico con DSU/ISEE valido</span>}
            <p>{result.tariNationalEligible ? `Risparmio stimato ${euro(result.tariEstimatedSaving)} su una TARI media ipotetica di ${euro(result.tariBase)}.` : 'La soglia economica nazionale non emerge dai dati inseriti.'}</p>
            <div className="tari-local-status"><strong>Agevolazioni comunali:</strong> verranno indicate come certe solo quando la relativa delibera/regolamento 2026 è stato verificato. Non applichiamo più percentuali locali generiche.</div>
            <Deadline city={input.municipality.name} />
          </div>
          <div className="white-card">
            <h3>Checklist</h3>
            <ul className="checklist">{['ISEE 2026 in corso di validità','Documento e codice fiscale','Codice utenza TARI','SPID o CIE','Documenti richiesti dal singolo bando'].map((t) => <li key={t}><Icon name="check" size={16} />{t}</li>)}</ul>
          </div>
        </aside>
      </div>
      {plan === 'report' ? (
        <section className="email-card white-card">
          <div className="section-title">
            <div><span className="eyebrow">PACCHETTO REPORT</span><h2>Relazione PDF + email/PEC pronta</h2><p>Puoi salvare la relazione come PDF dal browser e copiare il testo per l’Ufficio Tributi.</p></div>
            <div className="report-actions"><button className="secondary-action" onClick={() => printReport(input, result, email)}><Icon name="file" size={17} /> Stampa / salva PDF</button><button className="primary compact" onClick={copyEmail}><Icon name="copy" /> Copia email</button></div>
          </div>
          <textarea ref={emailRef} aria-label="Email pronta per il Comune" value={email} readOnly rows={12} />
          <p role="status" className="copy-status">{copyStatus}</p>
        </section>
      ) : (
        <div className="locked-extra"><h3>PDF ed email/PEC non inclusi nel piano da 4,99 €</h3><p>Il pacchetto da 9,90 € include anche la relazione personalizzata e il testo pronto per l’Ufficio Tributi.</p></div>
      )}
      <button className="primary new-calculation" onClick={reset}>Fai un nuovo calcolo <Icon name="arrow" /></button>
    </section>
  );
}

function Results({ input, accessPlan, onCheckout, checkoutBusy, checkoutError, reset }) {
  const result = useMemo(() => calculate(input), [input]);
  if (!accessPlan) return <PricingGate input={input} result={result} onCheckout={onCheckout} checkoutBusy={checkoutBusy} checkoutError={checkoutError} reset={reset} />;
  return <PaidResults input={input} plan={accessPlan} reset={reset} />;
}

export default function AppV2() {
  const [rows, setRows] = useState(fallback);
  const [dataState, setDataState] = useState('loading');
  const [region, setRegion] = useState('Lazio');
  const [province, setProvince] = useState('Roma');
  const [isee, setIsee] = useState('');
  const [children, setChildren] = useState('1');
  const [otherTown, setOtherTown] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [error, setError] = useState('');
  const [resultInput, setResultInput] = useState(null);
  const [magazine, setMagazine] = useState(false);
  const [accessPlan, setAccessPlan] = useState(null);
  const [checkoutBusy, setCheckoutBusy] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  const blurTimer = useRef(null);
  const mainRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchMunicipalities(fetch, 5000, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setRows(data);
          setDataState('live');
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setDataState('fallback');
      });
    return () => controller.abort();
  }, []);

  useEffect(() => () => clearTimeout(blurTimer.current), []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (!sessionId) {
      if (params.get('checkout') === 'cancelled') setCheckoutError('Pagamento annullato: puoi scegliere di nuovo il pacchetto quando vuoi.');
      return;
    }
    setCheckoutBusy('verify');
    fetch(`/api/verify-checkout?session_id=${encodeURIComponent(sessionId)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Verifica pagamento non riuscita.');
        return data;
      })
      .then((data) => {
        setResultInput({ isee: Number(data.isee), children: Number(data.figli), municipality: { id: data.comune, name: data.comune, region: '', province: '' } });
        setAccessPlan(data.plan);
        setCheckoutError('');
      })
      .catch((err) => setCheckoutError(err.message))
      .finally(() => setCheckoutBusy(''));
  }, []);

  const regions = useMemo(() => uniqueSorted(rows.map((c) => c.region)), [rows]);
  const provinces = useMemo(() => uniqueSorted(rows.filter((c) => c.region === region).map((c) => c.province)), [rows, region]);
  const towns = useMemo(() => rows.filter((c) => c.region === region && c.province === province).sort((a, b) => alphabetical(a.name, b.name)), [rows, region, province]);
  const matches = useMemo(() => searchMunicipalities(rows, region, province, query), [rows, region, province, query]);
  const capital = findCapital(rows, region, province);
  const municipality = otherTown ? selected : capital;
  const count = rows.length.toLocaleString('it-IT');

  function clearTown() {
    setSelected(null);
    setQuery('');
    setActive(-1);
    setOpen(false);
    setError('');
  }

  function pick(town) {
    clearTimeout(blurTimer.current);
    setSelected(town);
    setQuery(town.name);
    setOpen(false);
    setActive(-1);
    setError('');
  }

  function focusPage() {
    window.scrollTo({ top: 0, behavior: 'instant' });
    requestAnimationFrame(() => mainRef.current?.focus());
  }

  function resetCalculation() {
    setResultInput(null);
    setAccessPlan(null);
    setCheckoutBusy('');
    setCheckoutError('');
    window.history.replaceState({}, '', window.location.pathname);
    focusPage();
  }

  async function startCheckout(plan) {
    if (!resultInput) return;
    setCheckoutBusy(plan);
    setCheckoutError('');
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, comune: resultInput.municipality.name, isee: resultInput.isee, figli: resultInput.children }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Checkout non disponibile.');
      window.location.assign(data.url);
    } catch (err) {
      setCheckoutError(err.message);
      setCheckoutBusy('');
    }
  }

  function submit(event) {
    event.preventDefault();
    if (!municipality) {
      setError('Seleziona un Comune dall’elenco prima di continuare.');
      return;
    }
    const value = Number(isee);
    if (!isee.trim() || !Number.isFinite(value) || value < 0) {
      setError('Inserisci un ISEE valido, anche pari a zero.');
      return;
    }
    setAccessPlan(null);
    setCheckoutError('');
    setResultInput({ isee: value, children: Number(children), municipality });
    setError('');
    focusPage();
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <button className="brand" aria-label="BonusFatto.it, torna alla home" onClick={() => { setMagazine(false); resetCalculation(); }}>
          <span className="brand-mark">B</span><span>BonusFatto<span className="brand-dot">.it</span></span>
        </button>
        <span className="dataset-badge"><span className="status-dot" />{dataState === 'live' ? `${count} comuni 2026` : `${count} comuni${dataState === 'fallback' ? ' offline' : ''}`}</span>
        <button className="magazine-button" onClick={() => { setMagazine(true); focusPage(); }}><Icon name="book" size={17} />Magazine<span>↗</span></button>
      </header>
      <main ref={mainRef} tabIndex={-1}>
        {magazine ? (
          <Magazine close={() => { setMagazine(false); focusPage(); }} />
        ) : resultInput ? (
          <Results input={resultInput} accessPlan={accessPlan} onCheckout={startCheckout} checkoutBusy={checkoutBusy} checkoutError={checkoutError} reset={resetCalculation} />
        ) : (
          <div className="hero-grid page-enter">
            <section className="hero-copy">
              <div className="intro-badge"><span className="status-dot" />MENO DUBBI, PIÙ POSSIBILITÀ</div>
              <h1>Scopri <span>tutti i bonus</span><br />a cui puoi avere diritto<br />con il tuo ISEE<span className="heading-dot">.</span></h1>
              <p className="lead">Inserisci il tuo ISEE e scopri bonus nazionali, bonus bollette e le informazioni TARI per il tuo Comune.</p>
              <p className="hero-description">Regione, Provincia, Comune, ISEE e figli: BonusFatto organizza le agevolazioni in un unico riepilogo. <strong>Non serve avere sotto mano la bolletta TARI.</strong></p>
              <div className="pill-grid">
                <span className="pill green"><Icon name="check" size={15} />1. Bonus ISEE</span>
                <span className="pill green"><Icon name="check" size={15} />2. Bonus sociale TARI 25%</span>
                <span className="pill yellow"><Icon name="spark" size={15} />3. Luce, gas e acqua</span>
                <span className="pill dark"><Icon name="clock" size={15} />Scadenze locali</span>
              </div>
              <p className="simulation-caption">Il simulatore distingue le misure nazionali dalle agevolazioni comunali ancora da verificare.</p>
              <div className="stats">
                <div><Icon name="wallet" /><span>ANALISI VELOCE IN 30 SECONDI</span><strong>2,99 €</strong></div>
                <div><Icon name="file" /><span>ANALISI CON RELAZIONE</span><strong>6,90 €</strong><p>relazione PDF personalizzata +4,90 €</p></div>
                <div><Icon name="copy" /><span>INVIO PEC TARI</span><strong>14,90 €</strong><p>inviamo per te la richiesta di riduzione al Comune</p></div>
                <div><Icon name="spark" /><span>SERVIZIO CONTINUATIVO</span><strong>6,90 €</strong><p>invio aggiornamenti periodici su novità bonus e TARI</p></div>
              </div>
              <div className="privacy-line"><span className="privacy-icon"><Icon name="lock" size={18} /></span><p><strong>I tuoi dati restano essenziali.</strong><br />Nessuna registrazione richiesta per il calcolo.</p></div>
            </section>
            <section className="form-card">
              <div className="form-heading"><div className="step">1</div><div><h2>Dove abiti?</h2><p>Partiamo dal tuo Comune e dal tuo ISEE.</p></div><span className="form-time">~1 minuto</span></div>
              <form onSubmit={submit}>
                <div className="field-grid">
                  <label>Regione<select value={region} onChange={(e) => { const r = e.target.value; setRegion(r); setProvince(uniqueSorted(rows.filter((c) => c.region === r).map((c) => c.province))[0] || ''); clearTown(); }}>{regions.map((r) => <option key={r}>{r}</option>)}</select></label>
                  <label>Provincia / Capoluogo<select value={province} onChange={(e) => { setProvince(e.target.value); clearTown(); }}>{provinces.map((p) => <option key={p}>{p}</option>)}</select></label>
                </div>
                <p className="field-hint province-hint">{region === 'Lazio' ? 'Nel Lazio: Frosinone, Latina, Rieti, Roma, Viterbo.' : `${provinces.length} province disponibili in ${region}.`}</p>
                <div className="field-grid income-fields">
                  <label>Il tuo ISEE<span className="input-with-unit"><input type="number" min="0" step="0.01" inputMode="decimal" required placeholder="Es. 15000" value={isee} onChange={(e) => setIsee(e.target.value)} /><span>€</span></span></label>
                  <label>Figli a carico<select value={children} onChange={(e) => setChildren(e.target.value)}>{[0,1,2,3,4,5].map((n) => <option value={n} key={n}>{n} {n === 1 ? 'figlio' : 'figli'}</option>)}</select></label>
                </div>
                <p className="field-hint">Bonus sociali 2026: soglia ordinaria ISEE 9.796 €; 20.000 € per nuclei con almeno 4 figli a carico.</p>
                <div className="news-box"><span className="news-icon"><Icon name="spark" size={19} /></span><div><strong>Novità: TARI più trasparente.</strong><p>Il bonus sociale rifiuti nazionale è del <b>25%</b> della TARI dovuta quando ricorrono i requisiti. Le ulteriori riduzioni comunali vengono indicate solo se verificate.</p><span>Prezzi di lancio: analisi da 2,99 €, relazione PDF 4,90 € e servizi TARI acquistabili separatamente.</span></div></div>
                <label className="checkbox-label"><input type="checkbox" checked={otherTown} onChange={(e) => { setOtherTown(e.target.checked); clearTown(); }} /><span>Abito in un altro comune <small>(facoltativo)</small></span></label>
                {otherTown ? (
                  <div className="autocomplete">
                    <label htmlFor="town">Cerca comune in {province} <span className="label-count">({towns.length} comuni)</span></label>
                    <div className="search-input"><Icon name="search" size={18} /><input id="town" role="combobox" autoComplete="off" aria-autocomplete="list" aria-expanded={open} aria-controls="town-options" aria-activedescendant={active >= 0 && matches[active] ? `town-${matches[active].id}` : undefined} placeholder={province === 'Roma' ? 'Es. Fiumicino, Pomezia…' : 'Digita il nome del Comune…'} value={query} onFocus={() => { clearTimeout(blurTimer.current); setOpen(true); }} onBlur={() => { blurTimer.current = setTimeout(() => { setOpen(false); setActive(-1); }, 200); }} onChange={(e) => { setQuery(e.target.value); setSelected(null); setOpen(true); setActive(-1); }} onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, matches.length - 1)); } else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); } else if (e.key === 'Enter' && open) { e.preventDefault(); if (active >= 0 && matches[active]) pick(matches[active]); else if (matches.length === 1) pick(matches[0]); } else if (e.key === 'Escape') { setOpen(false); setActive(-1); } }} /></div>
                    {open && <div className="options-panel"><ul id="town-options" role="listbox" aria-label="Comuni disponibili">{matches.map((town, i) => <li id={`town-${town.id}`} role="option" aria-selected={selected?.id === town.id} className={active === i ? 'active-option' : ''} key={town.id} onMouseDown={(e) => { e.preventDefault(); pick(town); }}>{town.name}<span>{town.province}</span></li>)}</ul>{!matches.length && <p className="empty-options">Nessun comune trovato.{dataState === 'fallback' ? ' Elenco offline limitato: riprova con connessione.' : ' Prova un nome diverso.'}</p>}{matches.length === 80 && <p className="options-note">Mostrati al massimo 80 risultati. Digita per affinare.</p>}</div>}
                    <p className={`selection-hint ${selected ? 'selected' : ''}`} role="status">{selected ? `✓ Comune selezionato: ${selected.name}` : 'Nessun comune selezionato — scegli un risultato dall’elenco.'}</p>
                  </div>
                ) : (
                  <div className="capital-note"><Icon name="pin" size={17} /><span>Calcoleremo per <strong>{capital?.name || 'il Comune da selezionare'}</strong>.</span></div>
                )}
                {!capital && !otherTown && <p className="error">Attiva “Abito in un altro comune” e scegli la tua residenza.</p>}
                <Deadline city={municipality?.name || province} />
                <p className="form-disclaimer">Simulazione orientativa: il pagamento sblocca l’analisi, non certifica il diritto ai bonus.</p>
                {error && <p role="alert" className="error">{error}</p>}
                <button className="primary" type="submit">Calcola i bonus <Icon name="arrow" /></button>
                <p className="dataset-footer" role="status"><span className="status-dot" />{dataState === 'loading' ? 'Caricamento elenco nazionale…' : dataState === 'live' ? `${count} comuni disponibili · dataset 2026` : `Modalità offline · ${count} comuni principali`}</p>
              </form>
            </section>
          </div>
        )}
      </main>
      <footer className="site-footer"><span>© {new Date().getFullYear()} BonusFatto.it</span><span>Orientamento semplice, fonti dichiarate.</span><button onClick={() => { setMagazine(true); focusPage(); }}>Fonti e criteri ↗</button></footer>
    </div>
  );
}
