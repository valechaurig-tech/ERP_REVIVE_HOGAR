/**
 * Revive Hogar — formularios y acciones
 */

function bindAllForms() {
    bindFormSubmit('form-campana', guardarCampana);
    bindFormSubmit('form-prospecto', guardarProspecto);
    bindFormSubmit('form-gestion-prospecto', guardarGestionProspecto);
    bindFormSubmit('form-expediente-admin', guardarExpedienteAdmin);
    bindFormSubmit('form-pipeline', guardarCambioPipeline);
    bindFormSubmit('form-costo-remodelacion', guardarCostoRemodelacion);
    bindFormSubmit('form-montos-casa', guardarMontosCasa);
    bindFormSubmit('form-nuevo-vendedor', guardarNuevoVendedor);
    bindFormSubmit('form-usuario', guardarUsuarioEditado);
    bindFormSubmit('form-tarea', guardarTarea);
    bindFormSubmit('form-mensaje-caso', enviarMensajeCaso);
}

function guardarCampana(e) {
    e.preventDefault();
    const nombre = document.getElementById('camp-nombre').value.trim();
    const canal = document.getElementById('camp-canal').value;
    if (!nombre) { alert('El nombre de la campaña es obligatorio.'); return; }
    if (!canal) { alert('Selecciona el canal de la campaña.'); return; }
    const campanas = DB.get('campanas');
    const nueva = {
        id: DB.getId(),
        identificador: nombre,
        nombre,
        canal,
        costo: Number(document.getElementById('camp-costo').value) || 0,
        fechaInicio: document.getElementById('camp-fecha').value || hoyISO(),
        diasDuracion: Number(document.getElementById('camp-dias').value) || 1,
        estatus: 'Activa',
        creadoPor: currentUser?.displayName || 'Sistema',
        fechaCreacion: new Date().toISOString()
    };
    campanas.push(nueva);
    DB.set('campanas', campanas);
    logAction(`Campaña creada: ${nombre} (${canal})`);
    addHistory('campana', 'Nueva campaña', `${nombre} · ${canal}`);
    closeModal('modal-campana');
    e.target.reset();
    refreshActiveModule(true);
}

function guardarProspecto(e) {
    e.preventDefault();
    const nombre = document.getElementById('pros-nombre').value.trim();
    const tel = document.getElementById('pros-tel').value.trim();
    if (nombre.length < 3) { alert('Nombre completo obligatorio.'); return; }
    if (!tel) { alert('Teléfono obligatorio.'); return; }

    const campVal = document.getElementById('pros-campana').value;
    const origenRol = document.getElementById('pros-origen-rol').value;
    let vendedorId = document.getElementById('pros-vendedor').value;

    if (origenRol === 'vendedor' && currentUser?.rol === 'Vendedor') {
        vendedorId = currentUser.id;
    }
    if (!vendedorId) { alert('Selecciona un vendedor.'); return; }
    const vendedorAsignado = getVendedoresActivos().find(v => v.id === vendedorId);
    if (!vendedorAsignado) { alert('Vendedor no válido o inactivo.'); return; }

    const prospectos = DB.get('prospectos');
    const nuevo = {
        id: DB.getId(),
        nombreCompleto: nombre,
        telefono: tel,
        direccionPropiedad: '',
        notas: document.getElementById('pros-notas').value.trim(),
        campañaId: campVal === 'OTRO' ? null : campVal,
        campañaOtro: campVal === 'OTRO',
        vendedorId,
        tipoCredito: '',
        tieneEscrituras: '',
        invadida: '',
        adeudoCredito: 0,
        adeudoAgua: 0,
        adeudoLuz: 0,
        adeudoPredial: 0,
        estatus: RH_ESTATUS_PROSPECTO.NO_CONTACTADO,
        registradoPor: origenRol === 'vendedor' ? 'Vendedor' : 'Marketing',
        enviadoAdministradora: false,
        propuestaFinal: '',
        documentos: {},
        eventos: [],
        mensajes: [],
        fechaCaptura: new Date().toLocaleString(),
        fechaISO: hoyISO()
    };
    agregarEventoProspecto(nuevo, 'Registro', `Captado por ${nuevo.registradoPor}, asignado a ${vendedorAsignado.displayName}`);
    prospectos.push(nuevo);
    DB.set('prospectos', prospectos);
    notificarNuevoProspecto(nuevo, vendedorId);
    logAction(`Prospecto registrado: ${nombre}`);
    addHistory('prospecto', 'Nuevo prospecto', nombre);
    closeModal('modal-prospecto');
    e.target.reset();
    refreshActiveModule(true);
}

