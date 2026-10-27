import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(fileURLToPath(new URL('../js/compradores.js', import.meta.url)), 'utf8');
let seq = 0, writes = 0;
const collections = { compradores: [], casas: [ { id: 'house1', direccionPropiedad: 'Calle Demo' } ], usuariosLogin: [
    { id: 'seller1', rol: 'Vendedor', displayName: 'Asesor Uno', activo: true },
    { id: 'seller2', rol: 'Vendedor', displayName: 'Asesor Dos', activo: true }
] };
const user = { rol: 'Vendedor', id: 'seller1' };
const fields = new Map();
const field = (id, value = '') => {
    const state = { value, classList: { add() {}, remove() {} }, focus() {}, closest() { return { classList: { add() {}, remove() {} } }; } };
    fields.set(id, state); return state;
};
[
    'comprador-id', 'comprador-nombre', 'comprador-telefono', 'comprador-correo',
    'comprador-interes', 'comprador-presupuesto', 'comprador-propiedad', 'comprador-notas', 'comprador-estatus',
    'comprador-financiamiento', 'comprador-institucion',
    'comprador-proximo-contacto', 'comprador-seguimiento-nota', 'comprador-historial', 'comprador-pendientes', 'comprador-solo-pendientes',
    'comprador-asesor', 'comprador-editor', 'comprador-editor-titulo', 'comprador-total',
    'comprador-buscar', 'comprador-mostrar-archivados'
].forEach(id => field(id));
fields.get('comprador-estatus').value = 'Nuevo';
const tbody = { innerHTML: '', addEventListener() {} };
const alerts = [];
const context = vm.createContext({
    DB: {
        getId: () => 'rh_test_' + (++seq),
        get: key => collections[key] || [],
        set: (key, values) => { writes++; collections[key] = values; }
    },
    currentUser: user,
    rhUserCanAccessModule: () => true,
    confirmAction: () => true,
    informarErrorCaptura: (id, message, code) => alerts.push({id,message,code}),
    logAction: () => {},
    escapeHtml: text => String(text).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])),
    document: {
        getElementById: id => fields.get(id) || null,
        querySelector: sel => sel === '#table-compradores tbody' ? tbody : null
    },
    Date, Map, Set, Object, String, Number
});
vm.runInContext(source + '\n;globalThis.__buyer={normalizarCompradorCaptura,compradorVisibleParaRol,guardarComprador,compradorCambiarArchivo,renderCompradores,compradorEstadoContacto,compradorFechaValida};',context);
const api = context.__buyer;
let passed = 0;const ok = label => {passed++;console.log('PASS '+label);};
assert.throws(()=>api.normalizarCompradorCaptura({nombreCompleto:'X',telefono:'3331234567'},null,user),e=>e.codigo==='RH-BUY-001');ok('nombre obligatorio validado');
assert.throws(()=>api.normalizarCompradorCaptura({nombreCompleto:'Persona Demo',telefono:'22'},null,user),e=>e.codigo==='RH-BUY-002');ok('teléfono obligatorio validado');
assert.throws(()=>api.normalizarCompradorCaptura({nombreCompleto:'Persona Demo',telefono:'3331234567',presupuestoMax:'-10'},null,user),e=>e.codigo==='RH-BUY-003');ok('presupuesto opcional no negativo');
const normal=api.normalizarCompradorCaptura({nombreCompleto:' Persona Demo ',telefono:'33 3123 4567',asesorId:'seller2'},null,user);
assert.equal(normal.asesorId,'seller1');assert.equal(normal.nombreCompleto,'Persona Demo');ok('vendedor no reasigna comprador y limpia captura');
assert.equal(api.compradorVisibleParaRol({asesorId:'seller2'},user),false);
assert.equal(api.compradorVisibleParaRol({asesorId:'seller1'},user),true);
assert.equal(api.compradorVisibleParaRol({asesorId:'seller2'}, {rol:'Direccion',id:'director'}),true);ok('visibilidad por rol y vendedor');
fields.get('comprador-nombre').value='Comprador Prueba';
fields.get('comprador-telefono').value='333 123 4567';
fields.get('comprador-asesor').value='seller2';
fields.get('comprador-propiedad').value='house1';
fields.get('comprador-financiamiento').value='Infonavit';
fields.get('comprador-institucion').value='Institución demo';
fields.get('comprador-proximo-contacto').value='2026-12-02';
fields.get('comprador-seguimiento-nota').value='Llamada inicial de prueba';
const event={preventDefault(){}};
api.guardarComprador(event);
assert.equal(collections.compradores.length,1);assert.equal(collections.compradores[0].asesorId,'seller1');
assert.equal(writes,1);assert.equal(collections.compradores[0].propiedadInteresId,'house1');ok('registro nuevo independiente en colección compradores y propiedad vinculada');
assert.equal(collections.compradores[0].proximoContacto,'2026-12-02');
assert.equal(collections.compradores[0].seguimientos.length,1);
assert.equal(collections.compradores[0].seguimientos[0].nota,'Llamada inicial de prueba');
ok('seguimiento registra fecha y actividad sin alterar propiedad');
assert.equal(collections.compradores[0].tipoFinanciamiento,'Infonavit');
assert.equal(collections.compradores[0].bancoOInstitucion,'Institución demo');
ok('forma de compra e institución se guardan independientemente de las finanzas del inmueble');
const id=collections.compradores[0].id;
fields.get('comprador-id').value=id;
fields.get('comprador-nombre').value='Comprador Editado';
fields.get('comprador-financiamiento').value='Contado';
fields.get('comprador-seguimiento-nota').value='';
api.guardarComprador(event);
assert.equal(collections.compradores.length,1);assert.equal(collections.compradores[0].nombreCompleto,'Comprador Editado');
assert.equal(collections.compradores[0].id,id);ok('edición mantiene identidad sin duplicar');
assert.equal(collections.compradores[0].seguimientos.length,1);ok('editar sin nota no duplica actividades');
assert.equal(collections.compradores[0].tipoFinanciamiento,'Contado');ok('edición de forma de compra preserva el historial');
api.compradorCambiarArchivo(id);
assert.equal(collections.compradores.length,1);assert.equal(collections.compradores[0].estatus,'Archivado');ok('archivo conserva expediente');
api.compradorCambiarArchivo(id,true);
assert.equal(collections.compradores[0].estatus,'Nuevo');ok('restauración reversible');
collections.compradores.push({id:'rh_ajeno',asesorId:'seller2',nombreCompleto:'Otro vendedor',telefono:'3339990000',estatus:'Nuevo'});
api.renderCompradores();
assert.ok(tbody.innerHTML.includes('Comprador Editado'));
assert.ok(!tbody.innerHTML.includes('Otro vendedor'));ok('la lista de vendedor no muestra carteras ajenas');
assert.equal(api.compradorFechaValida('2026-02-29'), false);
assert.equal(api.compradorFechaValida('2028-02-29'), true);
assert.equal(api.compradorEstadoContacto({estatus:'Nuevo',proximoContacto:'2026-01-01'},'2026-10-27'),'vencido');
assert.equal(api.compradorEstadoContacto({estatus:'Nuevo',proximoContacto:'2026-10-27'},'2026-10-27'),'hoy');
assert.equal(api.compradorEstadoContacto({estatus:'Archivado',proximoContacto:'2026-01-01'},'2026-10-27'),'cerrado');
ok('contactos vencidos/hoy y fechas bisiestas se clasifican correctamente');
assert.throws(()=>api.normalizarCompradorCaptura({nombreCompleto:'Demo Completa',telefono:'3331234567',proximoContacto:'2026-02-31'},null,user),e=>e.codigo==='RH-BUY-004');
ok('fecha imposible rechazada con código de soporte');
console.log(JSON.stringify({passed,scope:'pure-and-mocked-no-real-data'}));
