# Inteligencia de mercado y prioridad de venta — Revive Hogar

**Corte de investigación:** 2026-11-05 (México)  
**Naturaleza:** investigación documental y de oferta publicada, NO avalúo, validación jurídica ni previsión estadística de velocidad de venta.  
**Autorización:** investigar sí, publicar/no contactar/no modificar ERP todavía.

## Objetivo ejecutivo

Priorizar viviendas con **menor fricción para concretar venta real** y mayor probabilidad observable de conversión, no elegir por ticket. **Comisión de referencia informada = 2% del valor de la operación**; calcular como referencia bruta, confirmar quién la recibe, base, descuentos, impuestos, momento de devengo, cobro efectivo y eventuales repartos.

**Fuente de inventario:** Google Sheets «Inventario propiedades Revive Hogar», pestaña `PROPUESTA`, leída el 5-nov-2026. Es la base viva del inventario y los estados deben corroborarse de forma humana. No reproducir direcciones exactas, nombres de propietarios ni información privada en este repositorio público.

## Lectura de inventario

- 52 fichas con identificación; 24 `DISPONIBLE`, 20 `APARTADA`, 8 `VENDIDA`.
- De 24 disponibles, 22 tienen precio, 2 no; 13 de las disponibles están por debajo de $900,000.
- Concentración visible de inventario económico en Tlajomulco/El Salto, más líneas de Bahía de Banderas y una en Aguascalientes.
- La hoja tiene inconsistencias en identificadores, ubicación y estados que impiden lanzar todo a la vez.
- Aunque 24 están `DISPONIBLE`, **no existe evidencia actual de disponibilidad confirmada**, posibilidad de visitas, crédito aceptado, documentación ni velocidad de cierre por unidad.

## Evidencia sobre el mercado

### México y Jalisco: qué podemos afirmar

1. ITESO, `Boletín de Análisis Económico N°30` (publicado 2026-04-06): basado en **ofertas digitales de diciembre de 2025**, no ventas cerradas. Reconoce submercados de vivienda económica en Tlajomulco y segmentación entre colonias. Fuente editorial de ITESO: https://rei.iteso.mx/items/fc45458b-54c4-4766-85ed-2b2e5338946a . El portal ITESO también lista edición especial N°38 de julio de 2026, con datos de junio, que convendrá usar en análisis territorial posterior: https://iteso.mx/web/general/detalle?group_id=5394827 .
2. `Propiedades.com` publica para **Valle de los Encinos, casas** precio medio $609,917, 60 m² de construcción de referencia e inventario activo de 23; datos actualizados 2026-09-01: https://propiedades.com/valores/valle-de-los-encinos-tlajomulco-de-zuniga/casas-venta . No es un avalúo individual ni corresponde necesariamente a un dúplex planta alta remodelado.
3. `Propiedades.com`, **Valle de Tejeda, departamentos**, reporta precio medio $490,885, mediana 45 m² e inventario activo 9, actualizado 2026-10-01: https://propiedades.com/valores/valle-de-tejeda-tlajomulco-de-zuniga/departamentos-venta . No comparar sin controlar planta, estado, acabado y gravámenes.
4. Para Tlajomulco, una fuente privada `Acierta Max` declara inventario actualizado 2026-11-05, pero su mediana municipal incluye fraccionamientos de alto valor; **no representa el submercado de propiedades de $500k–$900k**: https://acierta.pro/zonas/tlajomulco-de-zuniga/casas-en-venta.html .
5. La SHF informó en mayo de 2026 una apreciación interanual 12.5% del índice en la ZM Guadalajara para el primer trimestre; evidencia de encarecimiento, **no de ventas rápidas**: https://www.gob.mx/shf/es/articulos/indice-shf-de-precios-de-la-vivienda-en-mexico-primer-trimestre-de-2026 .
6. Demanda cualitativa: un hilo público de Guadalajara de abril de 2026 menciona a una persona que buscaba vivienda para crédito cercano a $700 mil y comparaba Chulavista vs El Salto. Es **una señal anecdótica y antigua**, no un comprador activo identificado ni base para una tasa de demanda: https://www.reddit.com/r/Guadalajara/comments/1sfxbdi/chulavista_o_el_salto/ .

### Conclusión de mercado

Sí existe un mercado identificable de vivienda de entrada, pero ninguna fuente abierta aquí prueba `días para vender` ni `porcentaje de cierre` por colonia. La absorción se medirá internamente con contactos cualificados, visitas realizadas, ofertas, apartados válidos y cierres; el precio por sí mismo es una variable secundaria.

