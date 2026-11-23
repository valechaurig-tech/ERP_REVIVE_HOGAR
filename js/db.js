/**
 * Revive Hogar — persistencia (localStorage / Supabase dedicado)
 * Proyecto Supabase exclusivo — tabla rh_records (sin compartir con otros sistemas).
 */

const DB_KEYS = [
    'campanas', 'prospectos', 'casas', 'usuariosLogin',
    'alertas', 'historial', 'auditoria', 'tareas',
    'presupuestos', 'archivos', 'configuracion', 'gastosEmpresa', 'presupuestoEmpresa',
    'cuentasBancarias', 'compradores', 'copropietarios', 'operacionesVenta',
    'actividadUso'
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
// Huellas de la última lectura/escritura remota, nunca objetos mutables de DB.get.
const DB_SYNCED_ROWS = {};
const DB_REMOTE_STAMPS = {};
function registrarFilasSincronizadas(key, items, stamps) {
    DB_SYNCED_ROWS[key] = new Map((items || [])
        .filter(item => item && item.id)
        .map(item => [item.id, JSON.stringify(item)]));
    DB_REMOTE_STAMPS[key] = new Map(stamps || []);
}
// Registro independiente para detectar bajas aunque DB.get() se modifique in-place.
const DB_IDS_SNAPSHOT = {};
function registrarIdsCache(key) {
    DB_IDS_SNAPSHOT[key] = new Set((DB_CACHE[key] || []).map(item => item?.id).filter(Boolean));
}
let dbMode = 'local';
let supabaseClient = null;

/** Adaptador compatible con la interfaz de sincronización que ya utiliza Revive. */
function crearClienteERPServidorSeguro() {
    const API = '/api/datos';
    async function enviar(params) {
        const url = API + '?collection=' + encodeURIComponent(params.collection) +
            (params.login ? '&login=1' : '') +
            '&offset=' + (params.offset || 0) + '&limit=' + (params.limit || 1000);
        const write = params.action !== 'read';
        try {
            const response = await fetch(write ? API : url,{
                method: write ? 'POST' : 'GET',credentials:'same-origin',
                cache:'no-store',redirect:'error',
                headers:write ? {'Content-Type':'application/json','X-RH-Datos':'1'} : {},
                ...(write ? {body:JSON.stringify(params)} : {})
            });
            const body = await response.json();
            if(!response.ok) return {data:null,error:{code:response.status===409?'23505':String(response.status),
                message:body.message || 'No se pudo completar la operación.'}};
            return {data:body.rows || [],error:null,count:body.rows?.length||0};
        } catch (err) { return {data:null,error:{code:'NETWORK',message:err.message||'Sin conexión'}}; }
    }
    function from(name) {
        if(name !== RH_TABLE) throw new Error('Tabla no permitida.');
        const query={action:'read',collection:null,filters:[],limit:1000,offset:0};
        const chain={
            select(_fields,opts) { if(opts?.count)query.count=true; if(opts?.head)query.head=true; return chain; },
            eq(field,value) { query.filters.push([field,value]);if(field==='collection')query.collection=value;
                if(field==='record_id')query.record_id=value;
                if(field==='updated_at')query.sello=value; return chain; },
            in(field,values){if(field==='record_id')query.ids=values;return chain;},
            order(){return chain;},
            range(a,b){query.offset=a;query.limit=b-a+1;return chain;},
            limit(n){query.limit=n;return chain;},
            delete(){query.action='delete';return chain;},
            update(data){query.action='update';query.data=data?.data;return chain;},
            insert(data){query.action='insert';query.collection=data?.collection;query.record_id=data?.record_id;
                query.data=data?.data;return chain;},
            then(resolve,reject){
                const go=async()=>{
                    if(!query.collection && query.action==='read')return {data:[],error:null,count:1};
                    if(query.action==='read'){
                        const login=query.collection==='usuariosLogin' && !rhDatosSesionCargados;
                        const result=await enviar({...query,login});
                        return query.head ? {...result,data:null,count:result.count} : result;
                    }
                    if(query.action==='delete'&&query.ids){
                        for(const id of query.ids){
                            const result=await enviar({...query,record_id:id});
                            if(result.error)return result;
                        }
                        return {data:[],error:null};
                    }
                    return enviar(query);
                };
                return go().then(resolve,reject);
            }
        };
        return chain;
    }
    return {from,
        channel(){return {on(){return this;},subscribe(){return {unsubscribe(){}};}};}
    };
}
let rhDatosSesionCargados=false;

let dbReady = false;
const persistTimers = {};
const deleteTimers = {};
const retryCounts = {};
const pendingDeletes = {};
// No descargar datos ajenos encima de cambios locales pendientes de confirmación.
const DB_PENDING_WRITES = new Set();
const DB_REVISIONS = {};
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
    DB_KEYS.forEach(key => { DB_CACHE[key] = leerLocalStorage(key); registrarIdsCache(key); });
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
    // PostgREST/Supabase entrega por defecto como máximo 1.000 filas;
    // paginar y ordenar por clave estable impide ocultar expedientes posteriores.
    const tamano = 1000;
    const rows = [];
    for (let desde = 0; desde <= DB_LIMITS.MAX_ITEMS_PER_COLLECTION; desde += tamano) {
        const { data, error } = await supabaseClient.from(RH_TABLE)
            .select('data, record_id, updated_at').eq('collection', key)
            .order('record_id', { ascending: true }).range(desde, desde + tamano - 1);
        if (error) throw new Error(`RH-DB-004: No se pudo leer ${key}: ${error.message || error}`);
        rows.push(...(data || []));
        if (rows.length > DB_LIMITS.MAX_ITEMS_PER_COLLECTION) {
            throw new Error(`RH-DB-005: ${key} supera el máximo de ${DB_LIMITS.MAX_ITEMS_PER_COLLECTION} registros`);
        }
        if (!data || data.length < tamano) break;
    }
    // Nunca reemplazar un borrador editado mientras se consultaba la red.
    if (DB_PENDING_WRITES.has(key) || pendingDeletes[key]?.size) return false;
    DB_CACHE[key] = rows.map(row => row.data).filter(Boolean);
    registrarIdsCache(key);
    registrarFilasSincronizadas(key, DB_CACHE[key], rows
        .filter(row => row?.data?.id)
        .map(row => [row.data.id, row.updated_at || '']));
    return true;
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
        if ((DB_CACHE[key] || []).length > 0) {
            // La migración inicial deliberada no tiene huellas previas en la nube.
            DB_SYNCED_ROWS[key] = new Map();
            DB_PENDING_WRITES.add(key);
            DB_REVISIONS[key] = (DB_REVISIONS[key] || 0) + 1;
            await persistirColeccionNube(key, true);
        }
    }
    return true;
}

