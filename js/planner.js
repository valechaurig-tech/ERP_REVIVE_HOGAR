/**
 * Revive Hogar — Planner tipo Asana + alertas
 */

const RH_PRIORIDADES = ['Baja', 'Media', 'Alta', 'Urgente'];
const RH_ESTADOS_TAREA = ['Pendiente', 'En proceso', 'Completada'];

function priorityClass(p) {
    const map = { Urgente: 'priority-urgent', Alta: 'priority-high', Media: 'priority-medium', Baja: 'priority-low' };
    return map[p] || 'priority-low';
}

function tareaVisibleParaUsuario(t) {
    if (!currentUser) return false;
    if (rhEsDireccion(currentUser)) return true;
    return t.assignedUserId === currentUser.id || t.createdByUserId === currentUser.id;
}

function renderPlanner() {
    const alertas = DB.get('alertas').filter(a => alertaVisibleParaUsuario(a));
    const pendientesAlert = alertas.filter(a => a.estado !== 'Resuelta');
    const tareas = DB.get('tareas').filter(tareaVisibleParaUsuario);
    const activas = tareas.filter(t => t.estado !== 'Completada');
    const completadas = tareas.filter(t => t.estado === 'Completada');
    const urgentes = activas.filter(t => t.priority === 'Urgente' || t.priority === 'Alta');

    setText('planner-pendientes', pendientesAlert.length);
    setText('planner-resueltas', alertas.filter(a => a.estado === 'Resuelta').length);
    setText('planner-tareas-activas', activas.length);
    setText('planner-tareas-urgentes', urgentes.length);
    setText('planner-tareas-completadas', completadas.length);
    setText('planner-total', pendientesAlert.length + activas.length);

    renderPlannerKanban(activas);
    renderPlannerAlertas(pendientesAlert);
    renderPlannerCompletadas(completadas);
    renderHistorialPlanner();
}

function renderPlannerKanban(tareas) {
    const cols = {
        Pendiente: document.getElementById('kanban-pendiente'),
        'En proceso': document.getElementById('kanban-proceso')
    };
    if (!cols.Pendiente) return;

    const renderCard = (t) => {
        const asignado = DB.get('usuariosLogin').find(u => u.id === t.assignedUserId);
        const creador = DB.get('usuariosLogin').find(u => u.id === t.createdByUserId);
        const vence = t.fechaVencimiento
            ? `<span class="task-due${t.fechaVencimiento < hoyISO() ? ' task-due--late' : ''}">📅 ${escapeHtml(t.fechaVencimiento)}</span>`
            : '';
        const acciones = t.estado === 'Pendiente'
            ? `<button type="button" class="btn btn-primary btn-small" onclick="updateTaskStatus('${escapeHtml(t.id)}','En proceso')">Iniciar</button>`
            : `<button type="button" class="btn btn-success btn-small" onclick="updateTaskStatus('${escapeHtml(t.id)}','Completada')">Completar</button>`;
        return `<div class="kanban-card kanban-card--${t.priority?.toLowerCase() || 'baja'}">
            <div class="kanban-card-top">
                <span class="pill ${priorityClass(t.priority)}">${escapeHtml(t.priority || 'Media')}</span>
                ${vence}
            </div>
            <strong>${escapeHtml(t.titulo)}</strong>
            ${t.descripcion ? `<p class="kanban-card-desc">${escapeHtml(t.descripcion)}</p>` : ''}
            <div class="kanban-card-meta">
                <span>👤 ${escapeHtml(asignado ? asignado.displayName : 'Sin asignar')}</span>
                ${creador ? `<span>· Por ${escapeHtml(creador.displayName)}</span>` : ''}
            </div>
            <div class="planner-actions">${acciones}</div>
        </div>`;
    };

    ['Pendiente', 'En proceso'].forEach(estado => {
        const items = tareas.filter(t => t.estado === estado);
        cols[estado].innerHTML = items.length === 0
            ? '<div class="kanban-card kanban-card-empty">Sin tareas</div>'
            : items.map(renderCard).join('');
    });
}

function renderPlannerAlertas(alertas) {
    const tbody = document.querySelector('#table-planner tbody');
    if (!tbody) return;
    tbody.innerHTML = alertas.length === 0
        ? '<tr><td colspan="5" class="celda-vacia">Sin alertas pendientes.</td></tr>'
        : alertas.map(a => `<tr>
            <td><span class="tipo-pill tipo-${escapeHtml(a.tipo || 'general')}">${escapeHtml(a.tipo || 'general')}</span></td>
            <td><strong>${escapeHtml(a.titulo)}</strong><br><small>${escapeHtml(a.mensaje)}</small></td>
            <td>${escapeHtml(a.creado)}</td>
            <td><span class="badge-mkt badge-mkt-warning">Pendiente</span></td>
            <td class="celda-acciones">
                ${a.relatedId && a.tipo === 'mensaje_caso' ? `<button type="button" class="btn btn-outline btn-small" onclick="abrirCasoDesdeAlerta('${escapeHtml(a.relatedId)}','${escapeHtml(a.casoTipo || 'casa')}')">Ver caso</button>` : ''}
                <button type="button" class="btn btn-primary btn-small" onclick="resolverAlerta('${escapeHtml(a.id)}')">Resolver</button>
            </td>
        </tr>`).join('');
}

