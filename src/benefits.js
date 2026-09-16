import { calculate as calculateCore } from './benefitsCore.js';
export * from './benefitsCore.js';

function round1(value) {
  return Math.round(Number(value) * 10) / 10;
}

function correctSingleMemberAdi(benefit, profile = {}) {
  const household = Math.max(1, Number(profile.household) || 1);
  if (benefit.id !== 'adi' || household !== 1) return benefit;

  const income = Number(profile.adiFamilyIncome);
  if (!Number.isFinite(income)) return benefit;

  // Per un nucleo di un solo componente la scala ADI parte da 1,00.
  // Le maggiorazioni della scala riguardano gli ulteriori componenti del nucleo.
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
    description: `Il profilo supera i controlli raccolti dal questionario. Per un nucleo composto da una sola persona la scala di equivalenza ADI utilizzata è 1,00. Sulla base del reddito familiare dichiarato, il beneficio mensile stimato è ${new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(monthly)}${rentPart ? `, inclusa una quota affitto fino a ${new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(rentPart)} annui` : ''}. L’INPS effettua comunque la verifica amministrativa definitiva.`
  };
}

export function calculate(input) {
  const base = calculateCore(input);
  const profile = input?.profile && typeof input.profile === 'object' ? input.profile : (base.profile || {});

  let benefits = base.benefits.map((benefit) => correctSingleMemberAdi(benefit, profile));

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
