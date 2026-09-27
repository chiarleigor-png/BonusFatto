create table if not exists public.comuni_tari (
  istat text primary key check (istat ~ '^[0-9]{6}$'),
  comune text not null,
  provincia text not null,
  scadenza_rata_1 date,
  scadenza_rata_2 date,
  riduzione_isee_9796 numeric(5,2),
  url_fonte text,
  raw_text text,
  verified boolean not null default false
);

alter table public.comuni_tari enable row level security;

comment on table public.comuni_tari is 'Dati TARI 2026 estratti esclusivamente dal portale MEF per i 100 comuni del file top100Comuni.json';
comment on column public.comuni_tari.riduzione_isee_9796 is 'Percentuale comunale esplicita applicabile a ISEE 9.796 euro; non include il bonus sociale nazionale del 25%';
