/**
 * Revive Hogar — control derivado de referidos y sus comisiones.
 * Se captura en el expediente de Regina y los pagos se registran aquí o en Gastos.
 */

function getResumenReferidos() {
    return DB.get('prospectos').map(p => {
        const d = p.datosExpediente || {};
        const marcadoSi = d.tieneReferido === 'Si';
        const tieneDatos = !!(d.referidoNombre || Number(d.referidoComision || 0));
        if (d.tieneReferido === 'No') return null;
        if (!marcadoSi && !tieneDatos) return null;
        const casa = DB.get('casas').find(c => c.prospectoId === p.id);
        const presupuesto = typeof getPresupuestoCasa === 'function'
            ? getPresupuestoCasa(casa?.id || p.id, false) : null;
        const partida = presupuesto?.partidas?.find(x => x.concepto === 'PAGO REFERIDO');
        const pagado = presupuesto?.egresos
            ?.filter(x => x.partidaId === partida?.id)
            .reduce((s, x) => s + Number(x.monto || 0), 0) || 0;
        const total = Number(d.referidoComision || partida?.monto || 0);
        return {
            prospectoId: p.id,
            presupuestoId: presupuesto?.id,
            entidadId: casa?.id || p.id,
            referido: d.referidoNombre || 'Pendiente de nombre',
            propiedad: p.direccionPropiedad || 'Sin dirección',
            propietario: p.nombreCompleto || '',
            total,
            pagado,
            pendiente: Math.max(0, total - pagado),
            partidaId: partida?.id,
            incompleto: marcadoSi && (!d.referidoNombre || !Number(d.referidoComision || 0))
        };
    }).filter(Boolean);
}

function renderReferidosComisiones() {
    if (!rhEsDireccion(currentUser)) return;
    const items = getResumenReferidos();
    const totalPagado = items.reduce((s, x) => s + x.pagado, 0);
    const totalPendiente = items.reduce((s, x) => s + x.pendiente, 0);
    setText('ref-kpi-operaciones', items.length);
    setText('ref-kpi-pendiente', formatearMoneda(totalPendiente));
    setText('ref-kpi-pagado', formatearMoneda(totalPagado));
    const wrap = document.getElementById('referidos-content');
    if (!wrap) return;
    if (!items.length) {
        wrap.innerHTML = `<div class="fin-empty ref-howto">
            <strong>Aún no hay referidos registrados</strong>
            <p>Para llenar esta sección:</p>
            <ol>
                <li>Abre el expediente del prospecto en <em>Bandeja Administradora</em>.</li>
                <li>En la ficha legal/económica marca <strong>¿Esta operación tiene referido? → Sí</strong>.</li>
                <li>Captura el <strong>nombre</strong> de quien refirió y la <strong>comisión ($)</strong>.</li>
                <li>Guarda borrador o envía la propuesta. Aquí aparecerán para registrar pagos.</li>
            </ol>
        </div>`;
        return;
    }
    wrap.innerHTML = `<div class="table-responsive table-clean"><table class="fin-table">
        <thead><tr><th>Referido</th><th>Propiedad / propietario</th><th class="text-right">Comisión</th><th class="text-right">Pagado</th><th class="text-right">Pendiente</th><th>Acciones</th></tr></thead>
        <tbody>${items.map(x => `<tr class="${x.incompleto ? 'ref-row-incomplete' : ''}">
            <td><strong>${escapeHtml(x.referido)}</strong>${x.incompleto ? '<small>Falta nombre o monto en el expediente</small>' : ''}</td>
            <td>${escapeHtml(x.propiedad)}<small>${escapeHtml(x.propietario)}</small></td>
            <td class="text-right">${formatearMoneda(x.total)}</td>
            <td class="text-right emp-positive">${formatearMoneda(x.pagado)}</td>
            <td class="text-right ${x.pendiente > 0 ? 'emp-negative' : 'emp-positive'}"><strong>${formatearMoneda(x.pendiente)}</strong></td>
            <td>${x.incompleto
                ? `<button type="button" class="btn btn-outline btn-small" onclick="abrirExpedienteDesdeReferido('${x.prospectoId}')">Completar en expediente</button>`
                : (x.pendiente > 0
                    ? `<button type="button" class="btn btn-primary btn-small" onclick="registrarPagoReferido('${x.entidadId}')">Registrar pago</button>`
                    : '<span class="fin-sync-label">Liquidado</span>')}
                <button type="button" class="btn btn-outline btn-small" onclick="abrirGastosDesdeReferido('${x.entidadId}')">Ver gastos</button>
            </td>
        </tr>`).join('')}</tbody>
    </table></div>`;
}

