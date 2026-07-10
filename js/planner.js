/**
 * Revive Hogar — Planner personal + alertas (tableros independientes por usuario)
 */

const RH_PRIORIDADES = ['Baja', 'Media', 'Alta', 'Urgente'];
const RH_ESTADOS_TAREA = ['Pendiente', 'En proceso', 'Completada'];

function priorityClass(p) {
    const map = { Urgente: 'priority-urgent', Alta: 'priority-high', Media: 'priority-medium', Baja: 'priority-low' };
    return map[p] || 'priority-low';
}

/** Tablero personal: solo tareas asignadas al usuario (independientes por persona). */
function tareaVisibleParaUsuario(t) {
    if (!currentUser || !t) return false;
    if (rhEsDireccion(currentUser)) return false;
    return t.assignedUserId === currentUser.id;
}

function renderPlanner() {
    if (!currentUser) return;

    const esDir = rhEsDireccion(currentUser);
    const alertas = DB.get('alertas').filter(a => alertaVisibleParaUsuario(a));
    const pendientesAlert = alertas.filter(a => a.estado !== 'Resuelta');

    const tareas = esDir ? [] : DB.get('tareas').filter(tareaVisibleParaUsuario);
    const activas = tareas.filter(t => t.estado !== 'Completada');
    const completadas = tareas.filter(t => t.estado === 'Completada');
    const urgentes = activas.filter(t => t.priority === 'Urgente' || t.priority === 'Alta');

    setText('planner-pendientes', pendientesAlert.length);
    setText('planner-resueltas', alertas.filter(a => a.estado === 'Resuelta').length);
    setText('planner-tareas-activas', activas.length);
    setText('planner-tareas-urgentes', urgentes.length);
    setText('planner-tareas-completadas', completadas.length);

    document.getElementById('planner-btn-nueva')?.classList.toggle('hidden', esDir);
    document.getElementById('planner-kanban-section')?.classList.toggle('hidden', esDir);
    document.getElementById('planner-equipo-resumen')?.classList.toggle('hidden', !esDir);
    document.getElementById('planner-completadas-section')?.classList.toggle('hidden', esDir);

    const kanbanTitle = document.getElementById('planner-kanban-title');
    if (kanbanTitle) kanbanTitle.textContent = 'Mi tablero Kanban';

    if (typeof renderPmSummaryBar === 'function') renderPmSummaryBar();

    if (esDir) {
        renderPlannerResumenEquipo();
    } else {
        renderPlannerKanban(activas, true);
        renderPlannerCompletadas(completadas);
    }

    renderPlannerAlertas(pendientesAlert);
    renderHistorialPlanner();
}

function renderPlannerResumenEquipo() {
    const grid = document.getElementById('planner-equipo-grid');
    if (!grid) return;
    const usuarios = DB.get('usuariosLogin').filter(u => u.activo !== false);
    grid.innerHTML = usuarios.map(u => {
        const st = typeof estadisticasTareasUsuario === 'function'
            ? estadisticasTareasUsuario(u.id)
            : { pendiente: 0, proceso: 0, urgentes: 0, total: 0 };
        return `<div class="pm-equipo-card pm-equipo-card--readonly">
            <div class="pm-equipo-card-head">
                <strong>${escapeHtml(u.displayName)}</strong>
                <span class="pm-equipo-rol">${escapeHtml(rhEtiquetaRol(u.rol))}</span>
            </div>
            <div class="pm-equipo-stats">
                <span><b>${st.pendiente}</b> por hacer</span>
                <span><b>${st.proceso}</b> en curso</span>
                <span class="pm-equipo-urgente"><b>${st.urgentes}</b> urgentes</span>
            </div>
            <p class="pm-equipo-nota">Tablero independiente — gestiona desde el gestor de proyectos.</p>
        </div>`;
    }).join('');
}

