const IPA_BASE = 'https://indicepa.gov.it/ipa-dati/api/3/action/datastore_search';
const RES_ENTI = 'd09adf99-dc10-4349-8c53-27b1e5aa97b6';
const RES_UO = 'b0aa1f6c-f135-4c8a-b416-396fed4e1a5d';
const RES_PEC = 'ef44cd11-74e2-457c-b425-4812dc102d18';

function clean(value, max = 180) {
  return String(value ?? '').trim().slice(0, max);
}

function norm(value = '') {
  return String(value)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

async function search(resourceId, q, limit = 100) {
  const url = new URL(IPA_BASE);
  url.searchParams.set('resource_id', resourceId);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('q', q);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    const data = await response.json();
    if (!response.ok || !data?.success) throw new Error('IndicePA non disponibile.');
    return Array.isArray(data?.result?.records) ? data.result.records : [];
  } finally {
    clearTimeout(timer);
  }
}

function pecFromUo(record) {
  const out = [];
  for (let i = 1; i <= 5; i += 1) {
    const mail = clean(record[`Mail${i}`], 256).toLowerCase();
    const type = norm(record[`Tipo_Mail${i}`]);
    if (mail && type === 'pec') out.push(mail);
  }
  return out;
}

function labelFromUo(record) {
  const keys = Object.keys(record || {}).filter((key) => /descr|denomin|nome|codice_uo/i.test(key));
  return keys.map((key) => clean(record[key], 220)).filter(Boolean).join(' · ');
}

function scoreOffice(label) {
  const text = norm(label);
  if (/tribut|tari/.test(text)) return 100;
  if (/entrate|fiscal/.test(text)) return 85;
  if (/finanz|ragion/.test(text)) return 45;
  return 0;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Metodo non consentito.' });
  }

  const comune = clean(req.query?.comune, 120);
  if (!comune) return res.status(400).json({ error: 'Comune mancante.' });

  try {
    const entityRows = await search(RES_ENTI, `Comune di ${comune}`, 40);
    const target = norm(`Comune di ${comune}`);
    const fallbackTarget = norm(comune);
    const entity = entityRows
      .map((row) => {
        const den = norm(row.Denominazione_ente);
        const score = den === target ? 100 : (den.includes(fallbackTarget) && /comune/.test(den) ? 60 : 0);
        return { row, score };
      })
      .sort((a, b) => b.score - a.score)[0]?.row;

    if (!entity?.Codice_IPA) {
      return res.status(200).json({ found: false, comune, source: 'IndicePA', confidence: 'none', message: 'Comune non individuato automaticamente in IndicePA.' });
    }

    const code = clean(entity.Codice_IPA, 100);
    const uoRows = (await search(RES_UO, code, 250)).filter((row) => clean(row.Codice_IPA, 100) === code);
    const dedicated = [];
    for (const row of uoRows) {
      const label = labelFromUo(row);
      const score = scoreOffice(label);
      for (const pec of pecFromUo(row)) dedicated.push({ pec, label, score });
    }
    dedicated.sort((a, b) => b.score - a.score);
    if (dedicated[0]?.score >= 85) {
      return res.status(200).json({
        found: true,
        comune,
        pec: dedicated[0].pec,
        office: dedicated[0].label || 'Ufficio Tributi / Entrate',
        confidence: 'high',
        source: 'IndicePA',
        codiceIpa: code,
        entity: clean(entity.Denominazione_ente, 300),
        updatedAt: clean(entity.Data_aggiornamento, 20),
      });
    }

    const entityPecs = [];
    for (let i = 1; i <= 5; i += 1) {
      const mail = clean(entity[`Mail${i}`], 256).toLowerCase();
      const type = norm(entity[`Tipo_Mail${i}`]);
      if (mail && type === 'pec') entityPecs.push(mail);
    }
    if (entityPecs.length) {
      return res.status(200).json({
        found: true,
        comune,
        pec: entityPecs[0],
        office: 'PEC istituzionale del Comune',
        confidence: 'medium',
        source: 'IndicePA',
        codiceIpa: code,
        entity: clean(entity.Denominazione_ente, 300),
        updatedAt: clean(entity.Data_aggiornamento, 20),
      });
    }

    const pecRows = (await search(RES_PEC, code, 120)).filter((row) => clean(row.Codice_IPA, 100) === code && clean(row.pec, 256));
    if (pecRows.length) {
      return res.status(200).json({
        found: true,
        comune,
        pec: clean(pecRows[0].pec, 256).toLowerCase(),
        office: 'PEC pubblicata per il Comune',
        confidence: 'medium',
        source: 'IndicePA',
        codiceIpa: code,
        entity: clean(entity.Denominazione_ente, 300),
        updatedAt: clean(pecRows[0].Data_aggiornamento || entity.Data_aggiornamento, 20),
      });
    }

    return res.status(200).json({ found: false, comune, source: 'IndicePA', confidence: 'none', codiceIpa: code, entity: clean(entity.Denominazione_ente, 300), message: 'PEC non individuata automaticamente: la pratica richiede verifica manuale.' });
  } catch (error) {
    console.error('IndicePA PEC lookup failed', error?.message || error);
    return res.status(200).json({ found: false, comune, source: 'IndicePA', confidence: 'error', message: 'Ricerca IndicePA temporaneamente non disponibile: nessun invio verrà effettuato senza verifica.' });
  }
}
