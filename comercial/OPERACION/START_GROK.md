# LEER PRIMERO — Revive Hogar Comercial para Grok
**Archivo único de arranque. Fecha 2026-11-06. Objetivo: ahorrar tokens.**
**GitHub original:** `valechaurig-tech/ERP_REVIVE_HOGAR`, rama `work/mesa-comercial-revive-hogar-2026-11-05`, carpeta `/comercial/OPERACION/`.

## 1. Quién hace qué

**ChatGPT:** investigación, ranking, comparables, estrategia, fotos/diseño, imágenes publicitarias, copys, emojis, comentarios, respuestas y optimización.

**Grok:** solo computadora: confirmar identidad y permisos de Facebook, comprobar grupos y reglas, localizar posts públicos de personas que quieren comprar, registrar enlaces y más adelante **subir/publicar contenido EXACTO aprobado** por ChatGPT+Dirección, con autorización explícita. No reescribir publicidad ni investigar mercado de nuevo.

**Equipo Revive:** confirma precio y disponibilidad, autorizaciones de foto, crédito, acceso a inmuebles, cuenta publicadora, asignación de lead y comisión de referencia 2% (bruta teórica, sin promesa).

## 2. Material que YA te dejamos

**No vuelvas a buscar precios ni recopilar todo el inventario:**
- [Catálogo legible](./CATALOGO_OPERATIVO.md): **24 fichas marcadas disponibles por hoja**, incluida **RVH012 La Fortuna NO DISPONIBLE por corrección del usuario**. Quedan 23 fichas que podrían evaluarse, ninguna autorizada todavía.
- [Catálogo JSON](./CATALOGO_OPERATIVO.json): lectura de `estado_operativo`, precio e hipervínculo de ficha/fotos. `estado_operativo` prevalece sobre la hoja.
- [Borradores editoriales y biblioteca de comentarios](./FICHAS_Y_COPYS_BORRADOR.md): hechos, emojis, anuncios y respuestas por situaciones.
- [Foto y dirección creativa](./FOTOGRAFIAS_Y_DISENO.md): enlaces a galerías reales, reglas y materiales que faltan. Fotos **NO descargadas ni copiadas**.
- [Autorización](./PLANTILLA_APROBACION_CAMPANA.md): una por cada campaña, aún vacía.
- Paquetes cortos individuales: [RHV041](./PAQUETES/RHV041.md), [RHV039](./PAQUETES/RHV039.md), [RVH023](./PAQUETES/RVH023.md), [RHV053](./PAQUETES/RHV053.md), [RHV049](./PAQUETES/RHV049.md).
- [Investigación de grupos](../CANALES_GRUPOS_Y_SENALES_DEMANDA_2026-11-05.md).
- [Cuenta de Facebook y Fase 0](../RESULTADO_GROK_FASE_0_Y_DECISION_FACEBOOK_2026-11-05.md).

## 3. Regla prioritaria de estados

`NO_DISPONIBLE_USUARIO`, `EXCLUIDA_*`, `BLOQUEADA_*` → **NO PROMOCIONAR**.  
`CANDIDATA_VALIDAR`, `REVALIDAR` → **INVESTIGAR EN SOLO LECTURA, NO PROMOCIONAR**.  
`APROBADO_PUBLICAR` → SOLO si existe un paquete aprobado actual por ID/versión/destino, con autorización inequívoca de Dirección y reglas de Facebook compatibles.

**Prohibición absoluta:** `RVH012 La Fortuna` ya no está disponible, aunque la hoja aún diga DISPONIBLE. No buscar interesados ni publicar.

## 4. Fase actual y siguiente tarea operativa

El operador ya informó que tiene **una sesión de Facebook autorizada**, pero no verificó Página Revive Hogar/Áurea. El usuario indica que otorgó acceso adicional, pero **NO se ha documentado aún la identidad concreta** que lo tiene.

**Primero**, verificar SOLO qué Página/perfil empresarial real está autorizado en el nuevo acceso. Si hay duda, `PERFIL_NO_CONFIRMADO`, no publicar. No crear cuentas ni cambiar accesos.

**Después**, con orden específica del usuario, revisar hasta cinco grupos hiperlocales en Tlajomulco/Valle de los Encinos; registrar reglas y solicitudes públicas. No contactar.

**Posteriormente**, al existir campaña aprobada, abrir **solo el paquete del ID** indicado y el registro de autorización. NO volver a leer todos los archivos.

## 5. Formato ultracorto de salida (máximo 250 palabras por misión)

```text
FASE: [IDENTIDAD / GRUPOS / PUBLICACION_APROBADA]
CUENTA: [URL pública o NO_VERIFICADA]
GRUPOS: [número vistos / aptos / no verificables]
RESULTADOS:
- URL | ESTADO | REGLA | ULTIMA_ACTIVIDAD
- URL | ESTADO | REGLA | ULTIMA_ACTIVIDAD
INTERESES_PUBLICOS: [máximo 3 URLs públicas; sin datos personales]
BLOQUEOS: [concretos]
SIGUIENTE_ACCION: [una sola]
FIN
```

No enviar capturas completas, listas de miembros, teléfonos, perfiles privados, contraseñas o datos de compradores a GitHub. Si hay CAPTCHA/2FA o bloqueo de plataforma, reportar y detenerse.

## 6. Eficiencia de tokens

- Primero `START_GROK.md`, luego **un solo archivo por misión**.
- Máximo 5 grupos y 3 posts públicos por ejecución.
- Sin deep research, sin scraping de perfiles privados, sin loops ni campañas masivas.
- No leer el ERP ni ramas técnicas, no hacer commits fuera de `/comercial/OPERACION` sin autorización.
- Si falta un recurso, `BLOQUEADO_DATO` y termina. **No inventar copys, fotos, precios ni reglas.**

**La mesa y los materiales existen. El que exista un borrador NO implica que se pueda publicar.**
