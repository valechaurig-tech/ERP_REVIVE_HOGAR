# Catálogo de errores — Revive Hogar ERP

Fecha: 27/10/2026. Solo códigos **implementados** o detectados por el comprobador. No incluye identidad ni datos de clientes.

## Sincronización
| Código | Situación | Acción del usuario | Tratamiento técnico |
|---|---|---|---|
| `RH-DB-001` | Supabase rechazó la escritura de una colección | No asumir guardado; verificar conexión y contactar soporte | Se conserva el estado en memoria durante la sesión; el indicador pasa a error. Es necesario reintentar y verificar confirmación. |
| `RH-DB-002` | Supabase rechazó un lote de eliminaciones | No repetir manualmente sin revisar el registro | El ID queda en la cola; se puede reintentar sin perder la baja pendiente. |
| `RH-DB-003` | Falló la eliminación de un registro individual | No considerar completada la eliminación | El registro se restaura en la vista local y se muestra error de nube. |

## Captura
| Código | Situación | Campo |
|---|---|---|
| `RH-FORM-101` | Falta nombre de campaña | `camp-nombre` |
| `RH-FORM-102` | Falta canal de campaña | `camp-canal` |
| `RH-FORM-201` | Falta nombre completo o tiene menos de tres caracteres | `pros-nombre` |
| `RH-FORM-202` | Falta teléfono de contacto | `pros-tel` |
| `RH-FORM-203` | Falta asignar vendedor | `pros-vendedor` |
| `RH-FORM-204` | Vendedor no existe o no está activo | `pros-vendedor` |

La validación enfoca el campo, lo marca temporalmente como inválido y muestra el código. **No se flexibilizaron requisitos financieros, legales o de seguridad.**

## Comprobador previo a liberación
| Código | Situación |
|---|---|
| `REV-REL-001` | Falta código fuente crítico de funciones o herramientas |
| `REV-REL-002` | Referencia a JavaScript inexistente |
| `REV-REL-003` | Colección avanzada ausente |
| `REV-REL-004` | Fotografía de recorrido faltante |
| `REV-REL-005` | JPEG incompleto o corrupto |
| `REV-REL-006` | JavaScript con error de sintaxis |
| `REV-SEC-001` | SQL mantiene política anónima permisiva `rh_anon_all` |
| `REV-SEC-002` | Se utiliza una contraseña inicial de demostración |

## Limitaciones antes de producción
- La sincronización todavía **no resuelve conflictos concurrentes** entre empleados ni reemplaza un respaldo; pendiente control de versión por registro.
- No se ha verificado todavía que el esquema SQL que figura en GitHub coincida con el esquema **activo** de producción.
- Autenticación y autorización de API/RLS requieren migración segura **después** del respaldo y de recuperar el backend exacto.
- Los contadores `RH_USAGE` son **locales** al navegador, solo agregados de siete días; no son un panel empresarial consolidado.
- Este catálogo no autoriza fusionar ni desplegar el PR mientras `verify-release.mjs` tenga bloqueos.


## Compradores (cartera nueva, independiente del propietario)
| Código | Situación | Campo |
|---|---|---|
| `RH-BUY-001` | Nombre de comprador ausente o demasiado corto | `comprador-nombre` |
| `RH-BUY-002` | Teléfono sin al menos 7 dígitos | `comprador-telefono` |
| `RH-BUY-003` | Presupuesto máximo numérico inválido, negativo o excesivo | `comprador-presupuesto` |

El registro nuevo solo exige nombre y teléfono; los demás datos quedan opcionales. `compradores` es una colección distinta a `prospectos` y `casas`; archivar no elimina registros. Los controles de rol actuales son de interfaz y **no sustituyen la autorización del servidor**.

| `RH-DB-004` | Falló lectura paginada de una colección | Mantener vista sin confirmar; consultar conectividad y permisos |
| `RH-DB-005` | Una colección excede el máximo configurable de 10,000 registros | No reemplazar caché por un resultado truncado |
| `RH-DB-006` | No se confirmó el guardado al cerrar sesión | Permanece la sesión abierta, se debe recuperar conexión y volver a intentar |

La aplicación advierte ante intento de cerrar la pestaña cuando mantiene escrituras en memoria sin confirmar. **La advertencia no es un respaldo** y el navegador puede no mostrarla en todos los dispositivos.


## Compradores — seguimiento
| Código | Motivo | Campo |
|---|---|---|
| `RH-BUY-004` | Fecha de próximo contacto inválida o imposible | `comprador-proximo-contacto` |

## Copropietarios declarativos
| Código | Motivo | Campo |
|---|---|---|
| `RH-OWN-001` | Nombre incompleto | `tit-nombre` |
| `RH-OWN-002` | Participación individual fuera de rango 0–100% | `tit-participacion` |
| `RH-OWN-003` | Copropietario activo duplicado | `tit-nombre` |
| `RH-OWN-004` | Suma de participaciones declaradas mayor de 100% | `tit-participacion` |

Las participaciones declaradas no son evidencia de dominio ni modifican pagos, utilidades o expedientes contractuales.
