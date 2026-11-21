-- Revive Hogar: migración de finanzas seguras (aplicar tras fase 1 saldos privados).
-- No actualiza registros reales al ejecutarse.
create table if not exists public.rh_fin_transferencias (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  fecha date not null,
  cuenta_origen_id text not null,
  cuenta_destino_id text not null,
  monto numeric(18,2) not null check (monto > 0),
  concepto text not null default '',
  actor_id text not null,
  creado_en timestamptz not null default now(),
  check(cuenta_origen_id <> cuenta_destino_id),
  check(char_length(concepto) <= 500)
);
alter table public.rh_fin_transferencias enable row level security;
revoke all on public.rh_fin_transferencias from public,anon,authenticated;
grant select,insert on public.rh_fin_transferencias to service_role;

create or replace view public.rh_fin_aperturas with (security_invoker=true) as
  select cuenta_id,fecha_corte,saldo_inicial,estado,validado_en
  from revive_finanzas.cuentas_apertura;
revoke all on public.rh_fin_aperturas from public,anon,authenticated;
grant select on public.rh_fin_aperturas to service_role;

CREATE OR REPLACE FUNCTION public.rh_fin_registrar_traspaso(p_request_id uuid, p_fecha date, p_origen text, p_destino text, p_monto numeric, p_concepto text, p_actor text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  cuenta record;
  cnt integer := 0;
  origen_saldo numeric(18,2);
  destino_saldo numeric(18,2);
  existing_id uuid;
  nuevo_id uuid;
begin
  if p_request_id is null or p_fecha is null
     or p_fecha > current_date + 1
     or p_fecha < date '2000-01-01'
     or p_origen is null or p_destino is null
     or p_origen = p_destino
     or p_monto is null or p_monto <= 0 or p_monto > 999999999.99
     or p_monto <> round(p_monto,2)
     or length(coalesce(p_concepto,'')) > 500
     or nullif(btrim(coalesce(p_actor,'')),'') is null
  then
    raise exception 'Datos de traspaso inválidos' using errcode='22023';
  end if;
  -- Peticiones duplicadas se devuelven por folio, sin repetir movimientos.
  select id into existing_id from public.rh_fin_transferencias
  where request_id = p_request_id;
  if existing_id is not null then return existing_id; end if;

  -- Orden estable de bloqueo evita que dos traspasos inversos se bloqueen mutuamente.
  for cuenta in
    select record_id,data
    from public.rh_records
    where collection='cuentasBancarias' and record_id in (p_origen,p_destino)
    order by record_id for update
  loop
    cnt := cnt + 1;
    if coalesce(cuenta.data->>'saldo','') !~ '^-?[0-9]+([.][0-9]+)?$' then
      raise exception 'Cuenta con saldo no numérico' using errcode='22023';
    end if;
    if cuenta.record_id = p_origen then origen_saldo := (cuenta.data->>'saldo')::numeric;
    else destino_saldo := (cuenta.data->>'saldo')::numeric; end if;
  end loop;
  if cnt<>2 then raise exception 'Cuenta de origen o destino inexistente' using errcode='22023'; end if;
  -- Rechequeo del request después de adquirir los bloqueos.
  select id into existing_id from public.rh_fin_transferencias where request_id=p_request_id;
  if existing_id is not null then return existing_id; end if;

  insert into public.rh_fin_transferencias
    (request_id,fecha,cuenta_origen_id,cuenta_destino_id,monto,concepto,actor_id)
  values
    (p_request_id,p_fecha,p_origen,p_destino,p_monto,coalesce(p_concepto,''),p_actor)
  returning id into nuevo_id;

  update public.rh_records set data=jsonb_set(data,'{saldo}',to_jsonb((origen_saldo-p_monto)::numeric(18,2)),true),
    updated_at=now()
    where collection='cuentasBancarias' and record_id=p_origen;
  update public.rh_records set data=jsonb_set(data,'{saldo}',to_jsonb((destino_saldo+p_monto)::numeric(18,2)),true),
    updated_at=now()
    where collection='cuentasBancarias' and record_id=p_destino;
  return nuevo_id;
end;
$function$


CREATE OR REPLACE FUNCTION public.rh_fin_confirmar_apertura(p_cuenta text, p_fecha date, p_saldo numeric, p_actor text)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare row_actual record;
begin
 if p_fecha is null or p_fecha > current_date
    or p_fecha < date '2000-01-01'
    or p_saldo is null or abs(p_saldo)>999999999.99
    or p_saldo <> round(p_saldo,2)
    or nullif(btrim(coalesce(p_actor,'')),'') is null
 then raise exception 'Apertura inválida' using errcode='22023';end if;
 if not exists (
   select 1 from public.rh_records
   where collection='cuentasBancarias' and record_id=p_cuenta
 ) then raise exception 'Cuenta inexistente' using errcode='22023';end if;
 insert into revive_finanzas.cuentas_apertura(cuenta_id)
 values (p_cuenta) on conflict (cuenta_id) do nothing;
 select fecha_corte,saldo_inicial,estado into row_actual
 from revive_finanzas.cuentas_apertura where cuenta_id=p_cuenta for update;
 if row_actual.estado='confirmado' then
   if row_actual.fecha_corte=p_fecha and row_actual.saldo_inicial=p_saldo then return true;end if;
   raise exception 'Apertura ya conciliada: no se puede sobrescribir' using errcode='22023';
 end if;
 update revive_finanzas.cuentas_apertura set fecha_corte=p_fecha,saldo_inicial=p_saldo,
   estado='confirmado', validado_por=p_actor,validado_en=now(), actualizado_en=now()
 where cuenta_id=p_cuenta;
 return true;
end;
$function$


revoke all on function public.rh_fin_registrar_traspaso(uuid,date,text,text,numeric,text,text) from public,anon,authenticated;
grant execute on function public.rh_fin_registrar_traspaso(uuid,date,text,text,numeric,text,text) to service_role;

revoke all on function public.rh_fin_confirmar_apertura(text,date,numeric,text) from public,anon,authenticated;
grant execute on function public.rh_fin_confirmar_apertura(text,date,numeric,text) to service_role;
