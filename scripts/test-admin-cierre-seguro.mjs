import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../js/forms.js', import.meta.url), 'utf8');

function setup({ bloqueos = [], errores = [], borrador = false } = {}) {
  const inicial = { id:'p1', tipoCredito:'infonavit', datosExpediente:{nss:'original'}, estatus:'En administradora' };
  const db = { prospectos: [structuredClone(inicial)], casas: [] };
  const mensajes = [];
  const efectos = [];
  const campos = new Map([
    ['exp-id', 'p1'],['exp-tipo-credito','bancario'],['exp-adeudo-credito','100'],
    ['exp-monto-adquisicion','500'],['exp-dato-nombre','Ejemplo'],
  ]);
  const contexto = {
    window:{ alert: msg => mensajes.push(msg) },
    document:{ getElementById:id=>id === 'modal-expediente-admin' ?
      { querySelector:()=>null } : id === 'form-expediente-admin' ?
      {querySelectorAll:()=>[]} : {value:campos.get(id)??''}},
    DB:{get:k=>db[k]||[],set:(k,v)=>{db[k]=v;efectos.push('db:'+k)}},
    currentUser:{rol:'Administradora'},
    RH_ESTATUS_PROSPECTO:{PROPUESTA_LISTA:'Propuesta lista'},
    normalizarAdeudo:v=>Number(v)||0,
    guardarDatosExpedienteAdmin:p=>{p.datosExpediente.nss='nuevo';},
    cambiarPasoCaptura:()=>efectos.push('tab'),
    validarReglasObligatorias:(p,g)=> g==='administradora_campos'?bloqueos:[],
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
  return {inicial,db,mensajes,efectos,guardar:borr=>contexto.guardarExpedienteAdmin({
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
