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

async function fillAddressDefaults(form) {
  const comune = form.elements.comuneFatturazione;
  const provincia = form.elements.provincia;
  const cap = form.elements.cap;
  if (!comune || !provincia || !cap) return;
  const municipality = findMunicipality(await getMunicipalityRows(), comune.value, provincia.value);
  if (!municipality) return;
  if (!provincia.value && municipality.code) provincia.value = municipality.code;
  const caps = municipality.caps || [];
  if (caps.length === 1 && !cap.value) {
    cap.value = caps[0];
    cap.title = 'CAP compilato automaticamente dal Comune selezionato';
  } else if (caps.length > 1 && !cap.value) {
    cap.placeholder = `CAP disponibili: ${caps.slice(0, 4).join(', ')}`;
    cap.title = 'Il Comune ha più CAP: inserisci quello corretto per l’indirizzo.';
  }
}

export function formEnhancementsReady() {
  return Boolean(fetchMunicipalities && normalizeText);
}
