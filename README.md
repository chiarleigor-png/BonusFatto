# BonusFatto.it - Deploy GitHub + Vercel + Stripe

## Setup rapido (come altro sito IA)

1. **Estrai ZIP** e carica cartella su GitHub:
   - Crea repo nuovo `bonusfatto` su GitHub
   - Carica tutti i file di questa cartella (drag & drop)

2. **Vercel Deploy:**
   - Vai su vercel.com → New Project → Importa repo `bonusfatto`
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Aggiungi Environment Variables:
     STRIPE_SECRET_KEY=sk_live_...
     STRIPE_PUBLISHABLE_KEY=pk_live_...

3. **Stripe:**
   - Hai già account Stripe → usa chiavi Live
   - Checkout gestito da /api/checkout.js (serverless Vercel)
   - Test: usa 4242 4242 4242 4242 04/26 123

4. **Struttura:**
   - /src/App.tsx → tutta logica 7904 comuni, ISEE senza 0, titolo ISEE poi TARI poi luce e gas, home solare giallo/arancio, PDF con logo
   - /api/checkout.js → Stripe Checkout Session
   - /public/bonusfatto_logo.png → logo per PDF

5. **Dopo deploy:**
   - Dominio: collega bonusfatto.it su Vercel → Domains
   - Testa Costarainera ISEE 26530 → messaggio soglie comunali
   - Testa Torino ISEE 5000 → sconto 50%

## Differenze da altro sito IA:
Stesso flusso ZIP → GitHub → Vercel. Unica aggiunta: /api folder per Stripe, già inclusa.

## Prossimo step Torino provincia:
Ricerca TARI 15 comuni in altra chat → poi integriamo percentuali verificate in App.tsx → nuovo ZIP → push GitHub → Vercel redeploy automatico.
