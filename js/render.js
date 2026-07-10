/**
 * Revive Hogar — renderizado de módulos
 */

function cargarSelects() {
    const campSel = document.getElementById('pros-campana');
    if (campSel) {
        const activas = getCampanasActivas();
        campSel.innerHTML = '<option value="OTRO">Otro (sin campaña)</option>' +
            activas.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.nombre || c.identificador)}${c.canal ? ' · ' + escapeHtml(c.canal) : ''}</option>`).join('');
    }
    const vendSel = document.getElementById('pros-vendedor');
    if (vendSel) {
        vendSel.innerHTML = getVendedoresActivos()
            .map(v => `<option value="${escapeHtml(v.id)}">${escapeHtml(v.displayName)}</option>`).join('');
    }
    const campFecha = document.getElementById('camp-fecha');
    if (campFecha && !campFecha.value) campFecha.value = hoyISO();
}

/* —— Planner: ver js/planner.js —— */

/* —— Dashboard —— */
function renderDashboard() {
    const prospectos = DB.get('prospectos');
    const campanas = DB.get('campanas');
    const casas = DB.get('casas');
    const presupuesto = campanas.reduce((s, c) => s + Number(c.costo || 0), 0);
    const firmados = prospectos.filter(p => p.estatus === 'Firmado').length;
    const declinados = prospectos.filter(p => p.estatus === 'Declinado').length;
    const activos = prospectos.filter(p => !['Firmado', 'Declinado'].includes(p.estatus)).length;
    const costoProspecto = prospectos.length ? presupuesto / prospectos.length : null;

    setText('dash-presupuesto', formatearMoneda(presupuesto));
    setText('dash-prospectos', prospectos.length);
    setText('dash-firmados', firmados);
    setText('dash-declinados', declinados);
    setText('dash-activos', activos);
    setText('dash-costo-prospecto', costoProspecto != null ? formatearMoneda(costoProspecto) : '—');
    setText('dash-casas-pipeline', casas.filter(c => c.estatusPipeline !== 'Cerrada').length);
    setText('dash-casas-venta', casas.filter(c => c.estatusPipeline === 'En venta').length);

    const fin = calcularIndicadoresFinancieros();
    setText('dash-remodelacion', formatearMoneda(fin.costosRemodelacion));
    setText('dash-inversion-propiedades', formatearMoneda(fin.inversionPropiedades));
    setText('dash-utilidad-realizada', fin.utilidadRealizada ? formatearMoneda(fin.utilidadRealizada) : '—');
    setText('dash-utilidad-proyectada', fin.utilidadProyectada ? formatearMoneda(fin.utilidadProyectada) : '—');
}

/* —— Marketing —— */
function renderMarketing() {
    const campanas = DB.get('campanas');
    const prospectos = DB.get('prospectos');
    document.getElementById('mkt-direccion-vendedor-hint')?.classList.toggle('hidden', !rhPuedeElegirVendedorVista());
    const presupuesto = campanas.reduce((s, c) => s + Number(c.costo || 0), 0);
    setText('kpi-mkt-presupuesto', formatearMoneda(presupuesto));
    setText('kpi-mkt-prospectos', prospectos.length);
    setText('kpi-mkt-firmados', prospectos.filter(p => p.estatus === 'Firmado').length);
    setText('kpi-mkt-declinados', prospectos.filter(p => p.estatus === 'Declinado').length);

    const tbodyCamp = document.querySelector('#table-campanas tbody');
    if (tbodyCamp) {
        tbodyCamp.innerHTML = campanas.length === 0
            ? '<tr><td colspan="8" class="celda-vacia">No hay campañas registradas.</td></tr>'
            : campanas.map(c => {
                const st = estadisticasCampana(c.id, prospectos);
                return `<tr>
                    <td><strong class="folio-tag">${escapeHtml(c.nombre || c.identificador)}</strong></td>
                    <td><span class="badge-mkt badge-mkt-primary">${escapeHtml(c.canal || '—')}</span></td>
                    <td>${escapeHtml(c.fechaInicio || '—')}</td>
                    <td>${escapeHtml(c.diasDuracion)} días</td>
                    <td class="mkt-celda-monto">${formatearMoneda(c.costo)}</td>
                    <td><span class="mkt-count">${st.total}</span></td>
                    <td><span class="mkt-count mkt-count-warn">${st.enProceso}</span></td>
                    <td><span class="mkt-count mkt-count-ok">${st.firmados}</span></td>
                    <td>${badgeEstatusCampana(c.estatus)}</td>
                </tr>`;
            }).join('');
    }

    const tbodyPros = document.querySelector('#table-prospectos-mkt tbody');
    if (tbodyPros) {
        const vendedores = DB.get('usuariosLogin');
        tbodyPros.innerHTML = prospectos.length === 0
            ? '<tr><td colspan="6" class="celda-vacia">Sin prospectos.</td></tr>'
            : prospectos.map(p => {
                const vend = vendedores.find(v => v.id === p.vendedorId);
                const camp = getCampanaById(p.campañaId);
                const campLabel = p.campañaId === 'OTRO' || !p.campañaId ? 'Otro' : (camp ? camp.identificador : '—');
                return `<tr>
                    <td><strong>${escapeHtml(p.nombreCompleto)}</strong></td>
                    <td>${escapeHtml(campLabel)}</td>
                    <td>${escapeHtml(vend ? vend.displayName : '—')}</td>
                    <td>${escapeHtml(p.telefono || '—')}</td>
                    <td>${badgeEstatusProspecto(p.estatus)}</td>
                    <td>${escapeHtml(p.registradoPor || '—')}</td>
                </tr>`;
            }).join('');
    }
}

function abrirModalCampana() {
    cargarSelects();
    document.getElementById('form-campana')?.reset();
    const f = document.getElementById('camp-fecha');
    if (f) f.value = hoyISO();
    document.getElementById('modal-campana')?.classList.add('active');
}

function abrirModalProspectoMarketing() {
    cargarSelects();
    document.getElementById('form-prospecto')?.reset();
    document.getElementById('pros-origen-rol').value = 'marketing';
    document.getElementById('pros-vendedor-wrap')?.classList.remove('hidden');
    const pv = document.getElementById('pros-vendedor');
    if (pv) pv.required = true;
    document.getElementById('modal-prospecto')?.classList.add('active');
}

/* —— Vendedor —— */
function actualizarToolbarVendedorVista() {
    const picker = document.getElementById('vend-toolbar-picker');
    const sel = document.getElementById('vend-vendedor-select');
    const btnReg = document.getElementById('vend-btn-registrar');
    const puedeElegir = rhPuedeElegirVendedorVista();

    picker?.classList.toggle('hidden', !puedeElegir);
    btnReg?.classList.toggle('hidden', puedeElegir);

    if (!puedeElegir || !sel) return;

    const vendedores = getVendedoresActivos();
    const vid = getVendedorVistaId();
    sel.innerHTML = vendedores.length
        ? vendedores.map(v => `<option value="${escapeHtml(v.id)}">${escapeHtml(v.displayName)}</option>`).join('')
        : '<option value="">Sin vendedores activos</option>';
    if (vid) sel.value = vid;
}

function irAModuloVendedorDireccion() {
    const btn = document.querySelector('.sidebar-nav .nav-item[data-module-id="mod-vendedor"]');
    if (btn) showModule('mod-vendedor', btn);
}

function onCambioVendedorVista() {
    const sel = document.getElementById('vend-vendedor-select');
    if (!sel?.value) return;
    setVendedorVistaId(sel.value);
    renderVendedor();
}

function renderVendedor() {
    if (!currentUser) return;
    actualizarToolbarVendedorVista();

    const vendedorId = getVendedorVistaId();
    const vendedor = getVendedorVistaUsuario();
    const esVistaDireccion = rhPuedeElegirVendedorVista();

    const titleEl = document.getElementById('vend-mod-title');
    const descEl = document.getElementById('vend-mod-desc');
    const casasTitle = document.getElementById('vend-casas-title');
    if (titleEl) {
        titleEl.textContent = esVistaDireccion && vendedor
            ? `Prospectos — ${vendedor.displayName}`
            : 'Mis Prospectos';
    }
    if (descEl) {
        descEl.textContent = esVistaDireccion
            ? 'Vista del módulo comercial del vendedor seleccionado.'
            : 'Seguimiento comercial y registro de prospectos en campo.';
    }
    if (casasTitle) {
        casasTitle.textContent = esVistaDireccion && vendedor
            ? `Propiedades de ${vendedor.displayName} (pipeline)`
            : 'Mis propiedades (pipeline)';
    }

    if (!vendedorId) {
        setText('vend-total', 0);
        setText('vend-nuevos', 0);
        setText('vend-interesados', 0);
        setText('vend-firmados', 0);
        const tbodyVac = document.querySelector('#table-vendedor tbody');
        if (tbodyVac) {
            tbodyVac.innerHTML = '<tr><td colspan="6" class="celda-vacia">No hay vendedores activos para mostrar.</td></tr>';
        }
        const casasVac = document.querySelector('#table-vendedor-casas tbody');
        if (casasVac) {
            casasVac.innerHTML = '<tr><td colspan="5" class="celda-vacia">—</td></tr>';
        }
        return;
    }

    const prospectos = DB.get('prospectos').filter(p => p.vendedorId === vendedorId);
    const nuevos = prospectos.filter(p => p.estatus === 'No contactado').length;
    setText('vend-total', prospectos.length);
    setText('vend-nuevos', nuevos);
    setText('vend-interesados', prospectos.filter(p => p.estatus === 'Interesado').length);
    setText('vend-firmados', prospectos.filter(p => p.estatus === 'Firmado').length);

    const msgVacio = esVistaDireccion
        ? 'Este vendedor no tiene prospectos asignados.'
        : 'No tienes prospectos asignados.';

    const tbody = document.querySelector('#table-vendedor tbody');
    if (!tbody) return;
    tbody.innerHTML = prospectos.length === 0
        ? `<tr><td colspan="6" class="celda-vacia">${msgVacio}</td></tr>`
        : prospectos.map(p => {
            const camp = p.campañaId && p.campañaId !== 'OTRO' ? getCampanaById(p.campañaId) : null;
            return `<tr>
                <td><strong>${escapeHtml(p.nombreCompleto)}</strong></td>
                <td>${escapeHtml(p.telefono)}</td>
                <td>${escapeHtml(camp ? camp.identificador : 'Otro')}</td>
                <td>${badgeEstatusProspecto(p.estatus)}</td>
                <td>${escapeHtml(p.fechaCaptura || '—')}</td>
                <td class="celda-acciones">
                    <button type="button" class="btn btn-primary btn-small" onclick="abrirGestionProspecto('${escapeHtml(p.id)}')">Gestionar</button>
                </td>
            </tr>`;
        }).join('');

    const casasVend = document.querySelector('#table-vendedor-casas tbody');
    if (casasVend) {
        const misCasas = DB.get('casas').filter(c => c.vendedorId === vendedorId);
        const msgCasasVacias = esVistaDireccion
            ? 'Este vendedor no tiene propiedades firmadas aún.'
            : 'Sin propiedades firmadas aún.';
        casasVend.innerHTML = misCasas.length === 0
            ? `<tr><td colspan="5" class="celda-vacia">${msgCasasVacias}</td></tr>`
            : misCasas.map(c => {
                const eco = calcularEconomiaCasa(c, getProspectoById(c.prospectoId));
                return `<tr>
                <td><strong>${escapeHtml(c.nombreCompleto)}</strong></td>
                <td>${badgeEstatusPipeline(c.estatusPipeline)}</td>
                <td class="mkt-celda-monto">${formatearMoneda(eco.remodelacion)}</td>
                <td>${escapeHtml(c.direccionPropiedad)}</td>
                <td><button type="button" class="btn btn-primary btn-small" onclick="abrirDetalleCasa('${escapeHtml(c.id)}')">Ver registro</button></td>
            </tr>`;
            }).join('');
    }
}

function abrirModalProspectoVendedor() {
    cargarSelects();
    document.getElementById('form-prospecto')?.reset();
    document.getElementById('pros-origen-rol').value = 'vendedor';
    const wrap = document.getElementById('pros-vendedor-wrap');
    const pv = document.getElementById('pros-vendedor');
    if (currentUser?.rol === 'Vendedor') {
        wrap?.classList.add('hidden');
        if (pv) { pv.required = false; pv.value = currentUser.id; }
    } else {
        wrap?.classList.remove('hidden');
        if (pv) {
            pv.required = true;
            const vid = getVendedorVistaId();
            if (vid) pv.value = vid;
        }
    }
    document.getElementById('modal-prospecto')?.classList.add('active');
}

function abrirGestionProspecto(id) {
    const p = getProspectoById(id);
    if (!p) return;
    if (currentUser?.rol === 'Vendedor' && p.vendedorId !== currentUser.id) return;

    document.getElementById('ges-id').value = p.id;
    const estatusSel = document.getElementById('ges-estatus');
    const estatusFijos = [RH_ESTATUS_PROSPECTO.PROPUESTA_LISTA, RH_ESTATUS_PROSPECTO.FIRMADO, RH_ESTATUS_PROSPECTO.DECLINADO, RH_ESTATUS_PROSPECTO.EN_ADMIN];
    if (estatusSel) {
        if (estatusFijos.includes(p.estatus)) {
            estatusSel.innerHTML = `<option value="${escapeHtml(p.estatus)}">${escapeHtml(p.estatus)}</option>`;
            estatusSel.disabled = true;
        } else {
            estatusSel.disabled = false;
            estatusSel.innerHTML = `
                <option value="No contactado">No contactado</option>
                <option value="En contacto">En contacto</option>
                <option value="Interesado">Interesado</option>`;
            estatusSel.value = p.estatus || 'No contactado';
        }
    }
    document.getElementById('ges-tipo-credito').value = p.tipoCredito || '';
    document.getElementById('ges-escrituras').value = p.tieneEscrituras || '';
    document.getElementById('ges-invadida').value = p.invadida || '';
    document.getElementById('ges-adeudo-credito').value = p.adeudoCredito ?? 0;
    document.getElementById('ges-adeudo-agua').value = p.adeudoAgua ?? 0;
    document.getElementById('ges-adeudo-luz').value = p.adeudoLuz ?? 0;
    document.getElementById('ges-adeudo-predial').value = p.adeudoPredial ?? 0;

    const locked = document.getElementById('ges-locked-fields');
    if (locked) {
        locked.innerHTML = camposContactoBloqueadosHtml(p, 'ges', true);
    }
    const gesDir = document.getElementById('ges-dir');
    if (gesDir) gesDir.value = p.direccionPropiedad || '';
    if (typeof bindMapaDireccionInput === 'function') {
        bindMapaDireccionInput('ges-dir', 'ges-map-preview');
    }

    const cierreWrap = document.getElementById('ges-cierre-wrap');
    const enviarAdmin = document.getElementById('ges-enviar-admin-wrap');
    if (cierreWrap) {
        cierreWrap.classList.toggle('hidden', p.estatus !== RH_ESTATUS_PROSPECTO.PROPUESTA_LISTA);
    }
    if (enviarAdmin) {
        enviarAdmin.classList.toggle('hidden',
            p.estatus !== RH_ESTATUS_PROSPECTO.INTERESADO || p.enviadoAdministradora);
    }

    document.getElementById('modal-gestion-prospecto')?.classList.add('active');
}

/* —— Administradora —— */
function renderAdministradora() {
    const prospectos = DB.get('prospectos').filter(p =>
        [RH_ESTATUS_PROSPECTO.EN_ADMIN, RH_ESTATUS_PROSPECTO.PROPUESTA_LISTA].includes(p.estatus) ||
        (p.estatus === RH_ESTATUS_PROSPECTO.INTERESADO && p.enviadoAdministradora)
    );
    setText('admin-pendientes', prospectos.filter(p =>
        p.estatus === RH_ESTATUS_PROSPECTO.EN_ADMIN ||
        (p.estatus === RH_ESTATUS_PROSPECTO.INTERESADO && p.enviadoAdministradora)
    ).length);
    setText('admin-propuestas', prospectos.filter(p => p.estatus === RH_ESTATUS_PROSPECTO.PROPUESTA_LISTA).length);

    const tbody = document.querySelector('#table-administradora tbody');
    if (!tbody) return;
    const vendedores = DB.get('usuariosLogin');
    tbody.innerHTML = prospectos.length === 0
        ? '<tr><td colspan="7" class="celda-vacia">No hay expedientes pendientes.</td></tr>'
        : prospectos.map(p => {
            const vend = vendedores.find(v => v.id === p.vendedorId);
            return `<tr>
                <td><strong>${escapeHtml(p.nombreCompleto)}</strong></td>
                <td>${escapeHtml(p.direccionPropiedad)}</td>
                <td>${escapeHtml(p.tipoCredito || '—')}</td>
                <td>${escapeHtml(vend ? vend.displayName : '—')}</td>
                <td>${badgeEstatusProspecto(p.estatus)}</td>
                <td>${formatearMoneda(p.adeudoCredito)}</td>
                <td class="celda-acciones">
                    <button type="button" class="btn btn-outline btn-small" onclick="abrirDetalleProspecto('${escapeHtml(p.id)}')">Ver caso</button>
                    <button type="button" class="btn btn-outline btn-small btn-luna-chip" onclick="lunaScoreProspecto('${escapeHtml(p.id)}')">Luna</button>
                    <button type="button" class="btn btn-primary btn-small" onclick="abrirExpedienteAdmin('${escapeHtml(p.id)}')">Expediente</button>
                </td>
            </tr>`;
        }).join('');
}

function abrirExpedienteAdmin(id) {
    const p = getProspectoById(id);
    if (!p) return;
    document.getElementById('exp-id').value = p.id;
    const montoExp = document.getElementById('exp-monto-adquisicion');
    if (montoExp) montoExp.value = p.montoAdquisicion != null ? p.montoAdquisicion : getMontoAdquisicionCasa(null, p);

    const fields = document.getElementById('exp-fields');
    if (fields) {
        fields.innerHTML = `
            ${camposContactoBloqueadosHtml(p, 'exp', true)}
            <div class="form-group"><label>Tipo de crédito</label><input class="form-control" id="exp-tipo-credito" value="${escapeHtml(p.tipoCredito || '')}"></div>
            <div class="form-group"><label>¿Escrituras?</label><select class="form-control" id="exp-escrituras"><option value="">—</option><option value="Si" ${p.tieneEscrituras === 'Si' ? 'selected' : ''}>Sí</option><option value="No" ${p.tieneEscrituras === 'No' ? 'selected' : ''}>No</option></select></div>
            <div class="form-group"><label>¿Invadida?</label><select class="form-control" id="exp-invadida"><option value="">—</option><option value="Si" ${p.invadida === 'Si' ? 'selected' : ''}>Sí</option><option value="No" ${p.invadida === 'No' ? 'selected' : ''}>No</option></select></div>
            <div class="form-group"><label>Adeudo crédito</label><input type="number" min="0" step="0.01" class="form-control" id="exp-adeudo-credito" value="${Number(p.adeudoCredito || 0)}"></div>
            <div class="form-group"><label>Adeudo agua</label><input type="number" min="0" step="0.01" class="form-control" id="exp-adeudo-agua" value="${Number(p.adeudoAgua || 0)}"></div>
            <div class="form-group"><label>Adeudo luz</label><input type="number" min="0" step="0.01" class="form-control" id="exp-adeudo-luz" value="${Number(p.adeudoLuz || 0)}"></div>
            <div class="form-group"><label>Adeudo predial</label><input type="number" min="0" step="0.01" class="form-control" id="exp-adeudo-predial" value="${Number(p.adeudoPredial || 0)}"></div>`;
    }

    const docs = document.getElementById('exp-documentos-preview');
    if (docs) docs.innerHTML = generarVistaDocumentos(p);

    if (typeof actualizarMapaDireccion === 'function') {
        actualizarMapaDireccion(p.direccionPropiedad || '', 'exp-map-preview');
    }

    document.getElementById('modal-expediente-admin')?.classList.add('active');
}

/* —— Pipeline —— */
function renderPipeline() {
    const casas = DB.get('casas');
    const filtro = document.getElementById('pipeline-filter')?.value || 'all';
    let list = casas;
    if (filtro !== 'all') list = casas.filter(c => c.estatusPipeline === filtro);

    setText('pipe-total', casas.length);
    setText('pipe-espera', casas.filter(c => c.estatusPipeline === 'Espera remodelación').length);
    setText('pipe-remodelacion', casas.filter(c => c.estatusPipeline === 'En remodelación').length);
    setText('pipe-venta', casas.filter(c => c.estatusPipeline === 'En venta').length);
    setText('pipe-cerradas', casas.filter(c => c.estatusPipeline === 'Cerrada').length);

    const fin = calcularIndicadoresFinancieros();
    setText('pipe-costo-remodelacion', formatearMoneda(fin.costosRemodelacion));
    setText('pipe-inversion-total', formatearMoneda(fin.inversionPropiedades));
    setText('pipe-utilidad-realizada', fin.utilidadRealizada ? formatearMoneda(fin.utilidadRealizada) : '—');

    const tbody = document.querySelector('#table-pipeline tbody');
    if (!tbody) return;
    tbody.innerHTML = list.length === 0
        ? '<tr><td colspan="9" class="celda-vacia">No hay propiedades en este filtro.</td></tr>'
        : list.map(c => {
            const p = getProspectoById(c.prospectoId);
            const eco = calcularEconomiaCasa(c, p);
            const utilidadTxt = eco.utilidad != null ? formatearMoneda(eco.utilidad) : '—';
            const utilidadCls = eco.utilidad != null && eco.utilidad < 0 ? 'mkt-celda-negativo' : 'mkt-celda-monto';
            return `<tr>
            <td><strong>${escapeHtml(c.nombreCompleto)}</strong></td>
            <td>${escapeHtml(c.direccionPropiedad)}</td>
            <td>${escapeHtml(c.tipoCredito || '—')}</td>
            <td>${badgeEstatusPipeline(c.estatusPipeline)}</td>
            <td class="mkt-celda-monto">${formatearMoneda(eco.remodelacion)}</td>
            <td class="mkt-celda-monto">${formatearMoneda(eco.inversion)}</td>
            <td class="${utilidadCls}">${utilidadTxt}</td>
            <td>${escapeHtml(c.fechaFirma ? new Date(c.fechaFirma).toLocaleDateString() : '—')}</td>
            <td class="celda-acciones">
                <button type="button" class="btn btn-primary btn-small" onclick="abrirDetalleCasa('${escapeHtml(c.id)}')">Ver registro</button>
                <button type="button" class="btn btn-outline btn-small" onclick="abrirDetalleCasa('${escapeHtml(c.id)}','remodelacion')">Costos</button>
                ${puedeEditarPipeline() ? `<button type="button" class="btn btn-primary btn-small" onclick="abrirCambioPipeline('${escapeHtml(c.id)}')">Estatus</button>` : ''}
                <button type="button" class="btn btn-outline btn-small btn-luna-chip" onclick="abrirDetalleCasa('${escapeHtml(c.id)}','luna')">Luna</button>
            </td>
        </tr>`;
        }).join('');
}

function abrirCambioPipeline(casaId) {
    if (!puedeEditarPipeline()) return;
    document.getElementById('pipe-casa-id').value = casaId;
    const c = DB.get('casas').find(x => x.id === casaId);
    if (c) {
        document.getElementById('pipe-nuevo-estatus').value = c.estatusPipeline;
        const pv = document.getElementById('pipe-precio-venta');
        if (pv) pv.value = c.precioVenta || '';
    }
    togglePipePrecioVenta();
    document.getElementById('modal-pipeline')?.classList.add('active');
}

function togglePipePrecioVenta() {
    const estatus = document.getElementById('pipe-nuevo-estatus')?.value;
    const wrap = document.getElementById('pipe-precio-venta-wrap');
    const input = document.getElementById('pipe-precio-venta');
    if (!wrap || !input) return;
    const requiere = estatus === RH_ESTATUS_PIPELINE.CERRADA || estatus === RH_ESTATUS_PIPELINE.VENTA;
    wrap.classList.toggle('hidden', !requiere);
    input.required = estatus === RH_ESTATUS_PIPELINE.CERRADA;
}

/* —— Auditoría —— */
function renderAuditoria() {
    const userF = document.getElementById('audit-filter-user')?.value || '';
    const dateF = document.getElementById('audit-filter-date')?.value || '';
    let logs = DB.get('auditoria');
    if (userF) logs = logs.filter(l => l.usuario.includes(userF));
    if (dateF) logs = logs.filter(l => l.fechaISO === dateF);
    const tbody = document.querySelector('#table-auditoria tbody');
    if (!tbody) return;
    tbody.innerHTML = logs.slice(0, 200).map(l => `<tr>
        <td>${escapeHtml(l.fecha)}</td>
        <td>${escapeHtml(l.usuario)}</td>
        <td>${escapeHtml(l.accion)}</td>
    </tr>`).join('') || '<tr><td colspan="3" class="celda-vacia">Sin registros.</td></tr>';
}

/* —— Usuarios —— */
function formatoContactoUsuario(u) {
    const partes = [];
    if (u.correo) partes.push(escapeHtml(u.correo));
    if (u.telefono) partes.push(escapeHtml(u.telefono));
    return partes.length ? partes.join('<br>') : '<span class="celda-muted">—</span>';
}

function renderUsuarios() {
    if (!puedeGestionarUsuarios()) return;
    const usuarios = DB.get('usuariosLogin');
    setText('usr-total', usuarios.length);
    setText('usr-vendedores', usuarios.filter(u => u.rol === 'Vendedor').length);
    const tbody = document.querySelector('#table-usuarios tbody');
    if (!tbody) return;
    tbody.innerHTML = usuarios.map(u => `<tr>
        <td><strong>${escapeHtml(u.displayName)}</strong>${u.nombreLuna && u.nombreLuna !== u.displayName ? `<br><small class="celda-muted">Luna: ${escapeHtml(getNombreLuna(u))}</small>` : ''}</td>
        <td>${escapeHtml(rhEtiquetaRol(u.rol))}</td>
        <td>${formatoContactoUsuario(u)}</td>
        <td>${u.activo === false ? '<span class="badge-mkt badge-mkt-danger">Inactivo</span>' : '<span class="badge-mkt badge-mkt-success">Activo</span>'}</td>
        <td class="celda-acciones">
            <button type="button" class="btn btn-primary btn-small" onclick="abrirEditorUsuario('${escapeHtml(u.id)}')">Configurar</button>
            ${u.rol === 'Vendedor' ? `<button type="button" class="btn btn-danger btn-small" onclick="eliminarVendedor('${escapeHtml(u.id)}')">Eliminar</button>` : ''}
        </td>
    </tr>`).join('');
}

function abrirEditorUsuario(id) {
    if (!puedeGestionarUsuarios()) return;
    const u = DB.get('usuariosLogin').find(x => x.id === id);
    if (!u) return;
    document.getElementById('usr-edit-id').value = u.id;
    document.getElementById('usr-edit-nombre').value = u.displayName || '';
    document.getElementById('usr-edit-correo').value = u.correo || '';
    document.getElementById('usr-edit-telefono').value = u.telefono || '';
    document.getElementById('usr-edit-rol').value = rhEtiquetaRol(u.rol);
    document.getElementById('usr-edit-password').value = u.password || '1234';
    document.getElementById('usr-edit-activo').checked = u.activo !== false;
    document.getElementById('modal-usuario')?.classList.add('active');
}

function abrirMiPerfil() {
    if (!currentUser) return;
    const u = DB.get('usuariosLogin').find(x => x.id === currentUser.id) || currentUser;
    document.getElementById('perfil-nombre').value = u.displayName || '';
    document.getElementById('perfil-correo').value = u.correo || '';
    document.getElementById('perfil-telefono').value = u.telefono || '';
    document.getElementById('perfil-rol').value = rhEtiquetaRol(u.rol);
    document.getElementById('perfil-password').value = u.password || '1234';
    document.getElementById('modal-mi-perfil')?.classList.add('active');
}

function abrirNuevoVendedor() {
    if (!puedeGestionarUsuarios()) return;
    document.getElementById('form-nuevo-vendedor')?.reset();
    document.getElementById('modal-nuevo-vendedor')?.classList.add('active');
}

function eliminarVendedor(id) {
    if (!puedeGestionarUsuarios()) return;
    if (!confirmAction('¿Eliminar este vendedor? No se borran sus prospectos históricos.')) return;
    const usuarios = DB.get('usuariosLogin').filter(u => u.id !== id);
    DB.set('usuariosLogin', usuarios);
    logAction('Vendedor eliminado');
    renderUsuarios();
    cargarUsuariosLogin();
}
