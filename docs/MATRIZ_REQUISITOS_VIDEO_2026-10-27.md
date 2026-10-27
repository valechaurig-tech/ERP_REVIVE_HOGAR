# Matriz de aceptación — recorrido real Revive Hogar

Fuente principal: `Transceipcion revive.pdf`, conversación grabada 26 octubre 2026, 7 páginas. Referencia a la misión `MISIÓN MAESTRA — REVIVE HOGAR ERP` 27 octubre 2026.

> El estado **no es completo** por existir archivo, pantalla o plantilla. Las filas siguientes son solicitudes del recorrido; su cobertura en el deployment completo continúa **sin prueba funcional**.

| Páginas | Módulo | Problema descrito | Comportamiento esperado | Dependencias que hay que inspeccionar | Estado | Prueba de aceptación |
|---|---|---|---|---|---|---|
| 1–2 | Propiedades/expediente | No existe entrada visible para datos del comprador, confusión comprador/propietario | Registrar comprador distinto, vinculado a inmueble y vendedor responsable | expediente.js, forms.js, relación persona–operación | Pendiente: fuente completa | Crear, salir, reabrir y ver ambos sin duplicación |
| 2–3 | Contabilidad y bancos | Falta elegir banco/cuenta para egresos por referido/propiedad | Cuenta bancaria, saldo inicial, CLABE, medio y movimiento enlazado | gastos.js, gastos-empresa.js, cuentasBancarias | Parcial identificado, no probado | Transferencia no duplica ingresos; egreso descontado exactamente una vez |
| 2 | Comisiones | No distingue captador y quien vende | Dos asesores independientes; % o importe y devengo diferenciado | propiedad, caso, personal, finanzas | Pendiente de verificar | Mismo/distinto asesor sin comisiones repetidas |
| 2–3 | Utilidades | Sin reparto claro empresa/socio ni anticipo conciliado | Resultado por inmueble real vs proyectado, pagos y participación socios | presupuestos, gastos, banco | Parcial identificado | Sumas y conciliación con movimientos reales |
| 3–4 | Propiedades | No hay flujo evidente para 'Vendida' ni filtros claros | Estado vendida y fecha; conservar historial y reportes | recorrido.js, expediente.js | Pendiente de verificar | Cambio a vendida actualizado en todas las pantallas |
| 4 | Captación | Registro de prospecto obliga datos no disponibles | Registro rápido y enriquecimiento progresivo | marketing, forms.js, db.js | Pendiente de verificar | Borrador parcial recargable; sin pérdida |
| 4 | Copropietarios | No permite indicar compra/propiedad conjunta y voluntad de venta | Personas vinculadas, porcentaje y consentimiento cuando aplica | expediente y contratos | Pendiente de verificar | Alta 2 copropietarios y sus autorizaciones |
| 4–6 | Formularios | Se piden campos/documents antes de tiempo y bloquean | Pasos lógicos; validación por etapa y configurable por Dirección | configuracion.js, forms.js, expediente.js | Parcial: configuración ya existe | Guardar borrador incompleto, enviar con validación correcta |
| 4–6 | Guardar y enviar | El botón bloquea sin explicar qué falta | Separar Guardar, Borrador, Enviar, Aprobar, Cerrar; errores por campo y enlace | validaciones, auditoría | Pendiente de verificar | Error lleva al campo; excepción autorizada queda auditada |
| 5–7 | Expediente | No se visualizan los documentos subidos ni su ubicación | Ver, descargar, versionar, validar y rastrear adjuntos | archivos.js, api/archivos.js, Storage | Parcial: existen archivos, no probado | Subir, reabrir, descargar y comprobar permisos |
| 5–7 | Kits | Se requiere kit notaría/avalúo en un clic | Checklist por etapa y ZIP de archivos autorizados | expediente.js, archivos.js | Pendiente de verificar | ZIP usable, sin documentos ajenos |
| 4–7 | Contratos | Formato incorrecto, impresión con hoja en blanco, campos prematuros | Usar plantillas oficiales aprobadas, DOCX editable, PDF legible | documents.js, templates legales | Dependencia: formatos oficiales | DOCX/PDF revisión paginación, cláusulas, caracteres |
| 3–4 | UI | Scroll horizontal y alta confusa | Sin desbordes; navegación por pestañas adaptable | CSS, index, forms.js | Pendiente de verificar | Móvil 390 px, tablet y escritorio, teclado |
| Solicitud maestra | Rastreador de uso | Sin evidencia sobre formularios abandonados y fricción | Eventos mínimos, tablero Dirección, observación 7 días sin PII | auth, almacenamiento, analítica | Pendiente | No recolecta valores, passwords, documentos ni bancos |

## Observaciones que deben preservarse

1. En la página 3, la operadora confirma: **"No, así como está, está bien"**. No rehacer el producto desde cero ni eliminar pantallas que funcionan.
2. En la página 4, prefiere **llenado por módulos/pestañas** y poder capturar sin requerir todo desde el inicio; Dirección podrá configurar obligatoriedad, pero nunca saltarse restricciones legales/seguridad/finanzas.
3. En páginas 5–6, `Guardar y enviar` bloquea debido a un calendario de pagos que el usuario no comprendía; NO quitar la conciliación financiera, sino distinguir borrador de cierre y explicar los importes pendientes.
4. En páginas 5–7 solicita poder encontrar los documentos ya guardados y generar kits; no considerar exitoso un upload hasta comprobar persistencia, permisos y descarga.
5. Plantillas jurídicas definitivas para notaría/contratos **no fueron entregadas en la transcripción**. No inventar cláusulas.

## Orden de trabajo cuando la fuente esté íntegra

- **Preflight:** snapshot reproducible, backup DB+Storage, restauración, RLS/roles/API, conflictos de sincronización.
- **Flujo 1:** prospecto → propiedad → propietario/copropietario → comprador → expediente → operación vendida.
- **Flujo 2:** cuentas → anticipo/apartado → pago egreso → referido/comisión → conciliación → utilidad y socios.
- **Flujo 3:** documento capturado → storage → expediente → kits → PDF/DOCX oficiales.
- **Flujo 4:** eventos mínimos de uso y errores, 7 días, tablero para Dirección.
- **Gate de publicación:** pruebas de regresión pasando, QA móvil, preview aislada, plan de reversión, autorización de despliegue.

## Criterios no negociables

- Crear / Consultar / Editar / Archivar autorizado / Recuperar cuando aplique; roles verificados en servidor.
- No escribir silenciosamente a un `localStorage` diferente después de una falla de Supabase.
- No reemplazar objetos completos ni eliminar registros por sincronización sin comprobación de versión y conflictos.
- Auditoría de cambios financieros: no doble pago, no doble ingreso y transferencias entre cuentas propias neutrales en ingresos.
- No instrumentar pulsaciones, imágenes, documentos, claves, CURP/NSS, montos individuales ni contenido de formularios.
- No modificar `main`, producción ni políticas activas sin autorización, respaldo y QA.

## Evidencia de esta ejecución

- Consulta GitHub: rama `main` SHA `6fdcfb7bb786b16ae521a613a93a66d5643e8e70`; PR: ninguno.
- Consulta Vercel: `dpl_Cmrqr8sR4o77urpBKwHVAAb6FSZm` READY y estructura `src/` de 64 archivos.
- Rama nueva: `work/recovery-vercel-2026-10-27`.
- Ninguna de las pruebas funcionales listadas arriba ha sido ejecutada todavía.
