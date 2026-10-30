import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const src = readFileSync(fileURLToPath(new URL('../js/titulares.js', import.meta.url)), 'utf8');
const principal = { id: 'house1', nombreCompleto: 'Propietario principal DEMO', precioVenta: 3000000, montoAdquisicion: 2100000 };
const state = { casas: [principal], copropietarios: [], presupuestos: [{ id: 'presup1', casaId: 'house1', pagosComprador: [{ monto: 1000 }] }] };
const elementos = new Map();
let seq = 0, errores = [], escrituras = [];
const item = key => {
  const el = { value: '', textContent: '', innerHTML: '',
    classList: { add(){}, remove(){} }, focus(){}, reset(){}, addEventListener(){} };
  elementos.set(key, el); return el;
};
for(const id of ['tit-casa-id','tit-id','tit-nombre','tit-telefono','tit-participacion','tit-propietario-principal','form-copropietario','modal-titulares','tit-mostrar-archivados']) item(id);
const body={ innerHTML: '', addEventListener(){} };
const context=vm.createContext({
    DB: {
      get: key => state[key] || [],
      getId: () => 'rh_test_' + (++seq),
      set: (key, data) => { state[key] = data; escrituras.push(key); }
    },
    currentUser: { rol:'Direccion', id:'director' },
    document:{getElementById:key=>elementos.get(key)||null,querySelector:s=>s==='#table-titulares tbody'?body:null},
    escapeHtml:s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])),
    informarErrorCaptura:(campo,mensaje,codigo)=>errores.push({campo,mensaje,codigo}),
    confirmAction:()=>true,logAction:()=>{},
    Date, Number, Array, Object, Map, Set
});
vm.runInContext(src + '\n;globalThis.__owner={normalizarCopropietario,abrirModalTitulares,guardarCopropietario,editarCopropietario,archivarCopropietario,restaurarCopropietario,listarCopropietarios,renderTitularesCasa};',context);
const a=context.__owner;
let passed=0;const ok=s=>{passed++;console.log('PASS '+s)};
assert.throws(()=>a.normalizarCopropietario({casaId:'house1',nombreCompleto:'X'}), e=>e.codigo==='RH-OWN-001');ok('nombre completo obligatorio');
assert.throws(()=>a.normalizarCopropietario({casaId:'house1',nombreCompleto:'Copropietaria DEMO',participacionDeclarada:'110'}), e=>e.codigo==='RH-OWN-002');ok('participación declarada debe ser 0-100');
a.abrirModalTitulares('house1');
assert.equal(elementos.get('tit-propietario-principal').textContent,'Propietario principal DEMO');ok('propietario principal se mantiene en expediente');
elementos.get('tit-nombre').value='Copropietaria DEMO';
elementos.get('tit-participacion').value='60';
a.guardarCopropietario({preventDefault(){}});
assert.equal(state.copropietarios.length,1);
assert.equal(state.copropietarios[0].participacionDeclarada,60);ok('crear copropietario sin alterar registros de casa');
elementos.get('tit-nombre').value='Copropietaria DEMO';
elementos.get('tit-participacion').value='40';
a.guardarCopropietario({preventDefault(){}});
assert.equal(state.copropietarios.length,1);
assert.equal(errores.at(-1).codigo,'RH-OWN-003');ok('duplicados activos rechazados');
elementos.get('tit-nombre').value='Copropietario Dos';
elementos.get('tit-participacion').value='55';
a.guardarCopropietario({preventDefault(){}});
assert.equal(state.copropietarios.length,1);
assert.equal(errores.at(-1).codigo,'RH-OWN-004');ok('suma de participaciones superior al 100 rechazada');
elementos.get('tit-nombre').value='Copropietario Dos';
elementos.get('tit-participacion').value='40';
a.guardarCopropietario({preventDefault(){}});
assert.equal(state.copropietarios.length,2);ok('dos participaciones compatibles permitidas');
const id=state.copropietarios[1].id;
a.editarCopropietario(id);
elementos.get('tit-nombre').value='Copropietario Actualizado';
a.guardarCopropietario({preventDefault(){}});
assert.equal(state.copropietarios.length,2);
assert.equal(state.copropietarios[1].nombreCompleto,'Copropietario Actualizado');ok('editar preserva identidad sin duplicar');
a.archivarCopropietario(id);
assert.equal(a.listarCopropietarios('house1').length,1);
assert.equal(state.copropietarios.length,2);ok('archivar conserva registro sin borrar');
assert.equal(a.restaurarCopropietario(id),true);
assert.equal(a.listarCopropietarios('house1').length,2);
ok('restaurar desde la interfaz devuelve al registro activo');
a.archivarCopropietario(id);
assert.equal(state.casas[0].nombreCompleto,'Propietario principal DEMO');
assert.equal(state.casas[0].precioVenta,3000000);
assert.equal(state.presupuestos[0].pagosComprador[0].monto,1000);
assert.ok(escrituras.every(key=>key==='copropietarios'));ok('propiedad y finanzas sin escrituras/alteraciones');
vm.runInContext("currentUser = {rol:'Vendedor',id:'seller1'};",context);
a.abrirModalTitulares('house1');
const before=state.copropietarios.length;
elementos.get('tit-nombre').value='No autorizado';
a.guardarCopropietario({preventDefault(){}});
assert.equal(state.copropietarios.length,before);ok('acceso restringido en UI (no sustituye RLS)');
console.log(JSON.stringify({ passed, scope: 'mocked-no-real-data' }));
