import { useEffect, useMemo, useState } from 'react';
import QuickAnalysisTestFlow from './QuickAnalysisTestFlow.jsx';
import TariPecTestFlowConnected from './TariPecTestFlowConnected.jsx';
import ServiceTestFlow from './ServiceTestFlow.jsx';
import IseeReportFlowFinal from './IseeReportFlowFinal.jsx';
import { openBillingForm } from './billingForm.js';

const SERVICE_ENTRY = 'bonusfatto_service_entry';
const REPORT_ENTRY = 'bonusfatto_report_entry';
const REPORT_ANALYSIS = 'bonusfatto_report_analysis';
const PAID_REPORT_SESSION = 'bonusfatto_paid_report_session';

function safeParse(value, fallback = null) {
  try { return JSON.parse(value); } catch { return fallback; }
}

function Loading({ error = '' }) {
  return <div className="bfs-shell">
    <main className="bfs-main">
      <section className="bfs-confirmation">
        <div className="bfs-success-icon">{error ? '!' : '✓'}</div>
        <span className="bfs-eyebrow">BONUSFATTO.IT</span>
        <h1>{error ? 'Non riusciamo a verificare il pagamento.' : 'Pagamento ricevuto.'}</h1>
        <p>{error || 'Stiamo aprendo il servizio acquistato…'}</p>
        {error && <div className="bfs-confirm-actions"><a className="bfs-primary-link" href="/">Torna alla Home</a></div>}
      </section>
    </main>
  </div>;
}

function patchReportProductionText() {
  const pill = document.querySelector('.bfq-test-pill');
  if (pill) pill.textContent = '6,90 € · una tantum';

  document.querySelectorAll('.eyebrow').forEach((node) => {
    node.textContent = node.textContent
      .replace('RISULTATO COMPLETO · TEST GRATUITO', 'RISULTATO COMPLETO')
      .replace('ANALISI CON RELAZIONE · TEST GRATUITO', 'ANALISI CON RELAZIONE');
  });

  const small = document.querySelector('.bfq-download-hero small');
  if (small) small.textContent = 'Relazione personalizzata · PDF definitivo';
}

export function ProductionReportFlow({ paidSessionId = '' }) {
  const effectiveSession = paidSessionId || window.sessionStorage.getItem(PAID_REPORT_SESSION) || '';

  useEffect(() => {
    if (paidSessionId) window.sessionStorage.setItem(PAID_REPORT_SESSION, paidSessionId);

    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, init = {}) => {
      const url = typeof input === 'string' ? input : input?.url || '';
      if (url === '/api/report-test' && String(init?.method || 'GET').toUpperCase() === 'POST') {
        const sessionId = paidSessionId || window.sessionStorage.getItem(PAID_REPORT_SESSION) || '';
        if (sessionId) {
          const currentBody = safeParse(init?.body, {}) || {};
          return originalFetch(input, { ...init, body: JSON.stringify({ ...currentBody, sessionId }) });
        }
      }
      return originalFetch(input, init);
    };

    const interceptDownload = (event) => {
      const button = event.target?.closest?.('.bfq-download-hero');
      if (!button) return;
      const sessionId = paidSessionId || window.sessionStorage.getItem(PAID_REPORT_SESSION) || '';
      if (sessionId) return;

      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();

      const analysis = safeParse(window.sessionStorage.getItem(REPORT_ANALYSIS), null);
      const entry = safeParse(window.sessionStorage.getItem(REPORT_ENTRY), {}) || {};
      if (!analysis?.input) {
        window.location.assign('/');
        return;
      }
      openBillingForm('report', {
        comune: analysis.input?.municipality?.name || entry.comune || '',
        isee: Number(analysis.input?.isee) || Number(entry.isee) || 0,
        figli: Number(analysis.input?.children) || Number(entry.figli) || 0,
        profile: analysis.profile || analysis.input?.profile || {},
      });
    };

    document.addEventListener('click', interceptDownload, true);
    patchReportProductionText();
    const observer = new MutationObserver(patchReportProductionText);
    observer.observe(document.documentElement, { childList: true, subtree: true });

    const originalAnchorClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function productionAnchorClick() {
      if (this.download?.includes('_TEST')) this.download = this.download.replace('_TEST', '');
      return originalAnchorClick.call(this);
    };

    return () => {
      document.removeEventListener('click', interceptDownload, true);
      observer.disconnect();
      window.fetch = originalFetch;
      HTMLAnchorElement.prototype.click = originalAnchorClick;
    };
  }, [paidSessionId]);

  return <IseeReportFlowFinal />;
}

export default function PaidServiceRouter({ sessionId }) {
  const [state, setState] = useState({ loading: true, error: '', plan: '', entry: null });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [verifyResponse, orderResponse] = await Promise.all([
          fetch(`/api/verify-checkout?session_id=${encodeURIComponent(sessionId)}`, { credentials: 'same-origin' }),
          fetch(`/api/order-summary?session_id=${encodeURIComponent(sessionId)}`, { credentials: 'same-origin' }),
        ]);
        const verified = await verifyResponse.json().catch(() => ({}));
        const order = await orderResponse.json().catch(() => ({}));
        if (!verifyResponse.ok || !verified?.paid) throw new Error(verified?.error || 'Pagamento non verificato.');
        if (!orderResponse.ok) throw new Error(order?.error || 'Dati dell’ordine non disponibili.');

        const entry = {
          comune: verified.comune,
          isee: Number(verified.isee) || 0,
          figli: Number(verified.figli) || 0,
          sessionId,
          orderCode: order.order_code || '',
          customerName: order.customer_name || '',
          customerSurname: order.customer_surname || '',
          customerEmail: order.customer_email || '',
          fiscalCode: order.fiscal_code || '',
          billingAddress: order.billing_address || '',
          billingZip: order.billing_zip || '',
          billingCity: order.billing_city || verified.comune || '',
          billingProvince: order.billing_province || '',
          pec: order.pec || '',
        };

        window.sessionStorage.setItem(SERVICE_ENTRY, JSON.stringify(entry));
        if (verified.plan === 'report') {
          const previous = safeParse(window.sessionStorage.getItem(REPORT_ENTRY), {}) || {};
          window.sessionStorage.setItem(REPORT_ENTRY, JSON.stringify({ ...previous, ...entry }));
          window.sessionStorage.setItem(PAID_REPORT_SESSION, sessionId);
        }

        if (active) setState({ loading: false, error: '', plan: verified.plan, entry });
      } catch (error) {
        if (active) setState({ loading: false, error: error?.message || 'Pagamento non verificabile.', plan: '', entry: null });
      }
    })();
    return () => { active = false; };
  }, [sessionId]);

  if (state.loading) return <Loading />;
  if (state.error) return <Loading error={state.error} />;
  if (state.plan === 'base') return <QuickAnalysisTestFlow />;
  if (state.plan === 'tari') return <TariPecTestFlowConnected />;
  if (state.plan === 'whatsapp') return <ServiceTestFlow />;
  if (state.plan === 'report') return <ProductionReportFlow paidSessionId={sessionId} />;
  return <Loading error="Servizio acquistato non riconosciuto." />;
}
