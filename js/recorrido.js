/**
 * Revive Hogar — recorridos virtuales por propiedad.
 * Metadatos en casa.recorrido; fotos en la colección archivos (tipo recorrido:sceneId).
 */

function getRecorridoCasa(casa) {
    const r = casa?.recorrido;
    return {
        publicado: r?.publicado !== false,
        firstSceneId: r?.firstSceneId || r?.scenes?.[0]?.id || null,
        scenes: Array.isArray(r?.scenes) ? r.scenes : []
    };
}

function precioPublicoCasa(casa) {
    const p = typeof getProspectoById === 'function' ? getProspectoById(casa.prospectoId) : null;
    const eco = typeof calcularEconomiaCasa === 'function' ? calcularEconomiaCasa(casa, p) : {};
    return Number(eco.precioVenta || casa.precioVenta || 0);
}

function contarEscenasRecorrido(casa) {
    return getRecorridoCasa(casa).scenes.length;
}

function guardarRecorridoCasa(casaId, recorrido) {
    const casas = DB.get('casas');
    const idx = casas.findIndex(c => c.id === casaId);
    if (idx < 0) return;
    casas[idx].recorrido = recorrido;
    DB.set('casas', casas);
}

function detectarKindFoto(file) {
    return new Promise(resolve => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            const ratio = img.naturalWidth / img.naturalHeight;
            URL.revokeObjectURL(url);
            resolve(ratio > 1.7 && ratio < 2.3 ? 'equirectangular' : 'photo');
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve('photo');
        };
        img.src = url;
    });
}

async function agregarFotoRecorrido(casaId, file) {
    const casa = DB.get('casas').find(c => c.id === casaId);
    if (!casa || !file) return;
    if (file.size > RH_MAX_ARCHIVO_BYTES) {
        alert('La foto supera 8 MB. Cómprimela antes de subirla.');
        return;
    }
    const mime = normalizarMimeArchivo(file);
    if (!mime || mime === 'application/pdf') {
        alert('Solo fotos JPG, PNG, WEBP o HEIC. Si es 360, usa una imagen equirectangular (~2:1).');
        return;
    }
    const sceneId = typeof DB.getId === 'function' ? DB.getId() : `${Date.now()}`;
    const tipo = `recorrido:${sceneId}`;
    const ubicacion = await guardarBinarioExpediente(casa.prospectoId, tipo, file);
    const registro = {
        id: DB.getId(),
        prospectoId: casa.prospectoId,
        tipo,
        origen: 'recorrido',
        nombre: file.name,
        mime,
        bytes: file.size,
        ...ubicacion,
        fechaISO: new Date().toISOString(),
        subidoPor: getUsuarioActual()
    };
    const archivos = DB.get('archivos');
    archivos.push(registro);
    DB.set('archivos', archivos);

    const recorrido = getRecorridoCasa(casa);
    const scene = {
        id: sceneId,
        title: `Estancia ${recorrido.scenes.length + 1}`,
        kind: await detectarKindFoto(file),
        archivoId: registro.id,
        hotspots: []
    };
    recorrido.scenes.push(scene);
    if (!recorrido.firstSceneId) recorrido.firstSceneId = scene.id;
    recorrido.publicado = true;
    guardarRecorridoCasa(casaId, recorrido);
    if (typeof logAction === 'function') logAction(`Recorrido: foto en ${casa.nombreCompleto}`);
}

