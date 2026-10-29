/**
 * Crea el bucket rh-archivos y sus políticas en Supabase.
 * Uso:
 *   node scripts/setup-storage.js
 *
 * Requiere en secrets.revive.env:
 *   SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...
 * o:
 *   SUPABASE_DB_PASSWORD=...
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function cargarSecrets() {
    const file = path.join(__dirname, '..', 'secrets.revive.env');
    if (!fs.existsSync(file)) return {};
    const out = {};
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (!m) continue;
        out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
    return out;
}

const STORAGE_SQL = `
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'rh-archivos',
    'rh-archivos',
    false,
    8388608,
    array['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf']
)
on conflict (id) do update set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "rh_archivos_select" on storage.objects;
create policy "rh_archivos_select" on storage.objects
    for select to anon using (bucket_id = 'rh-archivos');

drop policy if exists "rh_archivos_insert" on storage.objects;
create policy "rh_archivos_insert" on storage.objects
    for insert to anon with check (bucket_id = 'rh-archivos');

drop policy if exists "rh_archivos_update" on storage.objects;
create policy "rh_archivos_update" on storage.objects
    for update to anon using (bucket_id = 'rh-archivos') with check (bucket_id = 'rh-archivos');

drop policy if exists "rh_archivos_delete" on storage.objects;
create policy "rh_archivos_delete" on storage.objects
    for delete to anon using (bucket_id = 'rh-archivos');
`;

async function viaServiceRole(secrets) {
    const url = (secrets.SUPABASE_URL || 'https://fqoyvmhanouirqlcgskz.supabase.co').replace(/\/$/, '');
    const key = secrets.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) return false;

    const create = await fetch(`${url}/storage/v1/bucket`, {
        method: 'POST',
        headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            id: 'rh-archivos',
            name: 'rh-archivos',
            public: false,
            file_size_limit: 8388608,
            allowed_mime_types: [
                'image/jpeg', 'image/png', 'image/webp',
                'image/heic', 'image/heif', 'application/pdf'
            ]
        })
    });
    const createText = await create.text();
    if (![200, 201].includes(create.status) && !/already exists|duplicate/i.test(createText)) {
        throw new Error(`No se pudo crear el bucket (${create.status}): ${createText}`);
    }
    console.log('Bucket OK vía service_role');

    // Las policies solo se pueden crear por SQL; si no hay DB password, aviso.
    if (!secrets.SUPABASE_DB_PASSWORD) {
        console.log('AVISO: bucket listo. Falta aplicar políticas SQL (necesita SUPABASE_DB_PASSWORD o SQL Editor).');
        return 'bucket-only';
    }
    return 'need-sql';
}

async function viaPostgres(secrets) {
    const password = secrets.SUPABASE_DB_PASSWORD;
    if (!password) return false;
    const encoded = encodeURIComponent(password);
    const urls = [
        `postgresql://postgres:${encoded}@db.fqoyvmhanouirqlcgskz.supabase.co:5432/postgres`,
        `postgresql://postgres.fqoyvmhanouirqlcgskz:${encoded}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
        `postgresql://postgres.fqoyvmhanouirqlcgskz:${encoded}@aws-0-us-east-2.pooler.supabase.com:6543/postgres`,
        `postgresql://postgres.fqoyvmhanouirqlcgskz:${encoded}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`,
    ];
    for (const connectionString of urls) {
        const client = new Client({
            connectionString,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 10000
        });
        try {
            await client.connect();
            await client.query(STORAGE_SQL);
            const r = await client.query("select id, public from storage.buckets where id = 'rh-archivos'");
            console.log('SQL OK', r.rows);
            await client.end();
            return true;
        } catch (e) {
            console.log('Postgres FAIL', e.message.slice(0, 140));
            try { await client.end(); } catch (_) { /* ignore */ }
        }
    }
    return false;
}

async function main() {
    const secrets = cargarSecrets();
    const sr = await viaServiceRole(secrets);
    if (sr === true || sr === 'need-sql') {
        const ok = await viaPostgres(secrets);
        if (!ok && sr === 'need-sql') {
            console.error('Bucket creado, pero no pude aplicar políticas. Agrega SUPABASE_DB_PASSWORD o corre el SQL del schema.');
            process.exit(1);
        }
        if (ok) {
            console.log('Listo: bucket + políticas.');
            return;
        }
    }
    const ok = await viaPostgres(secrets);
    if (!ok) {
        console.error('Falta SUPABASE_SERVICE_ROLE_KEY o SUPABASE_DB_PASSWORD en secrets.revive.env');
        process.exit(1);
    }
    console.log('Listo: bucket + políticas.');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
