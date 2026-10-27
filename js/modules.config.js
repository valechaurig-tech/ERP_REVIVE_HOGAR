/**
 * Revive Hogar — módulos y permisos (independiente de Operacion_Ventas_V1)
 */

const RH_MENU_PLANNER = { id: 'mod-planner', icon: '🔔', name: 'Tareas y Alertas' };

const RH_ALL_MODULES = [
    { id: 'mod-dashboard', icon: '📊', name: 'Resumen Ejecutivo', label: 'Panel Dirección' },
    { id: 'mod-planner', icon: '🔔', name: 'Alertas', label: 'Alertas del sistema' },
    { id: 'mod-proyectos', icon: '📌', name: 'Gestor de proyectos', label: 'Gestión de equipo' },
    { id: 'mod-marketing', icon: '📢', name: 'Marketing', label: 'Campañas y prospectos' },
    { id: 'mod-vendedor', icon: '💼', name: 'Mis Prospectos', label: 'Seguimiento comercial' },
    { id: 'mod-administradora', icon: '📋', name: 'Bandeja Administradora', label: 'Propuestas y documentos' },
    { id: 'mod-pipeline', icon: '🏠', name: 'Propiedades', label: 'Pipeline de casas' },
    { id: 'mod-gastos', icon: '💳', name: 'Gastos y Presupuestos', label: 'Control financiero por propiedad' },
    { id: 'mod-gastos-empresa', icon: '🏢', name: 'Gastos de Empresa', label: 'Finanzas corporativas' },
    { id: 'mod-referidos', icon: '🤝', name: 'Referidos y Comisiones', label: 'Pagos pendientes y realizados' },
    { id: 'mod-configuracion', icon: '⚙️', name: 'Configuración', label: 'Reglas y documentos' },
    { id: 'mod-auditoria', icon: '🔍', name: 'Bitácora', label: 'Auditoría' },
    { id: 'mod-usuarios', icon: '🔐', name: 'Usuarios', label: 'Vendedores y accesos' }
];

const RH_MODULE_MAP = Object.fromEntries(RH_ALL_MODULES.map(m => [m.id, m]));

const RH_MODULE_LABELS = Object.fromEntries(
    RH_ALL_MODULES.map(m => [m.id, m.label || m.name])
);

const RH_MENU_DIRECCION = RH_ALL_MODULES.map(m => (
    m.id === 'mod-vendedor'
        ? { id: m.id, icon: m.icon, name: 'Prospectos vendedores', label: 'Vista por vendedor' }
        : { id: m.id, icon: m.icon, name: m.name }
));

const RH_MENU_GRUPOS_DIRECCION = [
    {
        id: 'grupo-operacion',
        name: 'Operación diaria',
        icon: 'mod-dashboard',
        items: ['mod-dashboard', 'mod-planner', 'mod-proyectos']
    },
    {
        id: 'grupo-comercial',
        name: 'Comercial',
        icon: 'mod-marketing',
        items: ['mod-marketing', 'mod-vendedor', 'mod-administradora']
    },
    {
        id: 'grupo-propiedades',
        name: 'Propiedades',
        icon: 'mod-pipeline',
        items: ['mod-pipeline', 'mod-gastos']
    },
    {
        id: 'grupo-finanzas',
        name: 'Finanzas',
        icon: 'mod-gastos-empresa',
        items: ['mod-gastos-empresa', 'mod-referidos']
    },
    {
        id: 'grupo-sistema',
        name: 'Sistema',
        icon: 'mod-configuracion',
        items: ['mod-configuracion', 'mod-auditoria', 'mod-usuarios']
    }
];

const RH_PERM_MAP = {
    Marketing: [
        { id: 'mod-marketing', icon: '📢', name: 'Campañas y prospectos' },
        { id: 'mod-proyectos', icon: '📌', name: 'Tareas' },
        RH_MENU_PLANNER
    ],
    Vendedor: [
        { id: 'mod-vendedor', icon: '💼', name: 'Mis Prospectos' },
        { id: 'mod-proyectos', icon: '📌', name: 'Tareas' },
        RH_MENU_PLANNER
    ],
    Administradora: [
        { id: 'mod-administradora', icon: '📋', name: 'Bandeja Administradora' },
        { id: 'mod-pipeline', icon: '🏠', name: 'Propiedades' },
        { id: 'mod-gastos', icon: '💳', name: 'Gastos y Presupuestos' },
        { id: 'mod-proyectos', icon: '📌', name: 'Tareas' },
        { id: 'mod-usuarios', icon: '🔐', name: 'Usuarios' },
        RH_MENU_PLANNER
    ],
    Direccion: [...RH_MENU_DIRECCION]
};

const RH_ROLES = ['Direccion', 'Marketing', 'Vendedor', 'Administradora'];

const RH_ROL_ETIQUETAS = {
    Direccion: 'Dirección',
    Marketing: 'Marketing',
    Vendedor: 'Vendedor',
    Administradora: 'Administradora'
};

const RH_ESTATUS_PROSPECTO = {
    NO_CONTACTADO: 'No contactado',
    EN_CONTACTO: 'En contacto',
    INTERESADO: 'Interesado',
    EN_ADMIN: 'En administradora',
    PROPUESTA_LISTA: 'Propuesta lista',
    FIRMADO: 'Firmado',
    DECLINADO: 'Declinado'
};

