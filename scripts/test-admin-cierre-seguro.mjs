import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../js/forms.js', import.meta.url), 'utf8');

function setup({ bloqueos = [], bloqueosDocs = [], errores = [], borrador = false } = {}) {
  const inicial = { id:'p1', tipoCredito:'infonavit', datosExpediente:{nss:'original'}, estatus:'En administradora' };
  const db = { prospectos: [structuredClone(inicial)], casas: [] };
  const mensajes = [];
  const efectos = [];
  const zonas = new Map([['exp-fields', []],['exp-documentos-preview', []]]);
  const crearNodo = tag => ({tag,children:[],textContent:'',style:{},attributes:{},
    setAttribute(k,v){this.attributes[k]=v},
    append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node)}},
    appendChild(node){node.parent=this;this.children.push(node)},
    prepend(node){node.parent=this;this.children.unshift(node)},
    remove(){if(this.parent)this.parent.children.splice(this.parent.children.indexOf(this),1)}
  });
  const zona=id=>({
    children:zonas.get(id),
    querySelector:selector=>zonas.get(id).find(x=>selector==='#rh-admin-bloqueo'&&x.id==='rh-admin-bloqueo')||null,
    prepend(node){node.parent=this;zonas.get(id).unshift(node)}
  });
  const campos = new Map([
    ['exp-id', 'p1'],['exp-tipo-credito','bancario'],['exp-adeudo-credito','100'],
    ['exp-monto-adquisicion','500'],['exp-dato-nombre','Ejemplo'],
  ]);
  const contexto = {
    window:{ alert: msg => mensajes.push(msg) },
    document:{ createElement:crearNodo,
      getElementById:id=>zonas.has(id)?zona(id):id==='modal-expediente-admin'?
      {querySelector:()=>null}:id==='form-expediente-admin'?
      {querySelectorAll:()=>[]}:{value:campos.get(id)??''}},
    DB:{get:k=>db[k]||[],set:(k,v)=>{db[k]=v;efectos.push('db:'+k)}},
    currentUser:{rol:'Administradora'},
    RH_ESTATUS_PROSPECTO:{PROPUESTA_LISTA:'Propuesta lista'},
    normalizarAdeudo:v=>Number(v)||0,
    guardarDatosExpedienteAdmin:p=>{p.datosExpediente.nss='nuevo';},
    cambiarPasoCaptura:()=>efectos.push('tab'),
    validarReglasObligatorias:(p,g)=> g==='administradora_campos'?bloqueos:
      g==='administradora_documentos'?bloqueosDocs:[],
    recolectarDatosDocumento:()=>({}),
    validarCoherenciaDocumento:()=>errores,
    getPendientesOpcionales:()=>[],
    sincronizarPresupuestoProspecto:()=>efectos.push('presupuesto'),
    agregarEventoProspecto:()=>efectos.push('evento'),
    guardarDocumentosDesdeExpediente:()=>efectos.push('docs'),
    notificarPropuestaLista:()=>efectos.push('notifica'),
    resolverAlertasPorRelatedId:()=>{},
    logAction:()=>{},
    closeModal:()=>{},
    refreshActiveModule:()=>{},
    alert:msg=>mensajes.push(msg),
    getUsuarioActual:()=> 'Administradora',
    hoyISO:()=> '2026-11-21',
    console
  };
  vm.createContext(contexto);
  vm.runInContext(source,contexto,{timeout:2500});
  return {inicial,db,mensajes,efectos,zonas,guardar:borr=>contexto.guardarExpedienteAdmin({
    preventDefault(){}, submitter:{dataset:{accion:borr?'borrador':'finalizar'}}
  })};
}

test('al faltar requisitos no modifica el prospecto original ni el presupuesto',()=>{
  const s=setup({bloqueos:['Documento obligatorio']});
  s.guardar(false);
  assert.deepEqual(s.db.prospectos[0],s.inicial);
  assert.equal(s.efectos.includes('presupuesto'),false);
  assert.equal(s.efectos.some(x=>x.startsWith('db:')),false);
  assert.match(s.mensajes.join(' '),/Documento obligatorio/);
  assert.match(s.mensajes.join(' '),/guardar un borrador/i);
});

test('si falla coherencia financiera evita sincronizar y conserva estado',()=>{
  const s=setup({errores:['No cuadra el calendario de pagos']});
  s.guardar(false);
  assert.deepEqual(s.db.prospectos[0],s.inicial);
  assert.equal(s.efectos.includes('presupuesto'),false);
  assert.match(s.mensajes.join(' '),/No cuadra el calendario/);
});

test('guardar borrador conserva el trabajo sin finalizar',()=>{
  const s=setup();s.guardar(true);
  assert.equal(s.db.prospectos[0].estatus,'En administradora');
  assert.equal(s.db.prospectos[0].tipoCredito,'bancario');
  assert.equal(s.db.prospectos[0].datosExpediente.nss,'nuevo');
  assert.equal(s.efectos.filter(x=>x==='presupuesto').length,1);
});

test('datos válidos finalizan y sincronizan solo una vez',()=>{
  const s=setup();s.guardar(false);
  assert.equal(s.db.prospectos[0].estatus,'Propuesta lista');
  assert.equal(s.efectos.filter(x=>x==='presupuesto').length,1);
  assert.equal(s.efectos.includes('db:prospectos'),true);
});

test('RH-4: muestra requisitos pendientes en pantalla sin modificar ni enviar expediente',()=>{
  const s=setup({bloqueos:['Monto de adquisición','¿Requiere poder?']});
  s.guardar(false);
  const aviso=s.zonas.get('exp-fields').find(x=>x.id==='rh-admin-bloqueo');
  assert.ok(aviso,'El aviso permanece visible en la pestaña de datos');
  assert.equal(aviso.attributes.role,'alert');
  assert.match(aviso.children[0].textContent,/2/);
  assert.match(aviso.children[1].textContent,/NO fue enviada/);
  assert.deepEqual(aviso.children[2].children.map(x=>x.textContent),
    ['Monto de adquisición','¿Requiere poder?']);
  assert.deepEqual(s.db.prospectos[0],s.inicial);
  assert.equal(s.efectos.some(x=>x.startsWith('db:')),false);
});
test('RH-4: los documentos faltantes se muestran en la sección correcta',()=>{
  const s=setup({bloqueosDocs:['Identificación (reverso)']});
  s.guardar(false);
  assert.equal(s.zonas.get('exp-fields').length,0);
  const aviso=s.zonas.get('exp-documentos-preview')[0];
  assert.equal(aviso.id,'rh-admin-bloqueo');
  assert.equal(aviso.children[2].children[0].textContent,'Identificación (reverso)');
  assert.equal(s.efectos.includes('notifica'),false);
});
test('RH-4: no interpreta HTML de datos del expediente ni acumula avisos repetidos',()=>{
  const peligro='<img src=x onerror=alert(1)>';
  const s=setup({bloqueos:[peligro]});
  s.guardar(false);
  s.guardar(false);
  const avisos=s.zonas.get('exp-fields');
  assert.equal(avisos.length,1);
  assert.equal(avisos[0].children[2].children[0].textContent,peligro);
  assert.equal(avisos[0].children[2].children[0].children.length,0);
});
