-- Revive Hogar — Esquema Supabase DEDICADO (proyecto separado de ERP-SELECTAS)
-- 1. Crear proyecto nuevo en https://supabase.com → New project → "revive-hogar"
-- 2. SQL Editor → pegar y ejecutar este archivo
-- 3. Database → Replication → activar Realtime en rh_records (recomendado)
-- 4. Settings → API → copiar URL y anon key a js/config.js

create table if not exists public.rh_records (
    collection text not null,
    record_id text not null,
    data jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default now(),
    primary key (collection, record_id)
);

create index if not exists idx_rh_records_collection on public.rh_records (collection);
create index if not exists idx_rh_records_updated on public.rh_records (updated_at desc);

alter table public.rh_records enable row level security;

drop policy if exists "rh_anon_all" on public.rh_records;
create policy "rh_anon_all" on public.rh_records
    for all using (true) with check (true);

comment on table public.rh_records is 'Colecciones Revive Hogar: campanas, prospectos, casas, usuariosLogin, etc.';
