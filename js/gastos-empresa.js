/**
 * Revive Hogar — finanzas corporativas (solo Dirección).
 * Gastos e ingresos de la empresa, presupuesto mensual y vista consolidada.
 */

const RH_CATEGORIAS_EGRESO_EMPRESA = [
    'Operación administrativa',
    'Marketing y publicidad',
    'Nómina y honorarios',
    'Legal y notarial',
    'Servicios profesionales',
    'Tecnología y software',
    'Transporte y viáticos',
    'Oficina y servicios',
    'Comisiones y referidos',
    'Impuestos y contribuciones',
    'Inversión en propiedades',
    'Remodelación general',
    'Otros egresos'
];

const RH_CATEGORIAS_INGRESO_EMPRESA = [
    'Utilidad por venta',
    'Comisión externa',
    'Aportación de socios',
    'Préstamo / financiamiento',
    'Reembolso',
    'Otros ingresos'
];

const RH_METODOS_PAGO_EMPRESA = [
    'Transferencia',
    'Efectivo',
    'Tarjeta',
    'Cheque',
    'Otro'
];

const RH_BANCOS_EMPRESA = [
    'BBVA', 'Banorte', 'Santander', 'Banamex / Citibanamex',
    'HSBC', 'Scotiabank', 'Inbursa', 'Banregio', 'Afirme', 'Otro'
];

const RH_EMPRESA_VISTAS = ['resumen', 'movimientos', 'presupuesto'];

let empresaMesActivo = null;
let empresaVistaActiva = 'resumen';
let empresaFiltroTipo = 'todos';
let empresaFiltroCategoria = '';
let empresaBusqueda = '';
let empresaMovimientoEditId = null;

function puedeGestionarGastosEmpresa() {
    return rhEsDireccion(currentUser);
}

function mesEmpresaActual() {
    if (empresaMesActivo) return empresaMesActivo;
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
}

function etiquetaMesEmpresa(mes) {
    const [anio, m] = String(mes || mesEmpresaActual()).split('-');
    const fecha = new Date(Number(anio), Number(m) - 1, 1);
    return fecha.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
}

function cambiarMesEmpresa(delta) {
    const [anio, mes] = mesEmpresaActual().split('-').map(Number);
    const fecha = new Date(anio, mes - 1 + delta, 1);
    empresaMesActivo = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
    renderGastosEmpresa();
}

function irMesEmpresaActual() {
    empresaMesActivo = null;
    renderGastosEmpresa();
}

function getCuentasBancarias() {
    return (DB.get('cuentasBancarias') || [])
        .slice()
        .sort((a, b) => String(a.banco).localeCompare(String(b.banco)) || String(a.alias).localeCompare(String(b.alias)));
}

function etiquetaCuentaBancaria(c) {
    if (!c) return '—';
    const clabe = c.clabe ? ` · ${c.clabe}` : '';
    return `${c.banco} — ${c.alias}${clabe}`;
}

function abrirModalCuentasBancarias() {
    if (!puedeGestionarGastosEmpresa()) return;
    document.getElementById('cuenta-bancaria-id').value = '';
    document.getElementById('cuenta-bancaria-banco').value = '';
    document.getElementById('cuenta-bancaria-alias').value = '';
    document.getElementById('cuenta-bancaria-titular').value = '';
    document.getElementById('cuenta-bancaria-clabe').value = '';
    renderListaCuentasBancarias();
    document.getElementById('modal-cuentas-bancarias')?.classList.add('active');
}

function renderListaCuentasBancarias() {
    const wrap = document.getElementById('cuentas-bancarias-lista');
    if (!wrap) return;
    const cuentas = getCuentasBancarias();
    if (!cuentas.length) {
        wrap.innerHTML = '<p class="fin-empty">Aún no hay cuentas. Agrégalas arriba para usarlas en cada movimiento.</p>';
        return;
    }
    wrap.innerHTML = `<table class="fin-table"><thead><tr><th>Banco</th><th>Alias</th><th>Titular</th><th>CLABE / número</th><th class="text-right">Saldo / corte</th><th></th></tr></thead>
        <tbody>${cuentas.map(c => `<tr>
            <td>${escapeHtml(c.banco)}</td>
            <td><strong>${escapeHtml(c.alias)}</strong></td>
            <td>${escapeHtml(c.titular || '—')}</td>
            <td>${escapeHtml(c.clabe || '—')}</td>
            <td class="text-right"><strong>${formatearMoneda(c.saldo || 0)}</strong></td>
            <td><button type="button" class="btn-icon-danger" onclick="eliminarCuentaBancaria('${c.id}')" aria-label="Eliminar">×</button></td>
        </tr>`).join('')}</tbody></table>`;
}

