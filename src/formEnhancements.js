import { fetchMunicipalities, normalizeText } from './geography.js';

export function formEnhancementsReady() {
  return Boolean(fetchMunicipalities && normalizeText);
}
