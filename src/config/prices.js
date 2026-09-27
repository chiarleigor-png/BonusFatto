export const PRICES = {
  base: { id: 'base', label: 'Analisi veloce 30 sec', price: 2.99 },
  pdf: { id: 'pdf', label: 'Analisi + Relazione PDF Top 100', price: 6.90 },
  pec: { id: 'pec', label: 'Invio PEC TARI al Comune', price: 14.90 }
};

export function formatPrice(value) {
  return Number(value).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}
