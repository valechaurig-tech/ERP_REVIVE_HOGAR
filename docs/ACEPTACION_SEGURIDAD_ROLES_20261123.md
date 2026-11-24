# Revive Hogar — criterios de aceptación para cerrar acceso anónimo
Revisión del 23 de noviembre de 2026.

## Situación confirmada

- **Producción actual:** `dpl_HqSou2Y4vTRL2ZLuLiZUUDWrcNG6` (Vercel READY), https://revive-hogar.vercel.app/ .
- **Backend publicado:** `/api/datos` controla sesión, CSRF, perfiles y permisos por colección. Última corrección: inventario de propiedades visible a Vendedores sin permitirles edición de `casas`.
- **Frontend nuevo:** `js/db.js` y `js/auth.js` siguen solo en esta rama, SIN publicar. Cambiar ambos juntos; nunca publicar solamente `js/auth.js` mientras el `db.js` antiguo siga conectado directamente a Supabase.
- **SQL preparado, NO ejecutado:** `supabase/migrations/20261121_erp_cerrar_anon_PENDIENTE_QA.sql` y su rollback; `public.rh_records` aún permite CRUD anónimo.
- **QA sin usuarios reales:** pruebas unitarias de permisos, concurrencia y borrado de caché; Chromium en GitHub Actions con interfaz real y backend sintético para Dirección, Administradora, Marketing y Vendedor. No envía peticiones autenticadas ni datos privados a producción. Se corrigió que la lista de usuarios posterior al login fuese pública en vez de tener los campos de perfil autorizados.
- **Diferencias código/deploy:** ver `docs/DRIFT_GITHUB_VERCEL_20261123.md`. No fusionar el árbol completo de esta rama ni `main` a Vercel.

## Checklist de aceptación pendiente con sesiones autorizadas

| Flujo | Dirección | Administradora | Marketing | Vendedor |
|---|---|---|---|---|
| Inicio de sesión y restauración al recargar | Pendiente real | Pendiente real | Pendiente real | Pendiente real |
| Ver perfil propio sin exponer contraseñas | Pendiente real | Pendiente real | Pendiente real | Pendiente real |
| Editar perfil sin cambiar roles/permisos | Pendiente real | Pendiente real | Pendiente real | Pendiente real |
| Ver módulos y datos de su rol | Pendiente real | Pendiente real | Pendiente real | Pendiente real |
| Crear/editar una ficha **sintética**, recargar y confirmar persistencia | Pendiente real | Pendiente real | N/A si sin permiso | Pendiente real |
| Alertas privadas y destinatarios | Pendiente real | Pendiente real | Pendiente real | Pendiente real |
| Propiedades compartidas sin editarlas desde Vendedor | N/A | N/A | N/A | Pendiente real |
| Administradora: guardar borrador y bloquear envío incompleto RH-4 | N/A | Pendiente real | N/A | N/A |
| Finanzas: ver sin mutar saldos y comprobar la transferencia sintética | Pendiente real | Según permiso | N/A | N/A |
| Cerrar sesión, limpiar datos y bloquear API | Pendiente real | Pendiente real | Pendiente real | Pendiente real |

**Nota:** las pruebas sintéticas con Chromium y las unitarias son necesarias, pero no sustituyen estas pruebas de sesiones reales. La API pública `/api/datos?collection=usuariosLogin&login=1` lista solo perfiles activos con ID/nombre/rol/tipo, sin contraseñas, teléfonos ni correos. El formulario de login protegido debe seguir verificando la contraseña en servidor.

## Puerta de liberación sin romper producción

1. Obtener copia verificable de la fuente de las siete funciones API productivas y un respaldo antes de cambiar la aplicación.
2. Con la versión productiva en una rama reconciliada, preparar overlay **conjunto** de `js/db.js` y `js/auth.js`; probar desde las cuatro sesiones autorizadas, garantizando rollback al despliegue anterior.
3. Si cualquier rol pierde acceso o aparece error 401/403/409 inesperado, restaurar inmediatamente el despliegue conocido y NO ejecutar SQL.
4. Tras comprobar que ninguna sesión normal accede directamente a `rh_records` con la clave pública, revocar `anon`/`authenticated` en una transacción; verificar privilegios FALSE, roles funcionando y recuentos de DB intactos.
5. Realizar rotación controlada de contraseñas existentes (guardadas como texto plano); no destruir ni invalidar cuentas antes de implantar un verificador de hashes compatible y probado.
6. Documentar aceptación por cada rol, fecha, SHA, despliegue y migración antes de declarar seguridad CERRADA.

## Otros bloqueos

- RH-1: UI de traspasos disponible, pendiente de comprobación funcional del equipo.
- RH-3: corte diario con formato solicitado, pendiente de aceptación y conciliación contable.
- RH-4: nueva lista persistente de requisitos publicada; aún necesita completarse la propuesta auténtica sin inventar valores.
- Vale debe confirmar fecha y saldos iniciales de las 15 cuentas, actualmente **0/15 conciliadas**.
- Estado preservado: 15 cuentas, dos movimientos, saldo registrado agregado $31,275.74, 0 transferencias reales en QA.

**Criterio de no cierre:** una aplicación funcional y pruebas automáticas aprobadas no bastan si `public.rh_records` sigue accesible de manera anónima.
