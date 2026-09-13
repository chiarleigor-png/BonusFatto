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
    arrow: (
      <>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    pin: (
      <>
        <path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    wallet: (
      <>
        <path d="M20 8H5a2 2 0 0 1 0-4h13v4M4 7v13h16V8M20 12h-6v4h6" />
        <path d="M16 14h.1" />
      </>
    ),
    spark: (
      <>
        <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="3" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
      </>
    ),
    search: (
      <>
        <circle cx="10" cy="10" r="6" />
        <path d="m15 15 5 5" />
      </>
    ),
    copy: (
      <>
        <rect x="8" y="8" width="12" height="13" rx="2" />
        <path d="M16 8V3H3v13h5" />
      </>
    ),
    book: (
      <>
        <path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1ZM12 5v15" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
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
  if (!deadline)
    return (
      <div className="deadline">
        <Icon name="clock" />
        <span>Scadenze locali: consulta il tuo Comune.</span>
      </div>
    );
  const left = countdown(deadline.date, now);
  return (
    <div className="deadline">
      <Icon name="clock" />
      <span>
        <strong>TARI {city}</strong> · {deadline.label}
        <br />
        <a href={deadline.url} target="_blank" rel="noreferrer">
          {left.expired
            ? 'Termine scaduto · consulta il bando'
            : `${left.days}g ${left.hours}h ${left.minutes}m ${left.seconds}s alla scadenza`}
        </a>
      </span>
      <span className={`deadline-tag ${left.expired ? 'expired' : ''}`}>
        {left.expired ? 'Scaduto' : 'Live'}
      </span>
    </div>
  );
}

function Magazine({ close }) {
  return (
    <section className="magazine page-enter">
      <button className="text-button" onClick={close}>
        ← Torna al calcolo
      </button>
      <span className="eyebrow">IL MAGAZINE DI BONUSFATTO</span>
      <h1>
        Un po’ di chiarezza,
        <br />
        <span>un aiuto in più.</span>
      </h1>
      <p className="lead">Tre punti da conoscere prima di richiedere un’agevolazione.</p>
      <div className="articles">
        <article className="white-card">
          <Icon name="book" />
          <h2>Il tuo ISEE è il punto di partenza</h2>
          <p>
            ISEE e numero di figli aiutano a orientarsi. Età, composizione del nucleo, lavoro e
            spese sostenute possono cambiare importi e requisiti.
          </p>
          <a
            href="https://www.inps.it/it/it/sostegni-sussidi-indennita/per-genitori.html"
            target="_blank"
            rel="noreferrer"
          >
            Consulta i servizi INPS ↗
          </a>
        </article>
        <article className="white-card">
          <Icon name="wallet" />
          <h2>Bonus sociale e sconti locali</h2>
          <p>
            La soglia ordinaria ARERA 2026 è 9.796 €. Il bonus sociale rifiuti è il 25%; le
            esenzioni comunali seguono regole proprie. Non esiste uno sconto nazionale TARI del 100%
            per ogni ISEE sotto 8.000 €.
          </p>
          <a
            href="https://www.arera.it/fileadmin/allegati/docs/26/2-2026-R-com.pdf"
            target="_blank"
            rel="noreferrer"
          >
            Leggi l’aggiornamento ARERA ↗
          </a>
        </article>
        <article className="white-card">
          <Icon name="clock" />
          <h2>Occhio alle scadenze</h2>
          <p>
            I bandi TARI 2026 di Roma e Fiumicino indicano rispettivamente il 28 febbraio e il 16
            marzo. Un termine scaduto non viene rinnovato automaticamente dal simulatore.
          </p>
          <Deadline city="Roma" />
          <Deadline city="Fiumicino" />
        </article>
      </div>
    </section>
  );
}

function Results({ input, reset }) {
  const result = useMemo(() => calculate(input), [input]);
  const email = emailTemplate(input);
  const [copyStatus, setCopyStatus] = useState('');
  const emailRef = useRef(null);
  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(email);
      setCopyStatus('Email copiata!');
    } catch {
      emailRef.current.focus();
      emailRef.current.select();
      setCopyStatus('Testo selezionato: premi Ctrl+C o usa Copia sul telefono.');
    }
  }
  return (
    <section className="results page-enter">
      <button className="text-button" onClick={reset}>
        ← Nuovo calcolo
      </button>
      <div className="result-heading">
        <div>
          <span className="eyebrow">IL TUO RIEPILOGO</span>
          <h1>
            <span>{result.benefits.length} agevolazioni</span>
            <br />
            da verificare per te.
          </h1>
          <p className="lead">
            {input.municipality.name} · ISEE {euro(input.isee)} · {input.children}{' '}
            {input.children === 1 ? 'figlio' : 'figli'} a carico
          </p>
        </div>
        <div className="total-card">
          <span>TOTALE POTENZIALE DEL MODELLO</span>
          <strong>{euro(result.total)}</strong>
          <p>Somma illustrativa, non importo spettante</p>
          <div>
            <span>Ipotesi annuali</span>
            <b>{euro(result.recurring)}</b>
          </div>
          <div>
            <span>Massimali e una tantum</span>
            <b>{euro(result.conditional)}</b>
          </div>
        </div>
      </div>
      <div className="model-notice">
        <Icon name="book" />
        <p>
          <strong>Una simulazione, non una verifica del diritto.</strong> Queste formule riproducono
          il modello dimostrativo richiesto e non sono tutte aggiornate alla normativa 2026. Il
          totale somma ipotesi annuali, massimali e contributi una tantum: non verifica
          cumulabilità, età, lavoro o spese. Le detrazioni sono escluse. Non copre tutti i bandi
          regionali.
        </p>
      </div>
      <div className="result-layout">
        <div>
          <div className="section-title">
            <h2>Le tue agevolazioni, una per una</h2>
            <span>{result.benefits.length} da approfondire</span>
          </div>
          <div className="bonus-list">
            {result.benefits.map((b, index) => (
              <article className="bonus-card" key={b.id}>
                <div className={`bonus-icon color-${index % 3}`}>
                  <Icon
                    name={
                      b.category === 'Casa' ? 'pin' : b.category === 'Bollette' ? 'wallet' : 'spark'
                    }
                  />
                </div>
                <div className="bonus-body">
                  <span className="category">{b.category} · Da verificare</span>
                  <h3>{b.name}</h3>
                  <p>{b.description}</p>
                </div>
                <div className="bonus-amount">
                  <strong>{b.amount === null ? '50%' : euro(b.amount)}</strong>
                  <span>{b.period === 'annuo' ? '/ anno · ipotesi' : b.period}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
        <aside className="result-aside">
          <div className="white-card">
            <span className="eyebrow">IL TUO COMUNE</span>
            <h2>{input.municipality.name}</h2>
            <div className="tari-number">
              {result.tariPercent}% <span>TARI simulata</span>
            </div>
            <p>
              Su una media ipotetica di {euro(result.tariBase)}. Questa percentuale non è una
              delibera comunale.
            </p>
            <Deadline city={input.municipality.name} />
          </div>
          <div className="white-card">
            <h3>La checklist da tenere pronta</h3>
            <ul className="checklist">
              {[
                'ISEE 2026 in corso di validità',
                'Documento e codice fiscale',
                'Codice utenza TARI',
                'SPID o CIE per i portali ufficiali',
                'Documenti specifici del bando',
              ].map((t) => (
                <li key={t}>
                  <Icon name="check" size={16} />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
      <section className="email-card white-card">
        <div className="section-title">
          <div>
            <span className="eyebrow">IL PROSSIMO PASSO È SEMPLICE</span>
            <h2>La tua email al Comune è pronta.</h2>
            <p>Completa i tuoi dati e inviala al recapito ufficiale dell’Ufficio Tributi.</p>
          </div>
          <button className="primary compact" onClick={copyEmail}>
            <Icon name="copy" />
            Copia email
          </button>
        </div>
        <textarea
          ref={emailRef}
          aria-label="Email pronta per il Comune"
          value={email}
          readOnly
          rows={12}
        />
        <p role="status" className="copy-status">
          {copyStatus}
        </p>
      </section>
      <button className="primary new-calculation" onClick={reset}>
        Fai un nuovo calcolo <Icon name="arrow" />
      </button>
    </section>
  );
}

export default function App() {
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
  const regions = useMemo(() => uniqueSorted(rows.map((c) => c.region)), [rows]);
  const provinces = useMemo(
    () => uniqueSorted(rows.filter((c) => c.region === region).map((c) => c.province)),
    [rows, region],
  );
  const towns = useMemo(
    () =>
      rows
        .filter((c) => c.region === region && c.province === province)
        .sort((a, b) => alphabetical(a.name, b.name)),
    [rows, region, province],
  );
  const matches = useMemo(
    () => searchMunicipalities(rows, region, province, query),
    [rows, region, province, query],
  );
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
    setResultInput({ isee: value, children: Number(children), municipality });
    setError('');
    focusPage();
  }
  return (
    <div className="app-shell">
      <header className="site-header">
        <button
          className="brand"
          aria-label="BonusFatto.it, torna alla home"
          onClick={() => {
            setMagazine(false);
            setResultInput(null);
            focusPage();
          }}
        >
          <span className="brand-mark">B</span>
          <span>
            BonusFatto<span className="brand-dot">.it</span>
          </span>
        </button>
        <span className="dataset-badge">
          <span className="status-dot" />
          {count} comuni{dataState === 'fallback' ? ' offline' : ''}
        </span>
        <button
          className="magazine-button"
          onClick={() => {
            setMagazine(true);
            focusPage();
          }}
        >
          <Icon name="book" size={17} />
          Magazine<span>↗</span>
        </button>
      </header>
      <main ref={mainRef} tabIndex={-1}>
        {magazine ? (
          <Magazine
            close={() => {
              setMagazine(false);
              focusPage();
            }}
          />
        ) : resultInput ? (
          <Results
            input={resultInput}
            reset={() => {
              setResultInput(null);
              focusPage();
            }}
          />
        ) : (
          <div className="hero-grid page-enter">
            <section className="hero-copy">
              <div className="intro-badge">
                <span className="status-dot" />
                MENO DUBBI, PIÙ POSSIBILITÀ
              </div>
              <h1>
                Scopri <span>tutti i bonus</span>
                <br />a cui hai diritto
                <br />
                con il tuo ISEE<span className="heading-dot">.</span>
              </h1>
              <p className="lead">
                Inserisci il tuo ISEE e scopri subito tutti i bonus, lo sconto TARI e il bonus luce
                e gas per il tuo Comune.
              </p>
              <p className="hero-description">
                Un solo punto di partenza per orientarti tra le agevolazioni. Cerca Regione,
                Provincia e Comune, inserisci ISEE e figli: al resto pensa BonusFatto.{' '}
                <strong>Non serve la bolletta.</strong>
              </p>
              <div className="pill-grid">
                <span className="pill green">
                  <Icon name="check" size={15} />
                  1. Tutti i bonus ISEE
                </span>
                <span className="pill green">
                  <Icon name="check" size={15} />
                  2. Sconto TARI fino al 100%
                </span>
                <span className="pill yellow">
                  <Icon name="spark" size={15} />
                  3. Luce, gas e acqua ~250 €/anno
                </span>
                <span className="pill dark">
                  <Icon name="clock" size={15} />
                  Countdown live
                </span>
              </div>
              <p className="simulation-caption">
                Importi e percentuali illustrativi del simulatore. Requisiti da verificare.
              </p>
              <div className="stats">
                <div>
                  <Icon name="pin" />
                  <span>DATASET {dataState === 'live' ? 'LIVE' : 'COMUNI'}</span>
                  <strong>
                    {count}
                    <small> comuni</small>
                  </strong>
                  <p>
                    {dataState === 'live'
                      ? 'caricati e ricercabili'
                      : dataState === 'loading'
                        ? 'connessione in corso'
                        : 'disponibili offline'}
                  </p>
                </div>
                <div>
                  <Icon name="wallet" />
                  <span>RISPARMIO</span>
                  <strong>~350 €</strong>
                  <p>esempio TARI + utenze</p>
                </div>
                <div>
                  <Icon name="clock" />
                  <span>SCADENZE</span>
                  <strong>
                    Live<small> countdown</small>
                  </strong>
                  <p>Roma e Fiumicino</p>
                </div>
              </div>
              <div className="privacy-line">
                <span className="privacy-icon">
                  <Icon name="lock" size={18} />
                </span>
                <p>
                  <strong>I tuoi dati restano tuoi.</strong>
                  <br />
                  Calcolo nel browser, senza registrazione.
                </p>
              </div>
            </section>
            <section className="form-card">
              <div className="form-heading">
                <div className="step">1</div>
                <div>
                  <h2>Dove abiti?</h2>
                  <p>Partiamo da te e dal tuo Comune.</p>
                </div>
                <span className="form-time">~1 minuto</span>
              </div>
              <form onSubmit={submit}>
                <div className="field-grid">
                  <label>
                    Regione
                    <select
                      value={region}
                      onChange={(e) => {
                        const r = e.target.value;
                        setRegion(r);
                        setProvince(
                          uniqueSorted(
                            rows.filter((c) => c.region === r).map((c) => c.province),
                          )[0],
                        );
                        clearTown();
                      }}
                    >
                      {regions.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Provincia / Capoluogo
                    <select
                      value={province}
                      onChange={(e) => {
                        setProvince(e.target.value);
                        clearTown();
                      }}
                    >
                      {provinces.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <p className="field-hint province-hint">
                  {region === 'Lazio'
                    ? 'Nel Lazio: Frosinone, Latina, Rieti, Roma, Viterbo.'
                    : `${provinces.length} province disponibili in ${region}.`}
                </p>
                <div className="field-grid income-fields">
                  <label>
                    Il tuo ISEE
                    <span className="input-with-unit">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        required
                        placeholder="Es. 15000"
                        value={isee}
                        onChange={(e) => setIsee(e.target.value)}
                      />
                      <span>€</span>
                    </span>
                  </label>
                  <label>
                    Figli a carico
                    <select value={children} onChange={(e) => setChildren(e.target.value)}>
                      {[0, 1, 2, 3, 4, 5].map((n) => (
                        <option value={n} key={n}>
                          {n} {n === 1 ? 'figlio' : 'figli'}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <p className="field-hint">
                  Bonus sociale TARI 2026: 25% con ISEE ≤ 9.796 €; il modello qui sotto usa fasce
                  dimostrative differenti.
                </p>
                <div className="news-box">
                  <span className="news-icon">
                    <Icon name="spark" size={19} />
                  </span>
                  <div>
                    <strong>Novità: non serve l’importo TARI.</strong>
                    <p>
                      Non devi ricordare quanto paghi. Stimiamo lo sconto TARI{' '}
                      <b>(100% / 50% / 25%)</b> e circa <b>250 €/anno</b> per luce, gas e acqua.
                    </p>
                    <span>Inclusi checklist, email pronta e scadenze.</span>
                  </div>
                </div>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={otherTown}
                    onChange={(e) => {
                      setOtherTown(e.target.checked);
                      clearTown();
                    }}
                  />
                  <span>
                    Abito in un altro comune <small>(facoltativo)</small>
                  </span>
                </label>
                {otherTown ? (
                  <div className="autocomplete">
                    <label htmlFor="town">
                      Cerca comune in {province}{' '}
                      <span className="label-count">({towns.length} comuni)</span>
                    </label>
                    <div className="search-input">
                      <Icon name="search" size={18} />
                      <input
                        id="town"
                        role="combobox"
                        autoComplete="off"
                        aria-autocomplete="list"
                        aria-expanded={open}
                        aria-controls="town-options"
                        aria-activedescendant={
                          active >= 0 && matches[active] ? `town-${matches[active].id}` : undefined
                        }
                        placeholder={
                          province === 'Roma'
                            ? 'Es. Fiumicino, Pomezia…'
                            : 'Digita il nome del Comune…'
                        }
                        value={query}
                        onFocus={() => {
                          clearTimeout(blurTimer.current);
                          setOpen(true);
                        }}
                        onBlur={() => {
                          blurTimer.current = setTimeout(() => {
                            setOpen(false);
                            setActive(-1);
                          }, 200);
                        }}
                        onChange={(e) => {
                          setQuery(e.target.value);
                          setSelected(null);
                          setOpen(true);
                          setActive(-1);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setOpen(true);
                            setActive((a) => Math.min(a + 1, matches.length - 1));
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setActive((a) => Math.max(0, a - 1));
                          } else if (e.key === 'Enter' && open) {
                            e.preventDefault();
                            if (active >= 0 && matches[active]) pick(matches[active]);
                            else if (matches.length === 1) pick(matches[0]);
                          } else if (e.key === 'Escape') {
                            setOpen(false);
                            setActive(-1);
                          }
                        }}
                      />
                    </div>
                    {open && (
                      <div className="options-panel">
                        <ul id="town-options" role="listbox" aria-label="Comuni disponibili">
                          {matches.map((town, i) => (
                            <li
                              id={`town-${town.id}`}
                              role="option"
                              aria-selected={selected?.id === town.id}
                              className={active === i ? 'active-option' : ''}
                              key={town.id}
                              ref={(el) => {
                                if (el && active === i) el.scrollIntoView({ block: 'nearest' });
                              }}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                pick(town);
                              }}
                            >
                              {town.name}
                              <span>{town.province}</span>
                            </li>
                          ))}
                        </ul>
                        {!matches.length && (
                          <p className="empty-options">
                            Nessun comune trovato.
                            {dataState === 'fallback'
                              ? ' Elenco offline limitato: riprova con connessione.'
                              : ' Prova un nome diverso.'}
                          </p>
                        )}
                        {matches.length === 80 && (
                          <p className="options-note">
                            Mostrati al massimo 80 risultati. Digita per affinare.
                          </p>
                        )}
                      </div>
                    )}
                    <p className={`selection-hint ${selected ? 'selected' : ''}`} role="status">
                      {selected
                        ? `✓ Comune selezionato: ${selected.name}`
                        : 'Nessun comune selezionato — scegli un risultato dall’elenco.'}
                    </p>
                  </div>
                ) : (
                  <div className="capital-note">
                    <Icon name="pin" size={17} />
                    <span>
                      Calcoleremo per <strong>{capital?.name || 'il Comune da selezionare'}</strong>
                      .
                    </span>
                  </div>
                )}
                {!capital && !otherTown && (
                  <p className="error">
                    Attiva “Abito in un altro comune” e scegli la tua residenza.
                  </p>
                )}
                <Deadline city={municipality?.name || province} />
                <p className="form-disclaimer">
                  Simulazione orientativa: non certifica il diritto ai bonus.
                </p>
                {error && (
                  <p role="alert" className="error">
                    {error}
                  </p>
                )}
                <button className="primary" type="submit">
                  Calcola – vai al totale stimato
                  <Icon name="arrow" />
                </button>
                <p className="dataset-footer" role="status">
                  <span className="status-dot" />
                  {dataState === 'loading'
                    ? 'Caricamento elenco completo… fallback già disponibile'
                    : dataState === 'live'
                      ? `${count} comuni disponibili · elenco online`
                      : `Modalità offline · ${count} comuni principali`}
                </p>
              </form>
            </section>
          </div>
        )}
      </main>
      <footer className="site-footer">
        <span>© {new Date().getFullYear()} BonusFatto.it</span>
        <span>Un aiuto per orientarti. Una scelta più consapevole.</span>
        <button
          onClick={() => {
            setMagazine(true);
            focusPage();
          }}
        >
          Fonti e criteri ↗
        </button>
      </footer>
    </div>
  );
}