async function renderCatalogoPipeline() {
    const host = document.getElementById('pipeline-catalogo');
    if (!host) return;
    const filtro = document.getElementById('pipeline-filter')?.value || 'all';
    let list = DB.get('casas');
    if (filtro !== 'all') list = list.filter(c => c.estatusPipeline === filtro);
    if (!list.length) {
        host.innerHTML = '<p class="celda-vacia">No hay casas en este filtro.</p>';
        return;
    }
    const cards = await Promise.all(list.map(async c => {
        const p = getProspectoById(c.prospectoId);
        const precio = precioPublicoCasa(c);
        const n = contarEscenasRecorrido(c);
        const rec = getRecorridoCasa(c);
        const first = rec.scenes[0];
        const archivo = first ? DB.get('archivos').find(a => a.id === first.archivoId) : null;
        let thumb = '';
        try {
            if (archivo) thumb = await obtenerUrlArchivo(archivo, 600);
        } catch (e) {
            thumb = '';
        }
        const publico = rec.publicado && n > 0;
        return `<article class="rh-casa-card">
            <div class="rh-casa-card-thumb">${thumb ? `<img alt="" src="${thumb}">` : '<span>Sin fotos</span>'}</div>
            <div class="rh-casa-card-body">
                <h5>${escapeHtml(c.direccionPropiedad || c.nombreCompleto)}</h5>
                <p class="rh-casa-card-price">${precio ? formatearMoneda(precio) : 'Precio por definir'}</p>
                <p class="rh-casa-card-meta">${badgeEstatusPipeline(c.estatusPipeline)} · ${n} foto${n === 1 ? '' : 's'}${publico ? ' · Público' : ''}</p>
                <div class="celda-acciones">
                    <button type="button" class="btn btn-primary btn-small" onclick="abrirDetalleCasa('${escapeHtml(c.id)}','recorrido')">Abrir recorrido</button>
                    ${n ? `<a class="btn btn-outline btn-small" href="tour.html#${encodeURIComponent(c.id)}" target="_blank" rel="noopener">Ver tour</a>` : ''}
                </div>
            </div>
        </article>`;
    }));
    host.innerHTML = cards.join('');
}

async function renderPanelRecorrido() {
    const host = document.getElementById('detalle-recorrido-content');
    if (!host || detalleModo !== 'casa') return;
    const casa = DB.get('casas').find(c => c.id === detalleActivoId);
    if (!casa) return;
    const rec = getRecorridoCasa(casa);
    const precio = precioPublicoCasa(casa);
    const filas = await Promise.all(rec.scenes.map(async scene => {
        const archivo = DB.get('archivos').find(a => a.id === scene.archivoId);
        let url = '';
        try {
            if (archivo) url = await obtenerUrlArchivo(archivo, 600);
        } catch (e) {
            url = '';
        }
        const opciones = rec.scenes
            .filter(s => s.id !== scene.id)
            .map(s => `<option value="${s.id}" ${scene.hotspots[0]?.target === s.id ? 'selected' : ''}>${escapeHtml(s.title)}</option>`)
            .join('');
        return `<article class="rh-scene-row">
            <img alt="" src="${url}">
            <div class="stack">
                <label>Estancia <input class="form-control" value="${escapeHtml(scene.title)}" onchange="renombrarEscenaRecorrido('${casa.id}','${scene.id}', this.value)"></label>
                <label>Puerta hacia
                    <select class="form-control" onchange="conectarEscenaRecorrido('${casa.id}','${scene.id}', this.value)">
                        <option value="">— sin conexión —</option>
                        ${opciones}
                    </select>
                </label>
                <p class="field-hint">${scene.kind === 'equirectangular' ? 'Foto 360' : 'Foto normal'}${archivo?.almacenamiento === 'indexeddb' ? ' · solo este dispositivo hasta que haya Storage' : ''}</p>
                <button type="button" class="btn btn-outline btn-small" onclick="quitarEscenaRecorrido('${casa.id}','${scene.id}')">Quitar</button>
            </div>
        </article>`;
    }));
    host.innerHTML = `
        <p class="module-desc">Sube una foto por cuarto. Si la imagen es 360 (relación ~2:1) el visitante puede girar. Conecta una estancia con otra para el recorrido.</p>
        <p><strong>${precio ? formatearMoneda(precio) : 'Sin precio de venta'}</strong> · ${escapeHtml(casa.direccionPropiedad || '')}</p>
        <label class="rh-tour-publish">
            <input type="checkbox" ${rec.publicado && rec.scenes.length ? 'checked' : ''} onchange="publicarRecorridoCasa('${casa.id}', this.checked)" ${rec.scenes.length ? '' : 'disabled'}>
            Mostrar en el sitio público de recorridos
        </label>
        <div class="row-actions">
            <label class="btn btn-primary btn-small">${rec.scenes.length ? 'Agregar foto' : 'Tomar / subir foto'}
                <input type="file" accept="image/*" capture="environment" hidden onchange="onFotoRecorridoSeleccionada('${casa.id}', this)">
            </label>
            ${rec.scenes.length ? `<a class="btn btn-outline btn-small" href="tour.html#${encodeURIComponent(casa.id)}" target="_blank" rel="noopener">Abrir recorrido</a>` : ''}
        </div>
        <div class="rh-scene-list">${filas.join('') || '<p class="celda-vacia">Aún no hay fotos.</p>'}</div>
    `;
}

