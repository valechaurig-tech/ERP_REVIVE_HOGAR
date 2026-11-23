# Revive Hogar — auditoría y puerta de cierre seguro (23-11-2026)

## Cambios realizados y comprobados

- **API de datos reforzada en producción** con despliegue `dpl_4x4EDDjhb2DXwFW1nKKKuh9vhbEG` (Vercel READY). Se publicó únicamente `api/datos.js` preservando por SHA los otros 104 archivos del despliegue anterior `dpl_DnWSbSVeoZ93LtmEky53X4dXXisR`.
- Un usuario puede modificar **su perfil propio**, incluidos nombre, correo y teléfono, sin cambiar `rol`, `tipo`, `activo` ni su `id`. La contraseña anterior se conserva si el usuario no introdujo otra nueva. La operación mantiene el control de concurrencia del sello de modificación.
- Un Vendedor **no puede leer casas ajenas** por el proxy ni recibir contactos privados de otros perfiles. Se preserva su propio perfil completo para edición.
- Se confirmaron **76/76 pruebas sin navegador** en Vercel Sandbox, con sintaxis validada. GitHub Actions de la revisión final **aprobó** las pruebas unitarias y la prueba visual responsive con Chromium (run 45274857330, 23-11-2026). El primer intento visual falló por una excepción intermitente de `undici` al consultar el servidor local de la prueba, no por un fallo confirmado del ERP; el smoke fue corregido para usar `node:http` y volvió a aprobar.
- Smoke real: `/`, `js/db.js`, `js/auth.js` y `js/gastos-empresa.js` HTTP 200; `/api/datos?collection=prospectos`, `/api/finanzas`, `/api/pruebas` y `/api/uso` devuelven 401 sin sesión; envío cruzado a `/api/datos` devuelve 403. El selector público contiene 8 perfiles sin exponer contraseñas ni datos de contacto.
- Las tablas `rh_pruebas_*`, `rh_fin_*` y `rh_uso_*` no otorgan operaciones a `anon`; **la única tabla pública anónima con CRUD sigue siendo `public.rh_records`**.
- Se intentó preparar una prueba E2E con cuentas sintéticas; **la ejecución remota fue bloqueada por controles de seguridad antes de realizarse**. Los tres registros temporales fueron eliminados y se verificó que no quedan registros `rhqa_%`.
- No hay nuevos reportes ni errores de runtime en la hora comprobada. RH-1/RH-3/RH-4 en revisión, RH-2 resuelto. Datos financieros inalterados: 15 cuentas, 2 movimientos, suma de saldos registrada $31,275.74, 0 traspasos, 0 aperturas conciliadas.

## IMPORTANTÍSIMO: NO revocar aún acceso anónimo a la tabla principal

La interfaz actual **sigue leyendo y escribiendo directamente en `public.rh_records`**. Quitar su política `rh_anon_all` hoy haría perder acceso a la información del ERP. La API segura de servidor ya está publicada, pero `js/db.js` y `js/auth.js` migrados siguen solo en esta rama.

Tampoco se realizó validación E2E autenticada con sesiones de Dirección, Administradora, Marketing y Vendedor, ni se han reemplazado contraseñas existentes por hashes verificables. Las 76 pruebas aisladas no cubren esos pasos.

## Secuencia obligatoria pendiente

1. Conciliar fuentes de `api/sesion.js`, `api/pruebas.js`, `api/finanzas.js` y `api/uso.js` desde la versión publicada a GitHub antes de fusiones o redespliegues del árbol completo.
2. Crear entorno de QA con credenciales propias, sin exposición de datos reales, o realizar pruebas autorizadas desde los roles reales sin entregar contraseñas a terceros.
3. Verificar inicios/cierres de sesión, edición de perfil, alta/edición de expedientes, archivos, Finanzas y navegación por todos los roles; comprobar que la API rechace cambios de propietario, escalamiento y concurrencia.
4. Publicar **solo** los cambios cliente `js/db.js` y `js/auth.js` sobre el snapshot verificado; verificar a cada rol con rollback listo. No modificar saldos ni expedientes reales para simular pruebas.
5. Tras la validación anterior, aplicar la migración versionada `20261121_erp_cerrar_anon_PENDIENTE_QA.sql` (y solo entonces); comprobar permisos y que todos los roles siguen operativos.
6. Rotar y proteger gradualmente credenciales, validando la compatibilidad del login. Documentar aceptación por Dirección, Administradora y Vendedores.

## Pendientes funcionales

- RH-1: traspasos implementados; falta operación autorizada validada por usuario.
- RH-3: informe de Alexis implementado, pero cierre financiero **provisional** hasta conciliar fechas y saldos iniciales de 15 cuentas con Vale.
- RH-4: requisitos documentales y monetarios de Administradora incompletos en el caso real. No falsificar importes ni respuestas para declarar resuelto.
- Pruebas: los borradores fallidos se guardan solo en la pestaña abierta. Evitar afirmar recepción cuando no existe folio confirmado.

**Principio de cierre:** conservar la operación de la empresa, no presentar como aprobadas las pruebas autenticadas bloqueadas y cerrar solo con evidencia verificable.

## Avance adicional del 23-11-2026 — sincronización y alertas

- Corregida la sincronización después de un **INSERT**: el cliente ahora pide `record_id, updated_at` a la API y conserva el sello de tiempo confirmado por el servidor, evitando rechazos por concurrencia en la segunda edición inmediata. Prueba explícita de crear-editar-guardar sin recargar añadida a `scripts/test-db-sync.mjs`.
- Protección de las **alertas personales**: la API filtra por `targetUserId` y `targetRoles` con la misma semántica que `alertaVisibleParaUsuario` de la interfaz. La Dirección tiene acceso a todas las alertas. Una actualización no puede cambiar sus destinatarios ni falsificar el autor; las alertas nuevas reciben la identidad del creador desde la sesión.
- Pruebas ampliadas con diferentes identidades simuladas: **81/81 automáticas sin navegador aprobadas**. Integridad financiera y QA integral de GitHub Actions aprobadas en la ejecución comprobada.
- **Despliegue seguro de solo backend publicado**: `dpl_77QSKGd2d1ZX1fp4JXgFrtH8LNWj` (READY) en https://revive-hogar.vercel.app/ , overlay exclusivo de `api/datos.js` sobre `dpl_4x4EDDjhb2DXwFW1nKKKuh9vhbEG`. Los otros 104 archivos no se alteraron.
- Smoke de producción: aplicación y scripts HTTP 200; endpoints privados devuelven 401 sin sesión, origen cruzado devuelve 403; ocho perfiles de acceso, **sin contraseñas ni contactos** en la lista pública. Sin errores de ejecución registrados en la última hora de consulta.
- Estado de base **no modificado**: 15 cuentas, 2 movimientos, suma registrada $31,275.74, 0 transferencias, 0 aperturas confirmadas, 0 residuos de QA. Bandeja: RH-1, RH-3 y RH-4 siguen en revisión; RH-2 resuelto; sin nuevos.
- **Límite fundamental**: la corrección del cliente `js/db.js` todavía NO se ha activado en producción. La política `rh_anon_all` de la tabla principal sigue abierta porque el cliente actual la necesita. Mantener la migración y el SQL de revocación separados hasta pasar E2E autenticado y disponer de reversión verificada. Evitar declarar cierre de seguridad prematuramente.
