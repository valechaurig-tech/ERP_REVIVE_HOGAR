/**
 * Revive Hogar — Gestor de proyectos avanzado (Monday / Asana)
 */

let proyectosFiltroUsuarioId = '';
let proyectosFiltroSeguimiento = false;
let proyectosVistaModo = 'kanban';
let tareaDetalleId = null;

const RH_ESTADOS_TAREA_PM = ['Pendiente', 'En proceso', 'Completada', 'En seguimiento'];

function rhPuedeUsarGestorProyectos() {
    return rhEsDireccion(currentUser);
}

function getTodasLasTareas() {
    return (DB.get('tareas') || []).map(normalizarTarea);
}

function normalizarTarea(t) {
    if (!t) return t;
    if (!Array.isArray(t.notas)) t.notas = [];
    if (typeof t.enSeguimiento !== 'boolean') t.enSeguimiento = t.estado === 'En seguimiento';
    if (t.enSeguimiento && t.estado !== 'Completada' && t.estado !== 'En seguimiento') {
        t.estado = 'En seguimiento';
    }
    return t;
}

function getTareaById(id) {
    return getTodasLasTareas().find(t => t.id === id);
}

function persistirTareas(tareas) {
    DB.set('tareas', tareas.map(normalizarTarea));
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
        seguimiento: tareas.filter(t => t.estado === 'En seguimiento' || t.enSeguimiento).length,
        urgentes: tareas.filter(t => ['Alta', 'Urgente'].includes(t.priority)).length
    };
}

function puedeGestionarTarea(t) {
    if (!currentUser || !t) return false;
    if (rhEsDireccion(currentUser)) return activeModuleId === 'mod-proyectos';
    return t.assignedUserId === currentUser.id;
}

function puedeVerDetalleTarea(t) {
    if (!currentUser || !t) return false;
    if (rhEsDireccion(currentUser)) return true;
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

function toggleSeccionColapsable(sectionId) {
    const body = document.getElementById(sectionId + '-body');
    const chevron = document.querySelector(`[data-collapse-target="${sectionId}"] .rh-collapse-chevron`);
    if (!body) return;
    const collapsed = body.classList.toggle('is-collapsed');
    if (chevron) chevron.textContent = collapsed ? '▸' : '▾';
    try { sessionStorage.setItem('rh-collapse-' + sectionId, collapsed ? '1' : '0'); } catch (_) { /* noop */ }
}

function aplicarEstadoColapsable(sectionId, defaultCollapsed) {
    const body = document.getElementById(sectionId + '-body');
    const chevron = document.querySelector(`[data-collapse-target="${sectionId}"] .rh-collapse-chevron`);
    if (!body) return;
    let collapsed = defaultCollapsed;
    try {
        const saved = sessionStorage.getItem('rh-collapse-' + sectionId);
        if (saved !== null) collapsed = saved === '1';
    } catch (_) { /* noop */ }
    body.classList.toggle('is-collapsed', collapsed);
    if (chevron) chevron.textContent = collapsed ? '▸' : '▾';
}

function poblarSelectAsignadosTarea(selectId, excluirSelf) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    let usuarios = DB.get('usuariosLogin').filter(u => u.activo !== false);
    if (excluirSelf !== false && currentUser) {
        usuarios = usuarios.filter(u => u.id !== currentUser.id);
    }
    sel.innerHTML = usuarios.length
        ? usuarios.map(u => `<option value="${escapeHtml(u.id)}">${escapeHtml(u.displayName)} — ${escapeHtml(rhEtiquetaRol(u.rol))}</option>`).join('')
        : '<option value="">Sin personas disponibles</option>';
}

function onCambioFiltroProyectos() {
    const sel = document.getElementById('proy-filtro-usuario');
    proyectosFiltroUsuarioId = sel?.value || '';
    renderProyectos();
}

function onFiltroSeguimientoProyectos() {
    const chk = document.getElementById('proy-filtro-seguimiento');
    proyectosFiltroSeguimiento = !!chk?.checked;
    renderProyectos();
}

