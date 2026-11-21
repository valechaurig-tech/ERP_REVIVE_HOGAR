-- Revive Hogar: métricas agregadas y rutas sin datos personales.
-- Solo rol, módulo, acción, día y conteo. Requiere Supabase con service_role en servidor.
create table if not exists public.rh_uso_diario (
 dia date not null, rol text not null, evento text not null, destino text not null,
 conteo integer not null default 0 check(conteo>=0),
 actualizado_en timestamptz not null default now(),
 primary key(dia,rol,evento,destino)
);
create table if not exists public.rh_uso_lotes (
 id uuid primary key, creado_en timestamptz not null default now()
);
alter table public.rh_uso_diario enable row level security;
alter table public.rh_uso_lotes enable row level security;
revoke all on public.rh_uso_diario from public,anon,authenticated;
revoke all on public.rh_uso_lotes from public,anon,authenticated;
grant select,insert,update,delete on public.rh_uso_diario to service_role;
grant select,insert,delete on public.rh_uso_lotes to service_role;

CREATE OR REPLACE FUNCTION public.rh_uso_registrar_lote(p_id uuid, p_rol text, p_eventos jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare e jsonb;dia_local date;v_evento text;v_destino text;cantidad int;agrego int;
begin
 if p_id is null or p_rol not in ('Direccion','Administradora','Marketing','Vendedor')
    or p_eventos is null or jsonb_typeof(p_eventos)<>'array'
    or jsonb_array_length(p_eventos)>100
 then raise exception 'Lote de uso inválido' using errcode='22023';end if;
 insert into public.rh_uso_lotes(id) values(p_id) on conflict do nothing;
 get diagnostics agrego=row_count;
 if agrego=0 then return false; end if;
 for e in select value from jsonb_array_elements(p_eventos) loop
  if jsonb_typeof(e)<>'object' then raise exception 'Evento inválido'; end if;
  dia_local:=(e->>'day')::date;
  v_evento:=e->>'event';
  v_destino:=e->>'target';
  cantidad:=(e->>'count')::integer;
  if dia_local<current_date-8 or dia_local>current_date+1
     or v_evento not in ('module_open','form_open','form_attempt','tab_open','session_start','transition')
     or v_destino is null or length(v_destino)>96
     or v_destino !~ '^[-a-zA-Z0-9:_>]+$'
     or cantidad<1 or cantidad>1000
  then raise exception 'Métrica no permitida' using errcode='22023';end if;
  insert into public.rh_uso_diario(dia,rol,evento,destino,conteo)
  values(dia_local,p_rol,v_evento,v_destino,cantidad)
  on conflict(dia,rol,evento,destino) do update
  set conteo=public.rh_uso_diario.conteo+excluded.conteo,actualizado_en=now();
 end loop;
 delete from public.rh_uso_diario where dia < current_date-30;
 delete from public.rh_uso_lotes where creado_en < now()-interval '30 days';
 return true;
end;
$function$


revoke all on function public.rh_uso_registrar_lote(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.rh_uso_registrar_lote(uuid,text,jsonb) to service_role;
