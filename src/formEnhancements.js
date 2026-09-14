import { fetchMunicipalities, normalizeText } from './geography.js';

let municipalityRowsPromise;

function getMunicipalityRows() {
  if (!municipalityRowsPromise) municipalityRowsPromise = fetchMunicipalities().catch(() => []);
  return municipalityRowsPromise;
}

function findMunicipality(items, name, province = '') {
  const target = normalizeText(name || '');
  const matches = items.filter((item) => normalizeText(item.name) === target);
  if (!matches.length) return null;
  return province ? (matches.find((item) => item.code === province.toUpperCase()) || matches[0]) : matches[0];
}

export function formEnhancementsReady() {
  return Boolean(fetchMunicipalities && normalizeText);
}
