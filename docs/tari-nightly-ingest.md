# TARI nightly ingestion

Il job `/api/cron/tari-ingest` indicizza fino a 500 Comuni per esecuzione.

## Configurazione richiesta su Vercel

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`

Applicare una sola volta la migration:

`supabase/migrations/20260929_tari_ingest.sql`

Il primo run popola automaticamente la coda nazionale dal dataset dei Comuni e poi processa i primi 500.

## Fonte

Per ogni Comune il job consulta la pagina MEF "Fiscalità locale - Altri tributi" 2026 usando il codice catastale e salva:
- URL MEF;
- link ai documenti TARI pubblicati;
- data di pubblicazione quando rilevabile;
- stato del Comune;
- numero tentativi e ultimo errore.

Non scarica interi archivi regionali (che possono essere molto grandi) e non effettua parsing OCR dei PDF nel job notturno.

## Stati

- `pending`: da lavorare / ritentare;
- `found`: uno o più documenti TARI trovati;
- `no_document`: nessun documento dopo 3 tentativi;
- `error`: errore tecnico, verrà ritentato.

## Sicurezza

L'endpoint richiede `Authorization: Bearer $CRON_SECRET`.
La tabella Supabase ha RLS attivo e nessuna policy pubblica.
