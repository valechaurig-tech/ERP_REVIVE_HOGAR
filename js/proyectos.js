/**
 * Revive Hogar — Gestor de proyectos (Dirección) estilo Monday / Asana
 */

let proyectosFiltroUsuarioId = '';

function rhPuedeUsarGestorProyectos() {
    return rhEsDireccion(currentUser);
}

function getTodasLasTareas() {
    return DB.get('tareas') || [];
}

function getTareasAsignadasA(userId) {
    return getTodasLasTareas().filter(t => t.assignedUserId === userId);
}

function estadisticasTareasUsuario(userId) {
    const tareas = getTareasAsignadasA(userId).filter(t => t.estado !== 'Completada');
    return {
        total: tareas.length,
        pendiente: tareas.filter(t => t.estado === 'Pendiente').length,
        proceso: tareas.filter(t => t.estado === 'En proceso').length,
        urgentes: tareas.filter(t => ['Alta', 'Urgente'].includes(t.priority)).length
    };
}

function puedeGestionarTarea(t) {
    if (!currentUser || !t) return false;
    if (rhEsDireccion(currentUser)) return activeModuleId === 'mod-proyectos';
    return t.assignedUserId === currentUser.id;
}

function puedeCrearTareaEnModuloActual() {
    if (!currentUser) return false;
    if (rhEsDireccion(currentUser)) return activeModuleId === 'mod-proyectos';
    return activeModuleId === 'mod-planner';
}

function irAGestorProyectos() {
    if (!rhPuedeUsarGestorProyectos()) return;
    const btn = document.querySelector('.sidebar-nav .nav-item[data-module-id="mod-proyectos"]');
    if (btn) showModule('mod-proyectos', btn);
}

function onCambioFiltroProyectos() {
    const sel = document.getElementById('proy-filtro-usuario');
    proyectosFiltroUsuarioId = sel?.value || '';
    renderProyectos();
}

function renderProyectos() {
    if (!rhPuedeUsarGestorProyectos()) return;

    const todas = getTodasLasTareas();
    const activas = todas.filter(t => t.estado !== 'Completada');
    const filtradas = proyectosFiltroUsuarioId
        ? activas.filter(t => t.assignedUserId === proyectosFiltroUsuarioId)
        : activas;
    const urgentes = filtradas.filter(t => ['Alta', 'Urgente'].includes(t.priority));
    const completadas = todas.filter(t => {
        if (t.estado !== 'Completada') return false;
        return !proyectosFiltroUsuarioId || t.assignedUserId === proyectosFiltroUsuarioId;
    });

    setText('proy-activas', filtradas.length);
    setText('proy-urgentes', urgentes.length);
    setText('proy-completadas', completadas.length);
    setText('proy-equipo', DB.get('usuariosLogin').filter(u => u.activo !== false).length);

    const sel = document.getElementById('proy-filtro-usuario');
    if (sel && !sel.dataset.bound) {
        sel.dataset.bound = '1';
        sel.addEventListener('change', onCambioFiltroProyectos);
    }
    if (sel && sel.options.length <= 1) {
        const usuarios = DB.get('usuariosLogin').filter(u => u.activo !== false);
        sel.innerHTML = '<option value="">Todo el equipo</option>' +
            usuarios.map(u => `<option value="${escapeHtml(u.id)}">${escapeHtml(u.displayName)} — ${escapeHtml(rhEtiquetaRol(u.rol))}</option>`).join('');
        if (proyectosFiltroUsuarioId) sel.value = proyectosFiltroUsuarioId;
    }

    renderProyectosKanban(filtradas);
    renderProyectosTablaEquipo();
    renderProyectosCompletadas(completadas);
}

