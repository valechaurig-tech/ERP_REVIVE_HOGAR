/**
 * REVIVE HOGAR — Métricas locales mínimas de navegación.
 * No recoge campos, valores, usuarios, IP, teléfonos, textos ni documentos.
 * Retiene siete días; las cifras NO representan a toda la empresa.
 * En ausencia de una política RLS/servidor verificada NO envía datos a la nube.
 */
(function initUsoRevive() {
    'use strict';
    const KEY = 'rh_usage_counts_v1';
    const RETENTION_DAYS = 7;
    const ALLOWED_ROLES = new Set(['Direccion', 'Dirección', 'Marketing', 'Vendedor', 'Administradora']);
    const ALLOWED_MODULES = new Set([
        'mod-planner', 'mod-proyectos', 'mod-dashboard', 'mod-marketing',
        'mod-vendedor', 'mod-compradores', 'mod-operaciones', 'mod-administradora', 'mod-pipeline', 'mod-gastos',
        'mod-gastos-empresa', 'mod-referidos', 'mod-configuracion',
        'mod-auditoria', 'mod-usuarios'
    ]);
    const ALLOWED_FORMS = new Set([
        'form-campana', 'form-prospecto', 'form-gestion-prospecto',
        'form-expediente-admin', 'form-pipeline', 'form-costo-remodelacion',
        'form-montos-casa', 'form-nuevo-vendedor', 'form-usuario',
        'form-mi-perfil', 'form-tarea', 'form-mensaje-caso',
        'form-autorizacion', 'form-pago-referido', 'form-comprador', 'form-operacion'
    ]);
    const ALLOWED_EVENTS = new Set(['module_open', 'form_attempt']);
    const localDay = date => [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0')
    ].join('-');

    function daysAllowed(now) {
        const keys = new Set();
        for (let i = 0; i < RETENTION_DAYS; i++) {
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
            keys.add(localDay(d));
        }
        return keys;
    }
    function clean(raw, now) {
        const result = {};
        const allowedDays = daysAllowed(now);
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return result;
        for (const [day, entries] of Object.entries(raw)) {
            if (!allowedDays.has(day) || !entries || typeof entries !== 'object' || Array.isArray(entries)) continue;
            const safe = {};
            for (const [key, count] of Object.entries(entries)) {
                const parts = key.split('|');
                const [event, role, target] = parts;
                if (parts.length !== 3 || !ALLOWED_EVENTS.has(event)
                    || !ALLOWED_ROLES.has(role) || !(event === 'module_open' ? ALLOWED_MODULES : ALLOWED_FORMS).has(target)) continue;
                if (Number.isSafeInteger(count) && count > 0 && count <= 100000) safe[key] = count;
            }
            if (Object.keys(safe).length) result[day] = safe;
        }
        return result;
    }
    function load(now = new Date()) {
        try {
            return clean(JSON.parse(localStorage.getItem(KEY) || '{}'), now);
        } catch (_) { return {}; }
    }
    function save(counts) {
        try {
            localStorage.setItem(KEY, JSON.stringify(counts));
            return true;
        } catch (_) { return false; }
    }
    function record(event, target, role) {
        if (!ALLOWED_EVENTS.has(event) || !ALLOWED_ROLES.has(role)) return false;
        if (!(event === 'module_open' ? ALLOWED_MODULES : ALLOWED_FORMS).has(target)) return false;
        try {
            const today = new Date();
            const counts = load(today);
            const day = localDay(today);
            const key = [event, role, target].join('|');
            if (!counts[day]) counts[day] = {};
            counts[day][key] = Math.min(100000, (counts[day][key] || 0) + 1);
            return save(counts);
        } catch (_) { return false; }
    }
    function report() {
        const rows = [];
        for (const [day, entries] of Object.entries(load())) {
            for (const [key, count] of Object.entries(entries)) {
                const [event, role, target] = key.split('|');
                rows.push({ day, event, role, target, count });
            }
        }
        return rows.sort((a, b) => b.day.localeCompare(a.day) || a.event.localeCompare(b.event));
    }
    window.RH_USAGE = Object.freeze({ record, report, retentionDays: RETENTION_DAYS, scope: 'local-only' });
    if (typeof document !== 'undefined' && document.addEventListener) {
        document.addEventListener('submit', event => {
            const formId = event.target?.id;
            if (formId && ALLOWED_FORMS.has(formId)) {
                record('form_attempt', formId, window.currentUser?.rol || (typeof currentUser !== 'undefined' ? currentUser?.rol : null));
            }
        }, true);
    }
})();
