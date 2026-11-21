import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const script = readFileSync(new URL('../js/usage-metrics.js', import.meta.url), 'utf8');
const render = readFileSync(new URL('../js/render.js', import.meta.url), 'utf8');

function lanzar(rol = 'Administradora') {
  const datos = new Map();
  const writes = [];
  const window = {};
  const sandbox = {
    window, console,
    document: {
      addEventListener() {},
      querySelectorAll() { return []; }
    },
    localStorage: {
      getItem(key) { return datos.get(key) ?? null; },
      setItem(key, value) { writes.push({ key, value }); datos.set(key, value); }
    }
  };
  vm.createContext(sandbox);
  // Igual que utils.js: variable léxica global, NO window.currentUser.
  vm.runInContext('let currentUser = ' + JSON.stringify({ rol, id: 'id-privado-1', displayName: 'Persona real' }) + ';', sandbox);
  vm.runInContext(script, sandbox, { timeout: 2000 });
  return { metrics: window.RH_USAGE, datos, writes };
}

test('registra apertura de módulo con la cuenta real léxica y rol, no identidad', () => {
  const { metrics, writes } = lanzar();
  assert.equal(metrics.anotar('module_open', 'mod-administradora'), true);
  assert.equal(metrics.report().length, 1);
  assert.equal(metrics.report()[0].count, 1);
  assert.equal(metrics.report()[0].role, 'Administradora');
  const almacenado = JSON.stringify(writes);
  assert.doesNotMatch(almacenado, /Persona real|id-privado-1/);
});

test('registra eventos de sesión, formulario y pestaña', () => {
  const { metrics } = lanzar('Direccion');
  assert.equal(metrics.anotar('session_start', 'app'), true);
  assert.equal(metrics.anotar('form_open', 'form-expediente-admin'), true);
  assert.equal(metrics.anotar('form_attempt', 'form-expediente-admin'), true);
  assert.equal(metrics.anotar('tab_open', 'captura:documentos'), true);
  assert.equal(metrics.report().length, 4);
});

test('rechaza rutas y eventos no permitidos', () => {
  const { metrics } = lanzar();
  assert.equal(metrics.anotar('form_open', 'clave-personal'), false);
  assert.equal(metrics.anotar('click_raw', 'app'), false);
  assert.deepEqual([...metrics.report()], []);
});

test('dos aperturas del mismo módulo se cuentan si no son duplicado inmediato', () => {
  const { metrics } = lanzar('Vendedor');
  assert.equal(metrics.record('module_open', 'mod-vendedor', 'Vendedor'), true);
  assert.equal(metrics.record('module_open', 'mod-vendedor', 'Vendedor'), true);
  assert.equal(metrics.report()[0].count, 2);
});

test('sin red ni sesión no transmite datos personales', async () => {
  const { metrics } = lanzar();
  metrics.anotar('module_open', 'mod-administradora');
  assert.equal(metrics.scope, 'private-aggregates');
  assert.equal(await metrics.flush(), false);
  assert.deepEqual([...metrics.reporteNube()], []);
});

test('el panel usa recuentos locales y no afirma desuso global', () => {
  assert.match(render, /RH_USAGE\?\.report\?\.\(\)/);
  assert.match(render, /Number\(evento\.count \|\| 0\)/);
  assert.match(render, /no implica que nadie las utilice/);
});

test('las transiciones quedan agregadas por módulo sin nombres',()=>{
  const {metrics,writes}=lanzar('Direccion');
  metrics.anotar('module_open','mod-dashboard');
  metrics.anotar('module_open','mod-gastos-empresa');
  const rutas=metrics.report().filter(x=>x.event==='transition');
  assert.equal(rutas.length,1);
  assert.equal(rutas[0].target,'mod-dashboard>mod-gastos-empresa');
  assert.doesNotMatch(JSON.stringify(writes),/Persona real|id-privado-1/);
});