function setProyectosVista(modo) {
    proyectosVistaModo = modo === 'tabla' ? 'tabla' : 'kanban';
    document.getElementById('proy-vista-kanban')?.classList.toggle('active', proyectosVistaModo === 'kanban');
    document.getElementById('proy-vista-tabla')?.classList.toggle('active', proyectosVistaModo === 'tabla');
    document.getElementById('proy-kanban-wrap')?.classList.toggle('hidden', proyectosVistaModo !== 'kanban');
    document.getElementById('proy-tabla-wrap')?.classList.toggle('hidden', proyectosVistaModo !== 'tabla');
    renderProyectos();
}

function filtrarTareasProyectos(activas) {
    let list = [...activas];
    if (proyectosFiltroUsuarioId) {
        list = list.filter(t => t.assignedUserId === proyectosFiltroUsuarioId);
    }
    if (proyectosFiltroSeguimiento) {
        list = list.filter(t => t.enSeguimiento || t.estado === 'En seguimiento');
    }
    return list;
}

function renderProyectos() {
    if (!rhPuedeUsarGestorProyectos()) return;

    aplicarEstadoColapsable('proy-equipo', true);

    const todas = getTodasLasTareas();
    const activas = todas.filter(t => t.estado !== 'Completada');
    const filtradas = filtrarTareasProyectos(activas);
    const urgentes = filtradas.filter(t => ['Alta', 'Urgente'].includes(t.priority));
    const enSeguimiento = filtradas.filter(t => t.enSeguimiento || t.estado === 'En seguimiento');
    const completadas = todas.filter(t => {
        if (t.estado !== 'Completada') return false;
        return !proyectosFiltroUsuarioId || t.assignedUserId === proyectosFiltroUsuarioId;
    });

    setText('proy-activas', filtradas.length);
    setText('proy-urgentes', urgentes.length);
    setText('proy-seguimiento', enSeguimiento.length);
    setText('proy-completadas', completadas.length);

    const sel = document.getElementById('proy-filtro-usuario');
    if (sel && !sel.dataset.bound) {
        sel.dataset.bound = '1';
        sel.addEventListener('change', onCambioFiltroProyectos);
    }
    if (sel && sel.options.length <= 1) {
        const usuarios = DB.get('usuariosLogin').filter(u => u.activo !== false);
        sel.innerHTML = '<option value="">👥 Todo el equipo</option>' +
            usuarios.map(u => `<option value="${escapeHtml(u.id)}">${escapeHtml(u.displayName)}</option>`).join('');
        if (proyectosFiltroUsuarioId) sel.value = proyectosFiltroUsuarioId;
    }

    document.getElementById('proy-filtro-seguimiento')?.addEventListener('change', onFiltroSeguimientoProyectos);

    renderProyectosTablaEquipo();
    if (proyectosVistaModo === 'kanban') renderProyectosKanban(filtradas);
    else renderProyectosTabla(filtradas);
    renderProyectosCompletadas(completadas);
}

function pmCardHtml(t, opts) {
    const o = opts || {};
    const asignado = DB.get('usuariosLogin').find(u => u.id === t.assignedUserId);
    const vence = t.fechaVencimiento
        ? `<span class="task-due${t.fechaVencimiento < hoyISO() && t.estado !== 'Completada' ? ' task-due--late' : ''}">📅 ${escapeHtml(t.fechaVencimiento)}</span>`
        : '';
    const seg = (t.enSeguimiento || t.estado === 'En seguimiento')
        ? '<span class="pm-chip-seguimiento">📌 Seguimiento</span>' : '';
    const notasCount = (t.notas || []).length;
    const notasBadge = notasCount ? `<span class="pm-chip-notas">💬 ${notasCount}</span>` : '';
    const click = o.clickable !== false
        ? `onclick="abrirDetalleTarea('${escapeHtml(t.id)}')" role="button" tabindex="0"`
        : '';
    return `<div class="kanban-card kanban-card--${t.priority?.toLowerCase() || 'baja'} pm-card pm-card--clickable" ${click}>
        <div class="kanban-card-top">
            <span class="pill ${priorityClass(t.priority)}">${escapeHtml(t.priority || 'Media')}</span>
            ${seg}${notasBadge}${vence}
        </div>
        <strong class="pm-card-title">${escapeHtml(t.titulo)}</strong>
        ${t.descripcion ? `<p class="kanban-card-desc">${escapeHtml(t.descripcion)}</p>` : ''}
        <div class="kanban-card-meta">
            <span class="pm-assignee-chip">👤 ${escapeHtml(asignado ? asignado.displayName : 'Sin asignar')}</span>
        </div>
    </div>`;
}

