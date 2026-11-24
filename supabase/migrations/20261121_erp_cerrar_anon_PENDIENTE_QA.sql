-- Revive Hogar | CIERRE FINAL de acceso anónimo al ERP.
-- BLOQUEADO para aplicación automática.
-- Solo ejecutar después de QA autenticado por todos los roles sobre /api/datos,
-- verificación del despliegue en producción y respaldo lógico verificable.
begin;
drop policy if exists rh_anon_all on public.rh_records;
revoke select,insert,update,delete on public.rh_records from anon,authenticated;
alter table public.rh_records enable row level security;
grant select,insert,update,delete on public.rh_records to service_role;
commit;
-- Después validar:
-- select has_table_privilege('anon','public.rh_records','SELECT'); -- false
-- select has_table_privilege('anon','public.rh_records','UPDATE'); -- false
-- select count(*) from public.rh_records; -- invariabilidad de registros
