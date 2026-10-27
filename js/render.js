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
    setText('dash-utilidad-realizada', fin.utilidadRealizada == null ? '—' : formatearMoneda(fin.utilidadRealizada));
    setText('dash-utilidad-proyectada', fin.utilidadProyectada == null ? '—' : formatearMoneda(fin.utilidadProyectada));
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
                <td><button type="button" class="btn btn-primary btn-small" onclick="abrirDetalleCasa('${escapeHtml(c.id)}')">Abrir ficha</button></td>
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
    document.getElementById('ges-estatus-propiedad').value = p.estatusPropiedad || (p.invadida === 'Si' ? 'Invadida' : '');
    document.getElementById('ges-ine-domicilio').value = p.ineDomicilioPropiedad || '';
    document.getElementById('ges-cfe-domicilio').value = p.cfeNombreYDomicilio || '';
    document.getElementById('ges-meses-viviendo').value = Number(p.mesesViviendo || 0);
    document.getElementById('ges-existe-notaria').value = p.existeNotariaEscritura || '';
    document.getElementById('ges-adeudo-credito').value = p.adeudoCredito ?? 0;
    document.getElementById('ges-adeudo-agua').value = p.adeudoAgua ?? 0;
    document.getElementById('ges-adeudo-luz').value = p.adeudoLuz ?? 0;
    document.getElementById('ges-adeudo-predial').value = p.adeudoPredial ?? 0;
    document.getElementById('ges-adeudo-credito-estado').value = p.adeudoCreditoEstado || 'Pendiente de revisar';
    document.getElementById('ges-adeudo-agua-estado').value = p.adeudoAguaEstado || 'Pendiente de revisar';
    document.getElementById('ges-adeudo-luz-estado').value = p.adeudoLuzEstado || 'Pendiente de revisar';
    document.getElementById('ges-adeudo-predial-estado').value = p.adeudoPredialEstado || 'Pendiente de revisar';
    document.getElementById('ges-precio-venta-estimado').value = Number(p.precioVentaEstimadoAsesor || 0);
    const mapsUrl = document.getElementById('ges-maps-url');
    if (mapsUrl) mapsUrl.value = p.mapsUrl || '';

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
    const btnContratos = document.getElementById('ges-btn-imprimir-contratos');
    if (btnContratos) {
        const aceptada = !!(p.ofertaAceptadaDigital || p.firmaDigital?.aceptada);
        btnContratos.disabled = !aceptada;
        btnContratos.title = aceptada
            ? 'Imprimir contratos tras aceptación de la oferta'
            : 'Primero registra la aceptación digital de la oferta';
        btnContratos.classList.toggle('btn-disabled-soft', !aceptada);
    }

    const ineUploads = document.getElementById('ges-ine-uploads');
    if (ineUploads) ineUploads.innerHTML = `
        ${uploadCardHtml(p.id, 'ine_frente', 'Foto o PDF de INE · frente', esReglaObligatoria('ase_ine_frente'), 'asesor')}
        ${uploadCardHtml(p.id, 'ine_reverso', 'Foto o PDF de INE · reverso', esReglaObligatoria('ase_ine_reverso'), 'asesor')}`;
    actualizarCondicionalesAsesor(p);

    document.getElementById('modal-gestion-prospecto')?.classList.add('active');
}

