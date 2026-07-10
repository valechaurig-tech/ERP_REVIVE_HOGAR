/**

 * Revive Hogar — Detalle de caso (propiedad / prospecto) + comunicación interna

 */



let detalleModo = 'casa';

let detalleActivoId = null;

let detalleTabActiva = 'resumen';



function abrirDetalleCasa(casaId, tabInicial) {

    const c = DB.get('casas').find(x => x.id === casaId);

    if (!c) return;

    if (currentUser?.rol === 'Vendedor' && c.vendedorId !== currentUser.id) return;

    detalleModo = 'casa';

    detalleActivoId = casaId;

    detalleTabActiva = tabInicial || 'resumen';

    renderDetalleModal();

    document.getElementById('modal-detalle-casa')?.classList.add('active');

}



function abrirDetalleProspecto(prospectoId, tabInicial) {

    const p = getProspectoById(prospectoId);

    if (!p) return;

    if (currentUser?.rol === 'Vendedor' && p.vendedorId !== currentUser.id) return;

    detalleModo = 'prospecto';

    detalleActivoId = prospectoId;

    detalleTabActiva = tabInicial || 'resumen';

    renderDetalleModal();

    document.getElementById('modal-detalle-casa')?.classList.add('active');

}



function abrirComunicacionDesdeGestion() {

    const id = document.getElementById('ges-id')?.value;

    if (!id) return;

    closeModal('modal-gestion-prospecto');

    abrirDetalleProspecto(id, 'comunicacion');

}



function abrirComunicacionDesdeExpediente() {

    const id = document.getElementById('exp-id')?.value;

    if (!id) return;

    closeModal('modal-expediente-admin');

    abrirDetalleProspecto(id, 'comunicacion');

}



function cambiarTabDetalleCasa(tab) {

    detalleTabActiva = tab;

    document.querySelectorAll('.detalle-tab').forEach(btn => {

        btn.classList.toggle('active', btn.dataset.tab === tab);

    });

    document.querySelectorAll('.detalle-tab-panel').forEach(p => {

        p.classList.toggle('active', p.dataset.panel === tab);

    });

    if (tab === 'comunicacion') renderMensajesCaso();
    if (tab === 'remodelacion' && typeof renderDetalleRemodelacion === 'function') {
        const casoTab = getCasoActivo();
        renderDetalleRemodelacion(casoTab, getProspectoDelCaso(casoTab));
    }
    if (tab === 'luna' && typeof renderPanelLunaCaso === 'function') renderPanelLunaCaso();
    if (tab === 'riva' && typeof renderPanelLunaCaso === 'function') renderPanelLunaCaso();
}



function getCasoActivo() {

    if (detalleModo === 'casa') {

        return DB.get('casas').find(x => x.id === detalleActivoId) || null;

    }

    return getProspectoById(detalleActivoId);

}



function getProspectoDelCaso(caso) {

    if (detalleModo === 'prospecto') return caso;

    return caso ? getProspectoById(caso.prospectoId) : null;

}



function renderDetalleModal() {

    const caso = getCasoActivo();

    if (!caso) return;

    const p = getProspectoDelCaso(caso);

    const vend = DB.get('usuariosLogin').find(u => u.id === (caso.vendedorId || p?.vendedorId));



    setText('detalle-casa-titulo', caso.nombreCompleto || p?.nombreCompleto || 'Caso');

    setText('detalle-casa-sub', caso.direccionPropiedad || p?.direccionPropiedad || '');



    const badge = document.getElementById('detalle-casa-badge');

    if (badge) {

        badge.textContent = detalleModo === 'casa' ? 'Propiedad en pipeline' : 'Prospecto en venta';

        badge.className = `detalle-tipo-badge detalle-tipo-badge--${detalleModo}`;

    }

    const tabRem = document.getElementById('detalle-tab-remodelacion');
    if (tabRem) tabRem.classList.toggle('hidden', detalleModo !== 'casa');
    if (detalleModo !== 'casa' && detalleTabActiva === 'remodelacion') detalleTabActiva = 'resumen';



    renderDetalleResumen(caso, p, vend);

    renderDetalleHistorial(caso, p);

    renderDetalleExpediente(caso, p);

    if (detalleModo === 'casa') renderDetalleRemodelacion(caso, p);

    poblarDestinatarioMensaje(caso, p);

    renderMensajesCaso();

    cambiarTabDetalleCasa(detalleTabActiva);

}