function guardarCuentaBancaria(event) {
    event.preventDefault();
    if (!puedeGestionarGastosEmpresa()) return;
    const id = document.getElementById('cuenta-bancaria-id')?.value || DB.getId();
    const cuenta = {
        id,
        banco: document.getElementById('cuenta-bancaria-banco')?.value || '',
        alias: document.getElementById('cuenta-bancaria-alias')?.value.trim() || '',
        titular: document.getElementById('cuenta-bancaria-titular')?.value.trim() || '',
        clabe: document.getElementById('cuenta-bancaria-clabe')?.value.trim() || '',
        saldo: Number(document.getElementById('cuenta-bancaria-saldo')?.value || 0),
        actualizadoEn: new Date().toISOString()
    };
    if (!cuenta.banco || !cuenta.alias) {
        alert('Banco y alias son obligatorios.');
        return;
    }
    const lista = getCuentasBancarias();
    const idx = lista.findIndex(x => x.id === id);
    if (idx >= 0) lista[idx] = { ...lista[idx], ...cuenta };
    else {
        cuenta.creadoEn = new Date().toISOString();
        lista.push(cuenta);
    }
    DB.set('cuentasBancarias', lista);
    logAction(`Cuenta bancaria guardada: ${cuenta.banco} · ${cuenta.alias}`);
    document.getElementById('cuenta-bancaria-id').value = '';
    document.getElementById('cuenta-bancaria-alias').value = '';
    document.getElementById('cuenta-bancaria-titular').value = '';
    document.getElementById('cuenta-bancaria-clabe').value = '';
    renderListaCuentasBancarias();
}

function eliminarCuentaBancaria(id) {
    if (!puedeGestionarGastosEmpresa() || !confirmAction('¿Eliminar esta cuenta bancaria?')) return;
    DB.set('cuentasBancarias', getCuentasBancarias().filter(x => x.id !== id));
    logAction('Cuenta bancaria eliminada');
    renderListaCuentasBancarias();
}

function llenarSelectsBancoMovimiento(mov) {
    const bancoSel = document.getElementById('emp-mov-banco');
    const cuentaSel = document.getElementById('emp-mov-cuenta');
    if (!bancoSel || !cuentaSel) return;
    const bancos = [...new Set([...RH_BANCOS_EMPRESA, ...getCuentasBancarias().map(c => c.banco)].filter(Boolean))];
    const bancoActual = mov?.banco || '';
    bancoSel.innerHTML = `<option value="">Sin banco</option>${bancos.map(b =>
        `<option value="${escapeHtml(b)}" ${b === bancoActual ? 'selected' : ''}>${escapeHtml(b)}</option>`).join('')}`;
    filtrarCuentasPorBancoMovimiento(mov?.cuentaId || '');
}

function filtrarCuentasPorBancoMovimiento(cuentaSeleccionada) {
    const banco = document.getElementById('emp-mov-banco')?.value || '';
    const cuentaSel = document.getElementById('emp-mov-cuenta');
    if (!cuentaSel) return;
    const cuentas = getCuentasBancarias().filter(c => !banco || c.banco === banco);
    const seleccion = cuentaSeleccionada || cuentaSel.value || '';
    cuentaSel.innerHTML = `<option value="">Sin cuenta</option>${cuentas.map(c =>
        `<option value="${escapeHtml(c.id)}" ${c.id === seleccion ? 'selected' : ''}>${escapeHtml(etiquetaCuentaBancaria(c))}</option>`).join('')}`;
    if (!cuentas.length && banco) {
        cuentaSel.innerHTML += '<option value="" disabled>No hay cuentas de este banco · usa “Cuentas bancarias”</option>';
    }
}

function getMovimientosEmpresa() {
    return DB.get('gastosEmpresa') || [];
}