function guardarGestionProspecto(e) {
    e.preventDefault();
    const id = document.getElementById('ges-id').value;
    const prospectos = DB.get('prospectos');
    const idx = prospectos.findIndex(p => p.id === id);
    if (idx < 0) return;
    const p = prospectos[idx];

    if (currentUser?.rol === 'Vendedor' && p.vendedorId !== currentUser.id) return;

    const estatusSel = document.getElementById('ges-estatus');
    const nuevoEstatus = estatusSel?.disabled ? p.estatus : estatusSel.value;
    p.tipoCredito = document.getElementById('ges-tipo-credito').value;
    p.tieneEscrituras = document.getElementById('ges-escrituras').value;
    p.invadida = document.getElementById('ges-invadida').value;
    p.direccionPropiedad = document.getElementById('ges-dir')?.value.trim() || '';
    p.adeudoCredito = normalizarAdeudo(document.getElementById('ges-adeudo-credito').value);
    p.adeudoAgua = normalizarAdeudo(document.getElementById('ges-adeudo-agua').value);
    p.adeudoLuz = normalizarAdeudo(document.getElementById('ges-adeudo-luz').value);
    p.adeudoPredial = normalizarAdeudo(document.getElementById('ges-adeudo-predial').value);

    if (nuevoEstatus === RH_ESTATUS_PROSPECTO.INTERESADO) {
        const faltantes = validarProspectoParaInteresado(p);
        if (faltantes.length) {
            alert('Para marcar como Interesado completa:\n• ' + faltantes.join('\n• '));
            return;
        }
    }

    const estatusAnterior = p.estatus;
    p.estatus = nuevoEstatus;
    agregarEventoProspecto(p, 'Seguimiento', `Estatus: ${estatusAnterior} → ${nuevoEstatus}`);

    if (nuevoEstatus === RH_ESTATUS_PROSPECTO.INTERESADO && estatusAnterior !== RH_ESTATUS_PROSPECTO.INTERESADO) {
        notificarProspectoInteresado(p);
    }

    prospectos[idx] = p;
    DB.set('prospectos', prospectos);
    logAction(`Seguimiento prospecto: ${p.nombreCompleto} → ${nuevoEstatus}`);

    const listoParaAdmin = nuevoEstatus === RH_ESTATUS_PROSPECTO.INTERESADO &&
        !p.enviadoAdministradora &&
        validarProspectoParaInteresado(p).length === 0;
    if (listoParaAdmin && confirm('Seguimiento guardado.\n\n¿Deseas enviar este expediente a administradora ahora?')) {
        p.estatus = RH_ESTATUS_PROSPECTO.EN_ADMIN;
        p.enviadoAdministradora = true;
        agregarEventoProspecto(p, 'Envío administradora', 'Expediente enviado tras guardar seguimiento');
        notificarProspectoInteresado(p);
        prospectos[idx] = p;
        DB.set('prospectos', prospectos);
        logAction(`Enviado a administradora: ${p.nombreCompleto}`);
    }

    closeModal('modal-gestion-prospecto');
    refreshActiveModule();
}

