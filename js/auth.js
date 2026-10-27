/**
 * Revive Hogar — autenticación y navegación
 */

let allowedModuleIds = [];

const MODULE_RENDERERS = {
    'mod-planner': () => renderPlanner(),
    'mod-proyectos': () => renderProyectos(),
    'mod-dashboard': () => renderDashboard(),
    'mod-marketing': () => renderMarketing(),
    'mod-vendedor': () => renderVendedor(),
    'mod-administradora': () => renderAdministradora(),
    'mod-pipeline': () => renderPipeline(),
    'mod-gastos': () => renderGastos(),
    'mod-gastos-empresa': () => renderGastosEmpresa(),
    'mod-referidos': () => renderReferidosComisiones(),
    'mod-configuracion': () => renderConfiguracionRequisitos(),
    'mod-auditoria': () => renderAuditoria(),
    'mod-usuarios': () => renderUsuarios()
};

function toggleLoginMode() {
    const mode = document.getElementById('login-access-mode')?.value || 'general';
    document.querySelectorAll('.role-option').forEach(btn =>
        btn.classList.toggle('active', btn.dataset.mode === mode)
    );
    const g = document.getElementById('login-group-general');
    const v = document.getElementById('login-group-vendedor');
    const gu = document.getElementById('login-general-user');
    const vu = document.getElementById('login-vendedor-user');
    if (g) g.classList.toggle('hidden', mode !== 'general');
    if (v) v.classList.toggle('hidden', mode !== 'vendedor');
    if (gu) gu.required = mode === 'general';
    if (vu) vu.required = mode === 'vendedor';
}

function setLoginMode(mode) {
    const el = document.getElementById('login-access-mode');
    if (el) el.value = mode;
    toggleLoginMode();
}

function cargarUsuariosLogin() {
    const usuarios = DB.get('usuariosLogin');
    const generalSelect = document.getElementById('login-general-user');
    const vendedorSelect = document.getElementById('login-vendedor-user');
    if (!generalSelect || !vendedorSelect) return;

    const ordenGeneral = ['Dirección', 'Marketing', 'Administradora'];
    generalSelect.innerHTML = '<option value="">Selecciona usuario…</option>';
    vendedorSelect.innerHTML = '<option value="">Selecciona vendedor…</option>';

    usuarios.filter(u => u.tipo === 'general' && u.activo !== false)
        .sort((a, b) => ordenGeneral.indexOf(a.displayName) - ordenGeneral.indexOf(b.displayName))
        .forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.id;
            opt.textContent = `${u.displayName} — ${rhEtiquetaRol(u.rol)}`;
            generalSelect.appendChild(opt);
        });

    usuarios.filter(u => u.tipo === 'vendedor' && u.activo !== false && u.rol === 'Vendedor')
        .forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.id;
            opt.textContent = u.displayName;
            vendedorSelect.appendChild(opt);
        });
    toggleLoginMode();
}

function aplicarVisibilidadModulos(ids) {
    document.querySelectorAll('.content-area > .module').forEach(mod => {
        const ok = ids.includes(mod.id);
        mod.classList.toggle('module-restricted', !ok);
        if (!ok) mod.classList.remove('active', 'module-enter');
    });
}

function createNavItemButton(menu, isActive) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `nav-item${isActive ? ' active' : ''}`;
    btn.dataset.moduleId = menu.id;
    btn.innerHTML = `<span class="nav-icon">${rhGetNavIconSvg(menu.id)}</span><span class="nav-label">${escapeHtml(menu.name)}</span>`;
    btn.addEventListener('click', () => showModule(menu.id, btn));
    return btn;
}

function createNavGroup(group, initialId) {
    const wrapper = document.createElement('div');
    const hasActiveChild = group.items.some(item => item.id === initialId);
    wrapper.className = `nav-group${hasActiveChild ? ' is-open' : ''}`;
    wrapper.dataset.groupId = group.id;

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = `nav-group-toggle${hasActiveChild ? ' has-active-child' : ''}`;
    toggle.setAttribute('aria-expanded', hasActiveChild ? 'true' : 'false');
    toggle.innerHTML = `
        <span class="nav-group-toggle-leading">
            <span class="nav-group-icon">${rhGetNavIconSvg(group.icon || group.items[0]?.id)}</span>
            <span class="nav-group-toggle-label">${escapeHtml(group.name)}</span>
        </span>
        <span class="nav-group-count">${group.items.length}</span>
        <span class="nav-group-chevron" aria-hidden="true"></span>`;
    toggle.addEventListener('click', () => {
        const open = wrapper.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    const panel = document.createElement('div');
    panel.className = 'nav-group-panel';
    const items = document.createElement('div');
    items.className = 'nav-group-items';

    group.items.forEach(menu => {
        const btn = createNavItemButton(menu, menu.id === initialId);
        btn.classList.add('nav-item-nested');
        items.appendChild(btn);
    });

    panel.appendChild(items);
    wrapper.append(toggle, panel);
    return wrapper;
}

function buildSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar || !currentUser) return;

    const menus = rhGetMenusForUser(currentUser);
    allowedModuleIds = menus.map(m => m.id);
    aplicarVisibilidadModulos(allowedModuleIds);

    sidebar.innerHTML = `
        <div class="sidebar-brand">
            <span class="sidebar-brand-icon" id="sidebar-brand-logo"></span>
            <div class="sidebar-brand-text">
                <strong>REVIVE HOGAR</strong>
                <span>${escapeHtml(currentUser.displayName)}</span>
                <small>${escapeHtml(rhEtiquetaRol(currentUser.rol))}</small>
            </div>
        </div>
        <div class="sidebar-section-label">Módulos</div>
        <div class="sidebar-nav" id="sidebar-nav"></div>`;

    const nav = document.getElementById('sidebar-nav');
    const groups = rhGetSidebarGroupsForUser(currentUser);
    const initialId = rhResolveInitialModuleId(menus);
    let firstBtn = null;
    const renderGrouped = rhEsDireccion(currentUser) && groups.length > 1;
    nav.classList.toggle('sidebar-nav--grouped', renderGrouped);
    if (renderGrouped) {
        groups.forEach(group => nav.appendChild(createNavGroup(group, initialId)));
        firstBtn = nav.querySelector(`.nav-item[data-module-id="${initialId}"]`);
    } else {
        menus.forEach((menu, i) => {
            const isActive = menu.id === initialId || (!initialId && i === 0);
            const btn = createNavItemButton(menu, isActive);
            nav.appendChild(btn);
            if (!firstBtn) firstBtn = btn;
        });
    }

    const sidebarLogo = document.getElementById('sidebar-brand-logo');
    if (sidebarLogo) sidebarLogo.innerHTML = getReviveLogoImg('sidebar');

    if (firstBtn && initialId) showModule(initialId, firstBtn, true);
}

