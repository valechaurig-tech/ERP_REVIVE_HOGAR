# Revive Hogar — Rescate e inventario contrastado (2026-10-27)

> **INVENTARIO / SOLO DIAGNÓSTICO. NO ES FUENTE COMPLETA NI AUTORIZA DESPLIEGUE.**

## Identidad de las fuentes

- GitHub: `valechaurig-tech/ERP_REVIVE_HOGAR` rama `main` SHA `6fdcfb7bb786b16ae521a613a93a66d5643e8e70` (10 julio 2026).
- Vercel: proyecto `prj_1Pfp3uI9f0aVlJDdTo3H9Yjllqi5`, deployment de producción `dpl_Cmrqr8sR4o77urpBKwHVAAb6FSZm` (5 octubre 2026), estado READY.
- Rama aislada actual: `work/recovery-vercel-2026-10-27`, creada desde `main` **solo para recuperación y auditoría**; todavía contiene componentes de julio: **NO DESPLEGAR**.
- No se han hecho cambios a `main`, Vercel ni a la base de datos.

## Conteo reproducido por las dos conexiones

| Métrica | Resultado |
|---|---:|
| Archivos de la fuente Vercel `src/` | 64 |
| Archivos GitHub `main` | 35 |
| Archivos presentes únicamente en Vercel | 30 |
| Archivos comunes por nombre (contenido no verificado) | 34 |
| Archivos presentes únicamente en GitHub | 1 |
| Archivos JavaScript en fuente Vercel (incl. `api/` y `scripts/`) | 30 |

### Archivos que faltan en `main` (recuperar del original, NO recrearlos a ciegas)

- `.vercelignore`
- `api/archivos.js`
- `captura.html`
- `demo-visita/01.jpg`
- `demo-visita/02.jpg`
- `demo-visita/03.jpg`
- `demo-visita/04.jpg`
- `demo-visita/05.jpg`
- `demo-visita/06.jpg`
- `demo-visita/07.jpg`
- `demo-visita/08.jpg`
- `demo-visita/09.jpg`
- `demo-visita/10.jpg`
- `demo-visita/11.jpg`
- `demo-visita/12.jpg`
- `demo-visita/13.jpg`
- `demo-visita/14.jpg`
- `demo-visita/15.jpg`
- `demo-visita/16.jpg`
- `demo-visita/17.jpg`
- `demo-visita/18.jpg`
- `js/archivos.js`
- `js/configuracion.js`
- `js/expediente.js`
- `js/gastos-empresa.js`
- `js/gastos.js`
- `js/recorrido.js`
- `js/referidos.js`
- `scripts/setup-storage.js`
- `tour.html`

### Archivos solo GitHub

- `.gitignore`

## Inventario por archivo

**Importante:** UID es el **identificador de archivo reportado por Vercel**, no un hash criptográfico verificable. Los SHA mostrados son de blobs GitHub. No compararlos entre sí ni declarar equivalencia por un nombre compartido.

