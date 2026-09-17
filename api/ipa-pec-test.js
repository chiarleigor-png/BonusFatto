const IPA_BASE = 'https://indicepa.gov.it/ipa-dati/api/3/action/datastore_search';
const RES_ENTI = 'd09adf99-dc10-4349-8c53-27b1e5aa97b6';
const RES_UO = 'b0aa1f6c-f135-4c8a-b416-396fed4e1a5d';
const RES_PEC = 'ef44cd11-74e2-457c-b425-4812dc102d18';

const PROVINCE_BY_ISTAT = {
  '001':'TO','002':'VC','003':'NO','004':'CN','005':'AT','006':'AL','007':'AO','008':'IM','009':'SV','010':'GE','011':'SP',
  '012':'VA','013':'CO','014':'SO','015':'MI','016':'BG','017':'BS','018':'PV','019':'CR','020':'MN','021':'BZ','022':'TN',
  '023':'VR','024':'VI','025':'BL','026':'TV','027':'VE','028':'PD','029':'RO','030':'UD','031':'GO','032':'TS','033':'PC',
  '034':'PR','035':'RE','036':'MO','037':'BO','038':'FE','039':'RA','040':'FC','041':'PU','042':'AN','043':'MC','044':'AP',
  '045':'MS','046':'LU','047':'PT','048':'FI','049':'LI','050':'PI','051':'AR','052':'SI','053':'GR','054':'PG','055':'TR',
  '056':'VT','057':'RI','058':'RM','059':'LT','060':'FR','061':'CE','062':'BN','063':'NA','064':'AV','065':'SA','066':'AQ',
  '067':'TE','068':'PE','069':'CH','070':'CB','071':'FG','072':'BA','073':'TA','074':'BR','075':'LE','076':'PZ','077':'MT',
  '078':'CS','079':'CZ','080':'RC','081':'TP','082':'PA','083':'ME','084':'AG','085':'CL','086':'EN','087':'CT','088':'RG',
  '089':'SR','090':'SS','091':'NU','092':'CA','093':'PN','094':'IS','095':'OR','096':'BI','097':'LC','098':'LO','099':'RN',
  '100':'PO','101':'KR','102':'VV','103':'VB','104':'OT','105':'OG','106':'VS','107':'CI','108':'MB','109':'FM','110':'BT',
  '111':'SU','112':'SS','113':'OT','114':'NU','115':'OR','116':'OG','117':'VS','118':'CA','119':'SU',
};

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

function municipalityMeta(entity) {
  const istat = clean(entity?.Codice_comune_ISTAT, 6);
  return {
    cap: clean(entity?.CAP, 5),
    provincia: PROVINCE_BY_ISTAT[istat.slice(0, 3)] || '',
    codiceComuneIstat: istat,
  };
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
  const metadataOnly = clean(req.query?.metadata, 10) === '1';
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
    const meta = municipalityMeta(entity);

    if (metadataOnly) {
      return res.status(200).json({
        found: true,
        comune,
        source: 'IndicePA',
        codiceIpa: code,
        entity: clean(entity.Denominazione_ente, 300),
        updatedAt: clean(entity.Data_aggiornamento, 20),
        ...meta,
      });
    }

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
        ...meta,
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
        ...meta,
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
        ...meta,
      });
    }

    return res.status(200).json({
      found: false,
      comune,
      source: 'IndicePA',
      confidence: 'none',
      codiceIpa: code,
      entity: clean(entity.Denominazione_ente, 300),
      message: 'PEC non individuata automaticamente: la pratica richiede verifica manuale.',
      ...meta,
    });
  } catch (error) {
    console.error('IndicePA PEC lookup failed', error?.message || error);
    return res.status(200).json({ found: false, comune, source: 'IndicePA', confidence: 'error', message: 'Ricerca IndicePA temporaneamente non disponibile: nessun invio verrà effettuato senza verifica.' });
  }
}
