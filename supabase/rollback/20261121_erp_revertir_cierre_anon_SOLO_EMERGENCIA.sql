-- PLAN DE REVERSIÓN, SOLO EMERGENCIA.
-- Reabre acceso antiguo, por lo que debe limitarse al tiempo mínimo indispensable.
begin;
alter table public.rh_records enable row level security;
grant select,insert,update,delete on public.rh_records to anon,authenticated;
drop policy if exists rh_anon_all on public.rh_records;
create policy rh_anon_all on public.rh_records for all to public
using (true) with check (true);
commit;
