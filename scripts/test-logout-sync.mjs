import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const code = readFileSync(fileURLToPath(new URL('../js/auth.js', import.meta.url)), 'utf8');
let fallar = true, llamados = 0, auditorias = 0;
const messages=[];
const app={ style: { display: 'block' } };
const login={ style: { display: 'none' } };
const sandbox=vm.createContext({
    currentUser: { id:'usuario_demo', displayName:'Persona demo', rol:'Direccion' },
    activeModuleId:'mod-dashboard',
    vendedorVistaId:null,
    clockInterval:null,
    DB:{ async flush(){ llamados++; if(fallar) throw new Error('sin conexión'); } },
    logAction:()=>{auditorias++;},
    document:{ getElementById(id){if(id==='app-screen')return app;if(id==='login-screen')return login;return null;}},
    console:{error(){}},
    alert:message=>messages.push(message),
    window:{}, Date, Object, Set
});
vm.runInContext(code, sandbox, {filename:'js/auth.js'});
const outcome1=await vm.runInContext('logout()',sandbox);
assert.equal(outcome1,false);
assert.equal(app.style.display,'block');
assert.equal(login.style.display,'none');
assert.equal(vm.runInContext('currentUser.id',sandbox),'usuario_demo');
assert.match(messages[0],/RH-DB-006/);
assert.equal(llamados,1);
fallar=false;
const outcome2=await vm.runInContext('logout()',sandbox);
assert.equal(outcome2,true);
assert.equal(app.style.display,'none');
assert.equal(login.style.display,'flex');
assert.equal(vm.runInContext('currentUser',sandbox),null);
assert.equal(auditorias,2);
console.log('PASS: 10 aserciones de logout con nube fallida y recuperación');
