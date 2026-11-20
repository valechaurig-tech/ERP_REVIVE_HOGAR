/** Pruebas de regresión para el formulario financiero heredado.
 * Ejecutar: node --test scripts/test-finanzas-integridad.mjs
 * No se conecta a Supabase, no crea movimientos reales.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const codigo = readFileSync(new URL('../js/gastos-empresa.js', import.meta.url), 'utf8');

function escenario({ cuentaSeleccionada = '', monto = '100.00', tipo = 'ingreso', concepto = 'Ingreso de verificación', cuentas, movimientos, editarId = '' } = {}) {
  const datos = {
    cuentasBancarias: structuredClone(cuentas ?? [{ id: 'c1', banco: 'BBVA', alias: 'Operativa', saldo: 1000 }]),
    gastosEmpresa: structuredClone(movimientos ?? [])
  };
  const mensajes = [];
  const escrituras = [];
  const campos = Object.fromEntries(Object.entries({
    'emp-mov-id': editarId,
    'emp-mov-fecha': '2026-11-20',
    'emp-mov-tipo': tipo,
    'emp-mov-categoria': 'Otros ingresos',
    'emp-mov-concepto': concepto,
    'emp-mov-proveedor': '',
    'emp-mov-monto': monto,
    'emp-mov-metodo': 'Transferencia',
    'emp-mov-banco': 'BBVA',
    'emp-mov-cuenta': cuentaSeleccionada,
    'emp-mov-referencia': '',
    'emp-mov-notas': '',
    'emp-mov-casa': ''
  }).map(([id, value]) => [id, { value, focus() {} }]));
  const contexto = {
    DB: {
      get(nombre) { return datos[nombre] ?? []; },
      set(nombre, filas) { escrituras.push(nombre); datos[nombre] = structuredClone(filas); },
      getId() { return 'nuevo-1'; }
    },
    currentUser: { rol: 'Direccion' },
    rhEsDireccion() { return true; },
    document: { getElementById(id) { return campos[id] ?? null; } },
    alert(mensaje) { mensajes.push(mensaje); },
    confirmAction() { return true; },
    logAction() {},
    getUsuarioActual() { return 'qa-aislado'; },
    closeModal() {},
    renderGastosEmpresa() {},
    hoyISO() { return '2026-11-20'; },
    formatearMoneda(n) { return String(n); },
    escapeHtml(v) { return String(v); },
    console
  };
  vm.createContext(contexto);
  vm.runInContext(codigo, contexto, { filename: 'gastos-empresa.js', timeout: 2500 });
  return { contexto, datos, escrituras, mensajes };
}

test('ingreso sin cuenta: no guarda ni modifica saldos', () => {
  const s = escenario();
  s.contexto.guardarMovimientoEmpresa({ preventDefault() {} });
  assert.equal(s.datos.gastosEmpresa.length, 0);
  assert.equal(s.datos.cuentasBancarias[0].saldo, 1000);
  assert.deepEqual(s.escrituras, []);
  assert.match(s.mensajes[0] ?? '', /cuenta válida/i);
});

test('cuenta inexistente: rechaza el movimiento', () => {
  const s = escenario({ cuentaSeleccionada: 'cuenta-inventada' });
  s.contexto.guardarMovimientoEmpresa({ preventDefault() {} });
  assert.deepEqual(s.escrituras, []);
});

test('monto inválido: no deja saldos corruptos', () => {
  for (const monto of ['-10', '0', 'Infinity', 'texto']) {
    const s = escenario({ cuentaSeleccionada: 'c1', monto });
    s.contexto.guardarMovimientoEmpresa({ preventDefault() {} });
    assert.deepEqual(s.escrituras, [], 'monto rechazado: ' + monto);
  }
});

test('ingreso válido: guarda movimiento y actualiza solo la cuenta seleccionada', () => {
  const s = escenario({ cuentaSeleccionada: 'c1' });
  s.contexto.guardarMovimientoEmpresa({ preventDefault() {} });
  assert.equal(s.datos.gastosEmpresa.length, 1);
  assert.equal(s.datos.gastosEmpresa[0].cuentaId, 'c1');
  assert.equal(s.datos.cuentasBancarias[0].saldo, 1100);
  assert.deepEqual(s.escrituras, ['cuentasBancarias', 'gastosEmpresa']);
});

test('egreso con cuenta de efectivo: conserva clasificación y resta saldo', () => {
  const s = escenario({
    cuentaSeleccionada: 'cash',
    tipo: 'gasto',
    cuentas: [{ id: 'cash', banco: 'Efectivo', alias: 'Caja', saldo: 150 }]
  });
  s.contexto.guardarMovimientoEmpresa({ preventDefault() {} });
  assert.equal(s.datos.gastosEmpresa[0].cuentaId, 'cash');
  assert.equal(s.datos.cuentasBancarias[0].saldo, 50);
});

test('cuenta con movimientos históricos: eliminación bloqueada', () => {
  const s = escenario({
    movimientos: [{ id: 'mov-1', cuentaId: 'c1', tipo: 'gasto', monto: 25 }]
  });
  s.contexto.eliminarCuentaBancaria('c1');
  assert.equal(s.datos.cuentasBancarias.length, 1);
  assert.deepEqual(s.escrituras, []);
  assert.match(s.mensajes[0] ?? '', /movimientos asociados/i);
});

test('movimiento histórico sin cuenta: no se reescribe al intentar editar', () => {
  const historico = { id: 'anterior', cuentaId: null, tipo: 'gasto', monto: 90, concepto: 'Histórico' };
  const s = escenario({ editarId: 'anterior', movimientos: [historico], cuentaSeleccionada: '' });
  s.contexto.guardarMovimientoEmpresa({ preventDefault() {} });
  assert.deepEqual(s.escrituras, []);
  assert.deepEqual(s.datos.gastosEmpresa, [historico]);
});
