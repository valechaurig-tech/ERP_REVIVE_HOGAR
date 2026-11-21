-- Patch idempotente: reintentos del mismo folio solo si coinciden sus datos.
-- Ejecutado y validado dentro de una transacción revertida, sin movimientos reales.
do $patch$
declare
 definition text;
 old_token text := 'if existing_id is not null then return existing_id; end if;';
 new_token text := $new$
if existing_id is not null then
  if exists (
     select 1 from public.rh_fin_transferencias t
     where t.id = existing_id
       and t.fecha = p_fecha and t.cuenta_origen_id = p_origen
       and t.cuenta_destino_id = p_destino and t.monto = p_monto
       and t.concepto = coalesce(p_concepto,'') and t.actor_id = p_actor
  ) then return existing_id; end if;
  raise exception 'El folio ya existe con otros datos; consulta el movimiento original.'
  using errcode = '22023';
end if;
$new$;
 hits integer;
begin
 definition := pg_get_functiondef('public.rh_fin_registrar_traspaso(uuid,date,text,text,numeric,text,text)'::regprocedure);
 hits := (length(definition)-length(replace(definition,old_token,'')))/length(old_token);
 if hits = 2 then execute replace(definition,old_token,new_token);
 elsif position('El folio ya existe con otros datos' in definition)>0 then null;
 else raise exception 'Revisar versión inesperada de la función antes de cambiarla'; end if;
end
$patch$;