function actualizarCondicionalesAsesor(prospecto) {
    const id = document.getElementById('ges-id')?.value;
    const p = prospecto || getProspectoById(id);
    if (typeof aplicarIndicadoresRequisitos === 'function') aplicarIndicadoresRequisitos();
    const estatus = document.getElementById('ges-estatus')?.value || p?.estatus;
    const activo = [
        RH_ESTATUS_PROSPECTO.EN_CONTACTO,
        RH_ESTATUS_PROSPECTO.INTERESADO,
        RH_ESTATUS_PROSPECTO.EN_ADMIN,
        RH_ESTATUS_PROSPECTO.PROPUESTA_LISTA
    ].includes(estatus);
    document.getElementById('ges-identidad-section')?.classList.toggle('is-disabled', !activo);
    document.getElementById('ges-enviar-admin-wrap')?.classList.toggle(
        'hidden',
        estatus !== RH_ESTATUS_PROSPECTO.INTERESADO || !!p?.enviadoAdministradora
    );

    const ineNo = document.getElementById('ges-ine-domicilio')?.value === 'No';
    const cfeSi = document.getElementById('ges-cfe-domicilio')?.value === 'Si';
    document.getElementById('ges-nota-cambio-ine')?.classList.toggle('hidden', !(ineNo && !cfeSi));

    const cfeUpload = document.getElementById('ges-cfe-upload');
    if (cfeUpload) {
        cfeUpload.classList.toggle('hidden', !cfeSi);
        cfeUpload.innerHTML = cfeSi && p ? uploadCardHtml(p.id, 'cfe_asesor', 'Recibo CFE a nombre del vendedor', esReglaObligatoria('ase_cfe_archivo'), 'asesor') : '';
    }

    const escrituras = document.getElementById('ges-escrituras')?.value;
    document.getElementById('ges-existe-notaria-wrap')?.classList.toggle('hidden', escrituras !== 'No');
    const escrituraUpload = document.getElementById('ges-escrituras-upload');
    if (escrituraUpload) {
        escrituraUpload.classList.toggle('hidden', escrituras !== 'Si');
        escrituraUpload.innerHTML = escrituras === 'Si' && p
            ? uploadCardHtml(p.id, 'escrituras_asesor', 'Escrituras completas (foto o PDF)', esReglaObligatoria('ase_escrituras_archivo'), 'asesor')
            : '';
    }
}

