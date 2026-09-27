import top100 from '../../lib/top100Comuni.json' with { type: 'json' };

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  const raw = Array.isArray(req.query?.istat) ? req.query.istat[0] : req.query?.istat;
  const istat = String(raw || '').trim();

  if (!/^\d{6}$/.test(istat)) {
    return res.status(400).json({ ok: false, error: 'ISTAT_INVALIDO' });
  }

  const comune = top100.find((item) => item.istat === istat);
  if (!comune) {
    return res.status(404).json({ ok: false, error: 'COMUNE_NON_IN_TOP100' });
  }

  return res.status(200).json({
    ok: true,
    available: true,
    comune: {
      nome: comune.nome,
      istat: comune.istat,
      provincia: comune.provincia,
      regione: comune.regione,
      abitanti: comune.abitanti,
      url_mef: comune.url_mef,
      url_albo: comune.url_albo
    },
    data: {
      scadenza_rata_1: '2026-11-30',
      scadenza_rata_2: null,
      riduzione_isee_9796: 25,
      url_fonte: comune.url_mef,
      verified: false,
      source: 'STATIC_PLACEHOLDER'
    }
  });
}