async function eliminarIdsNube(key, ids) {
    if (!supabaseClient || dbMode !== 'cloud' || !ids?.length) return;
    for (let i = 0; i < ids.length; i += 200) {
        const lote = ids.slice(i, i + 200);
        const { error } = await supabaseClient.from(RH_TABLE)
            .delete().eq('collection', key).in('record_id', lote);
        if (error) {
            actualizarIndicadorNube('error');
            throw new Error(`RH-DB-002: Falló la eliminación en ${key}: ${error.message || error}`);
        }
    }
}

async function flushPendientesEliminacion(key) {
    const ids = [...(pendingDeletes[key] || [])];
    if (!ids.length) return;
    // Los IDs no salen de la cola hasta recibir confirmación remota.
    await eliminarIdsNube(key, ids);
    ids.forEach(id => {
        pendingDeletes[key]?.delete(id);
        DB_SYNCED_ROWS[key]?.delete(id);
    });
}

async function persistirColeccionNube(key, inmediato = false) {
    if (!supabaseClient || dbMode !== 'cloud') return;
    if (!DB_PENDING_WRITES.has(key) && !pendingDeletes[key]?.size) return;
    const revision = DB_REVISIONS[key] || 0;
    await flushPendientesEliminacion(key);
    const items = DB_CACHE[key] || [];
    if (items.length === 0) {
        if ((DB_REVISIONS[key] || 0) === revision) DB_PENDING_WRITES.delete(key);
        if (inmediato) actualizarIndicadorNube(DB_PENDING_WRITES.size ? 'sync' : 'ok');
        return;
    }
    const previas = DB_SYNCED_ROWS[key] || new Map();
    const sellos = DB_REMOTE_STAMPS[key] || new Map();
    // Escribir solo nuevos/editados. Una fila ya vista solo se actualiza si su sello no cambió.
    const filas = items.filter(i => i.id)
        .filter(item => JSON.stringify(item) !== previas.get(item.id))
        .map(item => ({
            collection: key,
            record_id: item.id,
            data: JSON.parse(JSON.stringify(item)),
            updated_at: new Date().toISOString(),
            sello: sellos.has(item.id) ? sellos.get(item.id) : null
        }));
    for (const fila of filas) {
        if (fila.sello) {
            const { data, error } = await supabaseClient.from(RH_TABLE)
                .update({ data: fila.data, updated_at: fila.updated_at })
                .eq('collection', key)
                .eq('record_id', fila.record_id)
                .eq('updated_at', fila.sello)
                .select('record_id, updated_at');
            if (error) {
                actualizarIndicadorNube('error');
                throw new Error(`RH-DB-001: Falló la escritura en ${key}: ${error.message || error}`);
            }
            if (!data?.length) {
                actualizarIndicadorNube('error');
                throw new Error(`RH-DB-008: Otro usuario modificó ${key}/${fila.record_id}. Recarga antes de volver a guardar; no se sobrescribió su cambio.`);
            }
            sellos.set(fila.record_id, data[0].updated_at || fila.updated_at);
        } else {
            const { data, error } = await supabaseClient.from(RH_TABLE).insert({
                collection: fila.collection,
                record_id: fila.record_id,
                data: fila.data,
                updated_at: fila.updated_at
            }).select('record_id, updated_at');
            if (error) {
                actualizarIndicadorNube('error');
                const duplicado = error.code === '23505' || /duplicate|already exists/i.test(error.message || '');
                throw new Error(duplicado
                    ? `RH-DB-008: ${key}/${fila.record_id} ya fue creado por otro usuario. Recarga antes de guardar.`
                    : `RH-DB-001: Falló la escritura en ${key}: ${error.message || error}`);
            }
            if (!data?.length || !data[0]?.updated_at) {
                actualizarIndicadorNube('error');
                throw new Error(`RH-DB-009: El servidor no confirmó la fecha de guardado en ${key}/${fila.record_id}.`);
            }
            // La API genera su propio timestamp: la siguiente edición debe usar
            // ese sello real, no el reloj del navegador que creó el registro.
            sellos.set(fila.record_id, data[0].updated_at);
        }
        if (!DB_SYNCED_ROWS[key]) DB_SYNCED_ROWS[key] = new Map();
        DB_SYNCED_ROWS[key].set(fila.record_id, JSON.stringify(fila.data));
    }
    DB_REMOTE_STAMPS[key] = sellos;
    if ((DB_REVISIONS[key] || 0) === revision) DB_PENDING_WRITES.delete(key);
    else programarPersistencia(key);
    if (inmediato || !DB_PENDING_WRITES.size) actualizarIndicadorNube(DB_PENDING_WRITES.size ? 'sync' : 'ok');
}