function enviarAAdministradora() {
    const id = document.getElementById('ges-id').value;
    const prospectos = DB.get('prospectos');
    const idx = prospectos.findIndex(p => p.id === id);
    if (idx < 0) return;
    const p = prospectos[idx];
    if (currentUser?.rol === 'Vendedor' && p.vendedorId !== currentUser.id) return;
    const faltantes = validarProspectoParaInteresado(p);
    if (faltantes.length) {
        alert('Completa los datos antes de enviar:\n• ' + faltantes.join('\n• '));
        return;
    }
    p.estatus = RH_ESTATUS_PROSPECTO.EN_ADMIN;
    p.enviadoAdministradora = true;
    agregarEventoProspecto(p, 'Envío administradora', 'Expediente enviado');
    notificarProspectoInteresado(p);
    prospectos[idx] = p;
    DB.set('prospectos', prospectos);
    logAction(`Enviado a administradora: ${p.nombreCompleto}`);
    closeModal('modal-gestion-prospecto');
    refreshActiveModule();
}

function cerrarVentaVendedor(estatus) {
    const map = {
        Firmado: RH_ESTATUS_PROSPECTO.FIRMADO,
        Declinado: RH_ESTATUS_PROSPECTO.DECLINADO
    };
    estatus = map[estatus] || estatus;
    const id = document.getElementById('ges-id').value;
    const prospectos = DB.get('prospectos');
    const idx = prospectos.findIndex(p => p.id === id);
    if (idx < 0) return;
    const p = prospectos[idx];
    if (currentUser?.rol === 'Vendedor' && p.vendedorId !== currentUser.id) return;
    if (p.estatus !== RH_ESTATUS_PROSPECTO.PROPUESTA_LISTA) {
        alert('La administradora debe completar la propuesta antes de cerrar la venta.');
        return;
    }
    if (estatus === RH_ESTATUS_PROSPECTO.FIRMADO) {
        p.estatus = RH_ESTATUS_PROSPECTO.FIRMADO;
        p.fechaFirma = new Date().toISOString();
        crearCasaDesdeProspectoFirmado(p);
        resolverAlertasPorRelatedId(p.id, 'propuesta_lista');
    } else {
        p.estatus = RH_ESTATUS_PROSPECTO.DECLINADO;
        resolverAlertasPorRelatedId(p.id);
    }
    agregarEventoProspecto(p, 'Cierre', estatus);
    prospectos[idx] = p;
    DB.set('prospectos', prospectos);
    logAction(`Cierre ${estatus}: ${p.nombreCompleto}`);
    closeModal('modal-gestion-prospecto');
    refreshActiveModule();
}

function guardarExpedienteAdmin(e) {
    e.preventDefault();
    const id = document.getElementById('exp-id').value;
    const prospectos = DB.get('prospectos');
    const idx = prospectos.findIndex(p => p.id === id);
    if (idx < 0) return;
    const p = prospectos[idx];

    p.tipoCredito = document.getElementById('exp-tipo-credito')?.value || p.tipoCredito;
    p.tieneEscrituras = document.getElementById('exp-escrituras')?.value || p.tieneEscrituras;
    p.invadida = document.getElementById('exp-invadida')?.value || p.invadida;
    p.adeudoCredito = normalizarAdeudo(document.getElementById('exp-adeudo-credito')?.value);
    p.adeudoAgua = normalizarAdeudo(document.getElementById('exp-adeudo-agua')?.value);
    p.adeudoLuz = normalizarAdeudo(document.getElementById('exp-adeudo-luz')?.value);
    p.adeudoPredial = normalizarAdeudo(document.getElementById('exp-adeudo-predial')?.value);
    p.montoAdquisicion = normalizarAdeudo(document.getElementById('exp-monto-adquisicion')?.value);
    if (!p.montoAdquisicion) {
        alert('Indica el precio de compra a la familia.');
        return;
    }
    p.estatus = RH_ESTATUS_PROSPECTO.PROPUESTA_LISTA;
    p.enviadoAdministradora = true;

    guardarDocumentosDesdeExpediente(id);
    agregarEventoProspecto(p, 'Propuesta', 'Propuesta y documentos generados');
    notificarPropuestaLista(p, p.vendedorId);
    resolverAlertasPorRelatedId(p.id, 'prospecto_interesado');

    prospectos[idx] = p;
    DB.set('prospectos', prospectos);

    const casas = DB.get('casas');
    const casaIdx = casas.findIndex(c => c.prospectoId === p.id);
    if (casaIdx >= 0) {
        casas[casaIdx].montoAdquisicion = p.montoAdquisicion;
        DB.set('casas', casas);
    }

    logAction(`Propuesta lista: ${p.nombreCompleto}`);
    closeModal('modal-expediente-admin');
    refreshActiveModule();
}

