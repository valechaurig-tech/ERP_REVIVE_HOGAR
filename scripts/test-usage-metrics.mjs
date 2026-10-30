import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(fileURLToPath(new URL('../js/usage-metrics.js', import.meta.url)), 'utf8');
const storage = new Map();
let onSubmit = null;
const context = vm.createContext({
  window: {},
  document: { addEventListener: (event, cb) => { if (event === 'submit') onSubmit = cb; } },
  localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k,v) => storage.set(k,v) },
  Date, Set, Object, JSON, String, Number
});
vm.runInContext(source, context);
const metrics = context.window.RH_USAGE;
assert.equal(metrics.scope, 'local-only');
assert.equal(metrics.record('module_open', 'mod-gastos', 'Direccion'), true);
assert.equal(metrics.record('module_open', 'mod-gastos', 'Direccion'), true);
assert.equal(metrics.record('module_open', 'prospecto-nombre-real', 'Direccion'), false);
assert.equal(metrics.record('form_attempt', 'form-prospecto', 'Vendedor'), true);
assert.equal(metrics.record('form_attempt', 'form-prospecto', 'nombre cliente'), false);
assert.equal(metrics.report().reduce((sum, x) => sum + x.count, 0), 3);
assert.equal(metrics.report().every(x => !('id' in x) && !('user' in x) && !('value' in x)), true);
assert.equal(typeof onSubmit, 'function');
const raw = storage.get('rh_usage_counts_v1');
assert.equal(raw.includes('prospecto-nombre-real'), false);
assert.equal(raw.includes('nombre cliente'), false);
const oldDate = new Date(Date.now() - 15 * 86400000);
const old = [oldDate.getFullYear(),String(oldDate.getMonth()+1).padStart(2,'0'),String(oldDate.getDate()).padStart(2,'0')].join('-');
const v = JSON.parse(raw);
v[old] = { 'module_open|Direccion|mod-gastos': 1 };
storage.set('rh_usage_counts_v1', JSON.stringify(v));
assert.equal(metrics.report().some(row => row.day === old), false);
assert.equal(metrics.anotar('tab_open', 'Valle Latina 145'), false);
assert.equal(metrics.anotar('form_open', 'comentario libre del cliente'), false);
assert.equal(metrics.report().reduce((sum, x) => sum + x.count, 0), 3);
console.log('PASS: métricas locales, retención de siete días y privacidad');
