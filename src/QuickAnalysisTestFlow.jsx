import { useMemo } from 'react';
import { calculate, euro } from './benefits.js';

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
    <footer className="bfs-footer"><span>© {new Date().getFullYear()} BonusFatto.it</span><span>Analisi veloce in 30 secondi</span></footer>
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

function adaptForQuickAnalysis(benefit, children) {
  if (benefit.id !== 'children' || !Number.isFinite(Number(benefit.amount))) return benefit;
  const count = Math.max(0, Number(children) || 0);
  const subject = count === 1 ? 'il figlio indicato sia minorenne' : `i ${count} figli indicati siano minorenni`;
  return {
    ...benefit,
    eligibility: 'verifica',
    displayAmount: `Fino a ${euro(Number(benefit.amount))}`,
    period: 'al mese · quota base',
    description: `Stima calcolata ipotizzando che ${subject}. Età e requisiti dei figli vengono verificati nell’Analisi con relazione.`,
  };
}

export default function QuickAnalysisTestFlow() {
  const entry = useMemo(() => safeParse(window.sessionStorage.getItem(ENTRY_KEY), {}), []);
  const input = useMemo(() => ({
    isee: Number(entry.isee) || 0,
    children: Number(entry.figli) || 0,
    municipality: { name: entry.comune || '' },
    profile: { children: Number(entry.figli) || 0, childAges: [] },
  }), [entry]);

  const result = useMemo(() => {
    try {
      const raw = calculate(input);
      return { ...raw, benefits: raw.benefits.map((benefit) => adaptForQuickAnalysis(benefit, input.children)) };
    } catch {
      return { benefits: [] };
    }
  }, [input]);

  if (!entry?.comune) return <Shell><section className="bfs-confirmation"><span className="bfs-eyebrow">DATI NON DISPONIBILI</span><h1>Avvia prima il calcolo dalla Home.</h1><a className="bfs-primary-link" href="/">Torna alla Home</a></section></Shell>;

  return <Shell>
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
