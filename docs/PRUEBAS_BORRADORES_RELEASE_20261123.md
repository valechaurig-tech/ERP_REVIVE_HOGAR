# Revive Hogar — Pruebas: recuperación segura de borradores (23/11/2026)

**Producción:** https://revive-hogar.vercel.app/
**Despliegue confirmado READY:** `dpl_Exizsa5hBivQhbBfUrzJbyqDNhXb`
**Despliegue anterior para reversión:** `dpl_77QSKGd2d1ZX1fp4JXgFrtH8LNWj`

## Cambio publicado

Se publicó **exclusivamente** `js/prueba-nota.js` sobre el snapshot de producción. Los otros 104 archivos se conservaron por SHA. Se verificó HTTP 200 en la aplicación, informe financiero y archivo JS de Pruebas, y coincidencia exacta entre JS servido y GitHub.

Cuando una persona escribe un reporte, guarda en la pestaña abierta **comentario, tipo y metadatos mínimos** por un máximo de 30 minutos. Puede recuperarse tras recargar **la misma pestaña y desde la misma cuenta**. Los borradores se borran tras éxito del envío o cierre de sesión, y al cambiar de cuenta o caducar.

**No se guardan bytes de capturas ni PDF en localStorage/sessionStorage.** Si había adjuntos y se pierde el estado, el reporte explica que deberá adjuntarse otra vez. Si el envío no quedó confirmado advierte que debe consultar antes de reenviar. Los reportes sin adjuntos con envío pendiente pueden reintentar reutilizando el mismo requestId.

## QA y límites

- 6/6 pruebas específicas: restaurar comentario, cambio de cuenta, caducidad, no persistir adjuntos, retry idempotente, limpieza tras envío/logout.
- 87/87 pruebas automatizadas sin navegador de toda la rama.
- Previo a producción se verificó preview READY; el preview carece de credenciales de Supabase de preview y devolvió 503 en endpoints privados, por lo que **no** constituye una prueba de envío real.
- Comprobación posterior: último folio 4; 0 nuevos; 3 en revisión, 1 resuelto; 15 cuentas con suma de saldos registrada $31,275.74 y 0 traspasos. Cero registros temporales de QA.

## Pendientes reales que no se cierran con este cambio

1. **Riesgo crítico:** `public.rh_records` todavía permite CRUD anónimo. No revocar de golpe antes de migrar la sincronización y probar sesiones autenticadas de todos los roles. Backend de `/api/datos` sí está publicado; `js/db.js` y `js/auth.js` nuevos siguen en PR #9 sin activar.
2. RH-1 (traspasos): implementado pero pendiente prueba autorizada; RH-3 (corte diario): formato publicado pero sin aperturas conciliadas; RH-4 (Administradora): completar con información válida y comprobar el flujo de envío.
3. Conciliar las 15 aperturas bancarias con Vale; no extrapolar importes de PDF de referencia.
4. Sincronizar el código fuente de la producción Vercel con GitHub antes de fusionar/desplegar repositorio entero.
5. Esta recuperación solo conserva **comentario y metadatos**. No puede reconstruir un adjunto perdido ni demostrar recepción si el servidor no confirmó el folio.

**No hay que marcar como resuelto un reporte sin evidencia del flujo real.**
