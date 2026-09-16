const ENTRY_KEY = 'bonusfatto_report_entry';
const VERIFIED_KEY = 'bonusfatto_isee_verified';

function readJson(key) {
  try {
    return JSON.parse(sessionStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
}

function money(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value ?? '');
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number);
}

function findIseeInput() {
  const labels = Array.from(document.querySelectorAll('label'));
  const label = labels.find((node) => /Valore ISEE 2026/i.test(node.textContent || ''));
  return label?.querySelector('input[type="number"]') || null;
}

function applyAuthorityCheck() {
  if (new URLSearchParams(window.location.search).get('isee_preview') !== '1') return;

  const input = findIseeInput();
  if (!input || input.dataset.iseeAuthorityApplied === '1') return;

  const attestationValue = Number(input.value);
  if (!Number.isFinite(attestationValue) || attestationValue < 0) return;

  const entry = readJson(ENTRY_KEY) || {};
  const manualValue = Number(entry.isee);
  const manualValid = Number.isFinite(manualValue) && manualValue >= 0;
  const mismatch = manualValid && Math.abs(manualValue - attestationValue) > 0.009;

  input.readOnly = true;
  input.setAttribute('aria-readonly', 'true');
  input.dataset.iseeAuthorityApplied = '1';
  input.title = 'Valore letto dall’attestazione ISEE: non modificabile';

  const parent = input.closest('label') || input.parentElement;
  if (parent && !parent.querySelector('.bf-isee-authority-note')) {
    const note = document.createElement('div');
    note.className = 'bf-isee-authority-note tari-local-status';
    note.style.marginTop = '10px';
    note.style.lineHeight = '1.5';
    if (mismatch) {
      note.innerHTML = `<strong>ISEE verificato sull’attestazione: ${money(attestationValue)}</strong><br>Il valore inserito inizialmente era ${money(manualValue)}. Per l’analisi, il checkout e la relazione useremo il valore dell’attestazione.`;
    } else if (manualValid) {
      note.innerHTML = `<strong>ISEE verificato: ${money(attestationValue)}</strong><br>Il valore dell’attestazione coincide con quello inserito inizialmente.`;
    } else {
      note.innerHTML = `<strong>ISEE verificato sull’attestazione: ${money(attestationValue)}</strong><br>Questo è il valore utilizzato per l’analisi, il checkout e la relazione.`;
    }
    parent.appendChild(note);
  }

  sessionStorage.setItem(ENTRY_KEY, JSON.stringify({ ...entry, isee: attestationValue }));
  sessionStorage.setItem(VERIFIED_KEY, JSON.stringify({
    manualIsee: manualValid ? manualValue : null,
    attestationIsee: attestationValue,
    mismatch,
    verifiedAt: new Date().toISOString(),
  }));
}

if (typeof window !== 'undefined') {
  const observer = new MutationObserver(applyAuthorityCheck);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('load', applyAuthorityCheck, { once: true });
  applyAuthorityCheck();
}
