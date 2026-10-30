import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(fileURLToPath(new URL('../js/utils.js', import.meta.url)), 'utf8');
const states = { focus: 0, scroll: 0, alerts: [], added: {}, attrs: {} };
const field = {
    setAttribute(k,v) { states.attrs[k] = v; },
    removeAttribute(k) { delete states.attrs[k]; },
    focus() { states.focus++; },
    scrollIntoView() { states.scroll++; },
    addEventListener(k,cb) { states.added[k] = cb; }
};
const context = vm.createContext({
    document: { getElementById: id => id === 'pros-nombre' ? field : null },
    window: { alert: text => states.alerts.push(text) },
    Date, Number, String, Array, Object
});
vm.runInContext(source + '\n;globalThis.__helper = informarErrorCaptura;', context);
assert.equal(context.__helper('pros-nombre', 'Necesitamos el nombre.', 'RH-FORM-201'), false);
assert.equal(states.focus, 1);
assert.equal(states.scroll, 1);
assert.equal(states.attrs['aria-invalid'], 'true');
assert.match(states.alerts[0], /RH-FORM-201/);
assert.equal(states.alerts[0].includes('valor privado'), false);
states.added.input();
assert.equal(states.attrs['aria-invalid'], undefined);
assert.equal(context.__helper('id-desconocido', 'Pendiente', 'RH-FORM-999'), false);
console.log('PASS: 8 aserciones de enfoque, accesibilidad y código de captura');
