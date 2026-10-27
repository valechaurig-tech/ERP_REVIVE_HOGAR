/**
 * Revive Hogar — expedientes digitales.
 * Binarios en Supabase Storage (nube) o IndexedDB (fallback local).
 * La colección `archivos` conserva únicamente metadatos livianos.
 */

const RH_MAX_ARCHIVO_BYTES = 8 * 1024 * 1024;
const RH_ARCHIVOS_BUCKET = 'rh-archivos';
const RH_ARCHIVOS_IDB = 'revive_hogar_archivos';
const RH_MIME_ARCHIVOS = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'];

function normalizarMimeArchivo(file) {
    if (RH_MIME_ARCHIVOS.includes(file?.type)) return file.type;
    const extension = String(file?.name || '').toLowerCase().split('.').pop();
    return ({
        jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
        heic: 'image/heic', heif: 'image/heif', pdf: 'application/pdf'
    })[extension] || '';
}

function abrirDbArchivosLocal() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(RH_ARCHIVOS_IDB, 1);
        req.onupgradeneeded = () => {
            if (!req.result.objectStoreNames.contains('blobs')) req.result.createObjectStore('blobs');
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function guardarBlobLocal(key, blob) {
    const db = await abrirDbArchivosLocal();
    await new Promise((resolve, reject) => {
        const tx = db.transaction('blobs', 'readwrite');
        tx.objectStore('blobs').put(blob, key);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
    });
    db.close();
}

async function leerBlobLocal(key) {
    const db = await abrirDbArchivosLocal();
    const blob = await new Promise((resolve, reject) => {
        const req = db.transaction('blobs').objectStore('blobs').get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
    db.close();
    return blob;
}

async function eliminarBlobLocal(key) {
    const db = await abrirDbArchivosLocal();
    await new Promise((resolve, reject) => {
        const tx = db.transaction('blobs', 'readwrite');
        tx.objectStore('blobs').delete(key);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
    });
    db.close();
}

function nombreArchivoSeguro(nombre) {
    return String(nombre || 'archivo')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .slice(-100);
}

async function subirViaProxyServidor(path, file, mime) {
    const r = await fetch(`/api/archivos?action=upload&path=${encodeURIComponent(path)}`, {
        method: 'POST',
        headers: { 'Content-Type': mime },
        body: file
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `Proxy upload ${r.status}`);
    return data;
}

async function urlFirmadaViaProxy(storagePath) {
    const r = await fetch(`/api/archivos?action=signedUrl&path=${encodeURIComponent(storagePath)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: storagePath })
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `Proxy signedUrl ${r.status}`);
    return data.signedUrl;
}

async function eliminarViaProxy(storagePath) {
    const r = await fetch(`/api/archivos?action=delete&path=${encodeURIComponent(storagePath)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: storagePath })
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `Proxy delete ${r.status}`);
}

async function guardarBinarioExpediente(prospectoId, tipo, file) {
    const token = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const mime = normalizarMimeArchivo(file);
    if (DB.mode() === 'cloud') {
        const path = `prospectos/${prospectoId}/${tipo}/${token}-${nombreArchivoSeguro(file.name)}`;
        try {
            await subirViaProxyServidor(path, file, mime);
            return { almacenamiento: 'supabase', storagePath: path };
        } catch (proxyError) {
            // Compatibilidad: intenta cliente directo si el proxy aún no está desplegado.
            if (supabaseClient) {
                const { error } = await supabaseClient.storage
                    .from(RH_ARCHIVOS_BUCKET)
                    .upload(path, file, { cacheControl: '3600', upsert: false, contentType: mime });
                if (!error) return { almacenamiento: 'supabase', storagePath: path };
            }
            console.warn('Storage nube no disponible; se guarda en este navegador.', proxyError);
        }
    }
    const localKey = `${prospectoId}/${tipo}/${token}`;
    await guardarBlobLocal(localKey, file);
    return { almacenamiento: 'indexeddb', localKey };
}

async function eliminarBinarioExpediente(a) {
    if (a?.almacenamiento === 'supabase' && a.storagePath) {
        try {
            await eliminarViaProxy(a.storagePath);
            return;
        } catch (e) {
            if (supabaseClient) {
                const { error } = await supabaseClient.storage.from(RH_ARCHIVOS_BUCKET).remove([a.storagePath]);
                if (!error) return;
                throw new Error(error.message || e.message);
            }
            throw e;
        }
    } else if (a?.localKey) {
        await eliminarBlobLocal(a.localKey);
    }
}

function getArchivosProspecto(prospectoId) {
    return DB.get('archivos').filter(a => a.prospectoId === prospectoId);
}

function getArchivoProspecto(prospectoId, tipo) {
    const tiposEquivalentes = tipo === 'escritura_original'
        ? ['escritura_original', 'escrituras_asesor']
        : [tipo];
    return getArchivosProspecto(prospectoId)
        .filter(a => tiposEquivalentes.includes(a.tipo))
        .sort((a, b) => String(b.fechaISO).localeCompare(String(a.fechaISO)))[0] || null;
}

async function subirArchivoProspecto(input, tipo, origen = 'expediente') {
    const prospectoId = input?.dataset?.prospectoId ||
        (input?.closest('#modal-expediente-admin') ? document.getElementById('exp-id')?.value : '') ||
        (input?.closest('#modal-gestion-prospecto') ? document.getElementById('ges-id')?.value : '');
    const file = input?.files?.[0];
    if (!prospectoId || !file) return;
    if (file.size > RH_MAX_ARCHIVO_BYTES) {
        alert('El archivo supera 8 MB. Comprímelo antes de subirlo.');
        input.value = '';
        return;
    }
    const mimeNormalizado = normalizarMimeArchivo(file);
    if (!mimeNormalizado) {
        alert('Solo se permiten imágenes JPG, PNG, WEBP, HEIC o archivos PDF.');
        input.value = '';
        return;
    }

    input.disabled = true;
    const status = input.closest('.rh-upload-card')?.querySelector('.rh-upload-status');
    if (status) status.textContent = 'Guardando…';
    try {
        const archivos = DB.get('archivos');
        const anterior = archivos.findIndex(a => a.prospectoId === prospectoId && a.tipo === tipo);
        const anteriorRegistro = anterior >= 0 ? archivos[anterior] : null;
        const ubicacion = await guardarBinarioExpediente(prospectoId, tipo, file);
        const registro = {
            id: anterior >= 0 ? archivos[anterior].id : DB.getId(),
            prospectoId,
            tipo,
            origen,
            nombre: file.name,
            mime: mimeNormalizado,
            bytes: file.size,
            ...ubicacion,
            fechaISO: new Date().toISOString(),
            subidoPor: getUsuarioActual()
        };
        if (anterior >= 0) archivos[anterior] = registro;
        else archivos.push(registro);
        DB.set('archivos', archivos);
        if (anteriorRegistro) eliminarBinarioExpediente(anteriorRegistro).catch(console.warn);

        const prospectos = DB.get('prospectos');
        const idx = prospectos.findIndex(p => p.id === prospectoId);
        if (idx >= 0) {
            const tipoChecklist = tipo === 'escrituras_asesor' ? 'escritura_original' : tipo;
            prospectos[idx].archivoTipos = Array.from(new Set([...(prospectos[idx].archivoTipos || []), tipo]));
            prospectos[idx].checklistDocumental = prospectos[idx].checklistDocumental || {};
            prospectos[idx].checklistDocumental[tipoChecklist] = {
                ...(prospectos[idx].checklistDocumental[tipoChecklist] || {}),
                estado: 'Recibido',
                validadoEn: '',
                validadoPor: ''
            };
            agregarEventoProspecto(prospectos[idx], 'Documento', `${nombreDocumentoExpediente(tipo)} cargado por ${getUsuarioActual()}`);
            DB.set('prospectos', prospectos);
        }
        if (status) status.innerHTML = `✓ ${escapeHtml(file.name)}`;
        logAction(`Documento cargado: ${nombreDocumentoExpediente(tipo)}`);
        if (tipo === 'escritura_original' || tipo === 'escrituras_asesor') {
            if (typeof habilitarKitPorEscrituras === 'function') habilitarKitPorEscrituras(prospectoId);
            if (typeof refrescarKitDocumental === 'function') refrescarKitDocumental(prospectoId);
        }
        if (typeof refrescarArchivosAsesor === 'function') refrescarArchivosAsesor(prospectoId);
        if (typeof refrescarChecklistExpediente === 'function') refrescarChecklistExpediente(prospectoId);
    } catch (error) {
        console.error(error);
        if (status) status.textContent = 'No se pudo guardar';
        const detalle = String(error?.message || error);
        const faltaBucket = detalle.toLowerCase().includes('bucket');
        alert(faltaBucket
            ? 'Falta habilitar el almacenamiento de expedientes. Ejecuta la actualización de supabase/schema.sql.'
            : 'No se pudo guardar el archivo: ' + detalle);
    } finally {
        input.disabled = false;
    }
}

async function obtenerUrlArchivo(a, segundos = 3600) {
    if (!a) return '';
    if (a.almacenamiento === 'supabase' && a.storagePath) {
        try {
            return await urlFirmadaViaProxy(a.storagePath);
        } catch (proxyError) {
            if (!supabaseClient) throw proxyError;
            const { data, error } = await supabaseClient.storage
                .from(RH_ARCHIVOS_BUCKET)
                .createSignedUrl(a.storagePath, segundos);
            if (error) throw new Error(error.message || proxyError.message);
            return data.signedUrl;
        }
    }
    if (a.localKey) {
        const blob = await leerBlobLocal(a.localKey);
        return blob ? URL.createObjectURL(blob) : '';
    }
    return a.dataUrl || '';
}

async function abrirArchivoExpediente(id) {
    const a = DB.get('archivos').find(x => x.id === id);
    if (!a) return;
    const w = window.open('', '_blank');
    if (!w) { alert('Permite ventanas emergentes para abrir el archivo.'); return; }
    let url = '';
    try {
        url = await obtenerUrlArchivo(a, 300);
    } catch (error) {
        w.close();
        alert('No se pudo abrir el archivo: ' + (error.message || error));
        return;
    }
    if (!url) { w.close(); alert('El archivo no está disponible en este dispositivo.'); return; }
    w.location.href = url;
}

async function eliminarArchivoExpediente(id) {
    if (!confirmAction('¿Eliminar este archivo del expediente?')) return;
    const archivos = DB.get('archivos');
    const a = archivos.find(x => x.id === id);
    if (a) {
        try {
            await eliminarBinarioExpediente(a);
        } catch (error) {
            console.error(error);
            alert('No se pudo eliminar el archivo físico. No se modificó el expediente.');
            return;
        }
    }
    if (!await DB.remove('archivos', id)) {
        alert('No se pudo actualizar el expediente en la nube.');
        return;
    }
    if (a) logAction(`Documento eliminado: ${nombreDocumentoExpediente(a.tipo)}`);
    if (a) {
        const prospectos = DB.get('prospectos');
        const idx = prospectos.findIndex(p => p.id === a.prospectoId);
        const tipoChecklist = a.tipo === 'escrituras_asesor' ? 'escritura_original' : a.tipo;
        if (idx >= 0 && prospectos[idx].checklistDocumental?.[tipoChecklist]) {
            const restante = getArchivoProspecto(a.prospectoId, tipoChecklist);
            prospectos[idx].checklistDocumental[tipoChecklist].estado = restante ? 'Recibido' : 'Pendiente';
            prospectos[idx].checklistDocumental[tipoChecklist].validadoEn = '';
            prospectos[idx].checklistDocumental[tipoChecklist].validadoPor = '';
            DB.set('prospectos', prospectos);
        }
    }
    const prospectoId = document.getElementById('exp-id')?.value;
    if (a && typeof sincronizarEstadoKitPorArchivos === 'function') sincronizarEstadoKitPorArchivos(a.prospectoId);
    if (a && typeof refrescarKitDocumental === 'function') refrescarKitDocumental(a.prospectoId);
    if (prospectoId && typeof refrescarChecklistExpediente === 'function') refrescarChecklistExpediente(prospectoId);
}

function etiquetaUbicacionArchivo(archivo) {
    if (!archivo) return 'Sin archivo';
    if (archivo.almacenamiento === 'supabase' && archivo.storagePath) {
        return `Nube Revive · rh-archivos / ${archivo.storagePath}`;
    }
    if (archivo.almacenamiento === 'indexeddb' || archivo.localKey) {
        return 'Solo en este navegador (aún no está en la nube)';
    }
    return 'Guardado en el expediente';
}

function nombreDocumentoExpediente(tipo) {
    const catalogo = typeof RH_DOCUMENTOS_EXPEDIENTE !== 'undefined' ? RH_DOCUMENTOS_EXPEDIENTE : [];
    return catalogo.find(x => x.tipo === tipo)?.nombre ||
        ({
            ine_frente: 'INE frente',
            ine_reverso: 'INE reverso',
            escrituras_asesor: 'Escrituras',
            cfe_asesor: 'Recibo CFE'
        }[tipo] || tipo);
}

function uploadCardHtml(prospectoId, tipo, titulo, requerido = false, origen = 'expediente') {
    const archivo = getArchivoProspecto(prospectoId, tipo);
    return `<label class="rh-upload-card ${archivo ? 'is-complete' : ''}">
        <span class="rh-upload-icon">${archivo ? '✓' : '↑'}</span>
        <span class="rh-upload-copy"><strong>${escapeHtml(titulo)}${requerido ? ' *' : ''}</strong>
            <small class="rh-upload-status">${archivo ? `${escapeHtml(archivo.nombre)} · ${escapeHtml(etiquetaUbicacionArchivo(archivo))}` : 'Imagen o PDF · máximo 8 MB · se guarda en la nube del expediente'}</small>
        </span>
        <input type="file" accept="image/*,application/pdf" data-prospecto-id="${escapeHtml(prospectoId)}" onchange="subirArchivoProspecto(this,'${escapeHtml(tipo)}','${escapeHtml(origen)}')">
        ${archivo ? `<button type="button" class="rh-upload-view" onclick="event.preventDefault();abrirArchivoExpediente('${archivo.id}')">Ver</button>` : ''}
    </label>`;
}
