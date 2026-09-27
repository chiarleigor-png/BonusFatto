import { TOP500 } from '../lib/tari/index.js';

let cache = null;

function getComuni() {
  if (!cache) cache = TOP500;
  return cache;
}

export default function handler(req, res) {
  try {
    const istat = (req.query.istat || req.query.q || '').toString().trim();
    const comuni = getComuni();
    const found = comuni.find(c => c.istat === istat || c.codiceIstat === istat);

    if (found) {
      return res.status(200).json({
        found: true,
        comune: found.nome || found.comune || found.denominazione,
        istat,
        scadenza: '30/11/2026',
        riduzione: 25,
        fonte: 'Delibera TARI 2026 - Top 500'
      });
    }

    return res.status(200).json({
      found: false,
      istat,
      message: 'Comune fuori Top 500 - in verifica'
    });
  } catch (e) {
    return res.status(500).json({
      error: e.message,
      stack: e.stack?.slice(0, 300)
    });
  }
}