function renderProyectosKanban(tareas) {
    const cols = {
        Pendiente: document.getElementById('proy-kanban-pendiente'),
        'En proceso': document.getElementById('proy-kanban-proceso'),
        'En seguimiento': document.getElementById('proy-kanban-seguimiento'),
        Completada: document.getElementById('proy-kanban-hecho')
    };
    if (!cols.Pendiente) return;

    const estadosKanban = ['Pendiente', 'En proceso', 'En seguimiento'];
    estadosKanban.forEach(estado => {
        const items = tareas.filter(t => t.estado === estado);
        if (!cols[estado]) return;
        cols[estado].innerHTML = items.length === 0
            ? '<div class="kanban-card kanban-card-empty">Sin tareas</div>'
            : items.map(t => pmCardHtml(t)).join('');
    });

    const hecho = tareas.filter(t => t.estado === 'Completada').slice(0, 4);
    if (cols.Completada) {
        cols.Completada.innerHTML = hecho.length === 0
            ? '<div class="kanban-card kanban-card-empty">Ver lista de completadas ↓</div>'
            : hecho.map(t => pmCardHtml(t)).join('');
    }
}

function renderProyectosTabla(tareas) {
    const tbody = document.querySelector('#table-proy-activas tbody');
    if (!tbody) return;
    tbody.innerHTML = tareas.length === 0
        ? '<tr><td colspan="7" class="celda-vacia">Sin tareas con este filtro.</td></tr>'
        : tareas.map(t => {
            const u = DB.get('usuariosLogin').find(x => x.id === t.assignedUserId);
            const seg = t.enSeguimiento || t.estado === 'En seguimiento' ? '📌' : '—';
            return `<tr class="pm-table-row" onclick="abrirDetalleTarea('${escapeHtml(t.id)}')">
                <td><strong>${escapeHtml(t.titulo)}</strong></td>
                <td>${escapeHtml(u ? u.displayName : '—')}</td>
                <td><span class="badge-mkt badge-mkt-primary">${escapeHtml(t.estado)}</span></td>
                <td><span class="pill ${priorityClass(t.priority)}">${escapeHtml(t.priority)}</span></td>
                <td>${seg}</td>
                <td>${escapeHtml(t.fechaVencimiento || '—')}</td>
                <td>${(t.notas || []).length} 💬</td>
            </tr>`;
        }).join('');
}

function renderProyectosTablaEquipo() {
    const wrap = document.getElementById('proy-equipo-grid');
    if (!wrap) return;
    const usuarios = DB.get('usuariosLogin').filter(u => u.activo !== false);
    wrap.innerHTML = usuarios.map(u => {
        const st = estadisticasTareasUsuario(u.id);
        const emoji = u.rol === 'Vendedor' ? '🚗' : u.rol === 'Marketing' ? '📢' : u.rol === 'Administradora' ? '📋' : '👔';
        return `<div class="pm-equipo-card">
            <div class="pm-equipo-card-head">
                <span class="pm-equipo-emoji">${emoji}</span>
                <div>
                    <strong>${escapeHtml(u.displayName)}</strong>
                    <span class="pm-equipo-rol">${escapeHtml(rhEtiquetaRol(u.rol))}</span>
                </div>
            </div>
            <div class="pm-equipo-stats">
                <span>📝 <b>${st.pendiente}</b></span>
                <span>⚡ <b>${st.proceso}</b></span>
                <span>📌 <b>${st.seguimiento}</b></span>
            </div>
            <button type="button" class="btn btn-ghost btn-small" onclick="filtrarProyectosPorUsuario('${escapeHtml(u.id)}')">Ver tablero →</button>
        </div>`;
    }).join('');
}

