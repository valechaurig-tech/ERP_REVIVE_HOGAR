/**
 * Revive Hogar — persistencia (localStorage / Supabase dedicado)
 * Proyecto Supabase exclusivo — tabla rh_records (sin compartir con otros sistemas).
 */

const DB_KEYS = [
    'campanas', 'prospectos', 'casas', 'usuariosLogin',
    'alertas', 'historial', 'auditoria', 'tareas',
    'presupuestos', 'archivos', 'configuracion', 'gastosEmpresa', 'presupuestoEmpresa',
    'cuentasBancarias'
];

const DB_LIMITS = {
    MAX_IMPORT_BYTES: 5 * 1024 * 1024,
    MAX_ITEMS_PER_COLLECTION: 10000,
    MAX_STRING_LENGTH: 8000,
    MAX_KEY_LENGTH: 80
};

const RH_TABLE = 'rh_records';
const RH_STORAGE_PREFIX = 'revive_hogar_';

const DB_CACHE = {};
let dbMode = 'local';
let supabaseClient = null;
let dbReady = false;
const persistTimers = {};
const deleteTimers = {};
const pendingDeletes = {};
let realtimeChannel = null;

function sanitizarValorImportacion(valor, profundidad = 0) {
    if (profundidad > 6) return null;
    if (valor === null || valor === undefined) return valor;
    if (typeof valor === 'string') {
        return valor.length > DB_LIMITS.MAX_STRING_LENGTH
            ? valor.slice(0, DB_LIMITS.MAX_STRING_LENGTH) : valor;
    }
    if (typeof valor === 'number' || typeof valor === 'boolean') return valor;
    if (Array.isArray(valor)) {
        return valor.slice(0, DB_LIMITS.MAX_ITEMS_PER_COLLECTION)
            .map(v => sanitizarValorImportacion(v, profundidad + 1));
    }
    if (typeof valor === 'object') {
        const out = {};
        Object.keys(valor).slice(0, 60).forEach(k => {
            if (typeof k !== 'string' || k.length > DB_LIMITS.MAX_KEY_LENGTH) return;
            out[k] = sanitizarValorImportacion(valor[k], profundidad + 1);
        });
        return out;
    }
    return null;
}

function sanitizarColeccionImportada(items) {
    if (!Array.isArray(items)) return [];
    return items.slice(0, DB_LIMITS.MAX_ITEMS_PER_COLLECTION)
        .map(item => sanitizarValorImportacion(item))
        .filter(item => item && typeof item === 'object');
}

function leerLocalStorage(key) {
    try {
        const raw = localStorage.getItem(RH_STORAGE_PREFIX + key);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.warn(`No se pudo leer ${key}:`, e);
        return [];
    }
}

function escribirLocalStorage(key, data) {
    localStorage.setItem(RH_STORAGE_PREFIX + key, JSON.stringify(data));
}

function cargarCacheLocal() {
    DB_KEYS.forEach(key => { DB_CACHE[key] = leerLocalStorage(key); });
}

async function verificarTablaNube() {
    const { error } = await supabaseClient.from(RH_TABLE).select('collection').limit(1);
    if (error) {
        throw new Error(
            'No existe la tabla rh_records. Ejecuta supabase/schema.sql en el SQL Editor del proyecto Revive Hogar.'
        );
    }
}

async function cargarColeccionNube(key) {
    const { data, error } = await supabaseClient.from(RH_TABLE).select('data').eq('collection', key);
    if (error) throw new Error(`Error al cargar ${key}: ${error.message}`);
    DB_CACHE[key] = (data || []).map(row => row.data).filter(Boolean);
}

async function cargarTodoDesdeNube() {
    for (const key of DB_KEYS) await cargarColeccionNube(key);
}

async function migrarLocalANubeSiVacio() {
    const { count, error } = await supabaseClient.from(RH_TABLE).select('*', { count: 'exact', head: true });
    if (error) throw error;
    if (count > 0) return false;
    cargarCacheLocal();
    for (const key of DB_KEYS) {
        if ((DB_CACHE[key] || []).length > 0) await persistirColeccionNube(key, true);
    }
    return true;
}

async function eliminarIdsNube(key, ids) {
    if (!supabaseClient || dbMode !== 'cloud' || !ids?.length) return;
    for (let i = 0; i < ids.length; i += 200) {
        const lote = ids.slice(i, i + 200);
        const { error } = await supabaseClient.from(RH_TABLE)
            .delete().eq('collection', key).in('record_id', lote);
        if (error) console.error(`Error eliminando ${key}:`, error);
    }
}

async function flushPendientesEliminacion(key) {
    const ids = [...(pendingDeletes[key] || [])];
    pendingDeletes[key] = new Set();
    await eliminarIdsNube(key, ids);
}

