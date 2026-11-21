# Revive Hogar — auditoría de incidencias y adopción

Actualizado: 2026-11-20 (hora México). Fuente: lectura de Supabase real, capturas originales en `rh_records`, código de la rama de rediseño y despliegue productivo identificado en Vercel. **Este documento no incluye datos personales ni identificadores financieros, porque el repositorio es público.**

## I. Incidencias y capturas

La bandeja nueva `public.rh_pruebas_reports` contenía dos reportes. La colección heredada `rh_records: notasPrueba` contenía otros dos, con imagen JPEG íntegra. El 20/11 se copiaron esos dos a la bandeja nueva mediante request_id estable por origen. Los originales siguen intactos.

| Folio central | Pantalla | Diagnóstico | Acción / estado |
|---|---|---|---|
| 1 | Finanzas | Falta traspaso interno entre cuentas | Abierto; diseñar operación indivisible, origen/destino y sin duplicar ingresos/egresos |
| 2 | Inicio | Prueba explícita de recepción | **Resuelto**, entrega verificada y estatus cerrado en la base |
| 3 | Finanzas | Solicita corte diario con diseño de referencia | Abierto; usar formato de saldos diarios entregado por la empresa, no el reporte mensual |
| 4 | Administradora | «No me deja avanzar» | Abierto y prioritario; captura muestra una fila pendiente, pero no un mensaje de error. No inferir causa exacta |

**Precaución RH-4:** Los logs de auditoría muestran un proceso en el que un prospecto fue enviado a Administración y un expediente se guardó como borrador tres veces, sin evento posterior de propuesta finalizada. El código comprueba reglas obligatorias, coherencia financiera y algunas condiciones de comisiones al pulsar «Guardar y enviar». Hay que reproducir cuál condición impide completar la acción con un caso anonimizado. **No deshabilitar ni saltar validaciones legales, económicas o documentales.**

QA propuesto RH-4:
1. Abrir una ficha existente con rol Administradora y comprobar ambos botones «Ver caso» y «Expediente».
2. Abrir pestañas Datos, Ubicación y Documentos y comprobar que ninguna desaparezca.
3. Guardar borrador, recargar y confirmar que datos y documentos persisten.
4. Intentar finalizar con campos incompletos y verificar que se muestre el motivo específico y el campo correcto.
5. Completar un conjunto ficticio válido y comprobar avance a Propuesta lista y alerta de vendedor.
6. No escribir nada en casos reales durante la simulación y no simular éxito si no hay prueba real.

## II. Qué se ha usado: datos verificables

**`actividadUso`: cero eventos en producción.** Por ello NO se puede identificar qué módulos no se usan ni calcular embudos de navegación globales. Hay 54 eventos históricos en auditoría y 22 en historial, útiles para reconstruir operaciones de negocio, pero no clics ni minutos en pantallas.

- Auditoría por rol: Dirección **31** acciones, Administración **9**, Vendedores **14** (54 en total).
- Entradas/cierres de sesión contabilizados en auditoría: **25** eventos, no 25 personas únicas.
- Se observan altas de 15 cuentas, movimientos financieros, capturas de prospectos, envíos a administración y tres guardados de borrador.
- Existían ocho prospectos en la base al auditar, de los cuales uno seguía en Administración; también 6 presupuestos, 5 propiedades y 2 movimientos de empresa.
- No afirmar que Marketing, Pipeline, Documentos u otros módulos están abandonados: sin instrumentación central los datos no permiten concluirlo.

**Causa del vacío de telemetría:** el script de métricas consultaba `window.currentUser` mientras Revive maneja `let currentUser` en un script clásico. Eso impedía anotar los eventos de navegación en la cola de nube. Esa cola, además, pretendía guardar identificadores y nombres dentro de `rh_records`, tabla actualmente expuesta a clientes. Es **inseguro** activarla así.

## III. Trabajo preparado y verificación

- PR #4: saldos de referencia y aperturas preparadas en esquema privado de Supabase. Migración aplicada y comprobada, sin alterar saldos vigentes.
- PR #5: movimientos con cuenta obligatoria, protección contra eliminación de cuentas en uso, cuenta de efectivo y QA de integridad. **Siete pruebas aprobadas**, sin despliegue.
- PR #6: métricas **solo locales y agregadas** por rol/dispositivo de los últimos 7 días, apertura de módulos/formularios/pestañas y sesiones, sin IDs/nombres ni subida a la tabla pública. Panel distingue «sin registro» de «sin uso». QA automatizado aprobado. **No centraliza aún el uso del equipo.**
- Vercel conserva el despliegue de producción anterior: no hay nueva publicación desde estas ramas.

## IV. Prioridades, criterios de cierre

**P0 — Seguridad y alineación de fuentes:** reconstruir de forma verificable la versión real desplegada en Vercel y compararla archivo por archivo con GitHub. No mezclar las ramas ni publicar un árbol anterior. Convertir acceso directo a `rh_records` en una API con sesión validada por servidor y permisos por rol; probar Dirección, Administradora y Vendedores antes de revocar `anon`. No romper pruebas/capturas ni sincronización.

**P1 — Administradora RH-4:** reproducir el bloqueo con datos ficticios, mostrar las validaciones faltantes de forma comprensible y comprobar borrador/finalización. No cambiar estatus de un prospecto real para probar.

**P1 — Finanzas RH-1/RH-3:** conciliar los saldos con una fecha de arranque acordada; implementar traspasos atómicos entre cuentas, cuentas de efectivo, fechas de corte e impresión del reporte diario con apertura, ingresos, egresos, traspasos recibidos/enviados y cierre. No usar saldos actuales como apertura histórica.

**P1 — Métricas de uso multiusuario:** después de asegurar la sesión, crear tabla privada de eventos mínimos con identificación seudónima, rol, módulo/pestaña, tipo de acción, marca temporal y retención corta (30 días). API autenticada de inserción, lectura solo Dirección y sin textos de formularios ni documentos. Construir mapa de recorridos **observados** con tiempos aproximados y abandonos de formularios, señalando las limitaciones; comparar por rol y fecha.

**P2 — Incidencias únicas:** mantener un único destino de reportes; las notas heredadas pueden seguir consultándose, pero los envíos nuevos deben ir siempre a `rh_pruebas_reports`. Confirmar reintentos, capturas móviles y borradores persistentes.

## V. Reglas de entrega

- Hacer backup lógico y ensayos de restauración antes de cualquier migración de seguridad o financiera.
- No tocar cuentas, importes, prospectos ni documentos reales en QA.
- Exigir tests y revisión de regresión de roles, accesos, capturas, navegación, sincronización y finanzas.
- Solo desplegar tras comparar la fuente real de producción y contar con pruebas de inicio/cierre de sesión, lectura/escritura autorizadas y rollback verificado.
- Nunca presentar ausencia de telemetría como ausencia de uso.

Fuentes técnicas: Supabase `fqoyvmhanouirqlcgskz`, despliegue Vercel `dpl_G6A7EuqC7XwLmeJEM58mRMtuEDEZ`, ramas y PR #4–6 de GitHub. No compartir credenciales ni datos privados en el repositorio público.