function filtrarProyectosPorUsuario(userId) {
    proyectosFiltroUsuarioId = userId;
    const sel = document.getElementById('proy-filtro-usuario');
    if (sel) sel.value = userId;
    setProyectosVista('kanban');
    renderProyectos();
    document.getElementById('proy-kanban-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderProyectosCompletadas(tareas) {
    const tbody = document.querySelector('#table-proy-completadas tbody');
    if (!tbody) return;
    const sorted = [...tareas].sort((a, b) => (b.fechaCompletada || '').localeCompare(a.fechaCompletada || ''));
    tbody.innerHTML = sorted.length === 0
        ? '<tr><td colspan="5" class="celda-vacia">Sin tareas completadas.</td></tr>'
        : sorted.slice(0, 40).map(t => {
            const u = DB.get('usuariosLogin').find(x => x.id === t.assignedUserId);
            return `<tr class="pm-table-row" onclick="abrirDetalleTarea('${escapeHtml(t.id)}')">
                <td><strong>${escapeHtml(t.titulo)}</strong></td>
                <td>${escapeHtml(u ? u.displayName : '—')}</td>
                <td><span class="pill ${priorityClass(t.priority)}">${escapeHtml(t.priority)}</span></td>
                <td>${escapeHtml(t.fechaVencimiento || '—')}</td>
                <td>${escapeHtml(t.fechaCompletada ? new Date(t.fechaCompletada).toLocaleString() : '—')}</td>
            </tr>`;
        }).join('');
}

/* —— Panel detalle tarea (Monday-style) —— */
function abrirDetalleTarea(id) {
    const t = getTareaById(id);
    if (!t || !puedeVerDetalleTarea(t)) return;
    tareaDetalleId = id;
    const panel = document.getElementById('tarea-detalle-panel');
    if (!panel) return;

    const asignado = DB.get('usuariosLogin').find(u => u.id === t.assignedUserId);
    const creador = DB.get('usuariosLogin').find(u => u.id === t.createdByUserId);
    const editable = puedeGestionarTarea(t) || (rhEsDireccion(currentUser) && activeModuleId === 'mod-proyectos')
        || (t.assignedUserId === currentUser?.id);

    document.getElementById('td-titulo').textContent = t.titulo;
    document.getElementById('td-meta-asignado').textContent = asignado ? asignado.displayName : '—';
    document.getElementById('td-meta-creador').textContent = creador ? creador.displayName : '—';

    const estSel = document.getElementById('td-estado');
    if (estSel) {
        estSel.innerHTML = RH_ESTADOS_TAREA_PM.map(e =>
            `<option value="${escapeHtml(e)}"${t.estado === e ? ' selected' : ''}>${escapeHtml(e)}</option>`
        ).join('');
        estSel.disabled = !editable;
    }
    const priSel = document.getElementById('td-prioridad');
    if (priSel) {
        priSel.value = t.priority || 'Media';
        priSel.disabled = !editable;
    }
    const venc = document.getElementById('td-vencimiento');
    if (venc) {
        venc.value = t.fechaVencimiento || '';
        venc.disabled = !editable;
    }
    const desc = document.getElementById('td-descripcion');
    if (desc) {
        desc.value = t.descripcion || '';
        desc.disabled = !editable;
    }
    const segBtn = document.getElementById('td-btn-seguimiento');
    if (segBtn) {
        const on = t.enSeguimiento || t.estado === 'En seguimiento';
        segBtn.classList.toggle('active', on);
        segBtn.disabled = !editable;
        segBtn.textContent = on ? '📌 En seguimiento' : '📌 Marcar seguimiento';
    }

    document.getElementById('td-notas-lista').innerHTML = renderNotasTareaHtml(t.notas);
    document.getElementById('td-nota-input').value = '';
    document.getElementById('td-nota-input').disabled = !editable;
    document.getElementById('td-btn-guardar-nota').style.display = editable ? '' : 'none';
    document.getElementById('td-acciones-rapidas').innerHTML = editable ? renderAccionesRapidasTarea(t) : '';

    panel.classList.add('active');
    document.body.classList.add('tarea-panel-open');
}

function renderNotasTareaHtml(notas) {
    if (!notas?.length) return '<p class="td-notas-vacio">Sin notas aún. Agrega actualizaciones como en Monday.</p>';
    return [...notas].reverse().map(n => `
        <div class="td-nota-item">
            <div class="td-nota-head">
                <strong>${escapeHtml(n.autor || 'Usuario')}</strong>
                <small>${escapeHtml(n.fecha ? new Date(n.fecha).toLocaleString() : '')}</small>
            </div>
            <p>${escapeHtml(n.texto)}</p>
        </div>`).join('');
}

function renderAccionesRapidasTarea(t) {
    if (t.estado === 'Completada') return '<span class="module-desc">✅ Tarea completada</span>';
    let html = '';
    if (t.estado === 'Pendiente') html += `<button type="button" class="btn btn-primary btn-small" onclick="updateTaskStatus('${escapeHtml(t.id)}','En proceso')">▶ Iniciar</button>`;
    if (t.estado === 'En proceso' || t.estado === 'En seguimiento') {
        html += `<button type="button" class="btn btn-success btn-small" onclick="updateTaskStatus('${escapeHtml(t.id)}','Completada')">✓ Completar</button>`;
    }
    if (t.estado !== 'Pendiente' && t.estado !== 'Completada') {
        html += `<button type="button" class="btn btn-ghost btn-small" onclick="updateTaskStatus('${escapeHtml(t.id)}','Pendiente')">← Pendiente</button>`;
    }
    return html;
}

function cerrarDetalleTarea() {
    tareaDetalleId = null;
    document.getElementById('tarea-detalle-panel')?.classList.remove('active');
    document.body.classList.remove('tarea-panel-open');
}

function guardarCamposDetalleTarea() {
    if (!tareaDetalleId) return;
    const tareas = DB.get('tareas');
    const idx = tareas.findIndex(t => t.id === tareaDetalleId);
    if (idx < 0) return;
    const t = normalizarTarea(tareas[idx]);
    if (!puedeGestionarTarea(t) && !(rhEsDireccion(currentUser) && activeModuleId === 'mod-proyectos')) return;

    const nuevoEstado = document.getElementById('td-estado')?.value || t.estado;
    t.descripcion = document.getElementById('td-descripcion')?.value.trim() || '';
    t.priority = document.getElementById('td-prioridad')?.value || t.priority;
    t.fechaVencimiento = document.getElementById('td-vencimiento')?.value || '';
    t.enSeguimiento = nuevoEstado === 'En seguimiento' || (t.enSeguimiento && nuevoEstado !== 'Pendiente');
    t.estado = nuevoEstado === 'En seguimiento' ? 'En seguimiento' : nuevoEstado;
    if (nuevoEstado !== 'En seguimiento' && nuevoEstado !== 'Completada') t.enSeguimiento = false;

    tareas[idx] = t;
    persistirTareas(tareas);
    agregarNotaSistema(t.id, `Actualización: estado ${nuevoEstado}, prioridad ${t.priority}`);
    abrirDetalleTarea(t.id);
    refreshActiveModule();
}

function toggleSeguimientoDetalleTarea() {
    if (!tareaDetalleId) return;
    const tareas = DB.get('tareas');
    const idx = tareas.findIndex(t => t.id === tareaDetalleId);
    if (idx < 0) return;
    const t = normalizarTarea(tareas[idx]);
    if (!puedeGestionarTarea(t) && !(rhEsDireccion(currentUser) && activeModuleId === 'mod-proyectos')) return;

    const activar = !(t.enSeguimiento || t.estado === 'En seguimiento');
    t.enSeguimiento = activar;
    if (activar && t.estado !== 'Completada') t.estado = 'En seguimiento';
    else if (!activar && t.estado === 'En seguimiento') t.estado = 'En proceso';

    tareas[idx] = t;
    persistirTareas(tareas);
    agregarNotaSistema(t.id, activar ? '📌 Marcada en seguimiento' : 'Seguimiento removido');
    abrirDetalleTarea(t.id);
    refreshActiveModule();
}

function agregarNotaTarea() {
    const texto = document.getElementById('td-nota-input')?.value.trim();
    if (!texto || !tareaDetalleId) return;
    agregarNotaSistema(tareaDetalleId, texto, true);
    document.getElementById('td-nota-input').value = '';
    abrirDetalleTarea(tareaDetalleId);
    refreshActiveModule();
}

function agregarNotaSistema(tareaId, texto, esUsuario) {
    const tareas = DB.get('tareas');
    const idx = tareas.findIndex(t => t.id === tareaId);
    if (idx < 0) return;
    const t = normalizarTarea(tareas[idx]);
    t.notas = t.notas || [];
    t.notas.push({
        id: DB.getId(),
        texto,
        autor: esUsuario ? (currentUser?.displayName || 'Usuario') : 'Sistema',
        fecha: new Date().toISOString()
    });
    tareas[idx] = t;
    persistirTareas(tareas);
}

function renderPmSummaryBar() {
    const bar = document.getElementById('pm-summary-bar');
    if (!bar || !currentUser) return;

    const esDir = rhEsDireccion(currentUser);
    document.getElementById('pm-btn-gestor')?.classList.toggle('hidden', !esDir);

    const statsEl = document.getElementById('pm-summary-stats');
    if (!statsEl) return;

    if (esDir) {
        const activas = getTodasLasTareas().filter(t => t.estado !== 'Completada');
        const urgentes = activas.filter(t => ['Alta', 'Urgente'].includes(t.priority));
        const seg = activas.filter(t => t.enSeguimiento || t.estado === 'En seguimiento');
        statsEl.innerHTML = `
            <div class="pm-summary-stat"><span class="pm-summary-emoji">📋</span><span class="pm-summary-num">${activas.length}</span><span class="pm-summary-lbl">Activas equipo</span></div>
            <div class="pm-summary-stat pm-summary-stat--warn"><span class="pm-summary-emoji">🔥</span><span class="pm-summary-num">${urgentes.length}</span><span class="pm-summary-lbl">Urgentes</span></div>
            <div class="pm-summary-stat"><span class="pm-summary-emoji">📌</span><span class="pm-summary-num">${seg.length}</span><span class="pm-summary-lbl">En seguimiento</span></div>`;
        setText('pm-summary-titulo', 'Resumen del gestor');
        setText('pm-summary-desc', 'Vista rápida del equipo. Abre el gestor para notas, seguimiento y asignaciones.');
    } else {
        const mias = getTareasAsignadasA(currentUser.id);
        const activas = mias.filter(t => t.estado !== 'Completada');
        statsEl.innerHTML = `
            <div class="pm-summary-stat"><span class="pm-summary-emoji">✅</span><span class="pm-summary-num">${activas.length}</span><span class="pm-summary-lbl">Mis activas</span></div>
            <div class="pm-summary-stat pm-summary-stat--warn"><span class="pm-summary-emoji">⚡</span><span class="pm-summary-num">${activas.filter(t => ['Alta','Urgente'].includes(t.priority)).length}</span><span class="pm-summary-lbl">Prioridad alta</span></div>
            <div class="pm-summary-stat pm-summary-stat--ok"><span class="pm-summary-emoji">🎯</span><span class="pm-summary-num">${mias.filter(t => t.estado === 'Completada').length}</span><span class="pm-summary-lbl">Completadas</span></div>`;
        setText('pm-summary-titulo', 'Mi tablero');
        setText('pm-summary-desc', 'Tareas asignadas a ti. Toca una tarjeta para ver notas.');
    }
}
