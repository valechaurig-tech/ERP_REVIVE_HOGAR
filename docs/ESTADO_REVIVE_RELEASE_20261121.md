# Revive Hogar — 21 de noviembre de 2026
## Versión real de producción y continuidad

**Producción:** https://revive-hogar.vercel.app/
**Nuevo despliegue:** `dpl_UZGzkGqbSSHMPM83ENEhMrr9LENH` (READY).
**Despliegue anterior, para recuperación:** `dpl_G6A7EuqC7XwLmeJEM58mRMtuEDEZ`.

Este despliegue se construyó conservando las referencias SHA1 de 98 archivos exactos del último despliegue real y reemplazando solo cuatro scripts. La rama principal de GitHub NO equivale al código desplegado. No hacer merge o redeploy desde main hasta recuperar el árbol completo y comprobar que incluye las funciones API.

### Scripts cambiados (SHA1 servido por producción)

- `js/forms.js`: `7b799f61496bd1710213c3e2c791401b403c2060` — Administradora: los intentos inválidos de finalización no mutan el expediente cacheado ni sincronizan el presupuesto; se muestra causa y pestaña de revisión.
- `js/gastos-empresa.js`: `a66976ae5405c50a18b022ca1cdee02f7f92e8d4` — cuenta obligatoria al guardar nuevo movimiento; bloquea eliminación de cuentas referenciadas; permite crear caja tipo efectivo desde el formulario vigente.
- `js/usage-metrics.js`: `f4e7181aef022c109521508ddf51a4caf48ff21e` — eventos de navegación local agregados por rol (7 días) sin identidad personal; no sincroniza en tabla pública.
- `js/render.js`: `2b594b55556ee70e767378f10ebda6a24a5edbd8` — el panel utiliza los contadores locales y distingue ausencia de medición de ausencia de uso.

**QA:** 17 pruebas Node aprobadas; los cuatro scripts se sirvieron desde el enlace público de producción (HTTP 200; hash SHA1 exacto); los endpoints sin sesión `/api/sesion` y `/api/pruebas` respondieron HTTP 401 en vez de exponer datos. Vercel READY, sin errores de ejecución observados en la ventana consultada. **Limitación:** no se verificó la finalización real con una cuenta de Administradora ni una transacción comercial, ya que no se deben modificar expedientes ni saldos reales.

### Reportes al terminar la revisión

| Folio | Diagnóstico | Estado en base | Acción |
|---|---|---|---|
| RH-1 | Transferencias entre cuentas | nuevo | Pendiente de diseño e implementación atómica de traspasos |
| RH-2 | Recepción confirmada | resuelto | Cerrado; sin fallo funcional |
| RH-3 | Corte diario por cuenta como formato Vale/Alexis | nuevo | Pendiente de conciliación de saldos iniciales y reporte |
| RH-4 | Administradora: no deja avanzar | en_revision | Se corrigieron protecciones y orientación de validaciones, pero la causa específica y su resolución real aún requieren reproducción con un caso de prueba aislado |

No se recibieron reportes nuevos durante esta revisión. Los reportes históricos RH-3/4 ya están en la nueva bandeja con sus capturas.

### Seguridad aún pendiente — NO ocultar

La tabla `public.rh_records` continúa disponible desde el cliente con políticas demasiado amplias; no cerrar RLS sin migrar las lecturas y escrituras a API con autorización real por rol, pues se rompería la app. Las tablas de apertura `revive_finanzas` sí se encuentran privadas. Se necesita una entrega independiente de migración de auth/datos con regresiones de Dirección, Vendedor y Administradora y rollback.

### Datos financieros preservados

15 cuentas, 2 movimientos, saldo global registrado $31,275.74; 15 aperturas sin conciliar. No se realizaron cambios a saldos ni a datos financieros existentes durante este despliegue.

### Adopción de funciones

En el último análisis histórico existían 54 eventos de auditoría, 22 de historial y cero `actividadUso` central. Ruta observada: vendedor inicia un prospecto y lo envía a Administración; Administradora guarda 3 borradores; no consta el envío final. No equivale a estadísticas de clics ni prueba desuso de otros módulos.

Las métricas locales ahora pueden registrar desde el navegador que navega, pero siguen **sin registro agregado de todo el equipo**. Para ello se necesita una tabla privada de telemetría agregada y un endpoint con sesión verificada, métricas mínimas por rol y retención limitada. No almacenar datos de formularios, nombres o archivos en telemetría pública.

### Para la siguiente entrega

1. QA real RH-4 con cuenta y expediente ficticio, sin tocar el caso comercial real.
2. Crear traspaso interno atómico, con prevención de duplicados; saldo final = apertura + ingresos + traspasos recibidos − egresos − traspasos enviados.
3. Conciliar las 15 cuentas con Vale (fecha de arranque e importes); no inferir apertura a partir de saldos actuales.
4. Ejecutar migración a API con autorización en servidor y asegurar `rh_records`.
5. Recuperar árbol fuente completo de producción en repositorio/versionado y preparar reversiones verificadas antes del siguiente lanzamiento.
