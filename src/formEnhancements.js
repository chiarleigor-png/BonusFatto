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

function cleanName(value = '') {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z]/g, '');
}

function threeChars(value, isName = false) {
  const text = cleanName(value);
  const consonants = text.replace(/[AEIOU]/g, '');
  const vowels = text.replace(/[^AEIOU]/g, '');
  if (isName && consonants.length >= 4) return `${consonants[0]}${consonants[2]}${consonants[3]}`;
  return (consonants + vowels + 'XXX').slice(0, 3);
}

function checkChar(code) {
  const odd = [1,0,5,7,9,13,15,17,19,21,2,4,18,20,11,3,6,8,12,14,16,10,22,25,24,23];
  const digitOdd = [1,0,5,7,9,13,15,17,19,21];
  let total = 0;
  [...code].forEach((char, index) => {
    const isDigit = /\d/.test(char);
    const value = isDigit ? Number(char) : char.charCodeAt(0) - 65;
    total += index % 2 === 0 ? (isDigit ? digitOdd[value] : odd[value]) : value;
  });
  return String.fromCharCode(65 + (total % 26));
}

function makeFiscalCode({ nome, cognome, dataNascita, sesso, cadastralCode }) {
  const date = new Date(`${dataNascita}T12:00:00`);
  if (!nome || !cognome || Number.isNaN(date.getTime()) || !sesso || !cadastralCode) throw new Error('Completa tutti i dati anagrafici.');
  const months = 'ABCDEHLMPRST';
  const year = String(date.getFullYear()).slice(-2);
  const day = String(date.getDate() + (sesso === 'F' ? 40 : 0)).padStart(2, '0');
  const first15 = `${threeChars(cognome)}${threeChars(nome, true)}${year}${months[date.getMonth()]}${day}${cadastralCode.toUpperCase()}`;
  return first15 + checkChar(first15);
}

function addField(form, before, labelText, name, type = 'text', extra = '') {
  const label = document.createElement('label');
  label.innerHTML = `${labelText}<input type="${type}" name="${name}" ${extra} required />`;
  before.before(label);
  return label.querySelector('input');
}

function enhanceForm(form) {
  if (!form || form.dataset.bfAutoData) return;
  form.dataset.bfAutoData = 'true';
  const cf = form.elements.codiceFiscale;
  const cfLabel = cf?.closest('label');
  if (!cf || !cfLabel) return;

  const birthDate = addField(form, cfLabel, 'Data di nascita', 'dataNascita', 'date');
  const genderLabel = document.createElement('label');
  genderLabel.innerHTML = 'Sesso<select name="sesso" required><option value="">Seleziona</option><option value="M">M</option><option value="F">F</option></select>';
  cfLabel.before(genderLabel);
  const birthCity = addField(form, cfLabel, 'Comune di nascita', 'comuneNascita', 'text', 'autocomplete="off" placeholder="Es. Torino"');
  const birthProvince = addField(form, cfLabel, 'Provincia di nascita', 'provinciaNascita', 'text', 'maxlength="2" placeholder="TO"');

  const calcButton = document.createElement('button');
  calcButton.type = 'button';
  calcButton.className = 'secondary-action bf-cf-calc';
  calcButton.textContent = 'Calcola codice fiscale';
  cf.insertAdjacentElement('afterend', calcButton);
  const help = document.createElement('small');
  help.className = 'bf-cf-help';
  help.textContent = 'Per i nati all’estero inserisci direttamente il codice fiscale.';
  calcButton.insertAdjacentElement('afterend', help);

  calcButton.onclick = async () => {
    const municipality = findMunicipality(await getMunicipalityRows(), birthCity.value, birthProvince.value);
    if (!municipality?.cadastralCode) {
      help.textContent = 'Comune di nascita non trovato: controlla Comune e provincia oppure inserisci il codice fiscale manualmente.';
      return;
    }
    birthProvince.value = municipality.code || birthProvince.value;
    try {
      cf.value = makeFiscalCode({ nome: form.elements.nome.value, cognome: form.elements.cognome.value, dataNascita: birthDate.value, sesso: form.elements.sesso.value, cadastralCode: municipality.cadastralCode });
      help.textContent = 'Codice fiscale calcolato automaticamente. Verificalo prima di proseguire.';
    } catch (error) {
      help.textContent = error.message;
    }
  };

  fillAddressDefaults(form);
  form.elements.comuneFatturazione?.addEventListener('change', () => {
    if (form.elements.cap) form.elements.cap.value = '';
    fillAddressDefaults(form);
  });
}

function run() {
  document.querySelectorAll('.bf-billing-form').forEach(enhanceForm);
}

new MutationObserver(run).observe(document.documentElement, { childList: true, subtree: true });
run();
