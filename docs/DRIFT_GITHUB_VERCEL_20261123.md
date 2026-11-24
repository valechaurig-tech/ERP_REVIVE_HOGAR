# Revive Hogar — inventario de diferencias GitHub / producción
Fecha de auditoría: 23-11-2026 (continuación del cierre técnico).
**Despliegue de referencia:** `dpl_7zRL6JDG61q7bm6oj6CcLfysMfci` en https://revive-hogar.vercel.app/ .
**Comparación:** contenido HTTP real de 67 archivos públicos, comparado byte por byte con `main` y `security/erp-servidor-roles-20261121` (PR #9, SHA `779d3fc53f432803624f522171136937ca5fd408`). No se inspeccionaron datos privados, cuentas, claves ni contraseñas.

## Resultado

| Referencia GitHub | Idénticos al despliegue | Diferentes | Ausentes |
|---|---:|---:|---:|
| `main` | 6 | 22 | 39 |
| Rama de seguridad PR #9 | 41 | 21 | 5 |

No se detectaron errores HTTP al obtener los 67 archivos.

### Rama PR #9 — 21 archivos públicos diferentes

- `css/app.css`
- `index.html`
- `js/app.js`, `js/auth.js`, `js/brand.js`, `js/caso-detalle.js`
- `js/compradores.js`, `js/config.example.js`, `js/config.js`, `js/db.js`
- `js/forms.js`, `js/gastos-empresa.js`, `js/ia-features.js`, `js/luna.js`
- `js/modules.config.js`, `js/operaciones-venta.js`, `js/prueba-nota.js`
- `js/services.js`, `js/titulares.js`, `js/utils.js`
- `scripts/setup-storage.js`

### Rama PR #9 — 5 archivos ausentes

`activar-pruebas.html`, `css/pruebas.css`, `js/pruebas-imagen.js`, `js/vendor/html2canvas-1.4.1.min.js`, `js/vendor/html2canvas-LICENSE.txt`.

### Límites del inventario

- Las funciones privadas `api/sesion.js`, `api/finanzas.js`, `api/pruebas.js`, `api/uso.js`, `api/ia.js`, `api/archivos.js` y `api/datos.js` forman parte del despliegue pero **no pueden verificarse mediante un GET público como archivos fuente**. No afirmar que están recuperadas o iguales a GitHub.
- Algunos recursos pueden incluir configuración o material sensible de la instalación. No copiar indiscriminadamente esos archivos a otra ubicación sin revisión previa.
- La rama de seguridad PR #9 propone un **cliente nuevo** distinto al actual: en `js/db.js` y `js/auth.js` esa diferencia es intencional y requiere QA antes de ser sustituida.

## Ruta segura hacia una fuente única

1. Respaldar el despliegue completo Vercel y documentar los siete archivos de servidor como fuentes pendientes de reconciliación.
2. Revisar configuración antes de copiar o versionar cualquier archivo; no publicar credenciales ni permitir que el frontend acceda a `service_role`.
3. Aislar los cambios públicos aprobados (formularios de RH-4, borradores de Pruebas, corte diario) y conciliarlos con la rama de trabajo en un PR independiente, sin sobreescribir las APIs.
4. Ejecutar tests de los cuatro roles, operaciones y rollback en un entorno de QA con credenciales exclusivas de QA. Los tests browser con API ficticia son necesarios pero no sustituyen sesión real.
5. Solo después de una aceptación de Dirección/Administradora/Marketing/Vendedor, desplegar el cliente nuevo y revocar el permiso anónimo a `public.rh_records`.

**Prohibido:** fusionar `main`, PR #9 o PR #12 directamente a producción. Seguir publicando cambios específicos sobre snapshots verificados y preservar los 104 archivos restantes cuando solo se cambie un archivo.