function showModule(modId, navElement, bypass = false) {
    if (!currentUser || !rhUserCanAccessModule(currentUser, modId)) return;
    const next = document.getElementById(modId);
    if (!next || next.classList.contains('module-restricted')) return;

    document.querySelectorAll('.content-area > .module.active').forEach(m => m.classList.remove('active', 'module-enter'));
    document.querySelectorAll('.content-area > .module').forEach(m => { if (m !== next) m.classList.remove('active', 'module-enter'); });

    next.classList.add('active');
    void next.offsetWidth;
    next.classList.add('module-enter');
    activeModuleId = modId;
    actualizarBreadcrumbs(modId);

    if (!bypass && navElement) {
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(n => n.classList.remove('active'));
        navElement.classList.add('active');
        actualizarEstadoGruposNav(modId);
    } else if (bypass) {
        const match = document.querySelector(`.sidebar-nav .nav-item[data-module-id="${modId}"]`);
        if (match) {
            document.querySelectorAll('.sidebar-nav .nav-item').forEach(n => n.classList.remove('active'));
            match.classList.add('active');
            actualizarEstadoGruposNav(modId);
        }
    }
    refreshActiveModule(true);
}

function actualizarEstadoGruposNav(modId) {
    document.querySelectorAll('.nav-group').forEach(group => {
        const hasActive = !!group.querySelector(`.nav-item[data-module-id="${modId}"]`);
        group.classList.toggle('is-open', hasActive || group.classList.contains('is-open'));
        const toggle = group.querySelector('.nav-group-toggle');
        if (toggle) {
            toggle.classList.toggle('has-active-child', hasActive);
            if (hasActive) toggle.setAttribute('aria-expanded', 'true');
        }
    });
}

function updateClock() {
    const reloj = document.getElementById('reloj');
    if (reloj) reloj.textContent = new Date().toLocaleTimeString();
}

function refreshActiveModule(incluirSelects = false) {
    if (!activeModuleId || !rhUserCanAccessModule(currentUser, activeModuleId)) return;
    if (incluirSelects) cargarSelects();
    const fn = MODULE_RENDERERS[activeModuleId];
    if (fn) fn();
}

function logout() {
    DB.flush();
    logAction(`Cierre de sesión: ${currentUser ? currentUser.displayName : 'Sistema'}`);
    document.getElementById('app-screen').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
    currentUser = null;
    activeModuleId = null;
    allowedModuleIds = [];
    vendedorVistaId = null;
    if (typeof mostrarIAWidget === 'function') mostrarIAWidget(false);
    if (clockInterval) clearInterval(clockInterval);
}

function closeModal(id) {
    document.getElementById(id)?.classList.remove('active');
}

function bindAuditoriaEvents() {
    ['audit-filter-user', 'audit-filter-date'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', renderAuditoria);
    });
}

function bindLoginForm() {
    document.getElementById('login-access-mode')?.addEventListener('change', toggleLoginMode);
    document.querySelectorAll('.role-option').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('login-access-mode').value = btn.dataset.mode;
            toggleLoginMode();
        });
    });

    document.getElementById('login-form')?.addEventListener('submit', function (e) {
        e.preventDefault();
        const mode = document.getElementById('login-access-mode').value;
        const selectedId = mode === 'vendedor'
            ? document.getElementById('login-vendedor-user').value
            : document.getElementById('login-general-user').value;
        const user = DB.get('usuariosLogin').find(u => u.id === selectedId);
        if (!user) { alert('Selecciona un usuario válido'); return; }
        if (user.activo === false) { alert('Usuario desactivado. Contacta a Dirección.'); return; }
        const tipoEsperado = mode === 'vendedor' ? 'vendedor' : 'general';
        if (user.tipo !== tipoEsperado) { alert('Perfil de acceso incorrecto.'); return; }

        const cfg = window.RH_CONFIG || {};
        if (cfg.LOGIN_REQUIERE_PASSWORD !== false) {
            const ingresada = document.getElementById('login-password').value;
            const esperada = user.password || cfg.PASSWORD_INICIAL || '1234';
            if (ingresada !== esperada) { alert('Contraseña incorrecta.'); return; }
        }

        currentUser = user;
        document.getElementById('user-role-display').textContent = user.displayName;
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-screen').style.display = 'flex';
        logAction(`Inicio de sesión: ${user.displayName}`);
        addHistory('sesion', 'Inicio de sesión', user.displayName);
        document.getElementById('login-password').value = '';
        buildSidebar();
        if (typeof iniciarSesionIA === 'function') iniciarSesionIA();
        updateClock();
        if (clockInterval) clearInterval(clockInterval);
        clockInterval = setInterval(updateClock, 1000);
    });
}