function guardarCambioPipeline(e) {
    e.preventDefault();
    if (!puedeEditarPipeline()) return;
    const casaId = document.getElementById('pipe-casa-id').value;
    const nuevo = document.getElementById('pipe-nuevo-estatus').value;
    const nota = document.getElementById('pipe-nota').value.trim();
    const casas = DB.get('casas');
    const idx = casas.findIndex(c => c.id === casaId);
    if (idx < 0) return;
    const anterior = casas[idx].estatusPipeline;

    const precioVenta = normalizarAdeudo(document.getElementById('pipe-precio-venta')?.value);
    if (nuevo === RH_ESTATUS_PIPELINE.CERRADA && !precioVenta) {
        alert('Indica el precio de venta final para calcular la utilidad.');
        return;
    }

    casas[idx].estatusPipeline = nuevo;
    if (nuevo === RH_ESTATUS_PIPELINE.CERRADA || precioVenta > 0) {
        casas[idx].precioVenta = precioVenta;
    }

    if (!casas[idx].historial) casas[idx].historial = [];
    casas[idx].historial.unshift({
        fecha: new Date().toLocaleString(),
        estatus: nuevo,
        usuario: getUsuarioActual(),
        nota: nota || `Cambio de ${anterior} a ${nuevo}`
    });
    DB.set('casas', casas);
    logAction(`Pipeline: ${casas[idx].nombreCompleto} → ${nuevo}`);
    closeModal('modal-pipeline');
    refreshActiveModule();
}

function guardarCostoRemodelacion(e) {
    e.preventDefault();
    if (!puedeEditarCostosRemodelacion()) return;
    const casaId = document.getElementById('rem-casa-id')?.value;
    const concepto = document.getElementById('rem-concepto')?.value.trim();
    const monto = normalizarAdeudo(document.getElementById('rem-monto')?.value);
    if (!casaId || !concepto) { alert('Concepto obligatorio.'); return; }
    if (monto <= 0) { alert('Indica un monto mayor a cero.'); return; }

    const casas = DB.get('casas');
    const idx = casas.findIndex(c => c.id === casaId);
    if (idx < 0) return;
    if (!Array.isArray(casas[idx].costosRemodelacion)) casas[idx].costosRemodelacion = [];

    const costo = {
        id: DB.getId(),
        concepto,
        categoria: document.getElementById('rem-categoria')?.value || 'Otro',
        monto,
        fecha: hoyISO(),
        registradoPor: getUsuarioActual(),
        nota: document.getElementById('rem-nota')?.value.trim() || ''
    };
    casas[idx].costosRemodelacion.unshift(costo);
    if (!casas[idx].historial) casas[idx].historial = [];
    casas[idx].historial.unshift({
        fecha: new Date().toLocaleString(),
        estatus: casas[idx].estatusPipeline,
        usuario: getUsuarioActual(),
        nota: `Costo remodelación: ${concepto} (${formatearMoneda(monto)})`
    });
    DB.set('casas', casas);
    logAction(`Costo remodelación: ${casas[idx].nombreCompleto} — ${concepto} ${formatearMoneda(monto)}`);
    e.target.reset();
    document.getElementById('rem-casa-id').value = casaId;
    if (typeof renderDetalleRemodelacion === 'function' && detalleActivoId === casaId) {
        renderDetalleRemodelacion(casas[idx], getProspectoById(casas[idx].prospectoId));
    }
    refreshActiveModule();
}

