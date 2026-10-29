#!/usr/bin/env node
/**
 * QA de sincronización SIN datos reales. Simula Supabase, navegador y fallos de red.
 * node scripts/test-db-sync.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const source = readFileSync(fileURLToPath(new URL('../js/db.js', import.meta.url)), 'utf8');

async function createHarness(initialRecords = null) {
    const badge = { textContent: '', className: '' };
    const events = {};
    let failDeletes = false;
    let failUpserts = false;
    const remote = new Map();
    const timers = [];
    const calls = { delete: 0, upsert: 0, upsertRows: 0, update: 0, insert: 0, pages: 0 };
    const stamps = new Map();
    remote.set('prospectos', new Map(initialRecords
        ? initialRecords.map(item => [item.id, item])
        : [
            ['rh_a', { id: 'rh_a', nombreCompleto: 'Ejemplo uno' }],
            ['rh_b', { id: 'rh_b', nombreCompleto: 'Ejemplo dos' }]
        ]));
    function coll(key) {
        if (!remote.has(key)) remote.set(key, new Map());
        return remote.get(key);
    }
    const client = {
        channel() { return { on() { return this; }, subscribe() { return this; } }; },
        from(name) {
            assert.equal(name, 'rh_records');
            return {
                select(column, options) {
                    if (options?.count === 'exact') return Promise.resolve({ count: 2, error: null });
                    let selectedKey;
                    return {
                        limit() { return Promise.resolve({ data: [], error: null }); },
                        eq(field, key) {
                            assert.equal(field, 'collection');
                            selectedKey = key;
                            return this;
                        },
                        order(field) {
                            assert.equal(field, 'record_id');
                            return this;
                        },
                        range(first, last) {
                            calls.pages++;
                            const values = [...coll(selectedKey).values()]
                                .sort((a, b) => a.id.localeCompare(b.id))
                                .slice(first, last + 1);
                            return Promise.resolve({ data: values.map(data => ({
                                data: structuredClone(data),
                                record_id: data.id,
                                updated_at: stamps.get(selectedKey + ':' + data.id) || 'v1'
                            })), error: null });
                        }
                    };
                },
                delete() {
                    let key;
                    return {
                        eq(column, value) {
                            if (column === 'collection') {
                                key = value;
                                return this;
                            }
                            if (column === 'record_id') {
                                calls.delete++;
                                if (failDeletes) return Promise.resolve({ error: { message: 'Simulación de corte' } });
                                coll(key).delete(value);
                                return Promise.resolve({ error: null });
                            }
                            throw Error('Inesperado ' + column);
                        },
                        in(_column, ids) {
                            calls.delete++;
                            if (failDeletes) return Promise.resolve({ error: { message: 'Simulación de corte' } });
                            ids.forEach(id => coll(key).delete(id));
                            return Promise.resolve({ error: null });
                        }
                    };
                },
                upsert(rows) {
                    calls.upsert++;
                    calls.upsertRows += rows.length;
                    if (failUpserts) return Promise.resolve({ error: { message: 'Escritura rechazada' } });
                    for (const r of rows) coll(r.collection).set(r.record_id, structuredClone(r.data));
                    return Promise.resolve({ error: null });
                },
                update(row) {
                    const filters = {};
                    return {
                        eq(column, value) { filters[column] = value; return this; },
                        select() {
                            calls.update++;
                            calls.upsertRows++;
                            if (failUpserts) return Promise.resolve({ data: null, error: { message: 'Escritura rechazada' } });
                            const map = coll(filters.collection);
                            const stampKey = filters.collection + ':' + filters.record_id;
                            if (!map.has(filters.record_id) || (stamps.get(stampKey) || 'v1') !== filters.updated_at) {
                                return Promise.resolve({ data: [], error: null });
                            }
                            map.set(filters.record_id, structuredClone(row.data));
                            const next = 'v' + (calls.update + 1);
                            stamps.set(stampKey, next);
                            return Promise.resolve({ data: [{ record_id: filters.record_id, updated_at: next }], error: null });
                        }
                    };
                },
                insert(row) {
                    calls.insert++;
                    calls.upsertRows++;
                    if (failUpserts) return Promise.resolve({ error: { message: 'Escritura rechazada' } });
                    const map = coll(row.collection);
                    if (map.has(row.record_id)) return Promise.resolve({ error: { code: '23505', message: 'duplicate' } });
                    map.set(row.record_id, structuredClone(row.data));
                    stamps.set(row.collection + ':' + row.record_id, row.updated_at || 'v-new');
                    return Promise.resolve({ error: null });
                }
            };
        }
    };
    const storage = new Map();
    const context = vm.createContext({
        window: { RH_CONFIG: { SUPABASE_URL: 'https://test.invalid', SUPABASE_ANON_KEY: 'test' },
            supabase: { createClient: () => client },
            addEventListener: (event, fn) => { events[event] = fn; } },
        localStorage: {
            getItem: k => storage.get(k) ?? null,
            setItem: (k, v) => storage.set(k, v)
        },
        document: { getElementById: () => badge },
        console: { warn() {}, error() {} },
        setTimeout: fn => { timers.push(fn); return timers.length; },
        clearTimeout: () => {},
        Date, Math, Set, JSON
    });
    vm.runInContext(source + '\n;globalThis.__qa={DB,DB_CACHE,pendingDeletes,flushPendientesEliminacion,persistirColeccionNube,cargarColeccionNube,DB_PENDING_WRITES};', context, {
        filename: 'js/db.js'
    });
    const h = context.__qa;
    await h.DB.init();
    assert.equal(h.DB.mode(), 'cloud');
    return {
        ...h, badge, calls, remote, events,
        setDeleteFailure: v => { failDeletes = v; },
        setUpsertFailure: v => { failUpserts = v; },
        touch(key, id) { stamps.set(key + ':' + id, 'externo-' + id); }
    };
}

let tests = 0;
function ok(name) { tests++; console.log('PASS ' + name); }

{
    const h = await createHarness();
    const list = h.DB.get('prospectos');
    assert.equal(list.length, 2);
    list.splice(0, 1);
    h.DB.set('prospectos', list);
    assert.equal(h.pendingDeletes.prospectos.has('rh_a'), true,
        'Un borrado in-place también debe detectarse');
    ok('borrado in-place detectado desde snapshot independiente');
    h.setDeleteFailure(true);
    await assert.rejects(h.flushPendientesEliminacion('prospectos'), /RH-DB-002/);
    assert.equal(h.pendingDeletes.prospectos.has('rh_a'), true);
    assert.match(h.badge.textContent, /Error de nube/);
    ok('fallo de borrado mantiene cola y muestra error');
    h.setDeleteFailure(false);
    await h.flushPendientesEliminacion('prospectos');
    assert.equal(h.pendingDeletes.prospectos.has('rh_a'), false);
    assert.equal(h.remote.get('prospectos').has('rh_a'), false);
    ok('reintento de borrado confirmado elimina la cola');
}
{
    const h = await createHarness();
    const registros = h.DB.get('prospectos');
    registros[0].nombreCompleto = 'Edición pendiente';
    h.DB.set('prospectos', registros);
    h.setUpsertFailure(true);
    await assert.rejects(h.persistirColeccionNube('prospectos', true), /RH-DB-001/);
    assert.match(h.badge.textContent, /Error de nube/);
    assert.equal(h.DB_PENDING_WRITES.has('prospectos'), true);
    ok('rechazo de upsert no declara nube sincronizada');
    h.setUpsertFailure(false);
    await h.persistirColeccionNube('prospectos', true);
    assert.equal(h.DB_PENDING_WRITES.has('prospectos'), false);
    assert.equal(h.remote.get('prospectos').get('rh_a').nombreCompleto, 'Edición pendiente');
    ok('un reintento tras recuperar conexión confirma el borrador');
}
{
    const h = await createHarness();
    h.setDeleteFailure(true);
    const success = await h.DB.remove('prospectos', 'rh_a');
    assert.equal(success, false);
    assert.equal(h.DB.get('prospectos').some(i => i.id === 'rh_a'), true);
    assert.match(h.badge.textContent, /Error de nube/);
    ok('fallo de remove restaura registro visible y avisa');
}
{
    const rows = Array.from({ length: 1005 }, (_, i) => ({
        id: 'rh_' + String(i).padStart(5, '0'),
        nombreCompleto: 'Demo ' + i
    }));
    const h = await createHarness(rows);
    assert.equal(h.DB.get('prospectos').length, 1005);
    assert.equal(h.DB.get('prospectos').at(-1).id, 'rh_01004');
    assert.ok(h.calls.pages >= 2);
    ok('lectura paginada incluye todos los registros después del límite de 1000');
}
{
    const h = await createHarness();
    const list = h.DB.get('prospectos');
    list[0].nombreCompleto = 'Cambio pendiente';
    h.DB.set('prospectos', list);
    h.remote.get('prospectos').get('rh_a').nombreCompleto = 'Cambio externo';
    h.touch('prospectos', 'rh_a');
    const updated = await h.cargarColeccionNube('prospectos');
    assert.equal(updated, false);
    assert.equal(h.DB.get('prospectos')[0].nombreCompleto, 'Cambio pendiente');
    assert.equal(h.DB_PENDING_WRITES.has('prospectos'), true);
    ok('realtime no pisa borrador local no confirmado');
    await assert.rejects(h.persistirColeccionNube('prospectos', true), /RH-DB-008/);
    assert.equal(h.DB_PENDING_WRITES.has('prospectos'), true);
    assert.equal(h.remote.get('prospectos').get('rh_a').nombreCompleto, 'Cambio externo');
    ok('un guardado concurrente no sobrescribe el cambio del otro usuario');
}
{
    const h = await createHarness();
    h.DB.set('prospectos', h.DB.get('prospectos').filter(item => item.id !== 'rh_a'));
    assert.equal(h.pendingDeletes.prospectos.has('rh_a'), true);
    h.DB.set('prospectos', [
        ...h.DB.get('prospectos'),
        { id: 'rh_a', nombreCompleto: 'Restaurado antes del borrado' }
    ]);
    assert.equal(h.pendingDeletes.prospectos.has('rh_a'), false);
    await h.persistirColeccionNube('prospectos', true);
    assert.equal(h.remote.get('prospectos').has('rh_a'), true);
    ok('registro restaurado antes del envío cancela eliminación pendiente');
}
{
    const h = await createHarness();
    // Supabase externo cambia otro registro después de la lectura inicial.
    h.remote.get('prospectos').get('rh_b').nombreCompleto = 'Edición de compañera';
    const registros = h.DB.get('prospectos');
    registros[0].nombreCompleto = 'Actualizado localmente';
    h.DB.set('prospectos', registros);
    await h.persistirColeccionNube('prospectos', true);
    assert.equal(h.calls.update, 1);
    assert.equal(h.calls.upsert, 0);
    assert.equal(h.remote.get('prospectos').get('rh_a').nombreCompleto, 'Actualizado localmente');
    assert.equal(h.remote.get('prospectos').get('rh_b').nombreCompleto, 'Edición de compañera');
    ok('upsert solo actualiza registro cambiado sin pisar modificaciones ajenas');
}
{
    const h = await createHarness();
    await h.DB.flush();
    assert.equal(h.calls.upsert, 0);
    assert.equal(h.calls.delete, 0);
    ok('flush de colección intacta evita sobrescribir datos ajenos');
}
{
    const h = await createHarness();
    let cancelados = 0;
    const event = { returnValue: null, preventDefault() { cancelados++; } };
    h.events.beforeunload(event);
    assert.equal(cancelados, 0);
    const rows = h.DB.get('prospectos');
    rows[0].nombreCompleto = 'Edición a confirmar';
    h.DB.set('prospectos', rows);
    h.events.beforeunload(event);
    assert.equal(cancelados, 1);
    assert.equal(event.returnValue, '');
    await h.persistirColeccionNube('prospectos', true);
    h.events.beforeunload(event);
    assert.equal(cancelados, 1);
    ok('advertencia de cierre aparece únicamente con cambios pendientes');
}
console.log(JSON.stringify({ tests, passed: tests, mode: 'isolated-mock-no-production-data' }));
