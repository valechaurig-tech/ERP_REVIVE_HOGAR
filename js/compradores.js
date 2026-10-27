/**
 * Revive Hogar — cartera de COMPRADORES.
 * Colección independiente de prospectos/propietarios y de propiedades.
 * Formulario corto con campos adicionales opcionales.
 */
const RH_COMPRADOR_ESTADOS = ['Nuevo', 'En seguimiento', 'Interesado', 'Apartado', 'Concretado', 'Archivado'];

function compradorVisibleParaRol(comprador, usuario) {
    if (!usuario) return false;
    return usuario.rol === 'Direccion' || usuario.rol === 'Administradora' || usuario.rol === 'Marketing'
        || (usuario.rol === 'Vendedor' && comprador.asesorId === usuario.id);
}

function normalizarCompradorCaptura(datos, anterior = null, usuario = null) {
    const nombre = String(datos.nombreCompleto || '').trim();
    const telefono = String(datos.telefono || '').trim();
    if (nombre.length < 3) throw Object.assign(new Error('Captura el nombre del comprador (mínimo 3 caracteres).'), { campo: 'comprador-nombre', codigo: 'RH-BUY-001' });
    if (telefono.replace(/\D/g, '').length < 7) throw Object.assign(new Error('Captura un teléfono válido de contacto.'), { campo: 'comprador-telefono', codigo: 'RH-BUY-002' });

    const presupuestoRaw = String(datos.presupuestoMax ?? '').trim();
    const presupuesto = presupuestoRaw ? Number(presupuestoRaw) : null;
    if (presupuestoRaw && (!Number.isFinite(presupuesto) || presupuesto < 0 || presupuesto > 1e12)) {
        throw Object.assign(new Error('Revisa el presupuesto máximo.'), { campo: 'comprador-presupuesto', codigo: 'RH-BUY-003' });
    }
    const rolVendedor = usuario?.rol === 'Vendedor';
    // Un vendedor nunca puede reasignar sus compradores desde el cliente.
    const asesorId = rolVendedor ? usuario.id : String(datos.asesorId || '').trim();
    const estadoSolicitado = String(datos.estatus || anterior?.estatus || 'Nuevo');
    const estatus = RH_COMPRADOR_ESTADOS.includes(estadoSolicitado) ? estadoSolicitado : 'Nuevo';
    return {
        ...(anterior || {}),
        id: anterior?.id || DB.getId(),
        nombreCompleto: nombre.slice(0, 160),
        telefono: telefono.slice(0, 35),
        correo: String(datos.correo || '').trim().slice(0, 150),
        interes: String(datos.interes || '').trim().slice(0, 180),
        presupuestoMax: presupuesto,
        asesorId,
        propiedadInteresId: String(datos.propiedadInteresId || '').trim().slice(0, 70),
        notas: String(datos.notas || '').trim().slice(0, 2000),
        estatus,
        fechaCreacion: anterior?.fechaCreacion || new Date().toISOString(),
        fechaActualizacion: new Date().toISOString(),
        actualizadoPor: usuario?.id || null
    };
}

