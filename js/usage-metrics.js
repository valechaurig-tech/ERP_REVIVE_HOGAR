/**
 * REVIVE HOGAR — contadores locales de navegación, privacidad por diseño.
 * NO recoge nombres, identificadores personales, IP, valores ni documentos.
 * Retiene siete días por dispositivo, NO representan a toda la empresa.
 * Se prohíbe sincronizar por rh_records hasta tener API autenticada y protegida.
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
        'form-nueva-propiedad', 'form-cuenta-bancaria', 'form-movimiento-empresa', 'form-copropietario', 'form-traspaso-empresa', 'form-apertura-empresa'
    ]);
    const ALLOWED_TABS = new Set([
        'detalle:resumen', 'detalle:historial', 'detalle:expediente', 'detalle:remodelacion',
        'detalle:recorrido', 'detalle:comunicacion',
        'captura:contacto', 'captura:identidad', 'captura:adeudos',
        'captura:datos', 'captura:ubicacion', 'captura:documentos'
    ]);
    const ALLOWED_EVENTS = new Set(['module_open', 'form_attempt', 'form_open', 'tab_open', 'session_start', 'transition']);
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
                    || !ALLOWED_ROLES.has(role) || !destinoPermitido(event, target)) continue;
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
        if (!destinoPermitido(event, target)) return false;
        try {
            const today = new Date();
            const counts = load(today);
            const day = localDay(today);
            const key = [event, role, target].join('|');
            if (!counts[day]) counts[day] = {};
            counts[day][key] = Math.min(100000, (counts[day][key] || 0) + 1);
            const saved = save(counts);
            if (saved) programarEnvio();
            return saved;
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
        if (event === 'transition') {
            const pasos = target.split('>');
            return pasos.length === 2 && ALLOWED_MODULES.has(pasos[0]) && ALLOWED_MODULES.has(pasos[1]) && pasos[0] !== pasos[1];
        }
        return false;
    }

    // No se envían nombres, IDs, formularios ni datos del expediente.
    // Sincronización incremental: cada lote UUID solo puede contarse una vez en Supabase.
    const CURSOR_KEY = 'rh_usage_cursor_v1';
    const PENDING_PREFIX = 'rh_usage_pending_v1_';
    let envioProgramado = null;
    let enviando = false;
    let ultimaFirma = '';
    let ultimaMarca = 0;
    let ultimoModulo = '';

    function rolActual() {
        const user = typeof currentUser !== 'undefined' ? currentUser : null;
        return user?.rol || '';
    }
    function lecturaLocal(key, fallback = {}) {
        try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; }
        catch (_) { return fallback; }
    }
    function escribirLocal(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); return true; }
        catch (_) { return false; }
    }
    function programarEnvio() {
        if (typeof setTimeout !== 'function' || typeof fetch !== 'function') return;
        if (envioProgramado) clearTimeout(envioProgramado);
        envioProgramado = setTimeout(() => { envioProgramado = null; enviarPendientesUso(); }, 8000);
    }
    async function enviarPendientesUso() {
        if(enviando || typeof fetch !== 'function')return false;
        const rol=rolActual();
        if(!ALLOWED_ROLES.has(rol))return false;
        const pendingKey=PENDING_PREFIX+rol;
        let pending=lecturaLocal(pendingKey,null);
        if(!pending){
            const cur=lecturaLocal(CURSOR_KEY);
            const rows=report().filter(e=>e.role===rol);
            const dif=[],snapshot={};
            for(const e of rows){
                const key=[e.day,e.event,e.role,e.target].join('|');
                const last=Math.min(e.count,Number(cur[key]||0));
                const delta=e.count-last;
                if(delta<=0)continue;
                const n=Math.min(delta,1000);
                dif.push({day:e.day,event:e.event,target:e.target,count:n});
                snapshot[key]=last+n;
                if(dif.length>=100)break;
            }
            if(!dif.length)return true;
            if(!window.crypto?.randomUUID)return false;
            pending={id:window.crypto.randomUUID(),rows:dif,snapshot};
            if(!escribirLocal(pendingKey,pending))return false;
        }
        enviando=true;
        try{
            const response=await fetch('/api/uso',{
                method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',
                headers:{'Content-Type':'application/json','X-RH-Uso':'1'},
                body:JSON.stringify({batchId:pending.id,events:pending.rows})
            });
            if(!response.ok)return false;
            const result=await response.json();
            if(!result.ok)return false;
            const cur=lecturaLocal(CURSOR_KEY);
            for(const [key,value] of Object.entries(pending.snapshot)){
                cur[key]=Math.max(Number(cur[key]||0),Number(value));
            }
            escribirLocal(CURSOR_KEY,cur);
            localStorage.removeItem(pendingKey);
            return true;
        }catch(_){return false;}
        finally{enviando=false;}
    }
    function anotar(event, target) {
        if(!destinoPermitido(event,target))return false;
        const ahora=Date.now();
        const firma=event+'|'+target;
        if(firma===ultimaFirma&&ahora-ultimaMarca<800)return true;
        ultimaFirma=firma;ultimaMarca=ahora;
        const rol=rolActual();
        if(!ALLOWED_ROLES.has(rol))return false;
        if(event==='module_open'){
            if(ultimoModulo&&ultimoModulo!==target) record('transition',ultimoModulo+'>'+target,rol);
            ultimoModulo=target;
        }
        return record(event,target,rol);
    }
    function reporteNube(){return [];}
    window.RH_USAGE = Object.freeze({
        record,report,anotar,flush:enviarPendientesUso,reporteNube,
        modulos:[...ALLOWED_MODULES],
        pestanas:[...ALLOWED_TABS],
        formularios:[...ALLOWED_FORMS],
        retentionDays:RETENTION_DAYS,
        scope:'private-aggregates'
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
