/**
 * Revive Hogar — proxy seguro a Supabase Storage (service_role solo en servidor).
 * Acciones: upload | signedUrl | delete
 */

const BUCKET = 'rh-archivos';
const MAX_BYTES = 8 * 1024 * 1024;
const MIME_OK = new Set([
    'image/jpeg', 'image/png', 'image/webp',
    'image/heic', 'image/heif', 'application/pdf'
]);

function cors(res) {
    // Sin CORS público: los documentos solo se entregan al origen del ERP.
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Vary', 'Origin');
}

function json(res, status, body) {
    cors(res);
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(body));
}

function supabaseConfig() {
    const url = (process.env.SUPABASE_URL || process.env.RH_SUPABASE_URL || '').replace(/\/$/, '');
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.RH_SUPABASE_SERVICE_ROLE_KEY || '';
    if (!url || !key) {
        throw new Error('Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en Vercel.');
    }
    return { url, key };
}

function pathSeguro(raw) {
    const path = String(raw || '').replace(/^\/+/, '');
    if (!path || path.includes('..') || path.length > 500) return null;
    if (!/^prospectos\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/[A-Za-z0-9._-]+$/.test(path)) return null;
    return path;
}

function leerBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let size = 0;
        req.on('data', (chunk) => {
            size += chunk.length;
            if (size > MAX_BYTES) {
                reject(new Error('Archivo supera 8 MB'));
                req.destroy();
                return;
            }
            chunks.push(chunk);
        });
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

async function storageFetch(path, options = {}) {
    const { url, key } = supabaseConfig();
    const r = await fetch(`${url}/storage/v1${path}`, {
        ...options,
        headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            ...(options.headers || {})
        }
    });
    const text = await r.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    return { ok: r.ok, status: r.status, data, text };
}

const HOSTS_ARCHIVOS = new Set(['revive-hogar.vercel.app','revive-hogar-echauri-apps.vercel.app']);
const PREVIEW_ARCHIVOS = /^revive-hogar-[a-z0-9]+-echauri-apps\.vercel\.app$/;

class AccesoArchivoError extends Error {
    constructor(status, message) { super(message); this.status = status; }
}
function exigirArchivo(ok, status, msg) {
    if (!ok) throw new AccesoArchivoError(status,msg);
}
async function usuarioAutorizadoArchivos(req) {
    const host = String(req.headers.host || '').toLowerCase();
    exigirArchivo(HOSTS_ARCHIVOS.has(host) || PREVIEW_ARCHIVOS.test(host),
        400, 'Dominio no autorizado.');
    // Los intentos sin sesión nunca reciben acceso al proxy de service_role.
    const cookie = String(req.headers.cookie || '');
    exigirArchivo(cookie.includes('__Host-rh-session='), 401, 'Inicia sesión en Revive.');
    exigirArchivo(req.headers.origin === 'https://' + host &&
        req.headers['x-rh-archivos'] === '1', 403, 'Origen no autorizado.');

    const response = await fetch('https://' + host + '/api/sesion', {
        method: 'GET',redirect:'error',cache:'no-store',
        headers:{cookie,'Cache-Control':'no-store'}
    });
    exigirArchivo(response.ok, 401, 'La sesión venció.');
    const id = String((await response.json()).userId || '');
    exigirArchivo(/^[A-Za-z0-9_-]{1,128}$/.test(id),401,'Sesión inválida.');
    const storagePath = pathSeguro(req.query?.path);
    exigirArchivo(!!storagePath, 400, 'Ruta del expediente no permitida.');
    const prospectoId = storagePath.split('/')[1];
    const {url,key} = supabaseConfig();
    const headers = {apikey:key,Authorization:'Bearer '+key,Accept:'application/json'};
    async function leerColeccion(collection,recordId) {
        const q = new URLSearchParams({collection:'eq.'+collection,record_id:'eq.'+recordId,
            select:'data',limit:'1'});
        const r = await fetch(url+'/rest/v1/rh_records?'+q.toString(),{
            method:'GET',cache:'no-store',redirect:'error',headers
        });
        exigirArchivo(r.ok,503,'No se pudo verificar el expediente.');
        return (await r.json())?.[0]?.data;
    }
    const user = await leerColeccion('usuariosLogin',id);
    exigirArchivo(user && user.id===id && user.activo!==false,403,'Cuenta no activa.');
    exigirArchivo(['Direccion','Administradora','Vendedor'].includes(user.rol),
        403,'El rol no tiene acceso a expedientes.');
    if (user.rol!=='Direccion') {
        const prospecto = await leerColeccion('prospectos',prospectoId);
        exigirArchivo(!!prospecto,404,'Expediente no encontrado.');
        if (user.rol==='Vendedor')
            exigirArchivo(prospecto.vendedorId===id,403,
                'No puedes acceder a documentos de otro vendedor.');
    }
    return true;
}