const RH_ESTATUS_PIPELINE = {
    ESPERA: 'Espera remodelación',
    REMODELACION: 'En remodelación',
    VENTA: 'En venta',
    APARTADA: 'Apartada',
    VENDIDA: 'Vendida',
    CERRADA: 'Cerrada'
};

const RH_CATEGORIAS_COSTO_REM = [
    'Materiales',
    'Mano de obra',
    'Gastos administrativos',
    'Pagos a Tío Fabio (remodelación)',
    'Permisos',
    'Servicios',
    'Otro'
];

const RH_NAV_ICON_SVG = {
    'mod-dashboard': '<path stroke-linecap="round" stroke-linejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zm0 6a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1h-4a1 1 0 01-1-1v-5zM4 13a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2z"/>',
    'mod-planner': '<path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"/>',
    'mod-proyectos': '<path stroke-linecap="round" stroke-linejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25"/>',
    'mod-marketing': '<path stroke-linecap="round" stroke-linejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/>',
    'mod-vendedor': '<path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/>',
    'mod-administradora': '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>',
    'mod-pipeline': '<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/>',
    'mod-gastos': '<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75h19.5v10.5H2.25V6.75zm3 3h3m7.5 4.5h3M12 9.5v5m2-4.25c-.5-.75-3.5-.75-3.5.75 0 1.75 3.5.75 3.5 2.5 0 1.5-3 1.5-3.5.75"/>',
    'mod-gastos-empresa': '<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 21h19.5M2.25 9.75l9.75-6.75 9.75 6.75M4.5 10.5V21h6v-6h3v6h6V10.5"/>',
    'mod-referidos': '<path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.941 3.198v.001c0 .504-.123.999-.358 1.444A11.95 11.95 0 0112 21.75c-2.17 0-4.205-.576-5.963-1.584A2.993 2.993 0 016 18.719m12 0a3 3 0 00-.941-2.197m0 0A5.971 5.971 0 0012 13.5a5.971 5.971 0 00-5.058 3.022m10.117 0a3 3 0 00-4.059-4.036m-6.058 4.036A3 3 0 006 18.72m.942-2.198a3 3 0 014.058-4.036M15 6.75a3 3 0 11-6 0 3 3 0 016 0z"/>',
    'mod-configuracion': '<path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.592c.55 0 1.02.398 1.11.94l.213 1.279c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a6.759 6.759 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.278c-.09.543-.56.941-1.11.941h-2.592c-.55 0-1.02-.398-1.11-.94l-.213-1.279c-.063-.374-.313-.686-.645-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.075-.124l-1.217.456a1.125 1.125 0 01-1.37-.49l-1.296-2.247a1.125 1.125 0 01.26-1.431l1.003-.827c.293-.241.438-.613.43-.992a6.759 6.759 0 010-.255c.008-.378-.137-.75-.43-.991l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.298-2.247a1.125 1.125 0 011.369-.491l1.217.456c.355.133.75.072 1.076-.124.072-.044.146-.087.22-.128.331-.183.581-.495.644-.869l.213-1.278z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>',
    'mod-auditoria': '<path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>',
    'mod-usuarios': '<path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>',
    default: '<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/>'
};

function rhEtiquetaRol(rol) {
    return RH_ROL_ETIQUETAS[rol] || rol || 'Usuario';
}

function rhGetNavIconSvg(modId) {
    const inner = RH_NAV_ICON_SVG[modId] || RH_NAV_ICON_SVG.default;
    return `<svg class="nav-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">${inner}</svg>`;
}

function rhEsDireccion(user) {
    return user && user.rol === 'Direccion';
}

function rhGetMenusForUser(user) {
    if (!user || user.activo === false) return [];
    const moduleMap = Object.fromEntries(
        RH_ALL_MODULES.map(m => [m.id, { id: m.id, icon: m.icon, name: m.label || m.name }])
    );
    if (rhEsDireccion(user)) {
        return RH_MENU_DIRECCION.map(m => ({ id: m.id, icon: m.icon, name: m.name }));
    }
    const menus = (RH_PERM_MAP[user.rol] || []).map(m => ({ ...m }));
    const planner = moduleMap['mod-planner'];
    if (planner && !menus.some(m => m.id === 'mod-planner')) {
        menus.splice(menus.length > 0 ? 1 : 0, 0, planner);
    }
    return menus;
}

function rhGetSidebarGroupsForUser(user) {
    const menus = rhGetMenusForUser(user);
    if (!rhEsDireccion(user)) return [{ id: 'grupo-modulos', name: 'Módulos', items: menus }];

    const menuMap = Object.fromEntries(menus.map(m => [m.id, m]));
    return RH_MENU_GRUPOS_DIRECCION
        .map(group => ({
            ...group,
            items: group.items.map(id => menuMap[id]).filter(Boolean)
        }))
        .filter(group => group.items.length > 0);
}

function rhUserCanAccessModule(user, modId) {
    return rhGetMenusForUser(user).some(m => m.id === modId);
}

function rhResolveInitialModuleId(menus) {
    return menus[0]?.id || null;
}