function renderDetalleResumen(caso, p, vend) {

    const resumen = document.getElementById('detalle-resumen-content');

    if (!resumen) return;



    if (detalleModo === 'casa') {

        resumen.innerHTML = `

            <div class="detalle-grid">

                <div class="detalle-stat-card">${badgeEstatusPipeline(caso.estatusPipeline)}</div>

                <div class="detalle-kv"><span>Propietario</span><strong>${escapeHtml(caso.nombreCompleto)}</strong></div>

                <div class="detalle-kv"><span>Dirección</span><strong>${escapeHtml(caso.direccionPropiedad)}</strong></div>

                <div class="detalle-kv"><span>Teléfono</span><strong>${escapeHtml(p?.telefono || '—')}</strong></div>

                <div class="detalle-kv"><span>Tipo de crédito</span><strong>${escapeHtml(caso.tipoCredito || p?.tipoCredito || '—')}</strong></div>

                <div class="detalle-kv"><span>Escrituras</span><strong>${escapeHtml(p?.tieneEscrituras || '—')}</strong></div>

                <div class="detalle-kv"><span>Invadida</span><strong>${escapeHtml(p?.invadida || '—')}</strong></div>

                <div class="detalle-kv"><span>Vendedor</span><strong>${escapeHtml(vend?.displayName || '—')}</strong></div>

                <div class="detalle-kv"><span>Fecha de firma</span><strong>${caso.fechaFirma ? new Date(caso.fechaFirma).toLocaleDateString() : '—'}</strong></div>

                <div class="detalle-kv detalle-kv--wide"><span>Propuesta final</span><strong>${escapeHtml(caso.propuestaFinal || p?.propuestaFinal || '—')}</strong></div>

            </div>

            ${renderEconomiaCasaHtml(caso, p)}

            ${renderAdeudosHtml(p)}`;

    } else {

        resumen.innerHTML = `

            <div class="detalle-grid">

                <div class="detalle-stat-card">${badgeEstatusProspecto(caso.estatus)}</div>

                <div class="detalle-kv"><span>Prospecto</span><strong>${escapeHtml(caso.nombreCompleto)}</strong></div>

                <div class="detalle-kv"><span>Dirección</span><strong>${escapeHtml(caso.direccionPropiedad)}</strong></div>

                <div class="detalle-kv"><span>Teléfono</span><strong>${escapeHtml(caso.telefono || '—')}</strong></div>

                <div class="detalle-kv"><span>Tipo de crédito</span><strong>${escapeHtml(caso.tipoCredito || '—')}</strong></div>

                <div class="detalle-kv"><span>Vendedor</span><strong>${escapeHtml(vend?.displayName || '—')}</strong></div>

                <div class="detalle-kv"><span>Captura</span><strong>${escapeHtml(caso.fechaCaptura || '—')}</strong></div>

                <div class="detalle-kv detalle-kv--wide"><span>Propuesta</span><strong>${escapeHtml(caso.propuestaFinal || 'Pendiente')}</strong></div>

            </div>

            ${renderAdeudosHtml(caso)}`;

    }

}



function renderEconomiaCasaHtml(casa, prospecto) {

    const eco = calcularEconomiaCasa(casa, prospecto);

    const utilidadClass = eco.utilidad != null && eco.utilidad < 0 ? 'mkt-metric-danger' : 'mkt-metric-success';

    return `

        <div class="detalle-adeudos">

            <h5>Economía del proyecto</h5>

            <div class="mkt-analytics-grid detalle-adeudos-grid">

                <div class="mkt-metric-card"><span class="mkt-metric-label">Adquisición</span><span class="mkt-metric-value">${formatearMoneda(eco.adquisicion)}</span></div>

                <div class="mkt-metric-card"><span class="mkt-metric-label">Remodelación</span><span class="mkt-metric-value">${formatearMoneda(eco.remodelacion)}</span></div>

                <div class="mkt-metric-card mkt-metric-accent"><span class="mkt-metric-label">Inversión total</span><span class="mkt-metric-value">${formatearMoneda(eco.inversion)}</span></div>

                <div class="mkt-metric-card"><span class="mkt-metric-label">Precio venta</span><span class="mkt-metric-value">${eco.precioVenta ? formatearMoneda(eco.precioVenta) : '—'}</span></div>

                <div class="mkt-metric-card ${utilidadClass}"><span class="mkt-metric-label">Utilidad</span><span class="mkt-metric-value">${eco.utilidad != null ? formatearMoneda(eco.utilidad) : '—'}</span></div>

            </div>

        </div>`;

}



