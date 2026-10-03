import React, { useEffect, useState } from 'react';
import {
  acceptAllConsent,
  CONSENT_EVENT,
  readConsent,
  rejectOptionalConsent,
  saveConsent,
} from './consent.js';

export default function ConsentManager() {
  const initial = readConsent();
  const [consent, setConsent] = useState(initial);
  const [open, setOpen] = useState(!initial.decided);
  const [preferences, setPreferences] = useState(false);
  const [analytics, setAnalytics] = useState(initial.analytics);
  const [marketing, setMarketing] = useState(initial.marketing);

  useEffect(() => {
    const onChange = (event) => {
      setConsent(event.detail);
      setAnalytics(event.detail.analytics);
      setMarketing(event.detail.marketing);
      setOpen(false);
      setPreferences(false);
    };
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);

  const savePreferences = () => {
    saveConsent({ analytics, marketing });
  };

  if (!open) {
    return (
      <button
        type="button"
        className="cmp-reopen"
        onClick={() => {
          setAnalytics(consent.analytics);
          setMarketing(consent.marketing);
          setPreferences(true);
          setOpen(true);
        }}
        aria-label="Modifica preferenze cookie"
      >
        Preferenze cookie
      </button>
    );
  }

  return (
    <div className="cmp-overlay" role="presentation">
      <section
        className="cmp-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cmp-title"
        aria-describedby="cmp-description"
      >
        <div className="cmp-brand">BonusFatto.it</div>
        <h2 id="cmp-title">La tua privacy, prima di tutto</h2>
        <p id="cmp-description">
          Usiamo cookie e tecnologie simili per misurare l&apos;uso del sito e, con il tuo consenso,
          per la pubblicità e la misurazione delle campagne. I cookie necessari restano sempre attivi.
          Puoi accettare tutto, rifiutare i cookie opzionali o scegliere le categorie.
        </p>

        {preferences && (
          <div className="cmp-preferences">
            <div className="cmp-row">
              <div>
                <strong>Necessari</strong>
                <span>Funzionamento, sicurezza e memorizzazione delle tue preferenze.</span>
              </div>
              <span className="cmp-always">Sempre attivi</span>
            </div>
            <label className="cmp-row">
              <div>
                <strong>Analitici</strong>
                <span>Microsoft Clarity e misurazione statistica Google.</span>
              </div>
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
              />
            </label>
            <label className="cmp-row">
              <div>
                <strong>Marketing</strong>
                <span>Google Ads, Meta Pixel e misurazione delle conversioni pubblicitarie.</span>
              </div>
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
              />
            </label>
          </div>
        )}

        <div className="cmp-actions">
          <button type="button" className="cmp-button cmp-secondary" onClick={rejectOptionalConsent}>
            Rifiuta
          </button>
          {!preferences ? (
            <button type="button" className="cmp-button cmp-secondary" onClick={() => setPreferences(true)}>
              Personalizza
            </button>
          ) : (
            <button type="button" className="cmp-button cmp-secondary" onClick={savePreferences}>
              Salva preferenze
            </button>
          )}
          <button type="button" className="cmp-button cmp-primary" onClick={acceptAllConsent}>
            Accetta tutto
          </button>
        </div>

        <p className="cmp-note">
          Puoi modificare la scelta in qualsiasi momento tramite “Preferenze cookie”.
        </p>
      </section>
    </div>
  );
}
