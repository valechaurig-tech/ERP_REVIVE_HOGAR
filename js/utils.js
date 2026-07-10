/**
 * Revive Hogar — utilidades
 */

let currentUser = null;
let activeModuleId = null;
let clockInterval = null;

function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function setText(id, valor) {
    const el = document.getElementById(id);
    if (el) el.textContent = valor;
}

function confirmAction(msg) {
    return window.confirm(msg);
}

function getUsuarioActual() {
    return currentUser ? `${currentUser.displayName} (${rhEtiquetaRol(currentUser.rol)})` : 'Sistema';
}

function hoyISO() {
    return new Date().toISOString().slice(0, 10);
}

function formatearMoneda(n) {
    const num = Number(n) || 0;
    return num.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

function formatearNumero(n) {
    return Number(n || 0).toLocaleString('es-MX');
}

function bindFormSubmit(formId, handler) {
    const form = document.getElementById(formId);
    if (form && !form.dataset.bound) {
        form.dataset.bound = '1';
        form.addEventListener('submit', handler);
    }
}

function badgeEstatusProspecto(estatus) {
    const map = {
        'No contactado': 'badge-mkt-neutral',
        'En contacto': 'badge-mkt-primary',
        'Interesado': 'badge-mkt-warning',
        'En administradora': 'badge-mkt-primary',
        'Propuesta lista': 'badge-mkt-warning',
        'Firmado': 'badge-mkt-success',
        'Declinado': 'badge-mkt-danger'
    };
    const cls = map[estatus] || 'badge-mkt-neutral';
    return `<span class="badge-mkt ${cls}">${escapeHtml(estatus || '—')}</span>`;
}

function badgeEstatusCampana(estatus) {
    const cls = estatus === 'Activa' ? 'badge-mkt-success' : 'badge-mkt-neutral';
    return `<span class="badge-mkt ${cls}">${escapeHtml(estatus || '—')}</span>`;
}

function badgeEstatusPipeline(estatus) {
    const map = {
        'Espera remodelación': 'badge-mkt-warning',
        'En remodelación': 'badge-mkt-primary',
        'En venta': 'badge-mkt-success',
        'Cerrada': 'badge-mkt-neutral'
    };
    const cls = map[estatus] || 'badge-mkt-neutral';
    return `<span class="badge-mkt ${cls}">${escapeHtml(estatus || '—')}</span>`;
}

function getCampanasActivas() {
    return DB.get('campanas').filter(c => c.estatus === 'Activa');
}

function getCampanaById(id) {
    return DB.get('campanas').find(c => c.id === id);
}

function getVendedoresActivos() {
    return DB.get('usuariosLogin').filter(u => u.rol === 'Vendedor' && u.activo !== false);
}

function getProspectoById(id) {
    return DB.get('prospectos').find(p => p.id === id);
}

function puedeGestionarUsuarios() {
    return currentUser && (rhEsDireccion(currentUser) || currentUser.rol === 'Administradora');
}

function puedeEditarPipeline() {
    return currentUser && (rhEsDireccion(currentUser) || currentUser.rol === 'Administradora');
}

function puedeEditarCostosRemodelacion() {
    return puedeEditarPipeline();
}

function parseMontoTexto(texto) {
    if (!texto) return 0;
    const nums = String(texto).match(/[\d,]+(?:\.\d{1,2})?/g);
    if (!nums) return 0;
    const valores = nums.map(s => Number(s.replace(/,/g, ''))).filter(n => !isNaN(n) && n > 0);
    return valores.length ? Math.max(...valores) : 0;
}

function getCostosRemodelacionCasa(casa) {
    return Array.isArray(casa?.costosRemodelacion) ? casa.costosRemodelacion : [];
}

function sumarCostosRemodelacion(casa) {
    return getCostosRemodelacionCasa(casa).reduce((s, c) => s + Number(c.monto || 0), 0);
}

function getMontoAdquisicionCasa(casa, prospecto) {
    if (casa?.montoAdquisicion != null && casa.montoAdquisicion !== '') {
        return Number(casa.montoAdquisicion) || 0;
    }
    if (prospecto?.montoAdquisicion != null && prospecto.montoAdquisicion !== '') {
        return Number(prospecto.montoAdquisicion) || 0;
    }
    return parseMontoTexto(casa?.propuestaFinal || prospecto?.propuestaFinal);
}

function calcularEconomiaCasa(casa, prospecto) {
    const adquisicion = getMontoAdquisicionCasa(casa, prospecto);
    const remodelacion = sumarCostosRemodelacion(casa);
    const inversion = adquisicion + remodelacion;
    const precioVenta = Number(casa?.precioVenta) || 0;
    const utilidad = precioVenta > 0 ? precioVenta - inversion : null;
    const margen = precioVenta > 0 && utilidad != null ? Math.round((utilidad / precioVenta) * 100) : null;
    return { adquisicion, remodelacion, inversion, precioVenta, utilidad, margen };
}

function calcularIndicadoresFinancieros() {
    const campanas = DB.get('campanas');
    const casas = DB.get('casas');
    const inversionMarketing = campanas.reduce((s, c) => s + Number(c.costo || 0), 0);
    let costosRemodelacion = 0;
    let inversionPropiedades = 0;
    let utilidadRealizada = 0;
    let utilidadProyectada = 0;
    casas.forEach(c => {
        const p = getProspectoById(c.prospectoId);
        const eco = calcularEconomiaCasa(c, p);
        costosRemodelacion += eco.remodelacion;
        inversionPropiedades += eco.inversion;
        if (eco.utilidad != null) {
            if (c.estatusPipeline === RH_ESTATUS_PIPELINE.CERRADA) {
                utilidadRealizada += eco.utilidad;
            } else if (c.estatusPipeline === RH_ESTATUS_PIPELINE.VENTA) {
                utilidadProyectada += eco.utilidad;
            }
        }
    });
    return {
        inversionMarketing,
        costosRemodelacion,
        inversionPropiedades,
        inversionTotal: inversionMarketing + inversionPropiedades,
        utilidadRealizada,
        utilidadProyectada,
        utilidadNeta: utilidadRealizada - inversionMarketing
    };
}

function camposContactoBloqueadosHtml(p, prefix, readonly = true) {
    const ro = readonly ? 'readonly class="form-control field-locked"' : 'class="form-control"';
    const vend = DB.get('usuariosLogin').find(u => u.id === p.vendedorId);
    return `
        <div class="form-group"><label>Nombre completo</label><input type="text" id="${prefix}-nombre" ${ro} value="${escapeHtml(p.nombreCompleto || '')}"></div>
        <div class="form-group"><label>Teléfono</label><input type="tel" id="${prefix}-tel" ${ro} value="${escapeHtml(p.telefono || '')}"></div>
        <div class="form-group"><label>Vendedor asignado</label><input type="text" ${ro} value="${escapeHtml(vend ? vend.displayName : '—')}"></div>
        <div class="form-group full-width"><label>Dirección de la propiedad</label><input type="text" id="${prefix}-dir" ${ro} value="${escapeHtml(p.direccionPropiedad || '')}"></div>
        <div class="form-group full-width"><label>Notas iniciales</label><input type="text" id="${prefix}-notas" ${ro} value="${escapeHtml(p.notas || '')}"></div>`;
}

function validarProspectoParaInteresado(p) {
    const faltantes = [];
    if (!p.nombreCompleto || p.nombreCompleto.trim().length < 3) faltantes.push('Nombre completo');
    if (!p.direccionPropiedad || p.direccionPropiedad.trim().length < 5) faltantes.push('Dirección de la propiedad');
    if (!p.tieneEscrituras) faltantes.push('¿Tiene escrituras?');
    if (!p.invadida) faltantes.push('¿Está invadida?');
    if (!p.tipoCredito) faltantes.push('Tipo de crédito');
    return faltantes;
}

function normalizarAdeudo(val) {
    if (val === '' || val === null || val === undefined) return 0;
    const n = Number(val);
    return isNaN(n) ? 0 : Math.max(0, n);
}

function estadisticasCampana(campanaId, prospectos) {
    const list = prospectos.filter(p => p.campañaId === campanaId);
    return {
        total: list.length,
        enProceso: list.filter(p => !['Firmado', 'Declinado'].includes(p.estatus)).length,
        firmados: list.filter(p => p.estatus === 'Firmado').length,
        declinados: list.filter(p => p.estatus === 'Declinado').length
    };
}

function actualizarBreadcrumbs(modId) {
    const bc = document.getElementById('breadcrumbs');
    if (!bc) return;
    const label = RH_MODULE_LABELS[modId] || modId;
    bc.innerHTML = `<span class="bc-item">Revive Hogar</span><span class="bc-sep">/</span><span class="bc-item bc-current">${escapeHtml(label)}</span>`;
}