async function persistirColeccionNube(key, inmediato = false) {
    if (!supabaseClient || dbMode !== 'cloud') return;
    await flushPendientesEliminacion(key);
    const items = DB_CACHE[key] || [];
    if (items.length === 0) {
        if (inmediato) actualizarIndicadorNube('ok');
        return;
    }
    const filas = items.filter(i => i.id).map(item => ({
        collection: key,
        record_id: item.id,
        data: item,
        updated_at: new Date().toISOString()
    }));
    for (let i = 0; i < filas.length; i += 200) {
        const lote = filas.slice(i, i + 200);
        const { error } = await supabaseClient.from(RH_TABLE).upsert(lote, { onConflict: 'collection,record_id' });
        if (error) console.error(`Error sincronizando ${key}:`, error);
    }
    if (inmediato) actualizarIndicadorNube('ok');
}

function programarPersistencia(key) {
    if (dbMode !== 'cloud') return;
    clearTimeout(persistTimers[key]);
    persistTimers[key] = setTimeout(() => persistirColeccionNube(key), 600);
}

function programarEliminaciones(key, ids) {
    if (dbMode !== 'cloud' || !ids?.length) return;
    if (!pendingDeletes[key]) pendingDeletes[key] = new Set();
    ids.forEach(id => pendingDeletes[key].add(id));
    clearTimeout(deleteTimers[key]);
    deleteTimers[key] = setTimeout(() => flushPendientesEliminacion(key), 600);
}

function actualizarIndicadorNube(estado) {
    const el = document.getElementById('db-status-badge');
    if (!el) return;
    const map = {
        ok: ['Nube conectada', 'db-status-pill db-status-ok'],
        sync: ['Sincronizando…', 'db-status-pill db-status-sync'],
        local: ['Solo este navegador', 'db-status-pill db-status-local'],
        error: ['Error de nube', 'db-status-pill db-status-error']
    };
    const [text, cls] = map[estado] || map.error;
    el.textContent = text;
    el.className = cls;
}

async function recargarColeccionDesdeNube(key) {
    if (dbMode !== 'cloud' || !supabaseClient) return;
    clearTimeout(recargarColeccionDesdeNube._t?.[key]);
    if (!recargarColeccionDesdeNube._t) recargarColeccionDesdeNube._t = {};
    recargarColeccionDesdeNube._t[key] = setTimeout(async () => {
        try {
            await cargarColeccionNube(key);
            if (activeModuleId) refreshActiveModule(false);
        } catch (e) { console.warn(e); }
    }, 900);
}

function iniciarRealtime() {
    if (!supabaseClient || realtimeChannel) return;
    realtimeChannel = supabaseClient
        .channel('revive-hogar-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: RH_TABLE }, payload => {
            const col = payload.new?.collection || payload.old?.collection;
            if (col && DB_KEYS.includes(col)) recargarColeccionDesdeNube(col);
        })
        .subscribe();
}

const DB = {
    mode: () => dbMode,
    isReady: () => dbReady,

    async init() {
        const cfg = window.RH_CONFIG || {};
        const url = (cfg.SUPABASE_URL || '').trim();
        const key = (cfg.SUPABASE_ANON_KEY || '').trim();
        if (url && key && typeof window.supabase !== 'undefined') {
            try {
                supabaseClient = window.supabase.createClient(url, key);
                dbMode = 'cloud';
                actualizarIndicadorNube('sync');
                await verificarTablaNube();
                await cargarTodoDesdeNube();
                await migrarLocalANubeSiVacio();
                iniciarRealtime();
                actualizarIndicadorNube('ok');
            } catch (error) {
                console.error('Supabase Revive Hogar no disponible:', error);
                dbMode = 'local';
                cargarCacheLocal();
                actualizarIndicadorNube('error');
            }
        } else {
            dbMode = 'local';
            cargarCacheLocal();
            actualizarIndicadorNube('local');
        }
        dbReady = true;
    },

    async flush() {
        if (dbMode !== 'cloud') return;
        await Promise.all(DB_KEYS.map(k => persistirColeccionNube(k, true)));
    },

    get(key) {
        if (!DB_KEYS.includes(key)) return [];
        return DB_CACHE[key] || [];
    },

    set(key, data) {
        if (!DB_KEYS.includes(key)) throw new Error(`Colección no permitida: ${key}`);
        if (!Array.isArray(data)) throw new Error(`${key} debe ser un arreglo`);
        const prevIds = new Set((DB_CACHE[key] || []).map(item => item?.id).filter(Boolean));
        const nextIds = new Set((data || []).map(item => item?.id).filter(Boolean));
        const eliminados = [...prevIds].filter(id => !nextIds.has(id));
        DB_CACHE[key] = data;
        if (dbMode === 'local') escribirLocalStorage(key, data);
        else {
            if (eliminados.length) programarEliminaciones(key, eliminados);
            programarPersistencia(key);
        }
    },

    async remove(key, id) {
        if (!DB_KEYS.includes(key) || !id) return false;
        DB_CACHE[key] = (DB_CACHE[key] || []).filter(item => item.id !== id);
        if (dbMode === 'local') {
            escribirLocalStorage(key, DB_CACHE[key]);
            return true;
        }
        if (pendingDeletes[key]) pendingDeletes[key].delete(id);
        const { error } = await supabaseClient.from(RH_TABLE)
            .delete().eq('collection', key).eq('record_id', id);
        if (error) {
            console.error(`Error eliminando ${key}/${id}:`, error);
            return false;
        }
        return true;
    },

    getId() {
        return 'rh_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }
};
