# Revive Hogar — Avance de implementación del 27/oct/2026

## Vista rápida

**Rama de integración segura:** `work/recovery-vercel-2026-10-27`  
**Preview QA:** https://revive-hogar-bn5ypkkqh-echauri-apps.vercel.app  
**Deployment:** `dpl_FeowAMLP6TNoNFB8BijrecVH5wUo` (READY, sin alias producción).  
**Producción:** `revive-hogar.vercel.app` — conservar intacta la versión CLI original `dpl_Cmrqr8sR4o77urpBKwHVAAb6FSZm`.

**NO MERGE / NO PROMOTE:** el Preview **NO tiene** `api/archivos.js` y por eso retorna HTTP 404 para el endpoint. Debe recuperarse íntegra la fuente de Vercel y comprobar Supabase/Storage. El Preview *no* reemplaza producción.

## Cambios funcionales realizados y probados

### Protección de datos (`js/db.js`)
- Instantánea independiente de IDs por colección: detecta bajas cuando código legado altera un arreglo devuelto por `DB.get` en el propio objeto.
- Los borrados pendientes salen de la cola **después** de confirmarse, nunca antes.
- Errores de escritura o borrado remotos emiten `RH-DB-001`/`RH-DB-002` y muestran `Error de nube` en vez de falsear estado sincronizado.
- Un `DB.remove` individual fallido restaura los registros de la vista local y devuelve `false`, código `RH-DB-003`.
- Los fallos en trabajos asincrónicos se capturan para no producir rechazos de promesas sin observar.

**Límite:** no hay todavía detección general de conflictos concurrentes ni reintento automático persistente ante cierre del navegador; no atribuirle solución a esos problemas sin diseñar control de versiones por registro.

### Métricas locales de uso (`js/usage-metrics.js`, `js/auth.js`, `index.html`, `js/render.js`)
- Aperturas de módulo e intentos de formularios de una lista fija; siete días, solo conteos diarios/rol/módulo.
- Pantalla **Auditoría** muestra la tabla agregada local y advierte claramente que no representa a toda la empresa.
- No captura nombres, usuario/ID, teléfonos, mensajes, contraseñas, datos financieros ni documentos.
- **No transmite a la nube** hasta que exista un backend de analítica autorizado con RLS.

### Captura con errores precisos (`js/utils.js`, `js/forms.js`)
- Corrección en validaciones iniciales de campañas y alta de prospectos.
- Enfoca campo faltante, marca `aria-invalid`, borra indicador al modificar y muestra códigos de soporte `RH-FORM-101/102/201/202/203/204`.
- No se eliminan restricciones de aprobación, contratos ni finanzas.

### Aislamiento de Preview (`js/config.js`)
- Despliegues preview de `revive-hogar-*-echauri-apps.vercel.app` inhabilitan `SUPABASE_URL`/`SUPABASE_ANON_KEY` en memoria del navegador. Los dominios estables de producción conservan su conexión.
- Evita que formularios de un Preview de desarrollo escriban en producción.
- **No representa un ambiente de pruebas en Supabase** ni una migración de seguridad.

## QA ejecutada (Vercel Sandbox aislado, solo datos sintéticos)

- `node scripts/test-db-sync.mjs`: **5 pruebas aprobadas**, incluye caída de red en delete y upsert, cola de borrados y restauración de registro.
- `node scripts/test-usage-metrics.mjs`: pruebas de validación, exclusión de PII y retención de 7 días.
- `node scripts/test-form-errors.mjs`: **8 aserciones** de enfoque y códigos.
- `node scripts/test-preview-isolation.mjs`: dominios de producción y Preview aislados según lo esperado.
- `node scripts/verify-release.mjs`: **113 comprobaciones estáticas satisfactorias, 4 bloqueos vigentes** (exit code 1). La salida no es aprobación para liberar.
- Despliegue Preview READY. HTTP 200 comprobado para portada, CSS/JS principales y foto 18. **HTTP 404 comprobado** para `/api/archivos` del Preview, que es una regresión real si se sustituyera producción.

## Cuatro bloqueos de liberación