function compradorAbrirFormulario(id = '') {
    if (!currentUser || !rhUserCanAccessModule(currentUser, 'mod-compradores')) return;
    const registro = id ? DB.get('compradores').find(x => x.id === id) : null;
    if (id && (!registro || !compradorVisibleParaRol(registro, currentUser))) return;
    const frm = document.getElementById('form-comprador');
    if (!frm) return;
    frm.reset();
    document.getElementById('comprador-id').value = registro?.id || '';
    document.getElementById('comprador-nombre').value = registro?.nombreCompleto || '';
    document.getElementById('comprador-telefono').value = registro?.telefono || '';
    document.getElementById('comprador-correo').value = registro?.correo || '';
    document.getElementById('comprador-interes').value = registro?.interes || '';
    document.getElementById('comprador-presupuesto').value = registro?.presupuestoMax ?? '';
    const propiedad = document.getElementById('comprador-propiedad');
    if (propiedad) {
        const disponibles = DB.get('casas');
        propiedad.innerHTML = '<option value="">Sin propiedad seleccionada</option>' + disponibles.map(c => '<option value="' + escapeHtml(c.id) + '">' + escapeHtml(c.direccionPropiedad || c.nombreCompleto || c.id) + '</option>').join('');
        propiedad.value = registro?.propiedadInteresId || '';
    }
    document.getElementById('comprador-notas').value = registro?.notas || '';
    document.getElementById('comprador-estatus').value = registro?.estatus || 'Nuevo';
    const asesor = document.getElementById('comprador-asesor');
    if (asesor) {
        if (currentUser.rol === 'Vendedor') {
            asesor.closest('.rh-buyer-asesor-field')?.classList.add('hidden');
            asesor.value = currentUser.id;
        } else {
            asesor.closest('.rh-buyer-asesor-field')?.classList.remove('hidden');
            const usuarios = DB.get('usuariosLogin').filter(u => u.rol === 'Vendedor' && u.activo !== false);
            if (registro?.asesorId && !usuarios.some(u => u.id === registro.asesorId)) {
                const anterior = DB.get('usuariosLogin').find(u => u.id === registro.asesorId);
                if (anterior) usuarios.push(anterior);
            }
            asesor.innerHTML = '<option value="">Sin asignar</option>' + usuarios
                .map(u => '<option value="' + escapeHtml(u.id) + '">' + escapeHtml(u.displayName) + '</option>').join('');
            asesor.value = registro?.asesorId || '';
        }
    }
    document.getElementById('comprador-editor')?.classList.remove('hidden');
    document.getElementById('comprador-editor-titulo').textContent = registro ? 'Editar comprador' : 'Nuevo comprador';
    document.getElementById('comprador-nombre').focus();
}

function compradorCerrarFormulario() {
    document.getElementById('comprador-editor')?.classList.add('hidden');
}

function guardarComprador(e) {
    e.preventDefault();
    if (!currentUser || !rhUserCanAccessModule(currentUser, 'mod-compradores')) return;
    const id = document.getElementById('comprador-id').value;
    const registros = DB.get('compradores');
    const anterior = id ? registros.find(r => r.id === id) : null;
    if (id && (!anterior || !compradorVisibleParaRol(anterior, currentUser))) return;
    const val = n => document.getElementById('comprador-' + n)?.value || '';
    let registro;
    try {
        registro = normalizarCompradorCaptura({
            nombreCompleto: val('nombre'), telefono: val('telefono'),
            correo: val('correo'), interes: val('interes'),
            presupuestoMax: val('presupuesto'), propiedadInteresId: val('propiedad'), notas: val('notas'),
            estatus: val('estatus'), asesorId: val('asesor')
        }, anterior, currentUser);
    } catch (error) {
        informarErrorCaptura(error.campo || 'comprador-nombre', error.message, error.codigo || 'RH-BUY-000');
        return;
    }
    const nuevos = anterior
        ? registros.map(r => r.id === id ? registro : r)
        : [...registros, registro];
    DB.set('compradores', nuevos);
    if (typeof logAction === 'function') logAction((anterior ? 'Comprador actualizado: ' : 'Comprador registrado: ') + registro.nombreCompleto);
    compradorCerrarFormulario();
    renderCompradores();
}

function compradorCambiarArchivo(id, restaurar = false) {
    if (!currentUser || !rhUserCanAccessModule(currentUser, 'mod-compradores')) return;
    const registros = DB.get('compradores');
    const registro = registros.find(r => r.id === id);
    if (!registro || !compradorVisibleParaRol(registro, currentUser)) return;
    const estatus = restaurar ? 'Nuevo' : 'Archivado';
    if (registro.estatus === estatus) return;
    if (!restaurar && !confirmAction('¿Archivar este comprador? El expediente no se eliminará.')) return;
    DB.set('compradores', registros.map(r => r.id === id ? { ...r, estatus, fechaActualizacion: new Date().toISOString() } : r));
    if (typeof logAction === 'function') logAction((restaurar ? 'Comprador restaurado: ' : 'Comprador archivado: ') + registro.nombreCompleto);
    renderCompradores();
}