function renderPlannerKanban(tareas, interactivo) {
    const cols = {
        Pendiente: document.getElementById('kanban-pendiente'),
        'En proceso': document.getElementById('kanban-proceso')
    };
    if (!cols.Pendiente) return;

    const renderCard = (t) => {
        const vence = t.fechaVencimiento
            ? `<span class="task-due${t.fechaVencimiento < hoyISO() ? ' task-due--late' : ''}">📅 ${escapeHtml(t.fechaVencimiento)}</span>`
            : '';
        let acciones = '';
        if (interactivo && puedeGestionarTarea(t)) {
            acciones = t.estado === 'Pendiente'
                ? `<button type="button" class="btn btn-primary btn-small" onclick="updateTaskStatus('${escapeHtml(t.id)}','En proceso')">Iniciar</button>`
                : `<button type="button" class="btn btn-success btn-small" onclick="updateTaskStatus('${escapeHtml(t.id)}','Completada')">Completar</button>`;
        }
        return `<div class="kanban-card kanban-card--${t.priority?.toLowerCase() || 'baja'}">
            <div class="kanban-card-top">
                <span class="pill ${priorityClass(t.priority)}">${escapeHtml(t.priority || 'Media')}</span>
                ${vence}
            </div>
            <strong>${escapeHtml(t.titulo)}</strong>
            ${t.descripcion ? `<p class="kanban-card-desc">${escapeHtml(t.descripcion)}</p>` : ''}
            ${acciones ? `<div class="planner-actions">${acciones}</div>` : ''}
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
    const esDir = rhEsDireccion(currentUser);
    tbody.innerHTML = alertas.length === 0
        ? '<tr><td colspan="5" class="celda-vacia">Sin alertas pendientes.</td></tr>'
        : alertas.map(a => `<tr>
            <td><span class="tipo-pill tipo-${escapeHtml(a.tipo || 'general')}">${escapeHtml(a.tipo || 'general')}</span></td>
            <td><strong>${escapeHtml(a.titulo)}</strong><br><small>${escapeHtml(a.mensaje)}</small></td>
            <td>${escapeHtml(a.creado)}</td>
            <td><span class="badge-mkt badge-mkt-warning">Pendiente</span></td>
            <td class="celda-acciones">
                ${a.relatedId && a.tipo === 'mensaje_caso' ? `<button type="button" class="btn btn-outline btn-small" onclick="abrirCasoDesdeAlerta('${escapeHtml(a.relatedId)}','${escapeHtml(a.casoTipo || 'casa')}')">Ver caso</button>` : ''}
                ${`<button type="button" class="btn btn-primary btn-small" onclick="resolverAlerta('${escapeHtml(a.id)}')">Resolver</button>`}
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
        : sorted.slice(0, 30).map(t => `<tr>
                <td><strong>${escapeHtml(t.titulo)}</strong></td>
                <td>${escapeHtml(currentUser?.displayName || '—')}</td>
                <td><span class="pill ${priorityClass(t.priority)}">${escapeHtml(t.priority)}</span></td>
                <td>${escapeHtml(t.fechaCompletada ? new Date(t.fechaCompletada).toLocaleString() : '—')}</td>
            </tr>`).join('');
}

function renderHistorialPlanner() {
    const hist = document.getElementById('history-list');
    if (!hist) return;
    hist.innerHTML = DB.get('historial').slice(0, 12).map(h =>
        `<div class="history-item"><strong>${escapeHtml(h.titulo)}</strong> — ${escapeHtml(h.detalle)}<br><small>${escapeHtml(h.fecha)} · ${escapeHtml(h.usuario)}</small></div>`
    ).join('') || '<p class="module-desc">Sin actividad reciente.</p>';
}

function abrirModalTarea() {
    if (!puedeCrearTareaEnModuloActual()) {
        alert('Crea y asigna tareas desde el Gestor de proyectos.');
        return;
    }
    const form = document.getElementById('form-tarea');
    if (form) form.reset();
    const sel = document.getElementById('tarea-asignado');
    if (sel) {
        const usuarios = DB.get('usuariosLogin').filter(u => u.activo !== false);
        sel.innerHTML = usuarios.map(u => `<option value="${escapeHtml(u.id)}">${escapeHtml(u.displayName)} — ${escapeHtml(rhEtiquetaRol(u.rol))}</option>`).join('');
        if (!rhEsDireccion(currentUser) && currentUser) sel.value = currentUser.id;
    }
    document.getElementById('tarea-vencimiento').value = '';
    document.getElementById('modal-tarea')?.classList.add('active');
}

function updateTaskStatus(id, estado) {
    const tareas = DB.get('tareas');
    const idx = tareas.findIndex(t => t.id === id);
    if (idx < 0) return;
    if (!puedeGestionarTarea(tareas[idx])) return;

    tareas[idx].estado = estado;
    if (estado === 'Completada') {
        tareas[idx].fechaCompletada = new Date().toISOString();
    } else {
        tareas[idx].fechaCompletada = '';
    }
    DB.set('tareas', tareas);
    logAction(`Tarea ${estado.toLowerCase()}: ${tareas[idx].titulo}`);
    addHistory('tarea', `Tarea ${estado.toLowerCase()}`, tareas[idx].titulo);
    refreshActiveModule();
}

function guardarTarea(e) {
    e.preventDefault();
    if (!puedeCrearTareaEnModuloActual()) return;

    const tareas = DB.get('tareas');
    const nueva = {
        id: DB.getId(),
        titulo: document.getElementById('tarea-titulo').value.trim(),
        descripcion: document.getElementById('tarea-descripcion').value.trim(),
        assignedUserId: document.getElementById('tarea-asignado').value,
        createdByUserId: currentUser?.id || '',
        priority: document.getElementById('tarea-prioridad').value,
        estado: 'Pendiente',
        fechaVencimiento: document.getElementById('tarea-vencimiento').value || '',
        fechaCreacion: new Date().toISOString()
    };
    tareas.push(nueva);
    DB.set('tareas', tareas);
    createAlert({
        titulo: 'Nueva tarea asignada',
        mensaje: nueva.titulo,
        targetUserId: nueva.assignedUserId,
        relatedId: nueva.id,
        tipo: 'tarea_nueva'
    });
    logAction(`Tarea creada: ${nueva.titulo}`);
    closeModal('modal-tarea');
    refreshActiveModule();
}

function abrirCasoDesdeAlerta(relatedId, casoTipo) {
    if (casoTipo === 'prospecto') abrirDetalleProspecto(relatedId, 'comunicacion');
    else abrirDetalleCasa(relatedId, 'comunicacion');
}