function programarPersistencia(key, demora = 600) {
    if (dbMode !== 'cloud') return;
    clearTimeout(persistTimers[key]);
    persistTimers[key] = setTimeout(() => {
        persistirColeccionNube(key).then(() => {
            retryCounts[key] = 0;
        }).catch(error => {
            console.error('RH-DB-001:', error);
            // Máximo tres reintentos; no insistir indefinidamente contra permisos rechazados.
            if (DB_PENDING_WRITES.has(key) && (retryCounts[key] || 0) < 3) {
                retryCounts[key] = (retryCounts[key] || 0) + 1;
                programarPersistencia(key, 1000 * 2 ** retryCounts[key]);
            }
        });
    }, demora);
}

function programarEliminaciones(key, ids) {
    if (dbMode !== 'cloud' || !ids?.length) return;
    if (!pendingDeletes[key]) pendingDeletes[key] = new Set();
    ids.forEach(id => pendingDeletes[key].add(id));
    clearTimeout(deleteTimers[key]);
    deleteTimers[key] = setTimeout(() => {
        flushPendientesEliminacion(key).catch(error => console.error('RH-DB-002:', error));
    }, 600);
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
            if (DB_PENDING_WRITES.has(key) || pendingDeletes[key]?.size) return;
            const actualizado = await cargarColeccionNube(key);
            if (actualizado && activeModuleId) refreshActiveModule(false);
        } catch (e) { console.warn(e); }
    }, 900);
}