| Archivo fuente Vercel | Estado | UID Vercel | SHA blob GitHub (prefijo) |
|---|---|---|---|
| `.vercelignore` | Solo Vercel | `919f33363556f80f27cc2a2e97a537a4b8c8465d` | — |
| `api/archivos.js` | Solo Vercel | `95642932d1ed2162b7407ac0b93adcd8dd49adbc` | — |
| `api/ia.js` | Compartido, contenido no validado | `ae84d0856f1ba7649bc84e4db7896f32ec929717` | `240dda65a085` |
| `assets/echauriapps-logo.svg` | Compartido, contenido no validado | `8b62e4eb9e4554fabb8a93bf46b97fcbd7f22a02` | `a9358e9437dd` |
| `assets/revive-hogar-logo-full.png` | Compartido, contenido no validado | `8813c1c19f50f7a9f4d6db9af6f741ddc198433e` | `a8948d746e0c` |
| `assets/revive-hogar-logo-full.svg` | Compartido, contenido no validado | `cd4de39c4b0bb7ac4e4604fd5efc81ff92b6cc3a` | `3679a8608119` |
| `assets/revive-hogar-logo.png` | Compartido, contenido no validado | `00212d3c925deda864224d0d8c81c1e866f7851c` | `82af59fd42dc` |
| `assets/revive-hogar-mark.png` | Compartido, contenido no validado | `329b429f796db655025c270cc22a4d77fcef2a61` | `727dfd07022f` |
| `assets/revive-hogar-mark.svg` | Compartido, contenido no validado | `2beac38f0c39578ba554c9e910328b82b88f0d83` | `065038e90681` |
| `captura.html` | Solo Vercel | `e5dd9e9119987042eb69bbe7cc334998e79231dd` | — |
| `css/app.css` | Compartido, contenido no validado | `02a58a175af3f6b81d7a70183f2eaa5ede175ee1` | `d1d1d2254b1d` |
| `demo-visita/01.jpg` | Solo Vercel | `3f8fe6a54f9b1573efa6c0ff22b8b0e8a5d7f871` | — |
| `demo-visita/02.jpg` | Solo Vercel | `07b00769267f96da6750cf449e1a63b9acd41f00` | — |
| `demo-visita/03.jpg` | Solo Vercel | `acdbf4a9f3c38aff544879aaeadb2a6bcf22ffcd` | — |
| `demo-visita/04.jpg` | Solo Vercel | `3ecf49eb3693232dc01be8d682cfef05531d8b1b` | — |
| `demo-visita/05.jpg` | Solo Vercel | `de0d14826c6c6af29a00e42c27b3de92dbbd47ec` | — |
| `demo-visita/06.jpg` | Solo Vercel | `6d97e4e725d20c41a5ccc5ff323e34a9b84d6f4b` | — |
| `demo-visita/07.jpg` | Solo Vercel | `a10a52200ffd58cecefde597345b67e18daaf37f` | — |
| `demo-visita/08.jpg` | Solo Vercel | `215177d5f37c3aeea2a4d04dcd027d51b2d15949` | — |
| `demo-visita/09.jpg` | Solo Vercel | `13d96a45bd361d132c3c4ba091361a3f3e589e5b` | — |
| `demo-visita/10.jpg` | Solo Vercel | `605352873ec74e676e521e1921873337877585f5` | — |
| `demo-visita/11.jpg` | Solo Vercel | `eb1b4bdb120433fb5ff95f4555c4385bea9e6bb5` | — |
| `demo-visita/12.jpg` | Solo Vercel | `a490b2a139f8acc0f463b3c991015f790d9a9693` | — |
| `demo-visita/13.jpg` | Solo Vercel | `7968a7c7324550b2559f9c5f6d8d6e4b8610a419` | — |
| `demo-visita/14.jpg` | Solo Vercel | `6de3cf0f4c09439229bcaa6d0365c33112a1e073` | — |
| `demo-visita/15.jpg` | Solo Vercel | `03c58c75c1c8508022ade05dc56045ae68a5b9ae` | — |
| `demo-visita/16.jpg` | Solo Vercel | `b88b62438d80cf4b48e4c5ee351af65417d12fde` | — |
| `demo-visita/17.jpg` | Solo Vercel | `010b14e31cbceeff83ce5c4475ddca40283fd4d1` | — |
| `demo-visita/18.jpg` | Solo Vercel | `ec934603e769b4cf3f2533a37f7d450425f89e4b` | — |
| `deploy.ps1` | Compartido, contenido no validado | `b02ae9d1fe9e9998114aa785a68579f7524e0780` | `f41517decca3` |
| `index.html` | Compartido, contenido no validado | `92a76258278c11a7ce2f242563c6f18ea51631e2` | `54896f6449fc` |
| `js/app.js` | Compartido, contenido no validado | `5feea398576a8e193cac056181004df70d09bf48` | `1a6ad99bf000` |
| `js/archivos.js` | Solo Vercel | `7741528c3937bd824626d2b6dce1b1181cd3f7ca` | — |
| `js/auth.js` | Compartido, contenido no validado | `47ac08fe4a11e9685f584cf21e108f42855ad57e` | `fc447a548821` |
| `js/brand.js` | Compartido, contenido no validado | `61bfac4c62749758e3a961fdd2fffb3c70d56343` | `15a615fc48f2` |
| `js/caso-detalle.js` | Compartido, contenido no validado | `21653f6f61da246c6959d4500f33f714eba27b8b` | `2a19ada1134c` |
| `js/config.example.js` | Compartido, contenido no validado | `a3429b29890f956362860df509cc7d8c14d72599` | `72cad6cccb87` |
| `js/config.js` | Compartido, contenido no validado | `fcd4ca6805de255457b41978de50112164ea4591` | `7688a43f32c1` |
| `js/configuracion.js` | Solo Vercel | `76b2b794f8362c35ad00b8f5ecbc56c63b0b2c0e` | — |
| `js/db.js` | Compartido, contenido no validado | `8ad42719abfb4b7ee7cf055d11488dfc8a4da0a3` | `7011e8fbfa7d` |
| `js/documents.js` | Compartido, contenido no validado | `3373f8ffa251b6a2ff30ae5110c53117eb87e905` | `30afaba3a349` |
| `js/expediente.js` | Solo Vercel | `9b8ed90cac83a580010d48ae92b6f8abbfc9c1c5` | — |
| `js/forms.js` | Compartido, contenido no validado | `86a068e646bb343311dc49aae1f8533c3f1e1afd` | `e9b0677effae` |
| `js/gastos-empresa.js` | Solo Vercel | `917f1c0e9a67bee38e5862cbe02d633257db737a` | — |
| `js/gastos.js` | Solo Vercel | `417ec33728c347281bfd5ea5728190062ff19100` | — |
| `js/ia-assistant.js` | Compartido, contenido no validado | `0df9ef7968a4ec0e4c72db90238d9c027d57c5a5` | `357741ee1509` |
| `js/ia-features.js` | Compartido, contenido no validado | `fc8a678e98e9af9c1ef72f426f3b0d041e421597` | `af786bc62ed9` |
| `js/luna-knowledge.js` | Compartido, contenido no validado | `e55e0313875f6969161fd25bc0b5c6e63fa1d8f9` | `812e7dcab068` |
| `js/luna.js` | Compartido, contenido no validado | `ece55081f0f978bdf327be30bb5ca372c0a5f7f4` | `552ac3303ac4` |
| `js/maps.js` | Compartido, contenido no validado | `bc906bfcb386ba7f3f2a91d6855b8f238fed0e8a` | `eeb418b3c08c` |
| `js/modules.config.js` | Compartido, contenido no validado | `33258c073a2aeff0701b8a5ca87f4f1e8d4dd77f` | `43c258e02279` |
| `js/planner.js` | Compartido, contenido no validado | `fec93145a8810ceec2c83923b58b410258dadabe` | `164d2a1e87d8` |
| `js/proyectos.js` | Compartido, contenido no validado | `2f47695cd4219991594987c5203929348d42e2b3` | `f0fa39c5bc5d` |
| `js/recorrido.js` | Solo Vercel | `40333d8c951c6e5387fd4e2c0e29e0d8cb3391b4` | — |
| `js/referidos.js` | Solo Vercel | `5eaf5b8662031cf8ee948278c334a21c1afef65e` | — |
| `js/render.js` | Compartido, contenido no validado | `631467d6e7ac3a27397e72f67fa524cc174523f8` | `17835a4f6b8c` |
| `js/services.js` | Compartido, contenido no validado | `cc52751ffd2fe2102f7e1e08cdaacbe15f755834` | `78d2c820e2ec` |
| `js/utils.js` | Compartido, contenido no validado | `307f69e2a4ab1500bbd3546f9c5a509d09289083` | `b3ca59a55563` |
| `PROJECT_LOG.md` | Compartido, contenido no validado | `04dd83a0787bf9aaad3e11694a9b6a6a5f10cdbd` | `7b44e3c2d496` |
| `scripts/setup-storage.js` | Solo Vercel | `bbb8e025e4adc363b33b8b1555992ae376f55bd2` | — |
| `secrets.revive.env.example` | Compartido, contenido no validado | `b465079d60b360ec272545908c692104ad402817` | `5657c86254dd` |
| `supabase/schema.sql` | Compartido, contenido no validado | `5f6ffc1a2bd6beb7f9bb5dd6efcba358ec42d4c0` | `59ffec025163` |
| `tour.html` | Solo Vercel | `3380f5e8d3d243e9b6d4e175370a04bcbc485381` | — |
| `vercel.json` | Compartido, contenido no validado | `b498941d40616c068df11514bc4e6227e1111c66` | `c39ea05c74ec` |

