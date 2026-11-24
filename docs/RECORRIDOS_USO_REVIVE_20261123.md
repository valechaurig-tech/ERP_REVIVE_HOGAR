# Revive Hogar — lectura inicial del recorrido de navegación
Corte de consulta: 23/11/2026. Fuente: agregados de `public.rh_uso_diario`, sin nombres ni expedientes.

## Datos observados (no son sesiones únicas)

| Día | Rol | Evento | Módulo / destino | Ocurrencias |
|---|---|---|---|---:|
| 2026-11-23 | Dirección | module_open | mod-dashboard | 1 |
| 2026-11-23 | Dirección | module_open | mod-gastos-empresa | 1 |
| 2026-11-23 | Dirección | transition | mod-dashboard > mod-gastos-empresa | 1 |
| 2026-11-23 | Dirección | form_open | form-movimiento-empresa | 1 |
| 2026-11-23 | Dirección | form_open | form-traspaso-empresa | 2 |

**Suma: 6 eventos en 5 registros agregados.** El último fue el 23 de noviembre alrededor de las 10:20, hora del centro de México, según `actualizado_en` en la base.

## Lo que sí se puede concluir

- Se observó una transición de **Panel a Finanzas**.
- Se abrieron formularios de traspaso y movimiento. Abrir no equivale a guardar.
- El uso de la función de traspaso tuvo al menos dos aperturas, pero en la tabla de transferencias aún hay **cero operaciones**.
- El registro de eventos está conectado a Supabase y conserva los agregados.

## Lo que NO debe concluirse

- No se puede afirmar que Administradora, Marketing o Vendedor no utilizan el sistema: solo significa que todavía no existen agregados centrales correspondientes a esos roles.
- No puede calcularse tasa de conversión, retención ni tiempo de permanencia a partir de estos cinco renglones.
- Una apertura repetida puede corresponder a prueba o navegación y no necesariamente a un problema.
- No hay evidencia de que el intento de RH-4 se haya repetido desde que se corrigió el aviso de requisitos.

## Próximas mediciones sin PII

1. Mantener solo **día, rol, evento y destino**; jamás registrar nombres, teléfonos, importes bancarios, contraseñas ni contenido de formularios.
2. Evaluar eventos de `validation_blocked` y `form_completed` únicamente después de revisar el allowlist del endpoint de métricas y el consentimiento correspondiente, distinguiendo intentos de guardados confirmados.
3. Separar pruebas sintéticas y actividad del equipo, sin mezclar sus métricas. Nunca insertar eventos falsos en la tabla productiva.
4. Tras al menos varios días de navegación normal por todos los roles, comparar transiciones y módulos con frecuencias significativas.
5. Relacionar incidencias RH-1/RH-3/RH-4 con eventos agregados para priorizar UX, pero sin inferir cuál persona generó cada reporte.

**Estado:** tablero de datos parcial. No marcar módulos como no utilizados por ausencia de señal en esta muestra.
