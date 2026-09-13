# Verifica finale

Data: 13 settembre 2026.

- Compilazione Vite per produzione riuscita.
- 9 test automatici passati: soglie TARI, soglie bollette, annualizzazione e totale, input invalidi, copertura fallback, filtri e limite 80, scadenze, email, formato dataset e timeout anche durante una risposta bloccata.
- Browser integrato: caricamento reale di 7.904 comuni verificato.
- Form iniziale: Lazio/Roma, ISEE vuoto, 1 figlio verificati.
- Autocomplete: 80 opzioni al massimo, ricerca FIUM → Fiumicino e selezione mouse, POME → Pomezia e selezione con frecce/Invio verificati.
- Cambio Lazio/Roma → Lombardia/Milano: selezione del Comune azzerata, elenco coerente verificato.
- Milano, ISEE 7.000, 2 figli: 10 candidati condizionali, totale del modello 14.906 euro, risultato verificato.
- Copia email: conferma visibile “Email copiata!”. Nessun invio effettuato.
- Nuovo calcolo e Magazine verificati.
- Home e risultati controllati a 390 px: nessun overflow orizzontale.
- Console del browser integrato: nessun errore rilevato.

Il fallback è verificato nei dati e nelle funzioni; non è stata completata una simulazione di disconnessione nel browser integrato. Il progetto non è stato pubblicato su Vercel.