async function onFotoRecorridoSeleccionada(casaId, input) {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    input.disabled = true;
    try {
        await agregarFotoRecorrido(casaId, file);
        await renderPanelRecorrido();
        if (typeof renderPipeline === 'function') renderPipeline();
    } catch (error) {
        console.error(error);
        alert('No se pudo guardar la foto: ' + (error.message || error));
    } finally {
        input.disabled = false;
    }
}

function renombrarEscenaRecorrido(casaId, sceneId, title) {
    const casa = DB.get('casas').find(c => c.id === casaId);
    if (!casa) return;
    const rec = getRecorridoCasa(casa);
    const scene = rec.scenes.find(s => s.id === sceneId);
    if (!scene) return;
    scene.title = String(title || 'Estancia').trim() || 'Estancia';
    rec.scenes.forEach(s => {
        s.hotspots = (s.hotspots || []).map(h => h.target === sceneId ? { ...h, text: scene.title } : h);
    });
    guardarRecorridoCasa(casaId, rec);
}

function conectarEscenaRecorrido(casaId, sceneId, targetId) {
    const casa = DB.get('casas').find(c => c.id === casaId);
    if (!casa) return;
    const rec = getRecorridoCasa(casa);
    const scene = rec.scenes.find(s => s.id === sceneId);
    if (!scene) return;
    const dest = rec.scenes.find(s => s.id === targetId);
    scene.hotspots = dest ? [{ target: dest.id, yaw: 90, pitch: 0, text: dest.title }] : [];
    guardarRecorridoCasa(casaId, rec);
}

function publicarRecorridoCasa(casaId, on) {
    const casa = DB.get('casas').find(c => c.id === casaId);
    if (!casa) return;
    const rec = getRecorridoCasa(casa);
    rec.publicado = !!on;
    guardarRecorridoCasa(casaId, rec);
    if (typeof renderPipeline === 'function') renderPipeline();
}

async function quitarEscenaRecorrido(casaId, sceneId) {
    if (!confirm('¿Quitar esta foto del recorrido?')) return;
    const casa = DB.get('casas').find(c => c.id === casaId);
    if (!casa) return;
    const rec = getRecorridoCasa(casa);
    const scene = rec.scenes.find(s => s.id === sceneId);
    rec.scenes = rec.scenes.filter(s => s.id !== sceneId);
    rec.scenes.forEach(s => {
        s.hotspots = (s.hotspots || []).filter(h => h.target !== sceneId);
    });
    if (rec.firstSceneId === sceneId) rec.firstSceneId = rec.scenes[0]?.id || null;
    guardarRecorridoCasa(casaId, rec);
    if (scene?.archivoId) {
        const archivos = DB.get('archivos');
        const a = archivos.find(x => x.id === scene.archivoId);
        if (a) eliminarBinarioExpediente(a).catch(console.warn);
        DB.set('archivos', archivos.filter(x => x.id !== scene.archivoId));
    }
    await renderPanelRecorrido();
    if (typeof renderPipeline === 'function') renderPipeline();
}

function casasPublicasRecorrido() {
    return DB.get('casas').filter(c => {
        const rec = getRecorridoCasa(c);
        return c.estatusPipeline === 'En venta' && rec.publicado && rec.scenes.length > 0;
    });
}