function renderProyectosKanban(tareas) {
    const cols = {
        Pendiente: document.getElementById('proy-kanban-pendiente'),
        'En proceso': document.getElementById('proy-kanban-proceso'),
        Completada: document.getElementById('proy-kanban-hecho')
    };
    if (!cols.Pendiente) return;

    const renderCard = (t, esHecho) => {
        const asignado = DB.get('usuariosLogin').find(u => u.id === t.assignedUserId);
        const vence = t.fechaVencimiento
            ? `<span class="task-due${t.fechaVencimiento < hoyISO() && !esHecho ? ' task-due--late' : ''}">📅 ${escapeHtml(t.fechaVencimiento)}</span>`
            : '';
        let acciones = '';
        if (!esHecho) {
            if (t.estado === 'Pendiente') {
                acciones = `<button type="button" class="btn btn-primary btn-small" onclick="updateTaskStatus('${escapeHtml(t.id)}','En proceso')">Iniciar</button>`;
            } else if (t.estado === 'En proceso') {
                acciones = `<button type="button" class="btn btn-success btn-small" onclick="updateTaskStatus('${escapeHtml(t.id)}','Completada')">Completar</button>`;
            }
            if (t.estado === 'En proceso') {
                acciones += ` <button type="button" class="btn btn-outline btn-small" onclick="updateTaskStatus('${escapeHtml(t.id)}','Pendiente')">← Pendiente</button>`;
            }
        }
        return `<div class="kanban-card kanban-card--${t.priority?.toLowerCase() || 'baja'} pm-card">
            <div class="kanban-card-top">
                <span class="pill ${priorityClass(t.priority)}">${escapeHtml(t.priority || 'Media')}</span>
                ${vence}
            </div>
            <strong>${escapeHtml(t.titulo)}</strong>
            ${t.descripcion ? `<p class="kanban-card-desc">${escapeHtml(t.descripcion)}</p>` : ''}
            <div class="kanban-card-meta">
                <span class="pm-assignee-chip">👤 ${escapeHtml(asignado ? asignado.displayName : 'Sin asignar')}</span>
            </div>
            ${acciones ? `<div class="planner-actions">${acciones}</div>` : ''}
        </div>`;
    };

    ['Pendiente', 'En proceso'].forEach(estado => {
        const items = tareas.filter(t => t.estado === estado);
        cols[estado].innerHTML = items.length === 0
            ? '<div class="kanban-card kanban-card-empty">Arrastra mentalmente: sin tareas aquí</div>'
            : items.map(t => renderCard(t, false)).join('');
    });

    const hechoPreview = tareas.filter(t => t.estado === 'Completada').slice(0, 5);
    if (cols.Completada) {
        cols.Completada.innerHTML = hechoPreview.length === 0
            ? '<div class="kanban-card kanban-card-empty">Completadas abajo en lista</div>'
            : hechoPreview.map(t => renderCard(t, true)).join('');
    }
}

function renderProyectosTablaEquipo() {
    const wrap = document.getElementById('proy-equipo-grid');
    if (!wrap) return;
    const usuarios = DB.get('usuariosLogin').filter(u => u.activo !== false);
    wrap.innerHTML = usuarios.map(u => {
        const st = estadisticasTareasUsuario(u.id);
        return `<div class="pm-equipo-card" data-user-id="${escapeHtml(u.id)}">
            <div class="pm-equipo-card-head">
                <strong>${escapeHtml(u.displayName)}</strong>
                <span class="pm-equipo-rol">${escapeHtml(rhEtiquetaRol(u.rol))}</span>
            </div>
            <div class="pm-equipo-stats">
                <span><b>${st.pendiente}</b> por hacer</span>
                <span><b>${st.proceso}</b> en curso</span>
                <span class="pm-equipo-urgente"><b>${st.urgentes}</b> urgentes</span>
            </div>
            <button type="button" class="btn btn-outline btn-small pm-equipo-ver" onclick="filtrarProyectosPorUsuario('${escapeHtml(u.id)}')">Ver tablero</button>
        </div>`;
    }).join('');
}

