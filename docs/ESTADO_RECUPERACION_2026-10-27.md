# Revive Hogar — Estado verificable de recuperación (27 octubre 2026)

## Resultado alcanzado
- Rama aislada: `work/recovery-vercel-2026-10-27` (**NO desplegar sobre producción**).
- Fuente de verdad comparada: Vercel CLI production deployment `dpl_Cmrqr8sR4o77urpBKwHVAAb6FSZm`.
- GitHub `main` permanece en `6fdcfb7bb786b16ae521a613a93a66d5643e8e70`, sin merge.
- El árbol fuente Vercel contiene 64 archivos; el árbol recuperado de GitHub tenía 65 tras la incorporación de 2 documentos de auditoría y la ausencia de 2 fuentes privadas. Se agregó después el comprobador estático `scripts/verify-release.mjs`.
- Recuperación real: archivos avanzados de `js/`, `index.html`, `css/app.css`, `captura.html`, `tour.html`, `vercel.json`, `.vercelignore`, las 18 fotografías binarias del recorrido y los 3 logos PNG de producción. Cada elemento se descargó del dominio de Vercel, no se recreó por aproximación. GitHub conserva `.gitignore`.
- `js/config.js`, `js/config.example.js`, `js/brand.js`, `js/ia-features.js`, `js/luna.js` y SVG públicos se conservaron al verificar que el texto coincide con producción (normalizado CRLF).
- **No se considera recuperación íntegra del backend**, aunque el frontend sea casi completo.

## Preview aislado de la rama
- Deployment Vercel: `dpl_GXRSv5P3zbcADQqwkjHqkWTWhnk5`, READY, target preview (sin alias de producción).
- URL: https://revive-hogar-3b0jqcv1o-echauri-apps.vercel.app
- HTTP 200 confirmado para `/`, `/js/expediente.js`, `/demo-visita/01.jpg`.
- HTTP 404 confirmado para `/api/archivos?action=invalid`: backend privado ausente de GitHub. **Este Preview NO reemplaza producción**.

## Prueba de liberación ejecutada de verdad
- Comando ejecutado en sandbox aislado sobre el branch: `node scripts/verify-release.mjs`.
- **107 verificaciones exitosas y 4 bloqueos esperados** (exit code 1):
  - `REV-REL-001`: falta `api/archivos.js`.
  - `REV-REL-001`: falta `scripts/setup-storage.js`.
  - `REV-SEC-001`: `supabase/schema.sql` versionado incluye política `rh_anon_all` permisiva.
  - `REV-SEC-002`: `js/config.js` declara contraseña inicial de demostración.
- La prueba es *estática*: la salida 107/4 no sustituye pruebas funcionales, backup, análisis de permisos ni restauración.

## Fuente no íntegra y verificaciones pendientes
1. Los dos archivos `api/archivos.js` y `scripts/setup-storage.js` forman parte del despliegue CLI. El endpoint Vercel de recuperación por UID devuelve solo un fragmento truncado para esos archivos; no se escribió un reemplazo inventado.
2. `api/ia.js`, `supabase/schema.sql` y `deploy.ps1` ya existían en GitHub antiguo y el contenido exacto de octubre **no se pudo contrastar integralmente** (SQL y script de deploy muestran diferencias en los primeros fragmentos). Requieren su original antes de liberar.
3. No hay sesión del proyecto Supabase de Revive Hogar en las tres conexiones revisadas (`Primary`, `DO Selectas`, `Trading`). No existe backup ni prueba de restauración en esta ejecución.
4. Las políticas RLS activas, credenciales de producción, Storage, logs, tráfico y datos reales **no fueron modificados ni validados**. No ejecutar una migración de seguridad a ciegas.
5. No se ejecutó prueba funcional de guardado, buyer/owner, comisiones, finanzas, ZIP notaría, subida de archivos, edición concurrente, IA ni cierre de venta.
6. La transcripción del recorrido de 7 páginas y la matriz de 14 grupos de necesidades están documentadas en `docs/MATRIZ_REQUISITOS_VIDEO_2026-10-27.md`. Esas mejoras **siguen pendientes**; recuperación de código no equivale a implementarlas.

## Puertas para mover a producción
- Recuperar del equipo original la fuente exacta de `api/archivos.js`, `scripts/setup-storage.js`, `api/ia.js`, `supabase/schema.sql` y `deploy.ps1`, sin secretos, y verificar hash/contrato contra Vercel.
- Conectar el Supabase correcto y hacer backup **real** de base de datos y Storage; restaurar copia de muestra en entorno aislado.
- Cambiar autentificación, autorización API/RLS mediante migración probada sin interrumpir trabajadores.
- Terminar cambios solicitados del video por bloques, con validación de regresiones y doble check de saldo/archivos.
- Ejecutar el comprobador hasta exit code 0 y pruebas funcionales en Preview con datos sintéticos.
- Solo con todo anterior y autorización expresa realizar merge/promoción. Mantener rollback documentado.

## Protección
No se realizó merge a `main`, ni se reasignó `revive-hogar.vercel.app`, ni se ejecutó ninguna operación de Supabase.
