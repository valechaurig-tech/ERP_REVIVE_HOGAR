-- Revive Hogar / Fase 1: apertura de saldos preparada, SIN reinterpretar historiales.
-- Aplicada a Supabase real en 2026-11-20. Script idempotente y no destructivo.
-- No cambia ni actualiza public.rh_records.
create schema if not exists revive_finanzas;
revoke all on schema revive_finanzas from public, anon, authenticated;
grant usage on schema revive_finanzas to service_role;

create table if not exists revive_finanzas.cuentas_apertura (
  cuenta_id text primary key,
  fecha_corte date,
  saldo_inicial numeric(18,2),
  estado text not null default 'pendiente'
    check (estado in ('pendiente','confirmado')),
  validado_por text,
  validado_en timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint apertura_solo_si_validada check (
    estado = 'pendiente' and validado_en is null
    or estado = 'confirmado' and fecha_corte is not null
      and saldo_inicial is not null and validado_en is not null
      and nullif(btrim(validado_por),'') is not null
  )
);

create table if not exists revive_finanzas.saldos_referencia (
  origen text not null,
  cuenta_id text not null,
  alias text,
  saldo_visible numeric(18,2),
  capturado_en timestamptz not null default now(),
  primary key (origen, cuenta_id)
);

alter table revive_finanzas.cuentas_apertura enable row level security;
alter table revive_finanzas.saldos_referencia enable row level security;
revoke all on table revive_finanzas.cuentas_apertura from public, anon, authenticated;
revoke all on table revive_finanzas.saldos_referencia from public, anon, authenticated;
grant select, insert, update, delete on revive_finanzas.cuentas_apertura to service_role;
grant select, insert on revive_finanzas.saldos_referencia to service_role;

-- Todos los saldos históricos quedan pendientes de conciliación, sin cero falso.
insert into revive_finanzas.cuentas_apertura (cuenta_id)
select record_id from public.rh_records where collection = 'cuentasBancarias'
on conflict (cuenta_id) do nothing;

-- Referencia de saldo actual; NO es un saldo de apertura conciliado.
-- No se copian CLABE ni datos de titulares; origen fijo evita duplicados.
insert into revive_finanzas.saldos_referencia(origen,cuenta_id,alias,saldo_visible)
select 'fase1_20261120', record_id, data->>'alias',
       case when (data->>'saldo') ~ '^-?[0-9]+([.][0-9]+)?$'
            then (data->>'saldo')::numeric(18,2) else null end
from public.rh_records where collection = 'cuentasBancarias'
on conflict (origen,cuenta_id) do nothing;