## Limitaciones confirmadas y bloqueos

1. `list_deployment_files` permite inspeccionar el árbol Vercel.
2. `get_deployment_file_contents` devuelve base64 **recortado a ~2.014 caracteres** para archivos grandes (`js/db.js`, `js/expediente.js`, `api/archivos.js`). Los fragmentos **no sirven para reconstruir archivos íntegros**. Archivos breves (`.vercelignore`, `vercel.json`, `js/app.js`) sí pueden leerse completos. NO ensamblar fragmentos como fuente.
3. El acceso público alternativo desde este entorno no pudo leer la aplicación ni descargar código, por lo que tampoco se verificó en navegador un flujo real.
4. La cuenta Supabase conectada bajo "Primary" solo mostró `ProyectoOne`; no se identificó el Supabase correcto de Revive Hogar. **Ningún backup de DB/Storage existe aún en esta ejecución**.
5. La rama creada está basada en código antiguo, no en la fuente completa publicada: está **prohibido** abrir PR de despliegue o activar automatismo que publique esta rama.
6. Antes de cambios de datos o de seguridad: recuperar el directorio original usado por Vercel CLI o un ZIP íntegro del mismo; confirmar que coincida con la versión publicada; generar hashes SHA-256 en ambos; respaldar Supabase y Storage y comprobar restauración.
7. En `js/config.js` de GitHub antiguo se declaraba `SUPABASE_URL` diferente al identificador documentado en `PROJECT_LOG.md`; verificar el proyecto efectivo antes de tocar RLS. **No guardar claves ni valores sensibles en el inventario.**

