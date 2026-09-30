const MEF_BASE = 'https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/nuova_at';
const YEAR = 2026;

export function buildMefUrl(codiceCatastale) {
  const cc = encodeURIComponent(String(codiceCatastale || '').trim().toUpperCase());
  return `${MEF_BASE}/risultato.htm?DOWNLOAD=Procedi&annosel=${YEAR}&cc=${cc}&lista=1&pagina=sceltaregione.htm&r=2&tipo_trib=tutti`;
}

function absoluteUrl(href) {
  if (!href) return '';
  if (/^https?:\/\//i.test(href)) return href;
  return new URL(href, `${MEF_BASE}/`).href;
}

function stripTags(value = '') {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseTariPage(html, mefUrl) {
  const text = stripTags(html);
  const tariIndex = text.toUpperCase().indexOf('TARI');
  const hasTari = tariIndex >= 0 && !/non ci sono (delibere|documenti).*TARI/i.test(text);

  const links = [];
  const seen = new Set();
  const re = /href=["']([^"']*download_lib\.php[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = re.exec(html))) {
    const url = absoluteUrl(match[1]);
    const label = stripTags(match[2]);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    links.push({ url, label });
  }

  const tariLinks = links.filter((item) => /DIMUNIC|CIMUNIC|TARI|\.pdf/i.test(item.label + ' ' + item.url));

  const dates = [...text.matchAll(/\b(\d{2}-\d{2}-\d{4})\b/g)].map((m) => m[1]);
  const publicationDate = dates.length ? dates[dates.length - 1] : null;

  return {
    found: hasTari && tariLinks.length > 0,
    mefUrl,
    documents: tariLinks,
    publicationDate,
  };
}

export async function fetchTariForMunicipality({ codiceCatastale, codice_catastale, timeoutMs = 9000 }) {
  const cadastralCode = codiceCatastale || codice_catastale;
  if (!cadastralCode) return { found: false, reason: 'missing_codice_catastale', documents: [] };

  const mefUrl = buildMefUrl(cadastralCode);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(mefUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'BonusFatto.it TARI indexer/1.0 (+https://www.bonusfatto.it/)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!response.ok) {
      return { found: false, reason: `http_${response.status}`, mefUrl, documents: [] };
    }
    const html = await response.text();
    return parseTariPage(html, mefUrl);
  } finally {
    clearTimeout(timer);
  }
}