async function renderTourPublico() {
    const listHost = document.getElementById('tour-catalogo');
    const viewHost = document.getElementById('tour-viewer-wrap');
    if (!listHost) return;
    const casaId = decodeURIComponent((location.hash || '').replace(/^#/, ''));
    const casas = casasPublicasRecorrido();
    if (!casaId) {
        if (viewHost) viewHost.hidden = true;
        listHost.hidden = false;
        const cards = await Promise.all(casas.map(async c => {
            const rec = getRecorridoCasa(c);
            const archivo = DB.get('archivos').find(a => a.id === rec.scenes[0]?.archivoId);
            let thumb = '';
            try {
                if (archivo) thumb = await obtenerUrlArchivo(archivo, 1200);
            } catch (e) {
                thumb = '';
            }
            const precio = precioPublicoCasa(c);
            return `<a class="rh-casa-card rh-casa-card--link" href="#${encodeURIComponent(c.id)}">
                <div class="rh-casa-card-thumb">${thumb ? `<img alt="" src="${thumb}">` : '<span>Casa</span>'}</div>
                <div class="rh-casa-card-body">
                    <h5>${escapeHtml(c.direccionPropiedad || 'Propiedad')}</h5>
                    <p class="rh-casa-card-price">${precio ? formatearMoneda(precio) : 'Consultar precio'}</p>
                    <p class="rh-casa-card-meta">${rec.scenes.length} estancias</p>
                </div>
            </a>`;
        }));
        listHost.innerHTML = cards.join('') || '<p class="celda-vacia">Aún no hay recorridos publicados en venta.</p>';
        return;
    }
    const casa = DB.get('casas').find(c => c.id === casaId);
    const rec = casa ? getRecorridoCasa(casa) : { scenes: [] };
    if (!casa || !rec.publicado || !rec.scenes.length) {
        listHost.hidden = false;
        listHost.innerHTML = '<p class="celda-vacia">Este recorrido no está disponible. <a href="tour.html">Volver al catálogo</a></p>';
        if (viewHost) viewHost.hidden = true;
        return;
    }
    listHost.hidden = true;
    if (viewHost) {
        viewHost.hidden = false;
        await pintarVisorRecorrido(viewHost, casa, rec);
    }
}

async function pintarVisorRecorrido(host, casa, rec) {
    const urls = {};
    for (const scene of rec.scenes) {
        const archivo = DB.get('archivos').find(a => a.id === scene.archivoId);
        try {
            urls[scene.id] = archivo ? await obtenerUrlArchivo(archivo, 3600) : '';
        } catch (e) {
            urls[scene.id] = '';
        }
    }
    const precio = precioPublicoCasa(casa);
    const has360 = rec.scenes.some(s => s.kind === 'equirectangular') && window.pannellum;
    host.innerHTML = `
        <header class="tour-view-bar">
            <a href="tour.html">← Casas</a>
            <div>
                <strong>${escapeHtml(casa.direccionPropiedad || casa.nombreCompleto)}</strong>
                <span>${precio ? formatearMoneda(precio) : ''}</span>
            </div>
        </header>
        <div id="tour-pannellum" class="tour-stage"></div>
        <div id="tour-gallery" class="tour-stage" hidden></div>
    `;
    if (has360) {
        const scenes = {};
        rec.scenes.forEach(scene => {
            scenes[scene.id] = {
                title: scene.title,
                type: 'equirectangular',
                panorama: urls[scene.id],
                hotSpots: (scene.hotspots || []).map(h => ({
                    pitch: h.pitch ?? 0,
                    yaw: h.yaw ?? 90,
                    type: 'scene',
                    text: h.text || 'Entrar',
                    sceneId: h.target
                }))
            };
        });
        window.pannellum.viewer('tour-pannellum', {
            default: { firstScene: rec.firstSceneId || rec.scenes[0].id, autoLoad: true, sceneFadeDuration: 500 },
            scenes
        });
        return;
    }
    document.getElementById('tour-pannellum').hidden = true;
    const gal = document.getElementById('tour-gallery');
    gal.hidden = false;
    let index = 0;
    const paint = () => {
        const scene = rec.scenes[index];
        const next = rec.scenes[index + 1];
        gal.innerHTML = `
            <img alt="${escapeHtml(scene.title)}" src="${urls[scene.id] || ''}">
            <div class="tour-gallery-caption">
                <strong>${escapeHtml(scene.title)}</strong>
                <div>
                    <button type="button" class="btn btn-outline" ${index === 0 ? 'disabled' : ''} id="tour-prev">Anterior</button>
                    <button type="button" class="btn btn-primary" id="tour-next">${next ? escapeHtml(next.title) : 'Fin'}</button>
                </div>
            </div>
        `;
        gal.querySelector('#tour-prev')?.addEventListener('click', () => { if (index > 0) { index -= 1; paint(); } });
        gal.querySelector('#tour-next')?.addEventListener('click', () => {
            if (index < rec.scenes.length - 1) { index += 1; paint(); }
        });
    };
    paint();
}

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        if (document.body?.dataset.vista === 'tour-publico') {
            window.addEventListener('hashchange', () => { renderTourPublico(); });
        }
    });
}
