# RH-4 · Diagnóstico funcional sin datos personales
Fecha de verificación: 21/11/2026

## Evidencia

- Reporte RH-4: “NO ME DEJA AVANZAR”, pantalla `mod-administradora`, captura recuperada y conservada en la bandeja unificada.
- Hay **un expediente** en estatus `En administradora`, con tres guardados anteriores como borrador y sin evidencia de que se haya enviado la propuesta final.
- Se revisó exclusivamente la **presencia y validez** de requisitos en `public.rh_records` y el código real `js/configuracion.js`; no se extrajeron nombres, teléfonos, credenciales ni documentos.

## Requisitos que impiden pasar la validación actual

En el expediente pendiente, la regla `campoAdmin` exige respuesta no vacía y, para importes, valor mayor a cero. La verificación detectó:
- Sin respuesta: `requierePoder` (definir si necesita poder), `liquidaInfonavit` (definir si liquidará INFONAVIT), `tieneReferido` y `tieneComisionVenta`.
- Sin importe positivo: `montoAdquisicion`, `presupuestoRemodelacion`, `gastosAdministrativos` y `precioVentaEstimado`.
- También pueden faltar requisitos condicionales y documentos; no se ha demostrado que este sea el único bloqueo.

No se deben inventar importes, responder Sí/No por la usuaria ni omitir las reglas de obligatoriedad. La corrección previamente desplegada ya muestra los requisitos faltantes y permite guardar el borrador.

## QA de cierre faltante

1. Con sesión autorizada de Administradora, abrir ese expediente y reproducir el botón que se reportó.
2. Completar únicamente con datos reales y autorizados (o en una copia sintética aislada).
3. Verificar validaciones, guardar borrador, recargar, finalizar y enviar propuesta.
4. Comprobar recepción en Vendedor y trazabilidad en Auditoría.
5. Marcar RH-4 resuelto únicamente con ese recorrido aprobado, sin tocar el expediente comercial para simular éxito.

Estado: **en revisión**. La causa exacta del mensaje original no puede concluirse solo por la captura; estas son las validaciones que hoy rechazarían un envío incompleto.
