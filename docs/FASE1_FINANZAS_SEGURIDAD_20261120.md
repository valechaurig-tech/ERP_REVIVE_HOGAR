# Fase 1 — Seguridad y base de saldos diarios

Fecha: 2026-11-20. Alcance: preparación segura sin afectar operación existente.

## Aplicado en Supabase de Revive

- Se creó el esquema **privado** `revive_finanzas`.
- Tabla `revive_finanzas.cuentas_apertura`: una entrada por cuenta actual, inicialmente `pendiente`, sin `fecha_corte` ni `saldo_inicial`. La restricción impide declarar confirmada una apertura sin fecha, importe y responsable.
- Tabla `revive_finanzas.saldos_referencia`: copia de referencia de `alias` y `saldo` a la fecha de revisión, sin CLABE ni titular. **No es saldo histórico ni validado**. Origen fijo `fase1_20261120` evita duplicados.
- Ambas tablas tienen RLS y están en esquema no expuesto. Ningún permiso para `anon` o `authenticated`; acceso de servicio solamente. Se verificaron los privilegios.
- **Sin cambios** en `public.rh_records`, sus 15 cuentas ni sus movimientos.

## Bloqueo de seguridad pendiente (NO ocultar)

La tabla histórica `public.rh_records` todavía sirve el ERP mediante `supabase-js` con clave pública y una política `ALL USING (true)` que abarca datos sensibles y perfiles. **NO revocar la política sin corregir antes la aplicación:** dejaría fuera a usuarios reales y cortaría sincronización.

Pasos para cerrar ese riesgo, en una sola entrega verificada:

1. Recuperar y alinear el código de producción de Vercel con el repositorio GitHub. Actualmente la rama principal de GitHub carece de módulos recientes y no debe desplegarse sobre producción.
2. Reemplazar el acceso directo a `rh_records` desde el navegador por una API de servidor autenticada con la sesión real de Revive. No confiar en un ID, nombre o rol enviado desde el cliente.
3. Proteger cuentas, prospectos y registros contables con autorización por módulo y rol en cada endpoint, sin enviar hashes ni contraseñas a todos los clientes.
4. Preservar sincronización, altas, bajas, edición, cierres de sesión y usuarios vendedores; probar concurrencia y fallas de red.
5. Cambiar política de `rh_records` y revocar grants de `anon`/cliente solo después de que todos los flujos se hayan migrado y validado.
6. Verificar denegación desde rol anónimo y permitir uso real desde perfiles autorizados; desplegar con recuperación comprobada.

## Saldos e historial — pendientes funcionales

- Conciliar por cuenta saldos y **fecha de corte** con Vale. Nunca rellenar `saldo_inicial` con `saldo` actual de manera automática ni con los importes del PDF sin conciliación.
- Nuevos ingresos/egresos que afectan dinero deben tener `cuentaId` obligatorio. Guardar y mostrar los históricos sin cuenta como **Sin cuenta asignada**, sin inventar asignaciones.
- Los saldos negativos son válidos como indicadores y deben exhibirse sin maquillarlos.
- Los traspasos internos serán una operación atómica posterior, nunca ingreso y egreso duplicados.
- Crear corte diario solo a partir del último saldo conciliado; días anteriores mostrar **sin saldo histórico confirmado**.

## Controles básicos después de esta migración

```sql
select (select count(*) from revive_finanzas.cuentas_apertura) as cuentas_pendientes_o_confirmadas,
       (select count(*) from revive_finanzas.saldos_referencia where origen='fase1_20261120') as referencias;
select count(*) as movimientos_sin_cuenta
from public.rh_records
where collection='gastosEmpresa'
  and nullif(btrim(data->>'cuentaId'),'') is null;
```

**No hacer merge ni desplegar desde esta rama** hasta comparar con el artefacto actual de producción. Este cambio de esquema ya está aplicado y comprobado por conexión administrativa.