## Auditoría de precios y hechos — contradicciones detectadas

| Código | En la hoja | Fuente publicada externa | Resultado y decisión |
|---|---|---|---|
| **RHV041 Valle de los Encinos** | Disponible; $720,000; 2 rec; 60 m² | EasyBroker $720,000, 2 rec, 60 m² y 17 fotos | **Candidato sólido para validar primero**, sujeto a crédito/estado/legalidad/visitas |
| **RHV029 Valle de Tejeda** | Disponible; $599,000; 65 m²; 1.5 baños | EasyBroker $590,000; **44.74 m² y 1 baño**, 3 fotos | **RETENIDO:** corregir precio, superficie y baños antes de campaña |
| **RHV043 Los Cántaros** | Disponible; $690,000 | EasyBroker $720,000; Inmuebles24 $690,000; sitio principal Áurea mostró $690,000 | **RETENIDO:** resolver divergencia entre canales y foto ilustrativa |
| **RVH012 La Fortuna** | Disponible; $680,000 | Inmuebles24 $680,000 en título y **$620,000 en descripción**; URL EasyBroker dada por hoja no accesible (404 en revisión) | **RETENIDO:** confirmar precio actual, estado, enlace y ficha final |
| **RVH018 Hacienda Santa Fe** | Disponible; $980,000; domicilio registrado en hoja difiere | EasyBroker $980,000; 49 m², 14 fotos, **domicilio publicitado distinto** | **RETENIDO:** comprobar que el inmueble/folio corresponde a la misma unidad |
| **RHV051 Los Fresnos vs RVH014 Circuito Aguacate** | RHV051 disponible / RVH014 vendida; dirección aparentemente coincidente | No se ha comprobado que sean dos unidades distintas | **RETENIDO RHV051** hasta acreditar diferencia |
| **RHV045 Real del Valle vs RVH026 Santa Martha** | RHV045 disponible / RVH026 apartada; descripciones/domicilio similares | No se ha comprobado si son dos unidades distintas | **RETENIDO RHV045** |
| **RHV036 vs RHV048 Valle Esmeralda** | 1.4M / 1.24M; direcciones muy parecidas | Diferente metraje y precio, puede haber dos unidades | **CONCILIAR**, no suponer duplicidad |
| **RHV033** | Mismo ID aparece para dos inmuebles distintos | — | **Corregir identificador** antes de asociar campañas/leads |
| **RVH007 Arvento** | $510,000, sin ubicación ni fotos/ficha suficiente | No fue posible corroboración | **NO PUBLICAR** hasta completar |
| **RVH027 y RHV028** | Disponible, sin precio | — | **NO PUBLICAR** |

Fuentes:
- RHV041: https://aurea-bienes-raices.easybroker.com/property/departamento-en-planta-alta-en-venta-valle-de-los-encinos-tlajomulco-de-zu
- RHV029: https://aurea-bienes-raices.easybroker.com/property/departamento-en-venta-en-valle-de-tejeda-rvh
- RHV043: https://aurea-bienes-raices.easybroker.com/property/casa-duplex-en-venta-los-cantaros-tlajomulco-de-zuniga y https://www.inmuebles24.com/propiedades/clasificado/veclcain--casa-duplex-en-venta-los-cantaros-tlajomulco-de-150736942.html
- RVH012: https://www.inmuebles24.com/propiedades/clasificado/veclcain--casa-en-venta-la-fortuna-etapa-3-tlajomulco-de-149142994.html
- RVH018: https://aurea-bienes-raices.easybroker.com/property/casa-en-venta-en-hacienda-santa-fe-tlajomulco-de-zuniga-9db5d747-fef4-400c-b3df-6d9276147bc6

## Competencia: ejemplos contrastables

**Valle de los Encinos:** un anuncio indexado de dúplex planta alta de 2 recámaras por $815,250, última comprobación pública 2026-10-22, **SIN VERIFICAR** por ese agregador; comparación útil solo para hipótesis, no para avalúo: https://listu.mx/property/567a2b06-42fd-45bd-b2c8-1a549f5d7e6b .

**Valle de Tejeda:** oferta publicada $590,000 / 44.88–45 m² / 2 recámaras / segundo piso: https://www.inmuebles24.com/propiedades/clasificado/veclapin-departamento-en-venta-en-fraccionamiento-valle-de-148330902.html . Alinear si es la misma propiedad o una oferta diferente antes de llamarla comparable independiente.