1. `REV-REL-001` — falta código original `api/archivos.js` (función privada).
2. `REV-REL-001` — falta `scripts/setup-storage.js` (script backend).
3. `REV-SEC-001` — SQL antiguo contiene política permisiva `rh_anon_all` (no se ha validado RLS activo ni migrado).
4. `REV-SEC-002` — password de demostración en configuración/usuarios; falta migración a Supabase Auth tras backup.

Además, tres archivos del servidor y un log documental difieren de octubre: `api/ia.js`, `supabase/schema.sql`, `deploy.ps1`, `PROJECT_LOG.md`. Son seis fuentes privadas/no públicas a recuperar o comparar antes de producción.

## Siguientes tareas obligatorias

1. Descargar fuentes originales desde Vercel Source inspector o usando `scripts/recover-vercel-source.ps1` **desde el equipo con sesión Vercel CLI**; verificar que no se filtren credenciales antes de versionar.
2. Conectar la cuenta Supabase propietaria de Revive Hogar; backup completo DB/Storage, hashes y prueba de restauración en copia.
3. Auditar permisos por rol y API de archivos/IA. Diseñar y probar migración Auth/RLS sin romper sesiones ni usuarios.
4. Implementar y validar compradores/copropiedad, comisiones independientes, bancos, referidos, kits, contratos DOCX/PDF y borradores del video sobre la fuente completa.
5. Completar pruebas funcionales de flujo de propiedad/venta y concurrencia, QA móvil y rollback.
6. Solo entonces fusionar y desplegar la versión **probada** a producción.

Los resultados anteriores demuestran progreso real, no que el ERP esté terminado o que sea seguro cambiar producción hoy.


## Anexo de continuidad — 27 octubre, implementación posterior

### Sincronización reforzada
- Lectura de cada colección en bloques de 1.000 con orden estable para recuperar expedientes por encima del límite de PostgREST.
- Protección de cambios en memoria frente a eventos Realtime mientras existan escrituras locales pendientes.
- Envío de **solo los registros modificados**, no de toda la colección cada vez que hay flush, para evitar sobrescrituras ajenas innecesarias.
- Tres reintentos como máximo ante fallos transitorios y reactivación del envío al recuperar la conexión. No garantiza supervivencia de borradores tras cerrar el navegador.
- 12 pruebas sintéticas de sincronización aprobadas (subida de 5/5 a 12/12).

### Compradores independientes — primera versión funcional de rama
- Nueva colección `compradores`, módulo `mod-compradores`, navegación Comercial y permisos de interfaz por rol.
- Solo nombre y teléfono requeridos; correo, presupuesto, preferencia, asesor y notas en sección opcional.
- Crear, consultar, editar, buscar, archivar y restaurar sin modificar expedientes de propietarios existentes.
- Vendedor solo ve compradores asignados a él en la interfaz y no puede reasignar desde el formulario; la seguridad real sigue requiriendo RLS/servidor.
- **10 pruebas unitarias con datos ficticios aprobadas**, incluidas no duplicación, autorización UI, archivo y restauración.
- No se ha implementado todavía un vínculo transaccional completo entre comprador, propiedad, cierre de venta, notaría y distribución de comisiones. No declararlo finalizado.

### CI
- Trabajo `qa-sin-datos-reales` comprueba que los cambios no rompen los módulos; trabajo separado `puerta-produccion` permanece bloqueante mientras falten las fuentes privadas y la migración de Auth/RLS.
- Un check QA verde es distinto de un permiso de publicar: **NO MERGE mientras la puerta de producción esté fallando**.


### Protección posterior de datos y compradores
- El cierre de sesión ahora espera `DB.flush()`. Ante fallo de la nube, muestra `RH-DB-006` y mantiene abierta la sesión en vez de perder cambios silenciosamente. La salida pasa a la auditoría antes de sincronizarse.
- Se añadió aviso `beforeunload` cuando existen borradores de nube pendientes, sujeto a límites del navegador.
- Se amplió compradores para **vincular opcionalmente un inmueble existente por ID**, sin cambiar propietarios, contratos ni montos. Todavía no implementa cierre transaccional ni comisiones.
- 13 pruebas de sincronización, 10 de compradores y 10 aserciones de cierre de sesión aprobadas en Sandbox; pruebas existentes de privacidad y formularios también satisfactorias.