function renderCompradores() {
    if (!currentUser || !rhUserCanAccessModule(currentUser, 'mod-compradores')) return;
    const registros = DB.get('compradores').filter(r => compradorVisibleParaRol(r, currentUser));
    const filtro = (document.getElementById('comprador-buscar')?.value || '').trim().toLocaleLowerCase('es');
    const mostrarArchivo = !!document.getElementById('comprador-mostrar-archivados')?.checked;
    const filtrados = registros.filter(r => (mostrarArchivo || r.estatus !== 'Archivado')
        && (!filtro || [r.nombreCompleto, r.telefono, r.interes].some(s => String(s || '').toLocaleLowerCase('es').includes(filtro))));
    const total = document.getElementById('comprador-total');
    if (total) total.textContent = String(registros.filter(r => r.estatus !== 'Archivado').length);
    const vendedores = new Map(DB.get('usuariosLogin').map(u => [u.id, u.displayName]));
    const casas = new Map(DB.get('casas').map(c => [c.id, c.direccionPropiedad || c.nombreCompleto || c.id]));
    const tbody = document.querySelector('#table-compradores tbody');
    if (!tbody) return;
    tbody.innerHTML = filtrados.map(c => {
        const accion = c.estatus === 'Archivado'
            ? '<button type="button" class="btn btn-secondary btn-sm" data-accion="restaurar" data-comprador-id="' + escapeHtml(c.id) + '">Restaurar</button>'
            : '<button type="button" class="btn btn-secondary btn-sm" data-accion="archivar" data-comprador-id="' + escapeHtml(c.id) + '">Archivar</button>';
        return '<tr><td><strong>' + escapeHtml(c.nombreCompleto) + '</strong></td>'
            + '<td>' + escapeHtml(c.telefono) + '</td>'
            + '<td>' + escapeHtml(c.interes || '—') + '</td>'
            + '<td>' + escapeHtml(c.propiedadInteresId ? (casas.get(c.propiedadInteresId) || 'Propiedad no disponible') : '—') + '</td>'
            + '<td>' + escapeHtml(c.estatus) + '</td>'
            + '<td>' + escapeHtml(vendedores.get(c.asesorId) || 'Sin asignar') + '</td>'
            + '<td><button type="button" class="btn btn-primary btn-sm" data-accion="editar" data-comprador-id="' + escapeHtml(c.id) + '">Editar</button> ' + accion + '</td></tr>';
    }).join('') || '<tr><td colspan="7" class="celda-vacia">No hay compradores con estos filtros.</td></tr>';
}

function inicializarCompradores() {
    const form = document.getElementById('form-comprador');
    form?.addEventListener('submit', guardarComprador);
    document.getElementById('comprador-buscar')?.addEventListener('input', renderCompradores);
    document.getElementById('comprador-mostrar-archivados')?.addEventListener('change', renderCompradores);
    document.getElementById('comprador-nuevo')?.addEventListener('click', () => compradorAbrirFormulario());
    document.getElementById('comprador-cancelar')?.addEventListener('click', compradorCerrarFormulario);
    document.querySelector('#table-compradores tbody')?.addEventListener('click', event => {
        const button = event.target.closest('button[data-comprador-id]');
        if (!button) return;
        const id = button.dataset.compradorId;
        if (button.dataset.accion === 'editar') compradorAbrirFormulario(id);
        if (button.dataset.accion === 'archivar') compradorCambiarArchivo(id);
        if (button.dataset.accion === 'restaurar') compradorCambiarArchivo(id, true);
    });
}
