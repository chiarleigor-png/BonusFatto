import { useEffect, useRef, useState } from 'react';
import AppV2 from './AppV2.jsx';

const PROFILE_KEY = 'bonusfatto_profile_2026';

export default function AppV3() {
  const [questionnaire, setQuestionnaire] = useState(null);
  const bypassRef = useRef(false);
  const pendingFormRef = useRef(null);

  useEffect(() => {
    function attachGate() {
      const form = document.querySelector('.form-card form');
      if (!form || form.dataset.bfQuestionnaireGate === 'true') return;

      const handler = (event) => {
        if (bypassRef.current) {
          bypassRef.current = false;
          return;
        }

        const iseeInput = form.querySelector('.income-fields input[type="number"]');
        const childSelect = [...form.querySelectorAll('.income-fields select')][0];
        const isee = Number(iseeInput?.value);
        const children = Number(childSelect?.value);

        if (!iseeInput?.value.trim() || !Number.isFinite(isee) || isee < 0 || !Number.isInteger(children)) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        pendingFormRef.current = form;
        setQuestionnaire({ children });
      };

      form.dataset.bfQuestionnaireGate = 'true';
      form.addEventListener('submit', handler);
    }

    attachGate();
    const observer = new MutationObserver(attachGate);
    observer.observe(document.documentElement, { childList: true, subtree: true });

    const onMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'bonusfatto-profile-2026' || !event.data.profile) return;

      try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(event.data.profile));
      } catch {
        window.__bonusFattoProfile2026 = event.data.profile;
      }

      setQuestionnaire(null);
      requestAnimationFrame(() => {
        const form = pendingFormRef.current;
        if (!form) return;
        bypassRef.current = true;
        form.requestSubmit();
      });
    };

    window.addEventListener('message', onMessage);
    return () => {
      observer.disconnect();
      window.removeEventListener('message', onMessage);
    };
  }, []);

  return (
    <>
      <AppV2 />
      {questionnaire && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(27,32,26,.58)', backdropFilter: 'blur(6px)', display: 'grid', placeItems: 'center', padding: 12 }} role="dialog" aria-modal="true" aria-label="Questionario BonusFatto">
          <div style={{ width: 'min(900px, 100%)', height: 'min(92vh, 980px)', position: 'relative', borderRadius: 28, overflow: 'hidden', background: '#f7f4ec', boxShadow: '0 30px 100px rgba(0,0,0,.28)' }}>
            <button
              type="button"
              onClick={() => setQuestionnaire(null)}
              aria-label="Chiudi questionario"
              style={{ position: 'absolute', top: 14, right: 14, zIndex: 2, width: 40, height: 40, borderRadius: 999, border: '1px solid #dfe3d9', background: '#fff', color: '#20231f', fontSize: 22, cursor: 'pointer', boxShadow: '0 4px 18px rgba(0,0,0,.08)' }}
            >×</button>
            <iframe
              title="Questionario profilo bonus 2026"
              src={`/questionario-test/?children=${encodeURIComponent(questionnaire.children)}&embedded=1`}
              style={{ width: '100%', height: '100%', border: 0, background: '#f7f4ec' }}
            />
          </div>
        </div>
      )}
    </>
  );
}
