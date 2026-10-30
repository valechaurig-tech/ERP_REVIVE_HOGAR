/**
 * Revive Hogar — registro declarativo de copropietarios.
 * No sustituye escrituras, notaría ni acredita participación legal.
 * No escribe presupuestos, contratos, pagos o repartos de utilidades.
 */
let rhTitularesCasaId = null;

function puedeGestionarTitulares() {
    return currentUser && (currentUser.rol === 'Direccion' || currentUser.rol === 'Administradora');
}

function listarCopropietarios(casaId, incluirArchivados = false) {
    return DB.get('copropietarios').filter(t => t.casaId === casaId && (incluirArchivados || !t.archivado));
}

function normalizarCopropietario(datos, anterior = null) {
    const nombre = String(datos.nombreCompleto || '').trim().replace(/\s+/g, ' ');
    if (nombre.length < 3) throw Object.assign(new Error('Captura el nombre completo.'), {campo: 'tit-nombre', codigo: 'RH-OWN-001'});
    const raw = String(datos.participacionDeclarada ?? '').trim();
    const participacion = raw === '' ? null : Number(raw);
    if (raw && (!Number.isFinite(participacion) || participacion <= 0 || participacion > 100)) {
        throw Object.assign(new Error('La participación declarada debe ser mayor que 0 y máximo 100%.'), {campo: 'tit-participacion', codigo: 'RH-OWN-002'});
    }
    return {
        ...(anterior || {}),
        id: anterior?.id || DB.getId(),
        casaId: String(datos.casaId || anterior?.casaId || ''),
        nombreCompleto: nombre.slice(0, 160),
        participacionDeclarada: participacion,
        telefono: String(datos.telefono || '').trim().slice(0, 35),
        archivado: false,
        fechaRegistro: anterior?.fechaRegistro || new Date().toISOString(),
        fechaActualizacion: new Date().toISOString()
    };
}

function renderTitularesCasa() {
    if (!puedeGestionarTitulares() || !rhTitularesCasaId) return;
    const casa = DB.get('casas').find(c => c.id === rhTitularesCasaId);
    if (!casa) return;
    const titular = document.getElementById('tit-propietario-principal');
    if (titular) titular.textContent = casa.nombreCompleto || 'Sin nombre';
    const tbody = document.querySelector('#table-titulares tbody');
    if (!tbody) return;
    const incluirArchivados = !!document.getElementById('tit-mostrar-archivados')?.checked;
    const items = listarCopropietarios(casa.id, incluirArchivados);
    tbody.innerHTML = items.map(t => '<tr>'
        + '<td>' + escapeHtml(t.nombreCompleto) + (t.archivado ? ' <em>(Archivado)</em>' : '') + '</td>'
        + '<td>' + (t.participacionDeclarada === null ? 'Sin especificar' : escapeHtml(String(t.participacionDeclarada)) + '%') + '</td>'
        + '<td>' + (t.archivado
            ? '<button class="btn btn-outline btn-small" type="button" data-tit-action="restaurar" data-tit-id="' + escapeHtml(t.id) + '">Restaurar</button>'
            : '<button class="btn btn-outline btn-small" type="button" data-tit-action="editar" data-tit-id="' + escapeHtml(t.id) + '">Editar</button> '
              + '<button class="btn btn-outline btn-small" type="button" data-tit-action="archivar" data-tit-id="' + escapeHtml(t.id) + '">Archivar</button>') + '</td>'
        + '</tr>').join('') || '<tr><td colspan="3" class="celda-vacia">No hay copropietarios declarados con estos filtros.</td></tr>';
}

function abrirModalTitulares(casaId) {
    if (!puedeGestionarTitulares()) return;
    if (!DB.get('casas').some(c => c.id === casaId)) return;
    rhTitularesCasaId = casaId;
    document.getElementById('tit-casa-id').value = casaId;
    document.getElementById('tit-mostrar-archivados').checked = false;
    document.getElementById('form-copropietario')?.reset();
    document.getElementById('tit-id').value = '';
    renderTitularesCasa();
    document.getElementById('modal-titulares')?.classList.add('active');
}

function cerrarModalTitulares() {
    document.getElementById('modal-titulares')?.classList.remove('active');
    rhTitularesCasaId = null;
}