function renderDetalleRemodelacion(casa, prospecto) {

    const panel = document.getElementById('detalle-remodelacion-content');

    if (!panel || !casa) return;

    const eco = calcularEconomiaCasa(casa, prospecto);

    const costos = getCostosRemodelacionCasa(casa);

    const puedeEditar = puedeEditarCostosRemodelacion();

    const categorias = (typeof RH_CATEGORIAS_COSTO_REM !== 'undefined' ? RH_CATEGORIAS_COSTO_REM : ['Otro'])

        .map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');



    const filasCostos = costos.length === 0

        ? '<tr><td colspan="5" class="celda-vacia">Sin costos registrados aún.</td></tr>'

        : costos.map(c => `<tr>

            <td>${escapeHtml(c.fecha || '—')}</td>

            <td><strong>${escapeHtml(c.concepto)}</strong>${c.nota ? `<br><small>${escapeHtml(c.nota)}</small>` : ''}</td>

            <td>${escapeHtml(c.categoria || '—')}</td>

            <td class="mkt-celda-monto">${formatearMoneda(c.monto)}</td>

            <td>${puedeEditar ? `<button type="button" class="btn btn-outline btn-small" onclick="eliminarCostoRemodelacion('${escapeHtml(casa.id)}','${escapeHtml(c.id)}')">Eliminar</button>` : '—'}</td>

        </tr>`).join('');



    panel.innerHTML = `

        <div class="remodel-resumen mkt-analytics-grid">

            <div class="mkt-metric-card"><span class="mkt-metric-label">Adquisición</span><span class="mkt-metric-value">${formatearMoneda(eco.adquisicion)}</span></div>

            <div class="mkt-metric-card mkt-metric-warning"><span class="mkt-metric-label">Costos remodelación</span><span class="mkt-metric-value">${formatearMoneda(eco.remodelacion)}</span></div>

            <div class="mkt-metric-card mkt-metric-accent"><span class="mkt-metric-label">Inversión total</span><span class="mkt-metric-value">${formatearMoneda(eco.inversion)}</span></div>

            <div class="mkt-metric-card ${eco.utilidad != null && eco.utilidad >= 0 ? 'mkt-metric-success' : 'mkt-metric-danger'}"><span class="mkt-metric-label">Utilidad ${eco.precioVenta ? '' : 'proyectada'}</span><span class="mkt-metric-value">${eco.utilidad != null ? formatearMoneda(eco.utilidad) : '—'}</span></div>

        </div>

        ${puedeEditar ? `

        <form id="form-montos-casa" class="form-grid remodel-montos-form">

            <input type="hidden" id="montos-casa-id" value="${escapeHtml(casa.id)}">

            <div class="form-group"><label>Monto adquisición</label><input type="number" id="montos-adquisicion" class="form-control" min="0" step="0.01" value="${eco.adquisicion || ''}"></div>

            <div class="form-group"><label>Precio de venta</label><input type="number" id="montos-precio-venta" class="form-control" min="0" step="0.01" value="${eco.precioVenta || ''}" placeholder="Para utilidad proyectada"></div>

            <div class="form-group full-width"><button type="submit" class="btn btn-outline btn-toolbar">Actualizar montos</button></div>

        </form>` : ''}

        ${puedeEditar ? `

        <section class="remodel-add-section">

            <h5 class="mkt-section-title">Registrar costo de remodelación</h5>

            <form id="form-costo-remodelacion" class="form-grid">

                <input type="hidden" id="rem-casa-id" value="${escapeHtml(casa.id)}">

                <div class="form-group"><label>Concepto *</label><input type="text" id="rem-concepto" class="form-control" placeholder="Ej. Pintura, impermeabilizante…" required></div>

                <div class="form-group"><label>Categoría</label><select id="rem-categoria" class="form-control">${categorias}</select></div>

                <div class="form-group"><label>Monto *</label><input type="number" id="rem-monto" class="form-control" min="0" step="0.01" required></div>

                <div class="form-group full-width"><label>Nota</label><input type="text" id="rem-nota" class="form-control" placeholder="Proveedor, factura, etc."></div>

                <div class="form-group full-width"><button type="submit" class="btn btn-primary btn-toolbar">Agregar costo</button></div>

            </form>

        </section>` : '<p class="module-desc">Los costos de remodelación los registra la administradora o dirección.</p>'}

        <section class="mkt-section">

            <h5 class="mkt-section-title">Detalle de costos (${costos.length})</h5>

            <div class="table-responsive table-clean table-mkt">

                <table class="table-costos-rem">

                    <thead><tr><th>Fecha</th><th>Concepto</th><th>Categoría</th><th>Monto</th><th></th></tr></thead>

                    <tbody>${filasCostos}</tbody>

                    <tfoot><tr><td colspan="3"><strong>Total remodelación</strong></td><td class="mkt-celda-monto"><strong>${formatearMoneda(eco.remodelacion)}</strong></td><td></td></tr></tfoot>

                </table>

            </div>

        </section>`;



    bindFormSubmit('form-montos-casa', guardarMontosCasa);

    bindFormSubmit('form-costo-remodelacion', guardarCostoRemodelacion);

}



