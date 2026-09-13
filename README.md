# BonusFatto.it

Progetto React + Tailwind CSS, ricostruito da zero. Vite produce un sito statico pronto per Vercel, senza backend, account o chiavi API. Logo B originale in CSS/SVG, nessuna immagine esterna.

## Avvio e deploy

Richiede Node.js 20.19+ oppure 22.12+ e npm.

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

Su Vercel importa la cartella del progetto (quella che contiene questo README e package.json), seleziona Vite e lascia i valori presenti in `vercel.json`: comando `npm run build`, output `dist`. Non servono variabili d’ambiente. Se importi un repository con il progetto annidato, imposta questa cartella come Root Directory. L’assegnazione del dominio BonusFatto.it richiede il controllo del dominio e la configurazione DNS. Il progetto non è stato pubblicato e non registra il dominio.

## Cosa contiene

- Layout responsive beige/giallo, logo B blu-fucsia, form bianco e pulsante arancio.
- Regione Lazio e Provincia Roma iniziali, ISEE vuoto, 1 figlio. Comune esplicito vuoto: senza checkbox si usa il capoluogo, chiaramente indicato. Con “altro comune” è obbligatoria una selezione dall’elenco.
- Fetch GitHub con timeout di 5 secondi, comprensivo della lettura JSON; validazione della struttura. Fallback locale incluso di 187 comuni, tutte le 20 regioni e almeno un centro per ogni provincia del dataset.
- Regione → Provincia → Comune; ricerca senza distinzione di maiuscole o accenti, massimo 80 risultati. Selezione `onMouseDown` con `preventDefault`, chiusura `onBlur` ritardata 200 ms. Anche tastiera: frecce, Invio, Esc. Cambiare provincia o testo invalida la selezione precedente.
- Risultati dinamici (il numero non è fissato a 7), categorie, importi, subtotali, checklist, email con copia e selezione manuale di riserva, nuovo calcolo che conserva il form per modificarlo.
- Countdown Roma e Fiumicino con scadenze fisse 2026, ora italiana; mai valori negativi, mai rinnovi fittizi all’anno successivo.
- Magazine e fonti accessibili dall’header e dal footer.
- Nessuna persistenza di ISEE, nessuna email inviata. La richiesta GitHub recupera solo il dataset geografico e non include i dati del form.

## Formule e limiti: leggere prima della pubblicazione al pubblico

Le formule sono quelle del brief, implementate in `src/benefits.js`. Sono un **modello dimostrativo**, non un motore di spettanza aggiornato alla legge. L’interfaccia lo segnala nel form e nei risultati; non afferma “Hai diritto” nel riepilogo e non forza sette bonus.

| Voce                | Formula del modello                                                                                                               |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| TARI                | ISEE ≤8.000: 100%; ≤15.000: 50%; ≤26.530: 25%; oltre: 0%                                                                          |
| Media TARI          | Roma 360; Milano 400; Torino 380; Napoli 340; Bologna 370; Firenze 350; Genova 360; Costarainera 285; Imperia 290; altri 350 euro |
| Bollette            | 250 euro/anno se ISEE ≤9.530 oppure ≤20.000 con almeno 4 figli                                                                    |
| Assegno unico       | 199/120/57 euro per figlio per mese, fasce 17.500/40.000                                                                          |
| Psicologo           | Massimale 1.500/1.000/500 euro, fasce 15.000/30.000/50.000                                                                        |
| Mamme               | 3.000 euro se almeno 2 figli e ISEE ≤40.000, con requisiti ulteriori non rilevati                                                 |
| Carta Dedicata a Te | 500 euro se ISEE ≤15.000, candidata condizionata al nucleo di almeno 3 persone                                                    |
| Carta acquisti      | 80 euro × 6 bimestri se ISEE ≤8.117, requisiti anagrafici e patrimoniali da verificare                                            |
| Nido                | 3.000/2.500/1.500 euro, fasce 25.000/40.000, ipotesi per un bambino                                                               |
| Ristrutturazione    | 50% su massimo 96.000 in 10 anni; esclusa dalla somma                                                                             |
| Nuovi nati          | 1.000 euro se ci sono figli, candidata condizionata alla nascita/adozione e ai requisiti reali                                    |

ISEE e numero di figli **non bastano** per accertare le prestazioni. La Carta Dedicata a Te viene presentata come candidata da verificare perché il form non rileva il numero di adulti: non viene inventato un nucleo di tre persone. La somma illustrativa include ipotesi annuali, massimali e una tantum, esclude la detrazione e non certifica cumulabilità. Non è un risparmio garantito né un totale ricorrente annuo. Le fasce TARI del modello non sono aliquote comunali nazionali. Il file dei comuni contiene dati geografici, non bandi né tariffe: non è un dataset live di tutti i bonus regionali.

Differenze ufficiali rilevate il 13 settembre 2026:

- ARERA ha aggiornato la soglia ordinaria 2026 a **9.796 euro**. Il bonus sociale rifiuti è il **25%**; il modello conserva 9.530 per fedeltà al brief e lo dichiara.
- Bonus nido 2026: possono essere previsti fino a **3.600 euro**, con requisiti legati a data di nascita, ISEE specifico e spesa.
- Bonus nuovi nati 2026: nascita/adozione ammissibile e ISEE specifico non superiore a **40.000 euro**; avere figli non è sufficiente.
- Il termine Roma **28/02/2026** e Fiumicino **16/03/2026** è già trascorso alla data della realizzazione.

Per trasformarlo in un verificatore ufficiale occorre sostituire il modello con un catalogo normativo aggiornato, acquisire i requisiti mancanti, controllare incompatibilità, importi reali e bandi locali. I testi non promettono copertura completa dei bonus regionali.

## Fonti

- Comuni: https://github.com/matteocontrini/comuni-json (dataset scaricato il 13/09/2026, 7.904 voci; fallback derivato selezionando centri più popolosi, rappresentanza provinciale e comuni del brief).
- ARERA 2026: https://www.arera.it/fileadmin/allegati/docs/26/2-2026-R-com.pdf
- Bonus sociali: https://www.arera.it/consumatori/bonus-sociale
- Roma: https://www.comune.roma.it/web/it/notizia/esenzione-tari-2026-domande-entro-28-febbraio.page
- Fiumicino: https://www.comune.fiumicino.rm.it/index.php/it/news/bando-agevolazioni-tari-2026
- INPS nido: https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizio-strumento.schede-servizi.bonus-asilo-nido-e-forme-di-supporto-presso-la-propria-abitazione-51105.bonus-asilo-nido-e-forme-di-supporto-presso-la-propria-abitazione.html
- INPS nuovi nati: https://www.inps.it/it/it/dettaglio-scheda.it.schede-servizi.bonus-nuovi-nati.html

Lo screenshot originale non era disponibile tra gli allegati: la grafica segue la descrizione testuale completa recuperata dalla conversazione.

## Struttura

- `src/App.jsx`: viste, form, autocomplete, clipboard e countdown.
- `src/styles.css`: Tailwind e componenti grafici responsive.
- `src/geography.js`: fetch, normalizzazione, filtri e capoluoghi.
- `src/fallback.json`: dati geografici disponibili offline.
- `src/benefits.js`: funzioni pure per formule, date ed email.
- `tests/calculator.test.js`: controlli per soglie, totali, filtri, timeout e date.