function guardarCopropietario(e) {
    e.preventDefault();
    if (!puedeGestionarTitulares() || !rhTitularesCasaId) return;
    if (!DB.get('casas').some(c => c.id === rhTitularesCasaId)) return;
    const id = document.getElementById('tit-id')?.value || '';
    const registros = DB.get('copropietarios');
    const anterior = id ? registros.find(t => t.id === id && t.casaId === rhTitularesCasaId && !t.archivado) : null;
    if (id && !anterior) return;
    let nuevo;
    try {
        nuevo = normalizarCopropietario({
            casaId: rhTitularesCasaId,
            nombreCompleto: document.getElementById('tit-nombre').value,
            telefono: document.getElementById('tit-telefono').value,
            participacionDeclarada: document.getElementById('tit-participacion').value
        }, anterior);
    } catch (error) {
        informarErrorCaptura(error.campo || 'tit-nombre', error.message, error.codigo || 'RH-OWN-000');
        return;
    }
    const duplicado = registros.some(t => !t.archivado && t.casaId === rhTitularesCasaId
        && t.id !== nuevo.id && t.nombreCompleto.toLocaleLowerCase('es') === nuevo.nombreCompleto.toLocaleLowerCase('es'));
    if (duplicado) {
        informarErrorCaptura('tit-nombre', 'Ya existe un copropietario activo con este nombre.', 'RH-OWN-003');
        return;
    }
    // Evitar declaratorias internas que excedan 100%. No calcular el resto del propietario principal.
    const otras = registros.filter(t => !t.archivado && t.casaId === rhTitularesCasaId && t.id !== nuevo.id);
    const declarado = otras.reduce((s, t) => s + Number(t.participacionDeclarada || 0), 0);
    if (declarado + Number(nuevo.participacionDeclarada || 0) > 100.000001) {
        informarErrorCaptura('tit-participacion', 'La suma de participaciones declaradas excede el 100%.', 'RH-OWN-004');
        return;
    }
    DB.set('copropietarios', anterior
        ? registros.map(t => t.id === id ? nuevo : t)
        : [...registros, nuevo]);
    if (typeof logAction === 'function') logAction('Ficha declarativa de copropietario actualizada en propiedad ' + rhTitularesCasaId);
    document.getElementById('form-copropietario')?.reset();
    document.getElementById('tit-id').value = '';
    renderTitularesCasa();
}

function editarCopropietario(id) {
    if (!puedeGestionarTitulares() || !rhTitularesCasaId) return;
    const t = listarCopropietarios(rhTitularesCasaId).find(t => t.id === id);
    if (!t) return;
    document.getElementById('tit-id').value = t.id;
    document.getElementById('tit-nombre').value = t.nombreCompleto;
    document.getElementById('tit-telefono').value = t.telefono || '';
    document.getElementById('tit-participacion').value = t.participacionDeclarada ?? '';
    document.getElementById('tit-nombre').focus();
}

function archivarCopropietario(id) {
    if (!puedeGestionarTitulares() || !rhTitularesCasaId) return;
    const todos = DB.get('copropietarios');
    const t = todos.find(t => t.id === id && t.casaId === rhTitularesCasaId && !t.archivado);
    if (!t || !confirmAction('¿Archivar esta declaración? El registro se conservará.')) return;
    DB.set('copropietarios', todos.map(x => x.id === id ? { ...x, archivado: true, fechaActualizacion: new Date().toISOString() } : x));
    if (typeof logAction === 'function') logAction('Declaración de copropietario archivada en propiedad ' + rhTitularesCasaId);
    renderTitularesCasa();
}

function restaurarCopropietario(id) {
    if (!puedeGestionarTitulares() || !rhTitularesCasaId) return false;
    const todos = DB.get('copropietarios');
    const t = todos.find(t => t.id === id && t.casaId === rhTitularesCasaId && t.archivado);
    if (!t) return false;
    const actuales = listarCopropietarios(rhTitularesCasaId);
    if (actuales.some(x => x.nombreCompleto.toLocaleLowerCase('es') === t.nombreCompleto.toLocaleLowerCase('es'))) {
        informarErrorCaptura('tit-nombre', 'Ya existe un copropietario activo con el mismo nombre.', 'RH-OWN-003');
        return false;
    }
    const suma = actuales.reduce((acc, x) => acc + Number(x.participacionDeclarada || 0), 0);
    if (suma + Number(t.participacionDeclarada || 0) > 100.000001) {
        informarErrorCaptura('tit-participacion', 'Las participaciones declaradas superarían el 100%.', 'RH-OWN-004');
        return false;
    }
    DB.set('copropietarios', todos.map(x => x.id === id ? { ...x, archivado: false, fechaActualizacion: new Date().toISOString() } : x));
    if (typeof logAction === 'function') logAction('Declaración de copropietario restaurada en propiedad ' + rhTitularesCasaId);
    renderTitularesCasa();
    return true;
}

function inicializarTitulares() {
    document.getElementById('form-copropietario')?.addEventListener('submit', guardarCopropietario);
    document.getElementById('tit-mostrar-archivados')?.addEventListener('change', renderTitularesCasa);
    document.querySelector('#table-titulares tbody')?.addEventListener('click', event => {
        const btn = event.target.closest('button[data-tit-id]');
        if (!btn) return;
        if (btn.dataset.titAction === 'editar') editarCopropietario(btn.dataset.titId);
        if (btn.dataset.titAction === 'archivar') archivarCopropietario(btn.dataset.titId);
        if (btn.dataset.titAction === 'restaurar') restaurarCopropietario(btn.dataset.titId);
    });
}