function movimientoEnMes(m, mes) {
    return String(m.fecha || '').slice(0, 7) === mes;
}

function filtrarMovimientosEmpresa(mes) {
    const mesFiltro = mes || mesEmpresaActual();
    return getMovimientosEmpresa()
        .filter(m => movimientoEnMes(m, mesFiltro))
        .filter(m => empresaFiltroTipo === 'todos' || m.tipo === empresaFiltroTipo)
        .filter(m => !empresaFiltroCategoria || m.categoria === empresaFiltroCategoria)
        .filter(m => {
            if (!empresaBusqueda) return true;
            const q = empresaBusqueda.toLowerCase();
            return [m.concepto, m.proveedor, m.referencia, m.notas, m.categoria, m.banco, m.cuentaAlias]
                .some(x => String(x || '').toLowerCase().includes(q));
        })
        .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)) || String(b.creadoEn).localeCompare(String(a.creadoEn)));
}

function getPresupuestoEmpresaMes(mes) {
    const registro = DB.get('presupuestoEmpresa').find(x => x.mes === mes);
    return registro?.categorias || {};
}

function guardarPresupuestoEmpresaMes(mes, categorias) {
    const lista = DB.get('presupuestoEmpresa');
    const idx = lista.findIndex(x => x.mes === mes);
    const registro = {
        id: idx >= 0 ? lista[idx].id : DB.getId(),
        mes,
        categorias: { ...categorias },
        actualizadoEn: new Date().toISOString()
    };
    if (idx >= 0) lista[idx] = registro;
    else lista.push(registro);
    DB.set('presupuestoEmpresa', lista);
}

function calcularTotalesPropiedades() {
    const presupuestos = DB.get('presupuestos') || [];
    let egresos = 0;
    let inversion = 0;
    let utilidad = 0;
    presupuestos.forEach(p => {
        if (typeof calcularResumenPresupuesto !== 'function') return;
        const r = calcularResumenPresupuesto(p);
        egresos += Number(r.egresos || 0);
        inversion += Number(r.inversionTotal || 0);
        if (r.utilidad != null) utilidad += Number(r.utilidad || 0);
    });
    return { egresos, inversion, utilidad, propiedades: presupuestos.length };
}

function calcularResumenEmpresa(mes) {
    const movimientos = getMovimientosEmpresa().filter(m => movimientoEnMes(m, mes));
    const ingresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + Number(m.monto || 0), 0);
    const egresos = movimientos.filter(m => m.tipo === 'gasto').reduce((s, m) => s + Number(m.monto || 0), 0);
    const presupuesto = getPresupuestoEmpresaMes(mes);
    const presupuestoTotal = Object.values(presupuesto).reduce((s, v) => s + Number(v || 0), 0);
    const porCategoria = {};
    movimientos.forEach(m => {
        if (m.tipo !== 'gasto') return;
        porCategoria[m.categoria] = (porCategoria[m.categoria] || 0) + Number(m.monto || 0);
    });
    const propiedades = calcularTotalesPropiedades();
    return {
        ingresos,
        egresos,
        balance: ingresos - egresos,
        movimientos: movimientos.length,
        presupuestoTotal,
        variacionPresupuesto: presupuestoTotal ? egresos - presupuestoTotal : null,
        porCategoria,
        propiedades
    };
}

function cambiarVistaEmpresa(vista) {
    if (!RH_EMPRESA_VISTAS.includes(vista)) return;
    empresaVistaActiva = vista;
    renderGastosEmpresa();
}

function aplicarFiltrosEmpresa() {
    const busquedaEl = document.getElementById('emp-filtro-busqueda');
    empresaFiltroTipo = document.getElementById('emp-filtro-tipo')?.value || 'todos';
    empresaFiltroCategoria = document.getElementById('emp-filtro-categoria')?.value || '';
    empresaBusqueda = busquedaEl?.value || '';
    const tablaWrap = document.getElementById('emp-tabla-movimientos');
    if (empresaVistaActiva === 'movimientos' && tablaWrap) {
        const mes = mesEmpresaActual();
        const movimientos = filtrarMovimientosEmpresa(mes);
        const headingSmall = document.querySelector('#emp-contenido .fin-section-heading small');
        if (headingSmall) headingSmall.textContent = `${movimientos.length} en ${etiquetaMesEmpresa(mes)}`;
        tablaWrap.innerHTML = tablaMovimientosEmpresa(movimientos);
        return;
    }
    const caret = busquedaEl?.selectionStart ?? null;
    renderGastosEmpresa();
    const nuevo = document.getElementById('emp-filtro-busqueda');
    if (nuevo && caret != null) {
        nuevo.focus();
        try { nuevo.setSelectionRange(caret, caret); } catch (_) { /* ignore */ }
    }
}

