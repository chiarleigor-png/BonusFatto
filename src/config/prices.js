export const PRICES = {
  base: { id: 'base', label: 'Analisi veloce 30 sec', price: 2.99, stripePriceId: 'price_BASE_2_99' },
  pdf: { id: 'pdf', label: 'Analisi + Relazione PDF Top 500 + Testo PEC', price: 6.90, stripePriceId: 'price_PDF_6_90' },
  pec: { id: 'pec', label: 'Invio PEC gestito al Comune', price: 14.90, stripePriceId: 'price_PEC_14_90' }
};

export function formatPrice(value) {
  return Number(value).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}