function abrirExpedienteDesdeReferido(prospectoId) {
    if (typeof abrirExpedienteAdmin === 'function') {
        if (rhUserCanAccessModule(currentUser, 'mod-administradora')) {
            showModule('mod-administradora', null, true);
        }
        abrirExpedienteAdmin(prospectoId);
    }
}

function registrarPagoReferido(entidadId) {
    let item = getResumenReferidos().find(x => x.entidadId === entidadId);
    if (!item) return;
    if (!item.partidaId) {
        const prospecto = getProspectoById(item.prospectoId);
        if (prospecto && typeof sincronizarPresupuestoProspecto === 'function') sincronizarPresupuestoProspecto(prospecto);
        item = getResumenReferidos().find(x => x.entidadId === entidadId);
    }
    if (!item?.partidaId) {
        alert('No fue posible vincular la comisión con la partida PAGO REFERIDO. Completa el referido en el expediente y vuelve a guardar.');
        return;
    }
    if (item.pendiente <= 0) return;
    const texto = document.getElementById('ref-pago-texto');
    const montoInput = document.getElementById('ref-pago-monto');
    const entidad = document.getElementById('ref-pago-entidad');
    if (texto) texto.textContent = `Pago a ${item.referido}. Pendiente: ${formatearMoneda(item.pendiente)}.`;
    if (entidad) entidad.value = entidadId;
    if (montoInput) {
        montoInput.max = String(item.pendiente);
        montoInput.value = String(item.pendiente);
    }
    const cuenta = document.getElementById('ref-pago-cuenta');
    if (cuenta && typeof opcionesCuentaBancariaHtml === 'function') cuenta.innerHTML = opcionesCuentaBancariaHtml();
    document.getElementById('modal-pago-referido')?.classList.add('active');
}

function confirmarPagoReferido(e) {
    e.preventDefault();
    const entidadId = document.getElementById('ref-pago-entidad')?.value;
    const item = getResumenReferidos().find(x => x.entidadId === entidadId);
    if (!item?.partidaId) return;
    const monto = Math.max(0, Number(document.getElementById('ref-pago-monto')?.value || 0));
    if (!monto || monto > item.pendiente) {
        alert('Indica un monto válido que no supere el saldo pendiente.');
        return;
    }
    const presupuesto = getPresupuestoCasa(entidadId);
    presupuesto.egresos.unshift({
        id: DB.getId(),
        fecha: hoyISO(),
        categoria: 'Pago referido',
        origen: 'Revive',
        partidaId: item.partidaId,
        concepto: `Comisión a ${item.referido}`,
        nota: 'Registrado desde Referidos y Comisiones',
        monto,
        cuentaId: document.getElementById('ref-pago-cuenta')?.value || '',
        registradoPor: getUsuarioActual()
    });
    if (presupuesto.egresos[0].cuentaId && typeof moverSaldoCuenta === 'function') {
        moverSaldoCuenta(presupuesto.egresos[0].cuentaId, -monto);
    }
    guardarPresupuesto(presupuesto);
    logAction(`Pago referido: ${item.referido} — ${formatearMoneda(monto)}`);
    closeModal('modal-pago-referido');
    renderReferidosComisiones();
}

function abrirGastosDesdeReferido(entidadId) {
    if (!rhUserCanAccessModule(currentUser, 'mod-gastos')) return;
    gastoPropiedadActivaId = entidadId;
    showModule('mod-gastos', null, true);
    renderGastos();
}
