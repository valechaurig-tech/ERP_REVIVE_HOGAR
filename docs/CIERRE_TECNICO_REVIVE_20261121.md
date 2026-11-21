# Revive Hogar — corte técnico de entregas 21/11/2026

**Producción:** https://revive-hogar.vercel.app/
**Despliegue actual:** `dpl_BaDr2fxEhxTyVHTe8RxYjVvsEwpy` (READY).
**Para reversión rápida:** `dpl_GQWdXRmETb1TbfAnqDEbtegQfacj` (versión financiera anterior); `dpl_UZGzkGqbSSHMPM83ENEhMrr9LENH` (antes de Finanzas).

## Entregado y verificado

- Traspasos entre cuentas por API de Dirección `/api/finanzas`, con una función SQL de traspaso transaccional y bloqueo de filas. Verificada reversión y prevención de reintentos duplicados en Supabase, sin dinero real movido.
- Corte diario por fecha con ingresos, egresos, traspasos recibidos/enviados y saldo final: `saldo inicial + ingresos + traspasos recibidos - egresos - traspasos enviados`. Reporte por cuenta con impresión.
- Confirmación individual del saldo inicial por cuenta y fecha de apertura desde Dirección. Los saldos confirmados se bloquean contra sobrescritura casual. **Ninguna apertura fue inventada ni registrada todavía**.
- Auditoría de navegación con tabla privada `rh_uso_diario` y lotes idempotentes. Solo se registran rol, evento, módulo/ruta, fecha y conteo; NO hay nombres, contactos, contraseñas, contenido de formularios ni documentos. Dirección accede al resumen colectivo en Auditoría.
- Los registros antiguos de incidencia fueron unificados en la bandeja; no hubo nuevos reportes en esta revisión.
- Formulario de Administradora ya muestra razones de bloqueo y no escribe presupuesto ante validaciones fallidas; falta prueba con expediente ficticio en la app real.

## Validaciones

- **46 pruebas automatizadas sin navegador aprobadas**, incluyendo permisos, origen de peticiones, cobros falsos no realizados, datos inválidos, coherencia financiera, preservación de expedientes, fecha de corte, traspasos y uso colectivo.
- API sin sesión responde `401` en producción en `/api/sesion`, `/api/pruebas`, `/api/finanzas` y `/api/uso`.
- La base general conserva 15 cuentas y 2 movimientos con total `$31,275.74`. Existen **0 traspasos reales y 0 aperturas confirmadas**. La telemetría central iniciará su medición desde la versión nueva.
- Nuevas tablas y RPC de Finanzas/Uso tienen RLS y NO permiten ejecución ni lectura a `anon`.
- Errores de credenciales aparecidos durante QA corresponden a previews sin variables productivas, no al despliegue actual.

## Pendientes que impiden declararlo cerrado

1. **Seguridad crítica:** `public.rh_records` conserva permisos heredados demasiado amplios. No revocarlos de golpe: clientes actuales leen/escriben directamente. Migrar sincronización y login a APIs con autorización por rol, probar con Dirección, Administradora, Vendedores y después revocar grants de `anon`.
2. **Conciliación real:** Vale debe validar fecha de arranque y saldo inicial de cada una de las 15 cuentas; el PDF anterior no sirve para copiar cifras sin confirmar. Sin esto los cierres mostrarán **Sin confirmar**.
3. **QA por usuarios reales:** un traspaso autorizado y el envío de un expediente ficticio completo desde Administradora. Las pruebas de simulación no sustituyen la prueba real.
4. **Sincronía GitHub/Vercel:** el repositorio principal aún carece de fuentes de algunas funciones de servidor del último despliegue. Las entregas se publicaron preservando los SHAs de los demás archivos del despliegue anterior. NO hacer merge/deploy masivo desde el repo hasta recuperar y revisar la fuente real.
5. **Uso del equipo:** los datos centrales empiezan ahora, por lo que todavía no se puede atribuir falta de uso a ningún módulo sin una ventana suficiente de medición.

## Reportes

- RH-1 Traspasos: implementado, pendiente QA real → `en_revision`.
- RH-2 Prueba recepción: `resuelto`.
- RH-3 Corte diario formato Vale/Alexis: implementado parcialmente, a la espera de saldos conciliados → `en_revision`.
- RH-4 Administradora «No me deja avanzar»: se mejoraron errores y protección de borradores; origen exacto no reproducido aún → `en_revision`.

**Política para cerrar:** solo marcar resuelto tras verificar el flujo real de usuario y que la misma acción no provoque regresiones. Nunca modificar saldos o expedientes comerciales a modo de simulación.

## Revisión adicional — seguridad y QA del 21 de noviembre

- Ejecutada la batería extendida: **46 pruebas automáticas sin navegador, 46 aprobadas**, sin cambios en cuentas ni prospectos reales. La prueba de interfaz con Chromium NO pudo completarse en el sandbox Vercel Ubuntu 26.04: Playwright no dispone de Chromium compatible y el navegador descargado carece de librerías compartidas. Se añadió un job separado con runner `ubuntu-24.04` para no disfrazar el problema como prueba superada.
- El privilegio heredado de `anon` y `authenticated` para `TRUNCATE`, `REFERENCES` y `TRIGGER` sobre `public.rh_records` se **revocó y verificó**. **No** se revocó `SELECT/INSERT/UPDATE/DELETE` porque el navegador aún depende de ellos. La seguridad general SIGUE ABIERTA.
- La función de traspasos ahora exige que los reintentos con el mismo `request_id` coincidan en **fecha, origen, destino, monto, concepto y actor**; de lo contrario rechaza el intento. Verificado con operación ficticia y ROLLBACK: exactamente una operación temporal y cero movimientos persistidos.
- El asesor de Supabase indica INFO de RLS sin política en tablas de **servidor exclusivamente**: es intencional al usar el rol de servicio con grants revocados para `anon`; no es una apertura pública. También advierte que la protección contra contraseñas filtradas de Supabase Auth está desactivada; Revive usa su propia autenticación ERP, por lo que requiere revisar el modelo de acceso al migrar.
- El reporte RH-4 no tiene error técnico reproducible confirmado. El caso real mantiene una ficha en Administradora y borradores; no se ha alterado. Las reglas documentales y financieras siguen activas, y las pruebas aisladas demuestran que un intento inválido no guarda ni sincroniza prematuramente.
- La bandeja todavía contiene **4 folios: RH-1, RH-3 y RH-4 en revisión; RH-2 resuelto; cero reportes nuevos**.
- Revisión posterior: **15 cuentas, 2 movimientos, $31,275.74; cero traspasos reales y cero aperturas conciliadas**. No presentar este valor como saldo contable de una fecha histórica.

**Para cerrar formalmente:** se necesita migrar el acceso `rh_records` a servidor con prueba autenticada de todos los roles y rollback; ejecutar prueba de navegador compatible; validar una transferencia y un expediente ficticio desde sesiones reales; obtener las 15 aperturas firmadas/conciliadas por Vale. No otorgar cierre sin esas evidencias.