## Riesgos prioritarios todavía NO validados en la versión desplegada

- `rh_anon_all`: aparece en el SQL versionado; comprobar políticas **activas** en la base real antes de sustituirlas (migración por etapas para impedir bloqueo).
- Contraseñas de demostración en frontend y `usuariosLogin`: no asumir que la fuente actual de producción mantiene el mismo comportamiento hasta auditar `js/auth.js` completo.
- `api/archivos.js`: usa privilegios de servidor según auditoría anterior; verificar autenticación y autorización sin publicar secretos.
- `pendingDeletes`, `deleteTimers`, edición concurrente y sincronización de `db.js`: analizar implementación completa y probar con copias.
- No borrar ni reemplazar módulos avanzados recuperados. `js/configuracion.js`, `js/referidos.js`, `js/documents.js` ya contienen trabajo útil.
- El rastreador de uso debe registrar solo eventos técnicos mínimos, sin campos, pulsaciones, contraseñas ni capturas.

## Puertas de seguridad antes de modificar producción

- [x] Confirmar cuenta GitHub de Valeria y Vercel de `echauri-apps`.
- [x] Inventariar rama/commits/PR: una sola rama `main`, sin PR abiertos ni cerrados.
- [x] Identificar fuente Vercel más avanzada y archivos faltantes.
- [x] Crear rama aislada, sin merge.
- [ ] Recuperación **íntegra** del código de Vercel y verificación hash por archivo.
- [ ] Respaldo de base de datos y Storage, con prueba de restauración.
- [ ] Identificación de RLS vigente, credenciales y sesiones sin exponer valores secretos.
- [ ] Pruebas de regresión en base clonada y preview aislada.
- [ ] Aprobación explícita de merge/despliegue.

### Fuentes

- Vercel: https://vercel.com/echauri-apps/revive-hogar/Cmrqr8sR4o77urpBKwHVAAb6FSZm
- GitHub: https://github.com/valechaurig-tech/ERP_REVIVE_HOGAR
- Documento histórico: `REVIVE_HOGAR_AUDITORIA_VERCEL_2026-10-26.md` (fuera de este repositorio).
- Video transcrito: `Transceipcion revive.pdf` (7 páginas; archivo disponible en ChatGPT Library).

Este documento **no** indica que el sistema haya sido reparado ni que la fuente esté completa.