function guardarMontosCasa(e) {
    e.preventDefault();
    if (!puedeEditarCostosRemodelacion()) return;
    const casaId = document.getElementById('montos-casa-id')?.value;
    const casas = DB.get('casas');
    const idx = casas.findIndex(c => c.id === casaId);
    if (idx < 0) return;

    casas[idx].montoAdquisicion = normalizarAdeudo(document.getElementById('montos-adquisicion')?.value);
    casas[idx].precioVenta = normalizarAdeudo(document.getElementById('montos-precio-venta')?.value);
    DB.set('casas', casas);
    logAction(`Montos actualizados: ${casas[idx].nombreCompleto}`);
    if (typeof renderDetalleRemodelacion === 'function' && detalleActivoId === casaId) {
        renderDetalleRemodelacion(casas[idx], getProspectoById(casas[idx].prospectoId));
    }
    refreshActiveModule();
}

function eliminarCostoRemodelacion(casaId, costoId) {
    if (!puedeEditarCostosRemodelacion()) return;
    if (!confirmAction('¿Eliminar este costo de remodelación?')) return;
    const casas = DB.get('casas');
    const idx = casas.findIndex(c => c.id === casaId);
    if (idx < 0) return;
    const costos = getCostosRemodelacionCasa(casas[idx]);
    const costo = costos.find(c => c.id === costoId);
    casas[idx].costosRemodelacion = costos.filter(c => c.id !== costoId);
    DB.set('casas', casas);
    if (costo) logAction(`Costo eliminado: ${casas[idx].nombreCompleto} — ${costo.concepto}`);
    if (typeof renderDetalleRemodelacion === 'function' && detalleActivoId === casaId) {
        renderDetalleRemodelacion(casas[idx], getProspectoById(casas[idx].prospectoId));
    }
    refreshActiveModule();
}

function guardarNuevoVendedor(e) {
    e.preventDefault();
    if (!puedeGestionarUsuarios()) return;
    const vendedores = DB.get('usuariosLogin').filter(u => u.rol === 'Vendedor');
    if (vendedores.length >= 5) { alert('Máximo 5 vendedores.'); return; }
    const nombre = document.getElementById('nv-nombre').value.trim();
    const usuarios = DB.get('usuariosLogin');
    usuarios.push({
        id: DB.getId(),
        tipo: 'vendedor',
        displayName: nombre,
        rol: 'Vendedor',
        password: document.getElementById('nv-password').value.trim() || '1234',
        activo: true
    });
    DB.set('usuariosLogin', usuarios);
    logAction(`Vendedor creado: ${nombre}`);
    cargarUsuariosLogin();
    closeModal('modal-nuevo-vendedor');
    refreshActiveModule(true);
}

function guardarUsuarioEditado(e) {
    e.preventDefault();
    if (!puedeGestionarUsuarios()) return;
    const id = document.getElementById('usr-edit-id').value;
    const usuarios = DB.get('usuariosLogin');
    const idx = usuarios.findIndex(u => u.id === id);
    if (idx < 0) return;
    usuarios[idx].displayName = document.getElementById('usr-edit-nombre').value.trim();
    usuarios[idx].password = document.getElementById('usr-edit-password').value.trim() || '1234';
    usuarios[idx].activo = document.getElementById('usr-edit-activo').checked;
    DB.set('usuariosLogin', usuarios);
    logAction(`Usuario actualizado: ${usuarios[idx].displayName}`);
    cargarUsuariosLogin();
    closeModal('modal-usuario');
    renderUsuarios();
}
