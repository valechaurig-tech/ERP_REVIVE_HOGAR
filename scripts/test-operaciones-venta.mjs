import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const src = readFileSync(fileURLToPath(new URL('../js/operaciones-venta.js', import.meta.url)), 'utf8');
const casa = { id: 'house1', direccionPropiedad: 'Casa DEMO', estatusPipeline: 'En venta' };
const comprador = { id: 'buyer1', nombreCompleto: 'Comprador DEMO', estatus: 'Interesado', propiedadInteresId: 'house1' };
const vendedor = { id: 'seller1', rol: 'Vendedor', displayName: 'Asesor DEMO' };
const state = {
    casas: [casa],
    compradores: [comprador],
    usuariosLogin: [vendedor],
    operacionesVenta: [],
    gastosEmpresa: [{ id: 'gasto1', monto: 10 }],
    cuentasBancarias: [{ id: 'cuenta1', saldo: 500 }],
    presupuestos: [{ id: 'presup1', casaId: 'house1', pagosComprador: [{ monto: 1000 }] }]
};
const elementos = new Map();
let seq = 0;
const errores = [];
const escrituras = [];
const item = key => {
    const el = {
        value: '', textContent: '', innerHTML: '', className: '',
        classList: { add() { el.className += ' hidden'; }, remove() { el.className = el.className.replace(' hidden', ''); } },
        focus() {}, reset() {}, addEventListener() {}
    };
    elementos.set(key, el);
    return el;
};
for (const id of [
    'form-operacion', 'op-editor', 'op-id', 'op-casa', 'op-comprador', 'op-etapa', 'op-precio',
    'op-captador', 'op-vendedor', 'op-comision-captacion', 'op-comision-cierre',
    'op-tipo-captacion', 'op-tipo-cierre', 'op-observaciones', 'op-estimacion',
    'op-total', 'op-comisiones-total', 'op-editor-titulo', 'op-filtrar-archivadas'
]) item(id);
const body = { innerHTML: '', addEventListener() {} };
const context = vm.createContext({
    DB: {
        get: key => state[key] || [],
        getId: () => 'rh_op_' + (++seq),
        set: (key, data) => { state[key] = data; escrituras.push(key); }
    },
    currentUser: { rol: 'Direccion', id: 'director' },
    document: {
        getElementById: key => elementos.get(key) || null,
        querySelector: selector => selector === '#table-operaciones tbody' ? body : null
    },
    escapeHtml: value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])),
    informarErrorCaptura: (campo, mensaje, codigo) => errores.push({ campo, mensaje, codigo }),
    confirmAction: () => true,
    logAction: () => {},
    formatearMoneda: value => '$' + Number(value || 0).toFixed(2),
    Date, Number, Array, Object, Map, Set
});
vm.runInContext(src + '\n;globalThis.__sale={normalizarOperacionVenta,calcularComisionesOperacion,guardarOperacionVenta,renderOperacionesVenta};', context);
const api = context.__sale;
let passed = 0;
const ok = name => { passed++; console.log('PASS ' + name); };
const base = {
    casaId: 'house1', compradorId: 'buyer1', etapa: 'Borrador', precioPactado: '1000000',
    asesorCaptacionId: 'seller1', asesorCierreId: 'seller1',
    tipoComisionCaptacion: 'Porcentaje', comisionCaptacion: '3',
    tipoComisionCierre: 'Porcentaje', comisionCierre: '3', observaciones: 'Borrador DEMO'
};

assert.throws(() => api.normalizarOperacionVenta(
    { ...base, casaId: 'no-existe' }, null, state.casas, state.compradores, state.usuariosLogin, []
), error => error.codigo === 'RH-SALE-002');
ok('rechaza propiedad inexistente');

assert.throws(() => api.normalizarOperacionVenta(
    { ...base, compradorId: 'no-existe' }, null, state.casas, state.compradores, state.usuariosLogin, []
), error => error.codigo === 'RH-SALE-003');
ok('rechaza comprador inexistente');

const primera = api.normalizarOperacionVenta(base, null, state.casas, state.compradores, state.usuariosLogin, []);
assert.equal(primera.naturaleza, 'planeacion_no_financiera');
assert.equal(primera.comisionCaptacionEstimada, 30000);
assert.equal(primera.comisionCierreEstimada, 30000);
assert.equal(api.calcularComisionesOperacion(base).porAsesor.seller1, 60000);
assert.equal(Object.keys(api.calcularComisionesOperacion(base).porAsesor).length, 1);
ok('misma persona suma una sola estimación y no dos asesores');

assert.throws(() => api.normalizarOperacionVenta(
    base, null, state.casas, state.compradores, state.usuariosLogin, [primera]
), error => error.codigo === 'RH-SALE-008');
ok('rechaza una segunda operación activa sobre la misma propiedad');

assert.throws(() => api.normalizarOperacionVenta(
    { ...base, comisionCaptacion: '80', comisionCierre: '30' }, null, state.casas, state.compradores, state.usuariosLogin, []
), error => error.codigo === 'RH-SALE-005');
ok('rechaza comisiones estimadas mayores al precio');

for (const id of ['op-casa', 'op-comprador', 'op-etapa', 'op-precio', 'op-captador', 'op-vendedor', 'op-tipo-captacion', 'op-tipo-cierre', 'op-comision-captacion', 'op-comision-cierre', 'op-observaciones']) {
    elementos.get(id).value = '';
}
elementos.get('op-casa').value = 'house1';
elementos.get('op-comprador').value = 'buyer1';
elementos.get('op-etapa').value = 'Borrador';
elementos.get('op-precio').value = '1000000';
elementos.get('op-captador').value = 'seller1';
elementos.get('op-vendedor').value = 'seller1';
elementos.get('op-tipo-captacion').value = 'Porcentaje';
elementos.get('op-comision-captacion').value = '3';
elementos.get('op-tipo-cierre').value = 'Monto fijo';
elementos.get('op-comision-cierre').value = '10000';
api.guardarOperacionVenta({ preventDefault() {} });
assert.equal(state.operacionesVenta.length, 1);
assert.equal(state.operacionesVenta[0].totalComisionesEstimadas, 40000);
assert.equal(state.gastosEmpresa[0].monto, 10);
assert.equal(state.cuentasBancarias[0].saldo, 500);
assert.equal(state.presupuestos[0].pagosComprador[0].monto, 1000);
assert.equal(state.casas[0].estatusPipeline, 'En venta');
assert.ok(escrituras.every(key => key === 'operacionesVenta'));
ok('guardar borrador no escribe gastos, bancos, presupuestos ni el estatus de la propiedad');

vm.runInContext("currentUser = { rol: 'Vendedor', id: 'seller1' };", context);
const antes = state.operacionesVenta.length;
api.guardarOperacionVenta({ preventDefault() {} });
assert.equal(state.operacionesVenta.length, antes);
ok('vendedor no puede guardar operaciones desde la interfaz');

console.log(JSON.stringify({ passed, scope: 'mocked-no-real-data' }));