function filtrarProyectosPorUsuario(userId) {
    proyectosFiltroUsuarioId = userId;
    const sel = document.getElementById('proy-filtro-usuario');
    if (sel) sel.value = userId;
    renderProyectos();
    document.getElementById('proy-kanban-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderProyectosCompletadas(tareas) {
    const tbody = document.querySelector('#table-proy-completadas tbody');
    if (!tbody) return;
    const sorted = [...tareas].sort((a, b) => (b.fechaCompletada || '').localeCompare(a.fechaCompletada || ''));
    tbody.innerHTML = sorted.length === 0
        ? '<tr><td colspan="5" class="celda-vacia">Sin tareas completadas en este filtro.</td></tr>'
        : sorted.slice(0, 40).map(t => {
            const u = DB.get('usuariosLogin').find(x => x.id === t.assignedUserId);
            return `<tr>
                <td><strong>${escapeHtml(t.titulo)}</strong></td>
                <td>${escapeHtml(u ? u.displayName : '—')}</td>
                <td><span class="pill ${priorityClass(t.priority)}">${escapeHtml(t.priority)}</span></td>
                <td>${escapeHtml(t.fechaVencimiento || '—')}</td>
                <td>${escapeHtml(t.fechaCompletada ? new Date(t.fechaCompletada).toLocaleString() : '—')}</td>
            </tr>`;
        }).join('');
}

function renderPmSummaryBar() {
    const bar = document.getElementById('pm-summary-bar');
    if (!bar || !currentUser) return;

    const esDir = rhEsDireccion(currentUser);
    const btnGestor = document.getElementById('pm-btn-gestor');
    btnGestor?.classList.toggle('hidden', !esDir);

    const statsEl = document.getElementById('pm-summary-stats');
    if (!statsEl) return;

    if (esDir) {
        const todas = getTodasLasTareas();
        const activas = todas.filter(t => t.estado !== 'Completada');
        const urgentes = activas.filter(t => ['Alta', 'Urgente'].includes(t.priority));
        const porUsuario = DB.get('usuariosLogin').filter(u => u.activo !== false).length;
        statsEl.innerHTML = `
            <div class="pm-summary-stat"><span class="pm-summary-num">${activas.length}</span><span class="pm-summary-lbl">Tareas activas del equipo</span></div>
            <div class="pm-summary-stat pm-summary-stat--warn"><span class="pm-summary-num">${urgentes.length}</span><span class="pm-summary-lbl">Urgentes / alta prioridad</span></div>
            <div class="pm-summary-stat"><span class="pm-summary-num">${porUsuario}</span><span class="pm-summary-lbl">Tableros independientes</span></div>`;
        setText('pm-summary-titulo', 'Resumen del gestor de proyectos');
        setText('pm-summary-desc', 'Cada persona tiene su propio tablero. Desde aquí ves el panorama; gestiona todo en el gestor completo.');
    } else {
        const mias = getTareasAsignadasA(currentUser.id);
        const activas = mias.filter(t => t.estado !== 'Completada');
        const urgentes = activas.filter(t => ['Alta', 'Urgente'].includes(t.priority));
        statsEl.innerHTML = `
            <div class="pm-summary-stat"><span class="pm-summary-num">${activas.length}</span><span class="pm-summary-lbl">Mis tareas activas</span></div>
            <div class="pm-summary-stat pm-summary-stat--warn"><span class="pm-summary-num">${urgentes.length}</span><span class="pm-summary-lbl">Prioridad alta</span></div>
            <div class="pm-summary-stat pm-summary-stat--ok"><span class="pm-summary-num">${mias.filter(t => t.estado === 'Completada').length}</span><span class="pm-summary-lbl">Completadas</span></div>`;
        setText('pm-summary-titulo', 'Mi tablero personal');
        setText('pm-summary-desc', 'Solo ves y gestionas las tareas asignadas a ti.');
    }
}
