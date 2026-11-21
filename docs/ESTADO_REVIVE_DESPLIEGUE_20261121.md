# Revive Hogar — verificación final de entregas del 21/11/2026

**URL pública:** https://revive-hogar.vercel.app/
**Versión actual:** `dpl_DnWSbSVeoZ93LtmEky53X4dXXisR` (Vercel READY)
**Versión anterior inmediata para rollback:** `dpl_318cNW62v1ANQWd466hxbjSBc6QU`

## Cambios realmente publicados y verificados

1. **Storage protegido**: `/api/archivos` exige sesión, origen y autorización por rol/propietario. Solicitudes anónimas de subida, URL firmada o eliminación devuelven HTTP 401. Se quitó el fallback que guardaba documentos empresariales silenciosamente solo en el navegador.
2. **API nueva del ERP (servidor)**: `/api/datos` publicada **sin sustituir aún al cliente actual**. El listado de selección devuelve únicamente campos básicos y sin contraseñas; 8 usuarios activos visibles al último check. Las colecciones protegidas exigen sesión. Esta etapa aislada no cambia el comportamiento del personal.
3. **Reporte diario de Finanzas**: fecha seleccionable, resumen por cuenta con apertura/ingresos/egresos/traspasos/cierre, tablas de Ingresos, Egresos, Traspasos recibidos y enviados, observaciones, elaboración/autorización y fecha de impresión. Formato A4 horizontal basado en `Saldos diarios - formato.pdf` proporcionado en la conversación. En movimiento existe ahora **Empresa (opcional)**, reutilizada al imprimir.
4. **Sin aperturas inventadas**: si una o más cuentas no tienen fecha y saldo inicial conciliados, el documento dice **REPORTE PROVISIONAL** y las cifras finales figuran **SIN CONFIRMAR**. El PDF de referencia pertenece a otra razón social: sus valores monetarios NO se aplicaron a Revive.
5. **QA**: GitHub Actions en PR #10 pasó 56/56 pruebas sin navegador y prueba responsive en Chromium; se comprobó que el archivo JS exacto de GitHub se sirvió en producción (HTTP 200). La rama de migración de datos PR #9 pasó 71/71 pruebas aisladas y Chromium, pero NO se ha desplegado en los navegadores productivos.

## Integridad al finalizar

- 4 reportes en bandeja: RH-1, RH-3, RH-4 en revisión; RH-2 resuelto; sin folios nuevos.
- 15 cuentas, 2 movimientos, suma registrada $31,275.74.
- Cero traspasos reales realizados por QA y cero aperturas confirmadas.
- Los registros sintéticos temporales de prueba fueron eliminados; cero restos en la base.

## Bloqueos de cierre **reales**

**No declarar 100% cerrado hasta lo siguiente:**

- `public.rh_records` continúa con políticas heredadas de acceso anónimo. La migración a `/api/datos`, frontend y SQL de cierre están **preparados, probados con mocks, y pendientes en PR #9**. No aplicar la revocación hasta confirmar E2E con sesiones autorizadas de Dirección, Administradora, Marketing y Vendedor y contar con rollback probado. De lo contrario se rompería la app. También deben renovarse credenciales existentes como parte del endurecimiento, sin bloquear al equipo.
- Los 15 saldos de apertura requieren validación de Vale y la fecha real de corte. El PDF de muestra no es esa conciliación.
- RH-4 tiene requisitos obligatorios faltantes; diagnóstico sin PII en `docs/DIAGNOSTICO_RH4_ADMINISTRADORA_20261121.md` de PR #9. No editar cifras ni responder decisiones comerciales por la usuaria. El botón y el envío final aún requieren prueba autenticada.
- La validación con sesiones sintéticas reales de Vercel no se completó porque una restricción del entorno impidió la prueba remota. Los cinco registros temporales fueron limpiados y se verificó cero residuo. Las pruebas aisladas sí aprobaron.
- El árbol completo de GitHub no coincide con la fuente exacta del despliegue actual de Vercel; no fusionar ni redesplegar el repositorio entero.

**Regla operativa:** solo los cambios de archivos del último despliegue están publicados; el SQL que cierra CRUD anónimo está versionado pero NO aplicado. No afirmar que las 15 aperturas están conciliadas ni que RH-1/RH-3/RH-4 están resueltos.