function renderAdeudosHtml(p) {

    if (!p) return '';

    return `

        <div class="detalle-adeudos">

            <h5>Adeudos registrados</h5>

            <div class="mkt-analytics-grid detalle-adeudos-grid">

                <div class="mkt-metric-card"><span class="mkt-metric-label">Crédito</span><span class="mkt-metric-value">${formatearMoneda(p.adeudoCredito)}</span></div>

                <div class="mkt-metric-card"><span class="mkt-metric-label">Agua</span><span class="mkt-metric-value">${formatearMoneda(p.adeudoAgua)}</span></div>

                <div class="mkt-metric-card"><span class="mkt-metric-label">Luz</span><span class="mkt-metric-value">${formatearMoneda(p.adeudoLuz)}</span></div>

                <div class="mkt-metric-card"><span class="mkt-metric-label">Predial</span><span class="mkt-metric-value">${formatearMoneda(p.adeudoPredial)}</span></div>

            </div>

        </div>`;

}



function renderDetalleHistorial(caso, p) {

    const histPanel = document.getElementById('detalle-historial-content');

    if (!histPanel) return;



    let items = '';

    if (detalleModo === 'casa' && caso.historial?.length) {

        items = caso.historial.map(h => `

            <div class="timeline-item">

                <div class="timeline-dot"></div>

                <div class="timeline-body">

                    <strong>${escapeHtml(h.estatus)}</strong>

                    <p>${escapeHtml(h.nota || '')}</p>

                    <small>${escapeHtml(h.fecha)} · ${escapeHtml(h.usuario)}</small>

                </div>

            </div>`).join('');

    } else if (p?.eventos?.length) {

        items = p.eventos.map(h => `

            <div class="timeline-item">

                <div class="timeline-dot"></div>

                <div class="timeline-body">

                    <strong>${escapeHtml(h.evento)}</strong>

                    <p>${escapeHtml(h.detalle || '')}</p>

                    <small>${escapeHtml(h.fecha)} · ${escapeHtml(h.usuario)}</small>

                </div>

            </div>`).join('');

    }

    histPanel.innerHTML = items || '<p class="module-desc">Sin movimientos registrados.</p>';

}



function renderDetalleExpediente(caso, p) {

    const expPanel = document.getElementById('detalle-expediente-content');

    if (!expPanel) return;

    const data = p || caso;

    expPanel.innerHTML = `

        <div class="detalle-grid">

            <div class="detalle-kv"><span>Notas</span><strong>${escapeHtml(data.notas || '—')}</strong></div>

            <div class="detalle-kv"><span>Registrado por</span><strong>${escapeHtml(data.registradoPor || '—')}</strong></div>

            <div class="detalle-kv"><span>Escrituras</span><strong>${escapeHtml(data.tieneEscrituras || '—')}</strong></div>

            <div class="detalle-kv"><span>Invadida</span><strong>${escapeHtml(data.invadida || '—')}</strong></div>

            <div class="detalle-kv"><span>Estatus venta</span><strong>${badgeEstatusProspecto(data.estatus || caso.estatus)}</strong></div>

            <div class="detalle-kv detalle-kv--wide"><span>Propuesta</span><strong>${escapeHtml(data.propuestaFinal || '—')}</strong></div>

        </div>`;

}



