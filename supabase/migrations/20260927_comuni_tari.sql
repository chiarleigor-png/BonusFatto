create table if not exists public.comuni_tari (
  istat text primary key,
  comune text not null,
  provincia text not null,
  scadenza_rata_1 date,
  scadenza_rata_2 date,
  riduzione_isee_9796 numeric,
  url_fonte text,
  raw_text text,
  verified boolean not null default false
);

comment on table public.comuni_tari is 'Dati TARI 2026 estratti dalle fonti MEF per i 100 comuni BonusFatto';
comment on column public.comuni_tari.istat is 'Codice ISTAT ufficiale a 6 cifre';
comment on column public.comuni_tari.riduzione_isee_9796 is 'Percentuale di riduzione comunale esplicitamente prevista per ISEE <= 9.796 euro; null se non verificata';

alter table public.comuni_tari enable row level security;
