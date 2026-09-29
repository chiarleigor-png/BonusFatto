create table if not exists public.tari_comuni_ingest (
  istat text primary key,
  nome text not null,
  provincia text,
  regione text,
  codice_catastale text,
  status text not null default 'pending'
    check (status in ('pending','found','no_document','error')),
  attempts integer not null default 0,
  mef_url text,
  documents jsonb not null default '[]'::jsonb,
  mef_publication_date text,
  scadenza text,
  riduzione numeric,
  source_label text not null default 'MEF - Fiscalità locale - TARI 2026',
  last_checked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tari_comuni_ingest_status_idx
  on public.tari_comuni_ingest(status, attempts, updated_at);

alter table public.tari_comuni_ingest enable row level security;

-- Nessuna policy pubblica: l'accesso avviene solo server-side con SERVICE_ROLE.