function poblarDestinatarioMensaje(caso, p) {

    const sel = document.getElementById('msg-para-rol');

    if (!sel || !currentUser) return;

    const vendedorId = caso.vendedorId || p?.vendedorId;

    const vend = DB.get('usuariosLogin').find(u => u.id === vendedorId);

    const opciones = [];



    if (currentUser.rol === 'Vendedor') {

        opciones.push({ value: 'Administradora', label: 'Administradora' });

        opciones.push({ value: 'Direccion', label: 'Dirección' });

    } else if (currentUser.rol === 'Administradora') {

        if (vend) opciones.push({ value: `user:${vend.id}`, label: vend.displayName });

        opciones.push({ value: 'Vendedor', label: 'Vendedor asignado' });

    } else {

        if (vend) opciones.push({ value: `user:${vend.id}`, label: vend.displayName });

        opciones.push({ value: 'Administradora', label: 'Administradora' });

        opciones.push({ value: 'Vendedor', label: 'Vendedor asignado' });

    }

    sel.innerHTML = opciones.map(o => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`).join('');

}



function renderMensajesCaso() {

    const wrap = document.getElementById('detalle-mensajes-list');

    if (!wrap) return;



    const mensajes = obtenerMensajesCaso();

    const countEl = document.getElementById('detalle-msg-count');

    if (countEl) {

        countEl.textContent = mensajes.length;

        countEl.classList.toggle('hidden', mensajes.length === 0);

    }



    wrap.innerHTML = mensajes.length === 0

        ? '<div class="chat-empty">Sin mensajes. Usa este espacio para solicitar o aclarar información del caso.</div>'

        : mensajes.map(m => {

            const propio = m.autorId === currentUser?.id;

            return `<div class="chat-bubble ${propio ? 'chat-bubble--own' : 'chat-bubble--other'}">

                <div class="chat-bubble-header">

                    <strong>${escapeHtml(m.autorNombre)}</strong>

                    <span class="chat-rol">${escapeHtml(rhEtiquetaRol(m.autorRol))}</span>

                    <small>${escapeHtml(m.fecha)}</small>

                </div>

                <p>${escapeHtml(m.texto)}</p>

            </div>`;

        }).join('');

    wrap.scrollTop = wrap.scrollHeight;

}



function obtenerMensajesCaso() {

    const caso = getCasoActivo();

    if (!caso) return [];

    if (!caso.mensajes) caso.mensajes = [];

    return caso.mensajes;

}



function guardarMensajesCaso(mensajes) {

    if (detalleModo === 'casa') {

        const casas = DB.get('casas');

        const idx = casas.findIndex(c => c.id === detalleActivoId);

        if (idx < 0) return null;

        casas[idx].mensajes = mensajes;

        DB.set('casas', casas);

        return casas[idx];

    }

    const prospectos = DB.get('prospectos');

    const idx = prospectos.findIndex(p => p.id === detalleActivoId);

    if (idx < 0) return null;

    prospectos[idx].mensajes = mensajes;

    DB.set('prospectos', prospectos);

    return prospectos[idx];

}



function enviarMensajeCaso(e) {

    e.preventDefault();

    const texto = document.getElementById('msg-texto').value.trim();

    if (!texto || !detalleActivoId) return;



    const caso = getCasoActivo();

    if (!caso) return;

    const mensajes = caso.mensajes || [];

    const p = getProspectoDelCaso(caso);



    const paraVal = document.getElementById('msg-para-rol').value;

    let targetUserId = '';

    let targetRoles = [];

    if (paraVal.startsWith('user:')) {

        targetUserId = paraVal.slice(5);

    } else if (paraVal === 'Vendedor') {

        targetUserId = caso.vendedorId || p?.vendedorId || '';

    } else {

        targetRoles = [paraVal];

    }



    const msg = {

        id: DB.getId(),

        texto,

        autorId: currentUser.id,

        autorNombre: currentUser.displayName,

        autorRol: currentUser.rol,

        paraUserId: targetUserId,

        paraRoles: targetRoles,

        fecha: new Date().toLocaleString()

    };

    mensajes.push(msg);

    const actualizado = guardarMensajesCaso(mensajes);

    if (!actualizado) return;



    const nombreCaso = actualizado.nombreCompleto || p?.nombreCompleto || 'Caso';

    createAlert({

        titulo: `Mensaje sobre ${nombreCaso}`,

        mensaje: texto.slice(0, 120),

        targetUserId,

        targetRoles,

        relatedId: detalleActivoId,

        tipo: 'mensaje_caso',

        casoTipo: detalleModo === 'casa' ? 'casa' : 'prospecto'

    });



    logAction(`Mensaje en caso ${nombreCaso}`);

    document.getElementById('msg-texto').value = '';

    renderMensajesCaso();

}



function abrirDetalleProspectoComunicacion(prospectoId) {

    abrirDetalleProspecto(prospectoId, 'comunicacion');

}