function refrescarArchivosAsesor(prospectoId) {
    if (document.getElementById('ges-id')?.value !== prospectoId) return;
    const p = getProspectoById(prospectoId);
    const ineUploads = document.getElementById('ges-ine-uploads');
    if (p && ineUploads) {
        ineUploads.innerHTML = `
            ${uploadCardHtml(p.id, 'ine_frente', 'Foto o PDF de INE · frente', esReglaObligatoria('ase_ine_frente'), 'asesor')}
            ${uploadCardHtml(p.id, 'ine_reverso', 'Foto o PDF de INE · reverso', esReglaObligatoria('ase_ine_reverso'), 'asesor')}`;
    }
    actualizarCondicionalesAsesor(p);
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
            <div class="full-width">${generarCamposExpedienteAdmin(p)}</div>
            ${camposContactoBloqueadosHtml(p, 'exp', true)}
            <div class="form-group"><label>Tipo de crédito</label><input class="form-control" id="exp-tipo-credito" value="${escapeHtml(p.tipoCredito || '')}"></div>
            <div class="form-group"><label>¿Escrituras?</label><select class="form-control" id="exp-escrituras"><option value="">—</option><option value="Si" ${p.tieneEscrituras === 'Si' ? 'selected' : ''}>Sí</option><option value="No" ${p.tieneEscrituras === 'No' ? 'selected' : ''}>No</option></select></div>
            <div class="form-group"><label>¿Existe la notaría de la escritura?</label><select class="form-control" id="exp-existe-notaria"><option value="">—</option><option value="Si" ${p.existeNotariaEscritura === 'Si' ? 'selected' : ''}>Sí · segundo testimonio</option><option value="No" ${p.existeNotariaEscritura === 'No' ? 'selected' : ''}>No · Archivo Público</option></select></div>
            <div class="form-group"><label>Estatus actual de la propiedad</label><select class="form-control" id="exp-estatus-propiedad"><option value="">—</option>${['Invadida','Rentada','Sola','No se sabe'].map(x => `<option ${p.estatusPropiedad === x || (!p.estatusPropiedad && p.invadida === 'Si' && x === 'Invadida') ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
            ${campoAdeudoAdminHtml('Crédito', 'credito', p.adeudoCredito, p.adeudoCreditoEstado)}
            ${campoAdeudoAdminHtml('Agua', 'agua', p.adeudoAgua, p.adeudoAguaEstado)}
            ${campoAdeudoAdminHtml('Luz', 'luz', p.adeudoLuz, p.adeudoLuzEstado)}
            ${campoAdeudoAdminHtml('Predial', 'predial', p.adeudoPredial, p.adeudoPredialEstado)}`;
    }

    const docs = document.getElementById('exp-documentos-preview');
    if (docs) docs.innerHTML = `
        <div id="exp-checklist-wrap">${generarChecklistDocumental(p)}</div>
        ${generarVistaDocumentos(p)}`;
    if (typeof aplicarIndicadoresRequisitosAdmin === 'function') aplicarIndicadoresRequisitosAdmin();
    if (typeof actualizarCamposReferidoExpediente === 'function') actualizarCamposReferidoExpediente();
    if (typeof actualizarCamposComisionVentaExpediente === 'function') actualizarCamposComisionVentaExpediente();
    if (typeof actualizarCamposCocompradorExpediente === 'function') actualizarCamposCocompradorExpediente();

    if (typeof actualizarMapaDireccion === 'function') {
        actualizarMapaDireccion(p.direccionPropiedad || '', 'exp-map-preview');
    }

    document.getElementById('modal-expediente-admin')?.classList.add('active');
}

function campoAdeudoAdminHtml(label, key, monto, estado) {
    const actual = estado || 'Pendiente de revisar';
    return `<div class="form-group"><label>Adeudo ${escapeHtml(label)}</label><div class="debt-input-row">
        <input type="number" min="0" step="0.01" class="form-control" id="exp-adeudo-${key}" value="${Number(monto || 0)}">
        <select class="form-control" id="exp-adeudo-${key}-estado">${['Confirmado','Pendiente de revisar','No aplica'].map(x => `<option ${x === actual ? 'selected' : ''}>${x}</option>`).join('')}</select>
    </div></div>`;
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
    setText('pipe-apartadas', casas.filter(c => c.estatusPipeline === 'Apartada').length);
    setText('pipe-vendidas', casas.filter(c => c.estatusPipeline === 'Vendida').length);
    setText('pipe-cerradas', casas.filter(c => c.estatusPipeline === 'Cerrada').length);
    const btnNueva = document.getElementById('btn-nueva-propiedad-pipeline');
    if (btnNueva) btnNueva.classList.toggle('hidden', !(rhEsDireccion(currentUser) || currentUser?.rol === 'Administradora'));

    const fin = calcularIndicadoresFinancieros();
    setText('pipe-costo-remodelacion', formatearMoneda(fin.costosRemodelacion));
    setText('pipe-inversion-total', formatearMoneda(fin.inversionPropiedades));
    setText('pipe-utilidad-realizada', fin.utilidadRealizada == null ? '—' : formatearMoneda(fin.utilidadRealizada));

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
                <button type="button" class="btn btn-primary btn-small" onclick="abrirDetalleCasa('${escapeHtml(c.id)}')">Abrir ficha</button>
                ${puedeEditarPipeline() ? `<button type="button" class="btn btn-outline btn-small" onclick="abrirCambioPipeline('${escapeHtml(c.id)}')">Estatus</button>` : ''}
            </td>
        </tr>`;
        }).join('');
    if (typeof renderCatalogoPipeline === 'function') renderCatalogoPipeline();
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
    const requiere = [
        RH_ESTATUS_PIPELINE.CERRADA,
        RH_ESTATUS_PIPELINE.VENDIDA,
        RH_ESTATUS_PIPELINE.VENTA,
        RH_ESTATUS_PIPELINE.APARTADA
    ].includes(estatus);
    wrap.classList.toggle('hidden', !requiere);
    input.required = estatus === RH_ESTATUS_PIPELINE.CERRADA || estatus === RH_ESTATUS_PIPELINE.VENDIDA;
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
        <td><strong>${escapeHtml(u.displayName)}</strong></td>
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

async function eliminarVendedor(id) {
    if (!puedeGestionarUsuarios()) return;
    if (!confirmAction('¿Eliminar este vendedor? No se borran sus prospectos históricos.')) return;
    if (!await DB.remove('usuariosLogin', id)) {
        alert('No se pudo eliminar el usuario en la nube.');
        return;
    }
    logAction('Vendedor eliminado');
    renderUsuarios();
    cargarUsuariosLogin();
}