**Los Cántaros:** ofertas de departamentos por $419,000–$459,000 con 41–45 m², distintas de la vivienda de 72 m² de Revive; no afirmar que Revive está cara porque no son comparables equivalentes: https://www.inmuebles24.com/inmuebles-en-venta-en-fraccionamiento-los-cantaros-con-2-recamaras.html . Existe oferta similar 72 m² en $1,197,000 con condición/coto distintos; extremo que tampoco prueba valor objetivo: https://www.inmuebles24.com/propiedades/clasificado/veclcapa-acepto-infonavit-2-recamaras-150982614.html .

**Guadalajara/Tlajomulco:** hay una oferta amplia de vivienda en portales; evitar promedios de todo municipio debido a mezcla de segmentos, casas, cotos y lujo.

## Cola comercial por facilidad de preparación (no pronóstico de velocidad)

### A — Verificar primero esta semana
- **RHV041 Valle de los Encinos:** precio/datos básicos coinciden con página pública y 17 imágenes. Faltan crédito, disponibilidad real, expediente y visita.
- **RHV023 Los Abedules:** hoja $820,000 y 2 recámaras; aparece una ficha pública relacionada por $820,000/65m² pero la URL concreta no se pudo leer; comprobar identidad y fotos.
- **RHV053 Lomas de Quito:** hoja $810,000; ficha enlazada no se pudo recuperar; comprobar estado y crédito.
- **RHV039 Quintas del Valle:** hoja $590,000, 2 recámaras/62 m²; confirmar enlace y condiciones antes de hacer piezas.
- **RHV049 Eucaliptos:** hoja $990,000; aparece referencia pública de $990,000/78 m², pero el enlace concreto no fue accesible. Puede entrar si se valida y demuestra buena salida.

### B — Atractivas por precio pero BLOQUEADAS
- **RHV029** Valle Tejeda, **RVH012** La Fortuna, **RHV043** Los Cántaros, **RVH010** La Purísima: corregir discrepancias de precio, datos o disponibilidad de ficha antes de campaña.
- **RVH007** Arvento: $510,000 sin datos suficientes.

### C — Segundo frente
- **RHV034–RHV036 y RHV046/RHV048** Bahía de Banderas/Nayarit, más competidores y comunidades locales distintas. Venta potencial de mayor ticket, pero no se asume más rápida.
- **RHV044** Aguascalientes: operación remota diferente, requiere asesor/visitas.
- **RVH016** residencial $2.1M: no prioridad inicial por ticket.

**Regla:** la cola A puede cambiar tras una sola revisión documental. Si RHV041 tiene problema jurídico o no acepta crédito objetivo, pierde prioridad inmediatamente.

## Validación mínima para cada propiedad

`id_interno`, `nombre_corto`, `zona`, `estatus_confirmado`, `fecha_ultima_confirmacion`, `precio_venta_autorizado`, `comision_pct_y_quien_cobra`, `formas_de_pago_aceptadas`, `estado_juridico_y_gravamen`, `avaluo_dictamen_si_aplica`, `fotos_reales_y_derechos`, `responsable_de_visita`, `disponibilidad_de_llaves`, `link_publico_vigente`, `objeciones_y_respuestas_comprobables`.

**Infonavit 2026:** el monto depende de la precalificación individual, y la vivienda usada debe cumplir requisitos de avalúo/Dictamen Técnico de Calidad cuando aplique. Evitar prometer «te alcanza» o «crédito aprobado». Fuente oficial revisada julio 2026: https://portalmx.infonavit.org.mx/wps/portal/infonavitmx/mx2/derechohabientes/quiero_credito/quiero_comprar/ .

**Normativa:** la NOM-247-SE-2021 sigue vigente según Secretaría de Economía y exige publicidad clara, veraz y comprobable: https://platiica.economia.gob.mx/normalizacion/nom-247-se-2021/ .

## Métricas de la operación inicial

- Consultas públicas realmente pertinentes por zona y presupuesto
- Personas que voluntariamente escriben solicitando ficha
- Proporción de interesados con crédito viable / forma de pago viable
- Tiempo de respuesta humana; cita/visita realizadas
- Tasa de oferta por visita, cierre por oferta y comisión efectivamente cobrada
- Razones de rechazo: zona, precio, mantenimiento, piso, acceso, crédito, documentos

No inventar conversiones ni extrapolar días de venta de anuncios sin fecha comparable. Primeras mediciones solo después de ejecutar la prueba autorizada.

**Todos los hallazgos son investigación y deben ser revalidados antes de publicar.**