function renderGastosEmpresa() {
    if (!puedeGestionarGastosEmpresa()) return;
    const mes = mesEmpresaActual();
    const resumen = calcularResumenEmpresa(mes);
    setText('emp-kpi-ingresos', formatearMoneda(resumen.ingresos));
    setText('emp-kpi-egresos', formatearMoneda(resumen.egresos));
    setText('emp-kpi-balance', formatearMoneda(resumen.balance));
    setText('emp-kpi-presupuesto', resumen.presupuestoTotal ? formatearMoneda(resumen.presupuestoTotal) : '—');
    setText('emp-kpi-propiedades', formatearMoneda(resumen.propiedades.egresos));
    setText('emp-kpi-utilidad-prop', resumen.propiedades.utilidad ? formatearMoneda(resumen.propiedades.utilidad) : '—');
    setText('emp-mes-label', etiquetaMesEmpresa(mes));

    document.querySelectorAll('[data-emp-vista]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.empVista === empresaVistaActiva);
    });

    const contenido = document.getElementById('emp-contenido');
    if (!contenido) return;
    if (empresaVistaActiva === 'resumen') contenido.innerHTML = renderVistaResumenEmpresa(mes, resumen);
    else if (empresaVistaActiva === 'movimientos') contenido.innerHTML = renderVistaMovimientosEmpresa(mes);
    else contenido.innerHTML = renderVistaPresupuestoEmpresa(mes, resumen);
}

function renderVistaResumenEmpresa(mes, resumen) {
    const categorias = Object.entries(resumen.porCategoria).sort((a, b) => b[1] - a[1]);
    const maxCat = categorias[0]?.[1] || 1;
    const recientes = filtrarMovimientosEmpresa(mes).slice(0, 8);
    const variacion = resumen.variacionPresupuesto;
    const variacionHtml = variacion == null
        ? '<span class="emp-chip emp-chip--muted">Sin presupuesto definido</span>'
        : `<span class="emp-chip ${variacion > 0 ? 'emp-chip--danger' : 'emp-chip--success'}">${variacion > 0 ? '+' : ''}${formatearMoneda(variacion)} vs presupuesto</span>`;

    return `
        <div class="emp-grid-2">
            <section class="fin-section">
                <div class="fin-section-heading"><div><span>01</span><h4>Distribución de egresos</h4></div><small>${etiquetaMesEmpresa(mes)}</small></div>
                ${categorias.length ? categorias.map(([cat, monto]) => `
                    <div class="emp-bar-row">
                        <div class="emp-bar-copy"><strong>${escapeHtml(cat)}</strong><span>${formatearMoneda(monto)}</span></div>
                        <div class="emp-bar-track"><i style="width:${Math.max(8, Math.round((monto / maxCat) * 100))}%"></i></div>
                    </div>`).join('') : '<p class="fin-empty">Sin egresos registrados este mes.</p>'}
            </section>
            <section class="fin-section">
                <div class="fin-section-heading"><div><span>02</span><h4>Panorama consolidado</h4></div><small>Empresa + operación inmobiliaria</small></div>
                <div class="emp-summary-cards">
                    <article><span>Balance corporativo del mes</span><strong class="${resumen.balance >= 0 ? 'emp-positive' : 'emp-negative'}">${formatearMoneda(resumen.balance)}</strong>${variacionHtml}</article>
                    <article><span>Egresos en propiedades</span><strong>${formatearMoneda(resumen.propiedades.egresos)}</strong><small>${resumen.propiedades.propiedades} presupuestos activos</small></article>
                    <article><span>Inversión en propiedades</span><strong>${formatearMoneda(resumen.propiedades.inversion)}</strong><small>Capital desplegado en casas</small></article>
                    <article><span>Utilidad en propiedades</span><strong>${resumen.propiedades.utilidad ? formatearMoneda(resumen.propiedades.utilidad) : '—'}</strong><small>Sobre egresos reales</small></article>
                </div>
            </section>
        </div>
        <section class="fin-section">
            <div class="fin-section-heading"><div><span>03</span><h4>Últimos movimientos</h4></div>
                <button type="button" class="btn btn-outline btn-toolbar" onclick="cambiarVistaEmpresa('movimientos')">Ver todos</button>
            </div>
            ${tablaMovimientosEmpresa(recientes, true)}
        </section>`;
}

