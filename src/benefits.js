import { calculate as calculateCore } from './benefitsCore.js';
export * from './benefitsCore.js';

function round1(value) {
  return Math.round(Number(value) * 10) / 10;
}

function formatEuro(value) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(value);
}

function auuMinorBase(isee) {
  const minIsee = 17468.51, maxIsee = 46582.71, maxAmount = 203.8, minAmount = 58.3;
  if (isee <= minIsee) return maxAmount;
  if (isee >= maxIsee) return minAmount;
  const ratio = (isee - minIsee) / (maxIsee - minIsee);
  return round1(maxAmount - (maxAmount - minAmount) * ratio);
}

function auuYoungAdultBase(isee) {
  const minIsee = 17468.51, maxIsee = 46582.71, maxAmount = 99.1, minAmount = 29.1;
  if (isee <= minIsee) return maxAmount;
  if (isee >= maxIsee) return minAmount;
  const ratio = (isee - minIsee) / (maxIsee - minIsee);
  return round1(maxAmount - (maxAmount - minAmount) * ratio);
}

function correctSingleMemberAdi(benefit, profile = {}) {
  const household = Math.max(1, Number(profile.household) || 1);
  if (benefit.id !== 'adi' || household !== 1) return benefit;

  const income = Number(profile.adiFamilyIncome);
  if (!Number.isFinite(income)) return benefit;

  const scale = 1;
  const incomeThreshold = 6500 * scale;
  const incomePart = Math.max(480, incomeThreshold - income);
  const rentPart = profile.housing === 'rent'
    ? Math.min(Math.max(0, Number(profile.annualRent) || 0), 3640)
    : 0;
  const monthly = round1((incomePart + rentPart) / 12);

  return {
    ...benefit,
    amount: monthly,
    period: 'al mese · stima',
    description: `Il profilo supera i controlli raccolti dal questionario. Per un nucleo composto da una sola persona la scala di equivalenza ADI utilizzata è 1,00. Sulla base del reddito familiare dichiarato, il beneficio mensile stimato è ${formatEuro(monthly)}${rentPart ? `, inclusa una quota affitto fino a ${formatEuro(rentPart)} annui` : ''}. L’INPS effettua comunque la verifica amministrativa definitiva.`
  };
}

function correctAuu(benefits, input, profile = {}) {
  const ages = Array.isArray(profile.childAges) ? profile.childAges.map(Number).filter(Number.isFinite) : [];
  const minorCount = ages.length ? ages.filter(age => age < 18).length : Math.max(0, Number(input?.children) || 0);
  const youngAdultCount = Math.max(0, Number(profile.auuYoungAdultEligibleCount) || 0);
  if (minorCount === 0 && youngAdultCount === 0) return benefits;

  const familyIsee = Number(profile.familyIsee);
  const iseeForAuu = Number.isFinite(familyIsee) ? familyIsee : Number(input?.isee);
  if (!Number.isFinite(iseeForAuu)) return benefits;

  const minorPer = auuMinorBase(iseeForAuu);
  const adultPer = auuYoungAdultBase(iseeForAuu);
  const monthly = round1(minorPer * minorCount + adultPer * youngAdultCount);
  const parts = [];
  if (minorCount) parts.push(`${minorCount} ${minorCount === 1 ? 'figlio minore' : 'figli minori'} (${formatEuro(minorPer)} ciascuno)`);
  if (youngAdultCount) parts.push(`${youngAdultCount} ${youngAdultCount === 1 ? 'figlio 18–20 anni' : 'figli 18–20 anni'} con requisiti confermati (${formatEuro(adultPer)} ciascuno)`);

  const corrected = {
    id: 'children',
    name: 'Assegno unico e universale (AUU) 2026',
    category: 'Famiglia',
    amount: monthly,
    period: 'al mese · quota base',
    description: `Per ISEE ${formatEuro(iseeForAuu)}, la quota base AUU 2026 stimata è ${formatEuro(monthly)} al mese: ${parts.join(' + ')}. Eventuali maggiorazioni ulteriori non sono incluse in questa quota base.`,
    eligibility: 'spetta-profilo',
    amountType: 'quota-base',
    countInTotal: false,
    sourceUrl: 'https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.assegno-unico-e-universale-per-i-figli-a-carico-55984.assegno-unico-e-universale-per-i-figli-a-carico.html'
  };
  const index = benefits.findIndex(benefit => benefit.id === 'children');
  if (index >= 0) return benefits.map((benefit, i) => i === index ? { ...benefit, ...corrected } : benefit);
  return [...benefits, corrected];
}

function correctTari(benefit, base, input) {
  if (benefit.id === 'tari') {
    return {
      ...benefit,
      amount: 'spetta',
      displayAmount: 'Riduzione 25%',
      period: 'sulla TARI dovuta',
      amountType: 'percentuale',
      description: 'Il profilo economico rientra nella soglia prevista per il bonus sociale rifiuti. Il beneficio corrisponde al 25% della TARI effettivamente dovuta.'
    };
  }
  if (String(benefit.id || '').startsWith('tari-local-')) {
    const percent = Number(base?.tariLocalPercent);
    const municipality = input?.municipality?.name || '';
    return {
      ...benefit,
      amount: 'compatibile',
      displayAmount: Number.isFinite(percent) ? `Riduzione ${percent}%` : 'Riduzione comunale',
      period: 'agevolazione comunale 2026',
      amountType: 'percentuale',
      description: Number.isFinite(percent)
        ? `Per la fascia ISEE indicata risulta una riduzione comunale 2026 del ${percent}% nel Comune di ${municipality}.`
        : `Per la fascia ISEE indicata risulta un’agevolazione TARI comunale 2026 nel Comune di ${municipality}.`
    };
  }
  return benefit;
}

export function calculate(input) {
  const base = calculateCore(input);
  const profile = input?.profile && typeof input.profile === 'object' ? input.profile : (base.profile || {});

  let benefits = base.benefits.map((benefit) => correctSingleMemberAdi(benefit, profile));
  benefits = correctAuu(benefits, input, profile);
  benefits = benefits.map((benefit) => correctTari(benefit, base, input));

  const hasAdi = benefits.some((benefit) => benefit.id === 'adi');
  if (hasAdi && profile.sflSeparateEligible !== 'yes') {
    benefits = benefits.filter((benefit) => benefit.id !== 'sfl');
  }

  return {
    ...base,
    benefits,
    conditional: benefits
      .filter((benefit) => !benefit.countInTotal && Number.isFinite(Number(benefit.amount)) && Number(benefit.amount) > 0)
      .reduce((sum, benefit) => sum + Number(benefit.amount), 0)
  };
}
