/**
 * Revive Hogar — formularios y acciones
 */
let solicitarEnvioAdministradora = false;

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
    bindFormSubmit('form-mi-perfil', guardarMiPerfil);
    bindFormSubmit('form-tarea', guardarTarea);
    bindFormSubmit('form-mensaje-caso', enviarMensajeCaso);
    bindFormSubmit('form-autorizacion', validarAutorizacionFinanciera);
    bindFormSubmit('form-pago-referido', confirmarPagoReferido);
}

function guardarCampana(e) {
    e.preventDefault();
    const nombre = document.getElementById('camp-nombre').value.trim();
    const canal = document.getElementById('camp-canal').value;
    if (!nombre) { informarErrorCaptura('camp-nombre', 'El nombre de la campaña es obligatorio.', 'RH-FORM-101'); return; }
    if (!canal) { informarErrorCaptura('camp-canal', 'Selecciona el canal de la campaña.', 'RH-FORM-102'); return; }
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
    if (nombre.length < 3) { informarErrorCaptura('pros-nombre', 'Captura el nombre completo (mínimo 3 caracteres).', 'RH-FORM-201'); return; }
    if (!tel) { informarErrorCaptura('pros-tel', 'Captura el teléfono de contacto.', 'RH-FORM-202'); return; }

    const campVal = document.getElementById('pros-campana').value;
    const origenRol = document.getElementById('pros-origen-rol').value;
    let vendedorId = document.getElementById('pros-vendedor').value;

    if (origenRol === 'vendedor' && currentUser?.rol === 'Vendedor') {
        vendedorId = currentUser.id;
    }
    if (!vendedorId) { informarErrorCaptura('pros-vendedor', 'Selecciona el vendedor responsable.', 'RH-FORM-203'); return; }
    const vendedorAsignado = getVendedoresActivos().find(v => v.id === vendedorId);
    if (!vendedorAsignado) { informarErrorCaptura('pros-vendedor', 'El vendedor seleccionado está inactivo o no existe.', 'RH-FORM-204'); return; }

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
        estatusPropiedad: '',
        invadida: '',
        ineDomicilioPropiedad: '',
        cfeNombreYDomicilio: '',
        mesesViviendo: 0,
        existeNotariaEscritura: '',
        requiereCambioIne: false,
        archivoTipos: [],
        datosExpediente: {},
        checklistDocumental: {},
        adeudoCredito: 0,
        adeudoAgua: 0,
        adeudoLuz: 0,
        adeudoPredial: 0,
        adeudoCreditoEstado: 'Pendiente de revisar',
        adeudoAguaEstado: 'Pendiente de revisar',
        adeudoLuzEstado: 'Pendiente de revisar',
        adeudoPredialEstado: 'Pendiente de revisar',
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
    const enviarAlGuardar = solicitarEnvioAdministradora;
    solicitarEnvioAdministradora = false;
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
    p.estatusPropiedad = document.getElementById('ges-estatus-propiedad')?.value || p.estatusPropiedad || (p.invadida === 'Si' ? 'Invadida' : '');
    p.invadida = p.estatusPropiedad === 'Invadida' ? 'Si' : 'No';
    p.ineDomicilioPropiedad = document.getElementById('ges-ine-domicilio')?.value || '';
    p.cfeNombreYDomicilio = document.getElementById('ges-cfe-domicilio')?.value || '';
    p.mesesViviendo = Number(document.getElementById('ges-meses-viviendo')?.value || 0);
    p.existeNotariaEscritura = document.getElementById('ges-existe-notaria')?.value || '';
    p.requiereCambioIne = p.ineDomicilioPropiedad === 'No' && p.cfeNombreYDomicilio !== 'Si';
    p.direccionPropiedad = document.getElementById('ges-dir')?.value.trim() || '';
    p.mapsUrl = document.getElementById('ges-maps-url')?.value.trim() || p.mapsUrl || '';
    p.adeudoCredito = normalizarAdeudo(document.getElementById('ges-adeudo-credito').value);
    p.adeudoAgua = normalizarAdeudo(document.getElementById('ges-adeudo-agua').value);
    p.adeudoLuz = normalizarAdeudo(document.getElementById('ges-adeudo-luz').value);
    p.adeudoPredial = normalizarAdeudo(document.getElementById('ges-adeudo-predial').value);
    p.adeudoCreditoEstado = document.getElementById('ges-adeudo-credito-estado')?.value || 'Pendiente de revisar';
    p.adeudoAguaEstado = document.getElementById('ges-adeudo-agua-estado')?.value || 'Pendiente de revisar';
    p.adeudoLuzEstado = document.getElementById('ges-adeudo-luz-estado')?.value || 'Pendiente de revisar';
    p.adeudoPredialEstado = document.getElementById('ges-adeudo-predial-estado')?.value || 'Pendiente de revisar';
    p.precioVentaEstimadoAsesor = normalizarAdeudo(document.getElementById('ges-precio-venta-estimado')?.value);

    if (nuevoEstatus === RH_ESTATUS_PROSPECTO.INTERESADO) {
        const faltantes = typeof validarReglasObligatorias === 'function'
            ? validarReglasObligatorias(p, 'asesor')
            : validarProspectoParaInteresado(p);
        if (faltantes.length) {
            alert('Para marcar como Interesado completa:\n• ' + faltantes.join('\n• '));
            return;
        }
    }

    const estatusAnterior = p.estatus;
    p.estatus = nuevoEstatus;
    agregarEventoProspecto(p, 'Seguimiento', `Estatus: ${estatusAnterior} → ${nuevoEstatus}`);
    if (typeof sincronizarPresupuestoProspecto === 'function') sincronizarPresupuestoProspecto(p);
    if (p.tieneEscrituras === 'No' && ['Si', 'No'].includes(p.existeNotariaEscritura)) {
        const montoEscrituras = p.existeNotariaEscritura === 'Si' ? 5000 : 15000;
        createAlert({
            titulo: 'Presupuesto de escrituras requerido',
            mensaje: `${p.nombreCompleto}: se agregó ${formatearMoneda(montoEscrituras)} al presupuesto preliminar.`,
            targetRoles: ['Direccion', 'Administradora'],
            relatedId: p.id,
            tipo: 'presupuesto_escrituras',
            casoTipo: 'prospecto'
        });
    } else {
        resolverAlertasPorRelatedId(p.id, 'presupuesto_escrituras');
    }

    prospectos[idx] = p;
    DB.set('prospectos', prospectos);
    logAction(`Seguimiento prospecto: ${p.nombreCompleto} → ${nuevoEstatus}`);

    const listoParaAdmin = nuevoEstatus === RH_ESTATUS_PROSPECTO.INTERESADO &&
        !p.enviadoAdministradora &&
        (typeof validarReglasObligatorias === 'function'
            ? validarReglasObligatorias(p, 'asesor').length === 0
            : validarProspectoParaInteresado(p).length === 0);
    if (listoParaAdmin && (enviarAlGuardar || confirm('Seguimiento guardado.\n\n¿Deseas enviar este expediente a administradora ahora?'))) {
        const pendientesDocumentales = validarDocumentacionAsesor(p);
        if (pendientesDocumentales.length) {
            alert('El prospecto se enviará a Administradora con estos pendientes:\n• ' + pendientesDocumentales.join('\n• '));
        }
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

function guardarYEnviarAAdministradora() {
    const form = document.getElementById('form-gestion-prospecto');
    if (!form || !form.reportValidity()) return;
    solicitarEnvioAdministradora = true;
    form.requestSubmit();
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
        if (!(p.ofertaAceptadaDigital || p.firmaDigital?.aceptada)) {
            const continuar = confirmAction(
                'La oferta aún no tiene aceptación digital registrada.\n\n' +
                '¿Deseas marcar Firmado de todos modos? Lo ideal es: enviar oferta → aceptar digitalmente → imprimir contratos → Firmado.'
            );
            if (!continuar) return;
        }
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

function enviarOfertaFirmaDigital(prospectoId) {
    const id = prospectoId || document.getElementById('ges-id')?.value;
    const prospectos = DB.get('prospectos');
    const idx = prospectos.findIndex(p => p.id === id);
    if (idx < 0) return;
    const p = prospectos[idx];
    if (p.estatus !== RH_ESTATUS_PROSPECTO.PROPUESTA_LISTA) {
        alert('Primero debe existir la propuesta lista (presupuesto y envío al vendedor).');
        return;
    }
    p.firmaDigital = {
        ...(p.firmaDigital || {}),
        enviada: true,
        enviadaEn: new Date().toISOString(),
        enviadaPor: getUsuarioActual()
    };
    p.ofertaEnviadaFirma = true;
    agregarEventoProspecto(p, 'Oferta', 'Envío interno de oferta registrado');
    prospectos[idx] = p;
    DB.set('prospectos', prospectos);
    logAction(`Oferta enviada a firma digital: ${p.nombreCompleto}`);
    alert('Quedó registrado el envío interno. Cuando el cliente acepte, usa “Registrar aceptación del cliente”. El contrato se imprime en el expediente de administradora.');
}

function aceptarOfertaDigital(prospectoId) {
    const id = prospectoId || document.getElementById('ges-id')?.value;
    const prospectos = DB.get('prospectos');
    const idx = prospectos.findIndex(p => p.id === id);
    if (idx < 0) return;
    const p = prospectos[idx];
    if (p.estatus !== RH_ESTATUS_PROSPECTO.PROPUESTA_LISTA) {
        alert('Solo se puede aceptar la oferta cuando el estatus es Propuesta lista.');
        return;
    }
    if (!confirmAction('¿Confirmas que el cliente aceptó la oferta? Esto es un registro interno, no una firma electrónica.')) return;
    p.firmaDigital = {
        ...(p.firmaDigital || {}),
        aceptada: true,
        aceptadaEn: new Date().toISOString(),
        aceptadaPor: getUsuarioActual()
    };
    p.ofertaAceptadaDigital = true;
    p.checklistDocumental = p.checklistDocumental || {};
    p.checklistDocumental.oferta_formal_firmada = {
        ...(p.checklistDocumental.oferta_formal_firmada || {}),
        estado: 'Validado',
        validadoEn: new Date().toISOString(),
        validadoPor: getUsuarioActual()
    };
    agregarEventoProspecto(p, 'Oferta', 'Oferta aceptada digitalmente · contratos habilitados');
    prospectos[idx] = p;
    DB.set('prospectos', prospectos);
    logAction(`Oferta aceptada digitalmente: ${p.nombreCompleto}`);
    alert('Aceptación interna registrada. Imprime contrato y aviso desde el expediente de administradora.');
    if (document.getElementById('modal-gestion-prospecto')?.classList.contains('active')) {
        abrirGestionProspecto(p.id);
    }
}

function imprimirContratosTrasAceptacion(prospectoId) {
    const id = prospectoId || document.getElementById('ges-id')?.value;
    const p = getProspectoById(id);
    if (!p) return;
    if (!(p.ofertaAceptadaDigital || p.firmaDigital?.aceptada)) {
        alert('Primero registra la aceptación digital de la oferta.');
        return;
    }
    if (typeof plantillaDocumento !== 'function' || typeof imprimirDocumentoHtml !== 'function') {
        alert('No está disponible la generación de contratos.');
        return;
    }
    const datos = recolectarDatosDocumento(p);
    const docs = [
        { tipo: 'contrato', titulo: 'Contrato de prestación de servicios' },
        { tipo: 'privacidad', titulo: 'Aviso de privacidad simplificado' },
        { tipo: 'proceso', titulo: 'Proceso Revive Hogar' },
        { tipo: 'cronograma', titulo: 'Cronograma de gestión y comercialización' }
    ];
    docs.forEach(doc => {
        imprimirDocumentoHtml(plantillaDocumento(doc.tipo, datos), doc.titulo, true);
    });
    logAction(`Contratos impresos tras aceptación: ${p.nombreCompleto}`);
}

function guardarExpedienteAdmin(e) {
    e.preventDefault();
    const finalizar = e.submitter?.dataset?.accion !== 'borrador';
    const id = document.getElementById('exp-id').value;
    const prospectos = DB.get('prospectos');
    const idx = prospectos.findIndex(p => p.id === id);
    if (idx < 0) return;
    const p = prospectos[idx];

    p.tipoCredito = document.getElementById('exp-tipo-credito')?.value || p.tipoCredito;
    p.tieneEscrituras = document.getElementById('exp-escrituras')?.value || p.tieneEscrituras;
    p.existeNotariaEscritura = document.getElementById('exp-existe-notaria')?.value || p.existeNotariaEscritura;
    p.estatusPropiedad = document.getElementById('exp-estatus-propiedad')?.value || p.estatusPropiedad;
    p.invadida = p.estatusPropiedad === 'Invadida' ? 'Si' : 'No';
    p.adeudoCredito = normalizarAdeudo(document.getElementById('exp-adeudo-credito')?.value);
    p.adeudoAgua = normalizarAdeudo(document.getElementById('exp-adeudo-agua')?.value);
    p.adeudoLuz = normalizarAdeudo(document.getElementById('exp-adeudo-luz')?.value);
    p.adeudoPredial = normalizarAdeudo(document.getElementById('exp-adeudo-predial')?.value);
    p.adeudoCreditoEstado = document.getElementById('exp-adeudo-credito-estado')?.value || p.adeudoCreditoEstado;
    p.adeudoAguaEstado = document.getElementById('exp-adeudo-agua-estado')?.value || p.adeudoAguaEstado;
    p.adeudoLuzEstado = document.getElementById('exp-adeudo-luz-estado')?.value || p.adeudoLuzEstado;
    p.adeudoPredialEstado = document.getElementById('exp-adeudo-predial-estado')?.value || p.adeudoPredialEstado;
    p.montoAdquisicion = normalizarAdeudo(document.getElementById('exp-monto-adquisicion')?.value);
    guardarDatosExpedienteAdmin(p);
    if (typeof sincronizarPresupuestoProspecto === 'function') sincronizarPresupuestoProspecto(p);

    if (!finalizar) {
        agregarEventoProspecto(p, 'Expediente', 'Borrador actualizado por administradora');
        prospectos[idx] = p;
        DB.set('prospectos', prospectos);
        logAction(`Borrador de expediente guardado: ${p.nombreCompleto}`);
        closeModal('modal-expediente-admin');
        refreshActiveModule();
        return;
    }

    if (typeof validarReglasObligatorias === 'function') {
        const faltantesConfigurados = [
            ...validarReglasObligatorias(p, 'administradora_campos'),
            ...validarReglasObligatorias(p, 'administradora_documentos')
        ];
        if (faltantesConfigurados.length) {
            alert('Dirección configuró estos requisitos como obligatorios:\n• ' + Array.from(new Set(faltantesConfigurados)).join('\n• '));
            return;
        }
    }
    if (typeof recolectarDatosDocumento === 'function' && typeof validarCoherenciaDocumento === 'function') {
        const erroresCoherencia = validarCoherenciaDocumento('oferta', recolectarDatosDocumento(p));
        if (erroresCoherencia.length) {
            alert('Corrige la coherencia financiera antes de enviar:\n• ' + erroresCoherencia.join('\n• '));
            return;
        }
    }
    if (p.datosExpediente?.tieneReferido === 'Si') {
        if (!p.datosExpediente.referidoNombre || !Number(p.datosExpediente.referidoComision || 0)) {
            alert('Marcaste que hay referido: captura el nombre y la comisión antes de enviar.');
            return;
        }
    }
    if (p.datosExpediente?.tieneComisionVenta === 'Si') {
        const pct = Number(p.datosExpediente.comisionVentaValor || 0);
        if (!pct || pct > 100) {
            alert('La comisión por venta debe ser un porcentaje entre 0.01 y 100.');
            return;
        }
    }
    if (typeof getPendientesOpcionales === 'function') {
        const pendientesOpcionales = getPendientesOpcionales(p, ['administradora_campos', 'administradora_documentos']);
        if (pendientesOpcionales.length) {
            alert('La propuesta se enviará con estos datos o documentos opcionales pendientes:\n• ' +
                Array.from(new Set(pendientesOpcionales)).join('\n• '));
        }
    }
    p.estatus = RH_ESTATUS_PROSPECTO.PROPUESTA_LISTA;
    p.enviadoAdministradora = true;
    p.ofertaListaParaFirma = true;

    guardarDocumentosDesdeExpediente(id, p);
    agregarEventoProspecto(p, 'Propuesta', 'Propuesta, presupuesto y oferta listos para firma digital');
    notificarPropuestaLista(p, p.vendedorId);
    resolverAlertasPorRelatedId(p.id, 'prospecto_interesado');

    prospectos[idx] = p;
    DB.set('prospectos', prospectos);

    const casas = DB.get('casas');
    const casaIdx = casas.findIndex(c => c.prospectoId === p.id);
    if (casaIdx >= 0) {
        casas[casaIdx].montoAdquisicion = p.montoAdquisicion;
        casas[casaIdx].precioVenta = Number(p.datosExpediente?.precioVentaEstimado || casas[casaIdx].precioVenta || 0);
        DB.set('casas', casas);
    }

    logAction(`Propuesta lista: ${p.nombreCompleto}`);
    alert('Propuesta enviada al vendedor.\n\nSiguiente paso: imprimir/enviar la oferta de compraventa, registrar la firma digital y, al aceptarse, imprimir los contratos.');
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
    if ((nuevo === RH_ESTATUS_PIPELINE.CERRADA || nuevo === RH_ESTATUS_PIPELINE.VENDIDA) && !precioVenta) {
        alert('Indica el precio de venta final para calcular la utilidad.');
        return;
    }

    casas[idx].estatusPipeline = nuevo;
    if (nuevo === RH_ESTATUS_PIPELINE.CERRADA || nuevo === RH_ESTATUS_PIPELINE.VENDIDA || precioVenta > 0) {
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
    if (typeof sincronizarCasaEnPresupuesto === 'function') sincronizarCasaEnPresupuesto(casas[idx]);
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
    if (typeof sincronizarCasaEnPresupuesto === 'function') sincronizarCasaEnPresupuesto(casas[idx]);
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
    if (typeof sincronizarCasaEnPresupuesto === 'function') sincronizarCasaEnPresupuesto(casas[idx]);
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
    if (typeof sincronizarCasaEnPresupuesto === 'function') sincronizarCasaEnPresupuesto(casas[idx]);
    if (costo) logAction(`Costo eliminado: ${casas[idx].nombreCompleto} — ${costo.concepto}`);
    if (typeof renderDetalleRemodelacion === 'function' && detalleActivoId === casaId) {
        renderDetalleRemodelacion(casas[idx], getProspectoById(casas[idx].prospectoId));
    }
    refreshActiveModule();
}

// Mitigación temporal en la interfaz; la seguridad real requiere Supabase Auth + RLS.
function validarNuevaClaveAcceso(clave) {
    const texto = String(clave || '');
    return texto.length >= 10 && texto.length <= 128 && /\p{L}/u.test(texto) && /\d/.test(texto)
        && !['1234', 'password1234', 'contrasena1234'].includes(texto.toLocaleLowerCase('es'));
}
function claveAccesoCaptura(id, obligatoria = false) {
    const campo = document.getElementById(id);
    const clave = campo?.value || '';
    if (!clave && !obligatoria) return { valido: true, cambiar: false, valor: '' };
    if (!validarNuevaClaveAcceso(clave)) {
        informarErrorCaptura(id, 'Utiliza entre 10 y 128 caracteres, incluyendo al menos una letra y un número. No uses la contraseña inicial de demostración.', 'RH-AUTH-101');
        return { valido: false, cambiar: false, valor: '' };
    }
    return { valido: true, cambiar: true, valor: clave };
}
function aplicarDatosUsuarioFormulario(u, datos) {
    u.displayName = datos.nombre;
    u.nombreLuna = datos.nombre;
    u.correo = datos.correo || '';
    u.telefono = datos.telefono || '';
    // Una edición de nombre/correo jamás altera la contraseña actual.
    if (datos.password) u.password = datos.password;
}

function guardarNuevoVendedor(e) {
    e.preventDefault();
    if (!puedeGestionarUsuarios()) return;
    const vendedores = DB.get('usuariosLogin').filter(u => u.rol === 'Vendedor');
    if (vendedores.length >= 5) { alert('Máximo 5 vendedores.'); return; }
    const nombre = document.getElementById('nv-nombre').value.trim();
    if (nombre.length < 2) { alert('Indica el nombre del vendedor.'); return; }
    const nuevaClave = claveAccesoCaptura('nv-password', true);
    if (!nuevaClave.valido) return;
    const usuarios = DB.get('usuariosLogin');
    usuarios.push({
        id: DB.getId(),
        tipo: 'vendedor',
        displayName: nombre,
        nombreLuna: nombre,
        correo: document.getElementById('nv-correo')?.value.trim() || '',
        telefono: document.getElementById('nv-telefono')?.value.trim() || '',
        rol: 'Vendedor',
        password: nuevaClave.valor,
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
    const nombre = document.getElementById('usr-edit-nombre').value.trim();
    if (nombre.length < 2) { alert('El nombre es obligatorio.'); return; }
    const nuevaClave = claveAccesoCaptura('usr-edit-password');
    if (!nuevaClave.valido) return;
    aplicarDatosUsuarioFormulario(usuarios[idx], {
        nombre,
        correo: document.getElementById('usr-edit-correo')?.value.trim(),
        telefono: document.getElementById('usr-edit-telefono')?.value.trim(),
        password: nuevaClave.cambiar ? nuevaClave.valor : ''
    });
    usuarios[idx].activo = document.getElementById('usr-edit-activo').checked;
    DB.set('usuariosLogin', usuarios);
    sincronizarUsuarioSesion(usuarios[idx].id);
    logAction(`Usuario actualizado: ${usuarios[idx].displayName}`);
    cargarUsuariosLogin();
    closeModal('modal-usuario');
    renderUsuarios();
}

function guardarMiPerfil(e) {
    e.preventDefault();
    if (!currentUser) return;
    const nombre = document.getElementById('perfil-nombre').value.trim();
    if (nombre.length < 2) { alert('Indica tu nombre.'); return; }
    const usuarios = DB.get('usuariosLogin');
    const idx = usuarios.findIndex(u => u.id === currentUser.id);
    if (idx < 0) return;
    const nuevaClave = claveAccesoCaptura('perfil-password');
    if (!nuevaClave.valido) return;
    aplicarDatosUsuarioFormulario(usuarios[idx], {
        nombre,
        correo: document.getElementById('perfil-correo')?.value.trim(),
        telefono: document.getElementById('perfil-telefono')?.value.trim(),
        password: nuevaClave.cambiar ? nuevaClave.valor : ''
    });
    DB.set('usuariosLogin', usuarios);
    sincronizarUsuarioSesion(currentUser.id);
    logAction(`Perfil actualizado: ${usuarios[idx].displayName}`);
    closeModal('modal-mi-perfil');
}

function sincronizarUsuarioSesion(userId) {
    const u = DB.get('usuariosLogin').find(x => x.id === userId);
    if (!u || !currentUser || currentUser.id !== userId) return;
    currentUser = { ...u };
    const chip = document.getElementById('user-role-display');
    if (chip) chip.textContent = u.displayName;
    const sidebarName = document.querySelector('.sidebar-brand-text span');
    if (sidebarName) sidebarName.textContent = u.displayName;
}
