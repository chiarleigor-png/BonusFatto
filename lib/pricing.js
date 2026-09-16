export const PRICING_2026 = Object.freeze({
  quick: Object.freeze({
    code: 'quick',
    name: 'Analisi veloce',
    launchAmountCents: 299,
    ordinaryAmountCents: 399,
  }),
  isee: Object.freeze({
    code: 'isee',
    name: 'Analisi con ISEE',
    launchAmountCents: 690,
    ordinaryAmountCents: 890,
  }),
  report: Object.freeze({
    code: 'report',
    name: 'Relazione PDF personalizzata',
    launchAmountCents: 490,
    ordinaryAmountCents: 690,
  }),
  whatsapp: Object.freeze({
    code: 'whatsapp',
    name: 'Bonus Alert WhatsApp 12 mesi',
    launchAmountCents: 690,
    ordinaryAmountCents: 990,
  }),
  pec: Object.freeze({
    code: 'pec',
    name: 'Invio PEC al Comune',
    launchAmountCents: 1490,
    ordinaryAmountCents: 1990,
  }),
  tari: Object.freeze({
    code: 'tari',
    name: 'Gestione completa pratica TARI',
    launchAmountCents: 1990,
    ordinaryAmountCents: 2490,
  }),
});

export function euroFromCents(amountCents) {
  return (Number(amountCents || 0) / 100).toLocaleString('it-IT', {
    style: 'currency',
    currency: 'EUR',
  });
}