function renderPlannerCompletadas(tareas) {
    const tbody = document.querySelector('#table-tareas-completadas tbody');
    const count = document.getElementById('planner-completadas-count');
    if (count) count.textContent = tareas.length;
    if (!tbody) return;
    const sorted = [...tareas].sort((a, b) => (b.fechaCompletada || '').localeCompare(a.fechaCompletada || ''));
    tbody.innerHTML = sorted.length === 0
        ? '<tr><td colspan="4" class="celda-vacia">Sin tareas completadas.</td></tr>'
        : sorted.slice(0, 30).map(t => {
            const u = DB.get('usuariosLogin').find(x => x.id === t.assignedUserId);
            return `<tr>
                <td><strong>${escapeHtml(t.titulo)}</strong></td>
                <td>${escapeHtml(u ? u.displayName : '—')}</td>
                <td><span class="pill ${priorityClass(t.priority)}">${escapeHtml(t.priority)}</span></td>
                <td>${escapeHtml(t.fechaCompletada ? new Date(t.fechaCompletada).toLocaleString() : '—')}</td>
            </tr>`;
        }).join('');
}

function renderHistorialPlanner() {
    const hist = document.getElementById('history-list');
    if (!hist) return;
    hist.innerHTML = DB.get('historial').slice(0, 12).map(h =>
        `<div class="history-item"><strong>${escapeHtml(h.titulo)}</strong> — ${escapeHtml(h.detalle)}<br><small>${escapeHtml(h.fecha)} · ${escapeHtml(h.usuario)}</small></div>`
    ).join('') || '<p class="module-desc">Sin actividad reciente.</p>';
}

function abrirModalTarea() {
    const form = document.getElementById('form-tarea');
    if (form) form.reset();
    const sel = document.getElementById('tarea-asignado');
    if (sel) {
        sel.innerHTML = DB.get('usuariosLogin').filter(u => u.activo !== false)
            .map(u => `<option value="${escapeHtml(u.id)}">${escapeHtml(u.displayName)} — ${escapeHtml(rhEtiquetaRol(u.rol))}</option>`).join('');
    }
    document.getElementById('tarea-vencimiento').value = '';
    document.getElementById('modal-tarea')?.classList.add('active');
}

function updateTaskStatus(id, estado) {
    const tareas = DB.get('tareas');
    const idx = tareas.findIndex(t => t.id === id);
    if (idx < 0) return;
    tareas[idx].estado = estado;
    if (estado === 'Completada') {
        tareas[idx].fechaCompletada = new Date().toISOString();
    }
    DB.set('tareas', tareas);
    logAction(`Tarea ${estado.toLowerCase()}: ${tareas[idx].titulo}`);
    addHistory('tarea', `Tarea ${estado.toLowerCase()}`, tareas[idx].titulo);
    refreshActiveModule();
}

function guardarTarea(e) {
    e.preventDefault();
    const tareas = DB.get('tareas');
    tareas.push({
        id: DB.getId(),
        titulo: document.getElementById('tarea-titulo').value.trim(),
        descripcion: document.getElementById('tarea-descripcion').value.trim(),
        assignedUserId: document.getElementById('tarea-asignado').value,
        createdByUserId: currentUser?.id || '',
        priority: document.getElementById('tarea-prioridad').value,
        estado: 'Pendiente',
        fechaVencimiento: document.getElementById('tarea-vencimiento').value || '',
        fechaCreacion: new Date().toISOString()
    });
    DB.set('tareas', tareas);
    const asignado = DB.get('usuariosLogin').find(u => u.id === tareas[tareas.length - 1].assignedUserId);
    createAlert({
        titulo: 'Nueva tarea asignada',
        mensaje: tareas[tareas.length - 1].titulo,
        targetUserId: tareas[tareas.length - 1].assignedUserId,
        relatedId: tareas[tareas.length - 1].id,
        tipo: 'tarea_nueva'
    });
    logAction(`Tarea creada: ${tareas[tareas.length - 1].titulo}`);
    closeModal('modal-tarea');
    refreshActiveModule();
}

function abrirCasoDesdeAlerta(relatedId, casoTipo) {
    if (casoTipo === 'prospecto') abrirDetalleProspecto(relatedId, 'comunicacion');
    else abrirDetalleCasa(relatedId, 'comunicacion');
}