module.exports = async function handler(req, res) {
    cors(res);
    if(req.method !== 'POST') return json(res, 405, {error:'Método no admitido.'});
    try {
        await usuarioAutorizadoArchivos(req);
    } catch (e) {
        if(e instanceof AccesoArchivoError) return json(res,e.status,{error:e.message});
        console.error('RH-ARCHIVOS: autorización no disponible',e?.message);
        return json(res,503,{error:'No pudimos verificar el acceso al expediente.'});
    }
    try {
        const action = String(req.query?.action || req.query?.a || '').toLowerCase();

        if (req.method === 'POST' && action === 'upload') {
            const storagePath = pathSeguro(req.query?.path);
            const contentType = String(req.headers['content-type'] || '').split(';')[0].trim();
            if (!storagePath) return json(res, 400, { error: 'Ruta de archivo inválida.' });
            if (!MIME_OK.has(contentType)) {
                return json(res, 400, { error: 'Tipo de archivo no permitido.' });
            }
            const body = await leerBody(req);
            if (!body.length) return json(res, 400, { error: 'Archivo vacío.' });

            const up = await storageFetch(`/object/${BUCKET}/${storagePath}`, {
                method: 'POST',
                headers: {
                    'Content-Type': contentType,
                    'x-upsert': 'false',
                    'cache-control': '3600'
                },
                body
            });
            if (!up.ok) {
                return json(res, 502, { error: up.data?.message || up.text || 'Error al subir' });
            }
            return json(res, 200, { almacenamiento: 'supabase', storagePath });
        }

        if ((req.method === 'POST' || req.method === 'GET') && (action === 'signedurl' || action === 'url')) {
            let storagePath = pathSeguro(req.query?.path);
            if (!storagePath && req.method === 'POST') {
                const raw = await leerBody(req);
                const parsed = JSON.parse(raw.toString('utf8') || '{}');
                storagePath = pathSeguro(parsed.path || parsed.storagePath);
            }
            if (!storagePath) return json(res, 400, { error: 'Ruta de archivo inválida.' });

            const signed = await storageFetch(`/object/sign/${BUCKET}/${storagePath}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ expiresIn: 300 })
            });
            if (!signed.ok) {
                return json(res, 502, { error: signed.data?.message || signed.text || 'No se pudo firmar URL' });
            }
            const { url } = supabaseConfig();
            const relative = signed.data?.signedURL || signed.data?.signedUrl || '';
            const signedUrl = relative.startsWith('http') ? relative : `${url}/storage/v1${relative}`;
            return json(res, 200, { signedUrl });
        }

        if ((req.method === 'POST' || req.method === 'DELETE') && action === 'delete') {
            let storagePath = pathSeguro(req.query?.path);
            if (!storagePath && req.method === 'POST') {
                const raw = await leerBody(req);
                const parsed = JSON.parse(raw.toString('utf8') || '{}');
                storagePath = pathSeguro(parsed.path || parsed.storagePath);
            }
            if (!storagePath) return json(res, 400, { error: 'Ruta de archivo inválida.' });

            const del = await storageFetch(`/object/${BUCKET}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prefixes: [storagePath] })
            });
            // API alternativa: remove by array of paths
            if (!del.ok) {
                const del2 = await storageFetch(`/object/${BUCKET}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify([storagePath])
                });
                if (!del2.ok) {
                    return json(res, 502, { error: del2.data?.message || del.text || 'No se pudo eliminar' });
                }
            }
            return json(res, 200, { ok: true });
        }

        return json(res, 400, { error: 'Acción no válida. Usa action=upload|signedUrl|delete.' });
    } catch (error) {
        console.error(error);
        return json(res, 500, { error: error.message || 'Error interno' });
    }
};
