import top100 from '../lib/top100Comuni.json';

const byName = new Map(top100.map((item) => [item.nome.toLocaleLowerCase('it'), item]));
const cache = new Map();

function normalizeName(value = '') { return String(value).trim().toLocaleLowerCase('it'); }
function currentComune() {
  for (const selector of ['.paywall-heading .lead', '.result-heading .lead']) {
    const text = document.querySelector(selector)?.textContent?.trim();
    if (!text) continue;
    const first = text.split('·')[0]?.trim();
    if (first) return first;
  }
  return '';
}
function fmtDate(value) {
  if (!value) return 'non pubblicata';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
}
async function load(entry) {
  if (!cache.has(entry.istat)) {
    cache.set(entry.istat, fetch(`/api/tari/${entry.istat}`, { headers: { accept: 'application/json' } }).then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'TARI API non disponibile');
      return data;
    }));
  }
  return cache.get(entry.istat);
}
function ensureStyle() {
  if (document.getElementById('bf-tari-live-style')) return;
  const style = document.createElement('style');
  style.id = 'bf-tari-live-style';
  style.textContent = `.bf-tari-live{max-width:980px;margin:16px auto;padding:18px 20px;border:1px solid #ddd5ee;border-radius:18px;background:#fff;box-shadow:0 10px 28px rgba(37,25,60,.06)}.bf-tari-live strong{color:#4c1d95}.bf-tari-live-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:12px}.bf-tari-live-item{padding:12px;border-radius:12px;background:#f8f6fc}.bf-tari-live-item span{display:block;font-size:11px;color:#756d7c;text-transform:uppercase;letter-spacing:.06em}.bf-tari-live-item b{display:block;margin-top:3px;color:#2f2935}.bf-tari-live a{color:#6d28d9;font-weight:800}.bf-tari-pending{color:#756d7c;font-size:13px}@media(max-width:700px){.bf-tari-live-grid{grid-template-columns:1fr}}`;
  document.head.appendChild(style);
}
async function enhance() {
  const shell = document.querySelector('.paywall-shell, .results');
  if (!shell || shell.dataset.tariLive === '1') return;
  const comune = currentComune();
  if (!comune) return;
  const entry = byName.get(normalizeName(comune));
  shell.dataset.tariLive = '1';
  ensureStyle();
  const card = document.createElement('section');
  card.className = 'bf-tari-live';
  const anchor = shell.querySelector('.paywall-heading, .result-heading');
  if (anchor) anchor.after(card); else shell.prepend(card);
  if (!entry) {
    card.innerHTML = '<strong>TARI comunale</strong><p class="bf-tari-pending">Questo Comune non rientra ancora nel motore TARI Top 100. Non mostriamo dati comunali stimati o inventati.</p>';
    return;
  }
  card.innerHTML = `<strong>TARI ${entry.nome} · fonte MEF</strong><p class="bf-tari-pending">Caricamento dati verificati…</p>`;
  try {
    const response = await load(entry);
    const data = response.data || {};
    const reduction = data.riduzione_isee_9796 == null ? 'non pubblicata' : `${Number(data.riduzione_isee_9796).toLocaleString('it-IT')}%`;
    card.innerHTML = `<strong>TARI ${entry.nome} · fonte MEF</strong><div class="bf-tari-live-grid"><div class="bf-tari-live-item"><span>1ª rata</span><b>${fmtDate(data.scadenza_rata_1)}</b></div><div class="bf-tari-live-item"><span>2ª rata</span><b>${fmtDate(data.scadenza_rata_2)}</b></div><div class="bf-tari-live-item"><span>Riduzione comunale a ISEE 9.796 €</span><b>${reduction}</b></div></div><p class="bf-tari-pending">${data.verified ? 'Dati estratti dal documento MEF e marcati come verificati dal motore.' : 'Fonte MEF acquisita; estrazione automatica ancora in verifica.'}${data.url_fonte ? ` · <a href="${data.url_fonte}" target="_blank" rel="noreferrer">Apri fonte ufficiale ↗</a>` : ''}</p>`;
  } catch {
    card.innerHTML = `<strong>TARI ${entry.nome} · fonte MEF</strong><p class="bf-tari-pending">Dati comunali temporaneamente non disponibili. <a href="${entry.url_mef}" target="_blank" rel="noreferrer">Consulta il portale MEF ↗</a></p>`;
  }
}
new MutationObserver(enhance).observe(document.documentElement, { subtree: true, childList: true });
enhance();
