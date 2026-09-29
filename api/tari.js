import { TOP500 } from '../lib/tari/index.js';
import { getByIstat, isSupabaseConfigured } from '../lib/tari/supabase.js';

let cache = null;

function getComuni() {
  if (!cache) cache = TOP500;
  return cache;
}

export default async function handler(req, res) {
  try {
    const istat = (req.query.istat || req.query.q || '').toString().trim();

    if (isSupabaseConfigured() && istat) {
      try {
        const live = await getByIstat(istat);
        if (live?.status === 'found') {
          return res.status(200).json({
            found: true,
            comune: live.nome,
            istat,
            scadenza: live.scadenza || '30/11/2026',
            riduzione: live.riduzione ?? 25,
            fonte: live.source_label || 'MEF - Fiscalità locale - TARI 2026',
            mefUrl: live.mef_url || undefined,
            documents: Array.isArray(live.documents) ? live.documents : [],
            indexed: true,
          });
        }
        if (live && (live.status === 'pending' || live.status === 'error' || live.status === 'no_document')) {
          return res.status(200).json({
            found: false,
            istat,
            status: live.status,
            message: live.status === 'no_document'
              ? 'Delibera TARI 2026 non ancora disponibile nel portale MEF'
              : 'Comune in indicizzazione TARI',
          });
        }
      } catch (error) {
        console.warn('[TARI_SUPABASE_FALLBACK]', error?.message || error);
      }
    }

    const comuni = getComuni();
    const found = comuni.find(c => c.istat === istat || c.codiceIstat === istat);

    if (found) {
      return res.status(200).json({
        found: true,
        comune: found.nome || found.comune || found.denominazione,
        istat,
        scadenza: '30/11/2026',
        riduzione: 25,
        fonte: 'Delibera TARI 2026 - Top 500',
        indexed: false,
      });
    }

    return res.status(200).json({
      found: false,
      istat,
      message: 'Comune fuori dataset locale - in indicizzazione nazionale'
    });
  } catch (e) {
    return res.status(500).json({
      error: e.message,
      stack: e.stack?.slice(0, 300)
    });
  }
}
