/**
 * Revive Hogar — datos semilla, alertas, auditoría
 */

const RH_DATA_RESET_VERSION = '2026-04-v1';

function limpiarDatosOperativos() {
    ['campanas', 'prospectos', 'casas', 'alertas', 'historial', 'auditoria', 'tareas'].forEach(k => {
        DB.set(k, []);
    });
}

function initSeedData() {
    const resetKey = RH_STORAGE_PREFIX + 'data_reset_version';
    const prevReset = typeof localStorage !== 'undefined' ? localStorage.getItem(resetKey) : '';
    if (prevReset !== RH_DATA_RESET_VERSION) {
        limpiarDatosOperativos();
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(resetKey, RH_DATA_RESET_VERSION);
        }
    }

    DB_KEYS.forEach(k => {
        if (!Array.isArray(DB.get(k))) DB.set(k, []);
    });

    let usuarios = DB.get('usuariosLogin');
    const base = [
        { tipo: 'general', displayName: 'Dirección', rol: 'Direccion', password: '1234' },
        { tipo: 'general', displayName: 'Marketing', rol: 'Marketing', password: '1234' },
        { tipo: 'general', displayName: 'Administradora', rol: 'Administradora', password: '1234' },
        { tipo: 'vendedor', displayName: 'Vendedor 1', rol: 'Vendedor', password: '1234' },
        { tipo: 'vendedor', displayName: 'Vendedor 2', rol: 'Vendedor', password: '1234' }
    ];
    base.forEach(u => {
        if (!usuarios.some(x => x.displayName === u.displayName && x.rol === u.rol)) {
            usuarios.push({
                id: DB.getId(),
                activo: true,
                nombreLuna: u.displayName,
                correo: '',
                telefono: '',
                ...u
            });
        }
    });
    DB.set('usuariosLogin', usuarios);

    usuarios.forEach(u => {
        if (!u.nombreLuna && u.displayName) u.nombreLuna = u.displayName;
        if (u.correo == null) u.correo = '';
        if (u.telefono == null) u.telefono = '';
    });
    DB.set('usuariosLogin', usuarios);
}

function logAction(accion) {
    const logs = DB.get('auditoria');
    const ahora = new Date();
    logs.unshift({
        id: DB.getId(),
        fecha: ahora.toLocaleString(),
        fechaISO: hoyISO(),
        usuario: getUsuarioActual(),
        accion
    });
    if (logs.length > 500) logs.pop();
    DB.set('auditoria', logs);
}

function addHistory(tipo, titulo, detalle) {
    const historial = DB.get('historial');
    historial.unshift({
        id: DB.getId(),
        tipo,
        titulo,
        detalle,
        fecha: new Date().toLocaleString(),
        fechaISO: hoyISO(),
        usuario: currentUser ? currentUser.displayName : 'Sistema'
    });
    if (historial.length > 100) historial.pop();
    DB.set('historial', historial);
}

function createAlert({ titulo, mensaje, targetRoles, targetUserId, relatedId, tipo, casoTipo }) {
    const alertas = DB.get('alertas');
    const duplicada = alertas.some(a =>
        a.relatedId === relatedId && a.tipo === tipo && a.estado !== 'Resuelta' && a.titulo === titulo
    );
    if (duplicada) return;
    alertas.unshift({
        id: DB.getId(),
        titulo,
        mensaje,
        targetRoles: targetRoles || [],
        targetUserId: targetUserId || '',
        relatedId: relatedId || '',
        tipo: tipo || 'general',
        casoTipo: casoTipo || '',
        estado: 'Pendiente',
        creado: new Date().toLocaleString()
    });
    DB.set('alertas', alertas);
}

function resolverAlertasPorRelatedId(relatedId, tipo) {
    const alertas = DB.get('alertas');
    let cambio = false;
    alertas.forEach(a => {
        if (a.relatedId === relatedId && (!tipo || a.tipo === tipo) && a.estado !== 'Resuelta') {
            a.estado = 'Resuelta';
            cambio = true;
        }
    });
    if (cambio) DB.set('alertas', alertas);
}

function resolverAlerta(id) {
    const alertas = DB.get('alertas');
    const a = alertas.find(x => x.id === id);
    if (a) {
        a.estado = 'Resuelta';
        DB.set('alertas', alertas);
        logAction(`Alerta resuelta: ${a.titulo}`);
        refreshActiveModule();
    }
}

function alertaVisibleParaUsuario(alerta) {
    if (!currentUser) return false;
    if (rhEsDireccion(currentUser)) return true;
    if (alerta.targetUserId) return alerta.targetUserId === currentUser.id;
    if (alerta.targetRoles && alerta.targetRoles.includes(currentUser.rol)) return true;
    return false;
}

function notificarNuevoProspecto(prospecto, vendedorId) {
    createAlert({
        titulo: 'Nuevo prospecto asignado',
        mensaje: `${prospecto.nombreCompleto} — ${prospecto.direccionPropiedad}`,
        targetUserId: vendedorId,
        relatedId: prospecto.id,
        tipo: 'prospecto_nuevo'
    });
}

function notificarProspectoInteresado(prospecto) {
    createAlert({
        titulo: 'Prospecto listo para administradora',
        mensaje: `${prospecto.nombreCompleto} marcado como Interesado`,
        targetRoles: ['Administradora', 'Direccion'],
        relatedId: prospecto.id,
        tipo: 'prospecto_interesado'
    });
}

function notificarPropuestaLista(prospecto, vendedorId) {
    createAlert({
        titulo: 'Propuesta y documentos listos',
        mensaje: `Revisa la propuesta de ${prospecto.nombreCompleto}`,
        targetUserId: vendedorId,
        relatedId: prospecto.id,
        tipo: 'propuesta_lista'
    });
}

function crearCasaDesdeProspectoFirmado(prospecto) {
    const casas = DB.get('casas');
    if (casas.some(c => c.prospectoId === prospecto.id)) return;
    casas.push({
        id: DB.getId(),
        prospectoId: prospecto.id,
        vendedorId: prospecto.vendedorId,
        nombreCompleto: prospecto.nombreCompleto,
        direccionPropiedad: prospecto.direccionPropiedad,
        tipoCredito: prospecto.tipoCredito,
        propuestaFinal: '',
        montoAdquisicion: prospecto.montoAdquisicion ?? 0,
        precioVenta: 0,
        costosRemodelacion: [],
        estatusPipeline: RH_ESTATUS_PIPELINE.ESPERA,
        mensajes: [],
        fechaFirma: new Date().toISOString(),
        historial: [{
            fecha: new Date().toLocaleString(),
            estatus: RH_ESTATUS_PIPELINE.ESPERA,
            usuario: getUsuarioActual(),
            nota: 'Casa registrada tras firma'
        }]
    });
    DB.set('casas', casas);
    addHistory('casa', 'Nueva propiedad en pipeline', prospecto.nombreCompleto);
}

function agregarEventoProspecto(prospecto, evento, detalle) {
    if (!prospecto.eventos) prospecto.eventos = [];
    prospecto.eventos.unshift({
        fecha: new Date().toLocaleString(),
        evento,
        detalle,
        usuario: getUsuarioActual()
    });
}