function renderVistaMovimientosEmpresa(mes) {
    const movimientos = filtrarMovimientosEmpresa(mes);
    const categorias = [...RH_CATEGORIAS_EGRESO_EMPRESA, ...RH_CATEGORIAS_INGRESO_EMPRESA];
    return `
        <section class="fin-section">
            <div class="fin-section-heading"><div><span>01</span><h4>Registro de movimientos</h4></div><small>${movimientos.length} en ${etiquetaMesEmpresa(mes)}</small></div>
            <div class="emp-filters">
                <select id="emp-filtro-tipo" class="form-control" onchange="aplicarFiltrosEmpresa()">
                    <option value="todos" ${empresaFiltroTipo === 'todos' ? 'selected' : ''}>Todos</option>
                    <option value="gasto" ${empresaFiltroTipo === 'gasto' ? 'selected' : ''}>Solo egresos</option>
                    <option value="ingreso" ${empresaFiltroTipo === 'ingreso' ? 'selected' : ''}>Solo ingresos</option>
                </select>
                <select id="emp-filtro-categoria" class="form-control" onchange="aplicarFiltrosEmpresa()">
                    <option value="">Todas las categorías</option>
                    ${categorias.map(c => `<option value="${escapeHtml(c)}" ${empresaFiltroCategoria === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
                </select>
                <input id="emp-filtro-busqueda" class="form-control" placeholder="Buscar concepto, proveedor, referencia…" value="${escapeHtml(empresaBusqueda)}" oninput="aplicarFiltrosEmpresa()">
                <button type="button" class="btn btn-primary btn-toolbar" onclick="abrirModalMovimientoEmpresa()">+ Nuevo movimiento</button>
            </div>
            <div id="emp-tabla-movimientos">${tablaMovimientosEmpresa(movimientos)}</div>
        </section>`;
}

function renderVistaPresupuestoEmpresa(mes, resumen) {
    const presupuesto = getPresupuestoEmpresaMes(mes);
    const filas = RH_CATEGORIAS_EGRESO_EMPRESA.map(cat => {
        const plan = Number(presupuesto[cat] || 0);
        const real = Number(resumen.porCategoria[cat] || 0);
        const diff = real - plan;
        return `<tr>
            <td>${escapeHtml(cat)}</td>
            <td><input type="number" min="0" step="0.01" class="fin-cell-input fin-cell-money emp-budget-input" data-cat="${escapeHtml(cat)}" value="${plan}"></td>
            <td class="text-right">${formatearMoneda(real)}</td>
            <td class="text-right ${diff > 0 ? 'emp-negative' : diff < 0 ? 'emp-positive' : ''}">${plan ? formatearMoneda(diff) : '—'}</td>
        </tr>`;
    }).join('');
    return `
        <section class="fin-section">
            <div class="fin-section-heading"><div><span>01</span><h4>Presupuesto mensual de egresos</h4></div>
                <button type="button" class="btn btn-primary btn-toolbar" onclick="guardarPresupuestoEmpresaUI()">Guardar presupuesto</button>
            </div>
            <p class="emp-note">Define cuánto puede gastar la empresa por categoría. El resumen compara lo planeado contra lo registrado.</p>
            <div class="table-responsive table-clean">
                <table class="fin-table">
                    <thead><tr><th>Categoría</th><th>Presupuesto</th><th class="text-right">Real</th><th class="text-right">Variación</th></tr></thead>
                    <tbody>${filas}</tbody>
                    <tfoot><tr><th>Total</th><th>${formatearMoneda(resumen.presupuestoTotal)}</th><th class="text-right">${formatearMoneda(resumen.egresos)}</th><th class="text-right">${resumen.presupuestoTotal ? formatearMoneda(resumen.variacionPresupuesto) : '—'}</th></tr></tfoot>
                </table>
            </div>
        </section>`;
}

function tablaMovimientosEmpresa(items, compacto) {
    if (!items.length) return '<p class="fin-empty">Sin movimientos registrados.</p>';
    return `<div class="table-responsive table-clean"><table class="fin-table fin-table--mov">
        <thead><tr><th>Fecha</th><th>Tipo</th><th>Concepto</th><th>Categoría</th><th>Proveedor / origen</th><th>Banco / cuenta</th><th class="text-right">Monto</th>${compacto ? '' : '<th></th>'}</tr></thead>
        <tbody>${items.map(m => `<tr>
            <td>${escapeHtml(m.fecha || '—')}</td>
            <td><span class="emp-type emp-type--${m.tipo}">${m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}</span></td>
            <td><strong>${escapeHtml(m.concepto || '—')}</strong>${m.referencia ? `<small>Ref: ${escapeHtml(m.referencia)}</small>` : ''}${m.notas ? `<small>${escapeHtml(m.notas)}</small>` : ''}</td>
            <td>${escapeHtml(m.categoria || '—')}</td>
            <td>${escapeHtml(m.proveedor || '—')}${m.metodoPago ? `<small>${escapeHtml(m.metodoPago)}</small>` : ''}</td>
            <td>${escapeHtml(m.banco || '—')}${m.cuentaAlias ? `<small>${escapeHtml(m.cuentaAlias)}</small>` : ''}</td>
            <td class="text-right ${m.tipo === 'ingreso' ? 'emp-positive' : 'emp-negative'}">${m.tipo === 'ingreso' ? '+' : '−'}${formatearMoneda(m.monto)}</td>
            ${compacto ? '' : `<td><button type="button" class="btn-icon-danger" onclick="eliminarMovimientoEmpresa('${m.id}')" aria-label="Eliminar">×</button>
                <button type="button" class="btn btn-outline btn-toolbar emp-edit-btn" onclick="abrirModalMovimientoEmpresa('${m.id}')">Editar</button></td>`}
        </tr>`).join('')}</tbody></table></div>`;
}

function opcionesPropiedadesEmpresa(seleccion) {
    const casas = DB.get('casas') || [];
    return casas.map(c => `<option value="${escapeHtml(c.id)}" ${c.id === seleccion ? 'selected' : ''}>${escapeHtml(c.direccionPropiedad || c.nombreCompleto || 'Propiedad')}</option>`).join('');
}

function abrirModalMovimientoEmpresa(id) {
    empresaMovimientoEditId = id || null;
    const mov = id ? getMovimientosEmpresa().find(x => x.id === id) : null;
    const tipo = mov?.tipo || 'gasto';
    document.getElementById('emp-mov-id').value = mov?.id || '';
    document.getElementById('emp-mov-fecha').value = mov?.fecha || hoyISO();
    document.getElementById('emp-mov-tipo').value = tipo;
    document.getElementById('emp-mov-concepto').value = mov?.concepto || '';
    document.getElementById('emp-mov-proveedor').value = mov?.proveedor || '';
    document.getElementById('emp-mov-monto').value = mov?.monto != null ? mov.monto : '';
    document.getElementById('emp-mov-metodo').value = mov?.metodoPago || RH_METODOS_PAGO_EMPRESA[0];
    document.getElementById('emp-mov-referencia').value = mov?.referencia || '';
    document.getElementById('emp-mov-notas').value = mov?.notas || '';
    document.getElementById('emp-mov-casa').innerHTML = `<option value="">Sin vincular</option>${opcionesPropiedadesEmpresa(mov?.casaId || '')}`;
    llenarSelectsBancoMovimiento(mov);
    actualizarCategoriasMovimientoEmpresa(mov?.categoria || '');
    document.getElementById('emp-modal-title').textContent = mov ? 'Editar movimiento' : 'Nuevo movimiento';
    document.getElementById('modal-movimiento-empresa')?.classList.add('active');
}

function actualizarCategoriasMovimientoEmpresa(seleccion) {
    const tipo = document.getElementById('emp-mov-tipo')?.value || 'gasto';
    const cats = tipo === 'ingreso' ? RH_CATEGORIAS_INGRESO_EMPRESA : RH_CATEGORIAS_EGRESO_EMPRESA;
    const select = document.getElementById('emp-mov-categoria');
    if (!select) return;
    select.innerHTML = cats.map(c => `<option value="${escapeHtml(c)}" ${c === seleccion ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('');
}

function guardarMovimientoEmpresa(event) {
    event.preventDefault();
    if (!puedeGestionarGastosEmpresa()) return;
    const id = document.getElementById('emp-mov-id')?.value || DB.getId();
    const cuentaId = document.getElementById('emp-mov-cuenta')?.value || '';
    const cuenta = getCuentasBancarias().find(c => c.id === cuentaId);
    const mov = {
        id,
        fecha: document.getElementById('emp-mov-fecha')?.value || hoyISO(),
        tipo: document.getElementById('emp-mov-tipo')?.value || 'gasto',
        categoria: document.getElementById('emp-mov-categoria')?.value || '',
        concepto: document.getElementById('emp-mov-concepto')?.value.trim() || '',
        proveedor: document.getElementById('emp-mov-proveedor')?.value.trim() || '',
        monto: Math.max(0, Number(document.getElementById('emp-mov-monto')?.value || 0)),
        metodoPago: document.getElementById('emp-mov-metodo')?.value || '',
        banco: document.getElementById('emp-mov-banco')?.value || cuenta?.banco || '',
        cuentaId: cuentaId || null,
        cuentaAlias: cuenta ? etiquetaCuentaBancaria(cuenta) : '',
        referencia: document.getElementById('emp-mov-referencia')?.value.trim() || '',
        notas: document.getElementById('emp-mov-notas')?.value.trim() || '',
        casaId: document.getElementById('emp-mov-casa')?.value || null,
        actualizadoEn: new Date().toISOString(),
        creadoPor: getUsuarioActual()
    };
    if (!mov.concepto || !mov.monto) {
        alert('Concepto y monto son obligatorios.');
        return;
    }
    const lista = getMovimientosEmpresa();
    const idx = lista.findIndex(x => x.id === id);
    if (idx >= 0) {
        const anterior = lista[idx];
        if (anterior.cuentaId) {
            ajustarSaldoCuentaBancaria(anterior.cuentaId, anterior.tipo === 'gasto' ? Number(anterior.monto || 0) : -Number(anterior.monto || 0));
        }
        mov.creadoEn = anterior.creadoEn;
        lista[idx] = mov;
    } else {
        mov.creadoEn = new Date().toISOString();
        lista.push(mov);
    }
    if (mov.cuentaId) {
        ajustarSaldoCuentaBancaria(mov.cuentaId, mov.tipo === 'gasto' ? -Number(mov.monto || 0) : Number(mov.monto || 0));
    }
    DB.set('gastosEmpresa', lista);
    logAction(`${idx >= 0 ? 'Editó' : 'Registró'} movimiento empresa: ${mov.concepto}`);
    closeModal('modal-movimiento-empresa');
    renderGastosEmpresa();
}

async function eliminarMovimientoEmpresa(id) {
    if (!puedeGestionarGastosEmpresa()) return;
    if (typeof confirmarAccionFinancieraProtegida === 'function'
        ? !await confirmarAccionFinancieraProtegida('eliminar este movimiento de empresa')
        : !confirmAction('¿Eliminar este movimiento?')) return;
    const mov = getMovimientosEmpresa().find(x => x.id === id);
    if (mov?.cuentaId) ajustarSaldoCuentaBancaria(mov.cuentaId, mov.tipo === 'gasto' ? Number(mov.monto || 0) : -Number(mov.monto || 0));
    const lista = getMovimientosEmpresa().filter(x => x.id !== id);
    DB.set('gastosEmpresa', lista);
    logAction('Eliminó movimiento de empresa');
    renderGastosEmpresa();
}

function ajustarSaldoCuentaBancaria(cuentaId, delta) {
    if (!cuentaId || !delta) return;
    const lista = getCuentasBancarias();
    const idx = lista.findIndex(c => c.id === cuentaId);
    if (idx < 0) return;
    lista[idx].saldo = Number(lista[idx].saldo || 0) + Number(delta);
    lista[idx].actualizadoEn = new Date().toISOString();
    DB.set('cuentasBancarias', lista);
    vigilarSaldoCuentaBancaria(lista[idx]);
}

function vigilarSaldoCuentaBancaria(cuenta) {
    if (!cuenta || typeof createAlert !== 'function') return;
    if (Number(cuenta.saldo || 0) < -0.009) {
        createAlert({
            titulo: 'Cuenta bancaria en negativo',
            mensaje: `${cuenta.banco || 'Cuenta'} ${cuenta.alias || cuenta.numero || ''}: saldo ${formatearMoneda(cuenta.saldo)}.`,
            targetRoles: ['Direccion', 'Administradora'],
            relatedId: cuenta.id,
            tipo: 'saldo_cuenta_negativo'
        });
    } else if (typeof resolverAlertasPorRelatedId === 'function') {
        resolverAlertasPorRelatedId(cuenta.id, 'saldo_cuenta_negativo');
    }
}

function guardarPresupuestoEmpresaUI() {
    const mes = mesEmpresaActual();
    const categorias = {};
    document.querySelectorAll('.emp-budget-input').forEach(input => {
        categorias[input.dataset.cat] = Math.max(0, Number(input.value || 0));
    });
    guardarPresupuestoEmpresaMes(mes, categorias);
    logAction(`Presupuesto empresa ${mes} actualizado`);
    alert('Presupuesto guardado.');
    renderGastosEmpresa();
}

function imprimirReporteEmpresa() {
    const mes = mesEmpresaActual();
    const resumen = calcularResumenEmpresa(mes);
    const movimientos = filtrarMovimientosEmpresa(mes);
    const filas = movimientos.map(m => `<tr>
        <td>${escapeHtml(m.fecha)}</td>
        <td>${m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}</td>
        <td>${escapeHtml(m.concepto)}</td>
        <td>${escapeHtml(m.categoria)}</td>
        <td>${escapeHtml(m.proveedor || '—')}</td>
        <td style="text-align:right">${formatearMoneda(m.monto)}</td>
    </tr>`).join('');
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Reporte empresa ${mes}</title>
        <style>body{font-family:Arial,sans-serif;padding:28px;color:#1e293b}h1{margin:0 0 4px;font-size:22px}p{color:#64748b}
        .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:18px 0}
        .kpi{border:1px solid #e2e8f0;border-radius:10px;padding:12px}.kpi span{display:block;font-size:11px;color:#64748b}
        .kpi strong{font-size:18px}table{width:100%;border-collapse:collapse;font-size:12px;margin-top:18px}
        th,td{border-bottom:1px solid #e2e8f0;padding:8px;text-align:left}th{background:#f8fafc;font-size:10px;text-transform:uppercase}</style></head><body>
        <h1>Gastos de Empresa · Revive Hogar</h1><p>${etiquetaMesEmpresa(mes)} · Generado ${new Date().toLocaleString()}</p>
        <div class="kpis">
            <div class="kpi"><span>Ingresos</span><strong>${formatearMoneda(resumen.ingresos)}</strong></div>
            <div class="kpi"><span>Egresos</span><strong>${formatearMoneda(resumen.egresos)}</strong></div>
            <div class="kpi"><span>Balance</span><strong>${formatearMoneda(resumen.balance)}</strong></div>
            <div class="kpi"><span>Presupuesto</span><strong>${resumen.presupuestoTotal ? formatearMoneda(resumen.presupuestoTotal) : '—'}</strong></div>
        </div>
        <table><thead><tr><th>Fecha</th><th>Tipo</th><th>Concepto</th><th>Categoría</th><th>Proveedor</th><th>Monto</th></tr></thead>
        <tbody>${filas || '<tr><td colspan="6">Sin movimientos</td></tr>'}</tbody></table>
        <p style="margin-top:20px;font-size:11px">Referencia operativa: egresos en propiedades ${formatearMoneda(resumen.propiedades.egresos)} · ${resumen.propiedades.propiedades} presupuestos.</p>
        </body></html>`;
    const ventana = window.open('', '_blank');
    if (!ventana) return alert('Permite ventanas emergentes para imprimir.');
    ventana.document.write(html);
    ventana.document.close();
    ventana.focus();
    ventana.print();
}