function iniciarPollingSeguro() {
    if(realtimeChannel)return;
    const timer=setInterval(()=>{
        if(!rhDatosSesionCargados || typeof currentUser==='undefined'||!currentUser)return;
        for(const key of DB_KEYS){
            if(!DB_PENDING_WRITES.has(key) && !pendingDeletes[key]?.size)
                recargarColeccionDesdeNube(key);
        }
    },45000);
    realtimeChannel={unsubscribe:()=>clearInterval(timer)};
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
        if (url || key) {
            // Si hay intención de nube, una configuración incompleta o la CDN caída
            // JAMÁS deben permitir pasar a almacenamiento local.
            if (!url || !key) {
                dbMode = 'unavailable';
                dbReady = false;
                actualizarIndicadorNube('error');
                throw new Error('RH-DB-007: La configuración empresarial de Supabase está incompleta o su librería no cargó. Se bloqueó el acceso.');
            }
            try {
                supabaseClient = crearClienteERPServidorSeguro();
                dbMode = 'cloud';
                rhDatosSesionCargados = false;
                DB_KEYS.forEach(k=>{ DB_CACHE[k]=[];registrarIdsCache(k);});
                actualizarIndicadorNube('sync');
                // Solo lista pública de acceso, nunca contraseñas ni documentos antes de login.
                await cargarColeccionNube('usuariosLogin');
                actualizarIndicadorNube('ok');
            } catch (error) {
                console.error('Supabase Revive Hogar no disponible:', error);
                // Seguridad: no hacer fallback silencioso a una base local incompatible.
                dbMode = 'unavailable';
                dbReady = false;
                actualizarIndicadorNube('error');
                throw new Error('RH-DB-007: No se pudo confirmar la conexión con la base empresarial. Se bloqueó el acceso para evitar mezclas o pérdidas de información.');
            }
        } else {
            dbMode = 'local';
            cargarCacheLocal();
            actualizarIndicadorNube('local');
        }
        dbReady = true;
    },

    async cargarDatosProtegidos() {
        if(dbMode!=='cloud'||!supabaseClient) return false;
        await cargarTodoDesdeNube();
        rhDatosSesionCargados=true;
        // Evitar descargar datos desactualizados encima de ediciones locales.
        if(!realtimeChannel)iniciarPollingSeguro();
        return true;
    },
    limpiarDatosSesion() {
        if(dbMode!=='cloud')return;
        rhDatosSesionCargados=false;
        DB_KEYS.forEach(k=>{
            DB_CACHE[k]=[];
            registrarIdsCache(k);
            registrarFilasSincronizadas(k,[],[]);
            DB_PENDING_WRITES.delete(k);
            delete pendingDeletes[k];
            try { localStorage.removeItem(RH_STORAGE_PREFIX+k); }catch{}
        });
        cargarColeccionNube('usuariosLogin').then(()=>{if(typeof cargarUsuariosLogin==='function')cargarUsuariosLogin();}).catch(console.warn);
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
        const prevIds = DB_IDS_SNAPSHOT[key] || new Set((DB_CACHE[key] || []).map(item => item?.id).filter(Boolean));
        const nextIds = new Set((data || []).map(item => item?.id).filter(Boolean));
        const eliminados = [...prevIds].filter(id => !nextIds.has(id));
        DB_CACHE[key] = data;
        registrarIdsCache(key);
        if (dbMode === 'local') escribirLocalStorage(key, data);
        else {
            DB_REVISIONS[key] = (DB_REVISIONS[key] || 0) + 1;
            DB_PENDING_WRITES.add(key);
            retryCounts[key] = 0;
            // Si el registro reapareció antes de despachar el borrado, no eliminarlo.
            nextIds.forEach(id => pendingDeletes[key]?.delete(id));
            if (eliminados.length) programarEliminaciones(key, eliminados);
            actualizarIndicadorNube('sync');
            programarPersistencia(key);
        }
    },

    async remove(key, id) {
        if (!DB_KEYS.includes(key) || !id) return false;
        const anteriores = DB_CACHE[key] || [];
        DB_CACHE[key] = anteriores.filter(item => item.id !== id);
        if (dbMode === 'local') {
            escribirLocalStorage(key, DB_CACHE[key]);
            registrarIdsCache(key);
            return true;
        }
        if (pendingDeletes[key]) pendingDeletes[key].delete(id);
        const { error } = await supabaseClient.from(RH_TABLE)
            .delete().eq('collection', key).eq('record_id', id);
        if (error) {
            DB_CACHE[key] = anteriores;
            registrarIdsCache(key);
            actualizarIndicadorNube('error');
            console.error(`RH-DB-003: Error eliminando ${key}/${id}:`, error);
            return false;
        }
        registrarIdsCache(key);
        DB_SYNCED_ROWS[key]?.delete(id);
        return true;
    },

    getId() {
        return 'rh_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }
};

// Una conexión recuperada permite reintentar borradores aún no confirmados.
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('online', () => {
        if (dbMode !== 'cloud') return;
        DB_KEYS.forEach(key => {
            if (DB_PENDING_WRITES.has(key) || pendingDeletes[key]?.size) {
                retryCounts[key] = 0;
                programarPersistencia(key);
            }
        });
    });
    window.addEventListener('beforeunload', event => {
        if (dbMode !== 'cloud') return;
        const pendientes = DB_PENDING_WRITES.size > 0
            || Object.values(pendingDeletes).some(set => set?.size > 0);
        if (pendientes) {
            event.preventDefault();
            event.returnValue = '';
        }
    });
}

