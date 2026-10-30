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
        'form-autorizacion', 'form-pago-referido', 'form-comprador', 'form-operacion',
        'form-nueva-propiedad', 'form-cuenta-bancaria', 'form-movimiento-empresa', 'form-copropietario'
    ]);
    const ALLOWED_TABS = new Set([
        'detalle:resumen', 'detalle:historial', 'detalle:expediente', 'detalle:remodelacion',
        'detalle:recorrido', 'detalle:comunicacion',
        'captura:contacto', 'captura:identidad', 'captura:adeudos',
        'captura:datos', 'captura:ubicacion', 'captura:documentos'
    ]);
    const ALLOWED_EVENTS = new Set(['module_open', 'form_attempt']);
    const CLOUD_EVENTS = new Set(['module_open', 'form_attempt', 'form_open', 'tab_open', 'session_start']);
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
    function destinoPermitido(event, target) {
        if (event === 'module_open') return ALLOWED_MODULES.has(target);
        if (event === 'form_attempt' || event === 'form_open') return ALLOWED_FORMS.has(target);
        if (event === 'tab_open') return ALLOWED_TABS.has(target);
        if (event === 'session_start') return target === 'app';
        return false;
    }

    const colaNube = [];
    let timerNube = null;

    let ultimaFirma = '';
    let ultimaMarca = 0;

    function anotar(event, target) {
        if (!destinoPermitido(event, target)) return false;
        const firma = event + '|' + target;
        const ahora = Date.now();
        if (firma === ultimaFirma && ahora - ultimaMarca < 800) return true;
        ultimaFirma = firma;
        ultimaMarca = ahora;
        const role = window.currentUser?.rol || null;
        if ((event === 'module_open' || event === 'form_attempt') && role) record(event, target, role);
        if (!CLOUD_EVENTS.has(event) || !role || !window.currentUser?.id) return event === 'module_open' || event === 'form_attempt';
        const nombre = String(window.currentUser.displayName || '').trim().slice(0, 80);
        colaNube.push({
            id: 'rh_uso_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            ts: new Date().toISOString(),
            dia: localDay(new Date()),
            rol: role,
            usuarioId: String(window.currentUser.id).slice(0, 40),
            usuario: nombre,
            tipo: event,
            destino: target
        });
        if (typeof setTimeout === 'function') {
            clearTimeout(timerNube);
            timerNube = setTimeout(vaciarNube, 1200);
        }
        return true;
    }

    function vaciarNube() {
        if (!colaNube.length || typeof DB === 'undefined' || typeof DB.get !== 'function' || typeof DB.set !== 'function') return false;
        const actuales = DB.get('actividadUso') || [];
        const conocidos = new Set(actuales.map(x => x?.id).filter(Boolean));
        const nuevos = colaNube.splice(0, 40).filter(x => x.id && !conocidos.has(x.id));
        const limite = Date.now() - 30 * 86400000;
        const siguientes = actuales.filter(x => {
            const momento = Date.parse(x?.ts || '');
            return !Number.isFinite(momento) || momento >= limite;
        }).concat(nuevos);
        siguientes.sort((a, b) => String(a.ts).localeCompare(String(b.ts)));
        try {
            DB.set('actividadUso', siguientes.slice(-4000));
            return true;
        } catch (_) { return false; }
    }

    function reporteNube() {
        if (typeof DB === 'undefined' || typeof DB.get !== 'function') return [];
        return (DB.get('actividadUso') || []).filter(x => x && destinoPermitido(x.tipo, x.destino) && ALLOWED_ROLES.has(x.rol));
    }

    window.RH_USAGE = Object.freeze({
        record, report, anotar, flush: vaciarNube, reporteNube,
        modulos: [...ALLOWED_MODULES],
        pestanas: [...ALLOWED_TABS],
        formularios: [...ALLOWED_FORMS],
        retentionDays: RETENTION_DAYS,
        scope: 'local-only'
    });
    if (typeof document !== 'undefined' && document.addEventListener) {
        document.addEventListener('submit', event => {
            const formId = event.target?.id;
            if (formId) anotar('form_attempt', formId);
        }, true);
    }
    if (typeof MutationObserver === 'function' && document.querySelectorAll) {
        const abiertos = new Set();
        const revisar = () => {
            document.querySelectorAll('.modal.active form[id]').forEach(form => {
                if (abiertos.has(form.id)) return;
                abiertos.add(form.id);
                anotar('form_open', form.id);
            });
            document.querySelectorAll('.modal:not(.active) form[id]').forEach(form => abiertos.delete(form.id));
        };
        const observer = new MutationObserver(revisar);
        document.querySelectorAll('.modal').forEach(modal => observer.observe(modal, { attributes: true, attributeFilter: ['class'] }));
    }
})();
