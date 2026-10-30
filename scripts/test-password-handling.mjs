import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const forms = readFileSync(fileURLToPath(new URL('../js/forms.js', import.meta.url)), 'utf8');
const render = readFileSync(fileURLToPath(new URL('../js/render.js', import.meta.url)), 'utf8');
const records = [{id:'user-1',rol:'Direccion',displayName:'Directora demo',password:'ClaveAntigua879',activo:true}];
const inputs = new Map();
const element = id => {
    if(!inputs.has(id)) inputs.set(id,{value:'',checked:true,classList:{add(){},remove(){}},reset(){}});
    return inputs.get(id);
};
const set = (id,value)=>{element(id).value=value};
const read = id=>element(id).value;
let writes=0, seq=0;
const errores=[];
const events=[];
const ctx=vm.createContext({
    document:{getElementById:id=>element(id),querySelector:()=>null},
    DB:{get:key=>key==='usuariosLogin'?records:[],getId:()=> 'user-new-' + (++seq),set:(key,rows)=>{ assert.equal(key,'usuariosLogin');writes++; }},
    currentUser:{...records[0]},
    puedeGestionarUsuarios:()=>true,informarErrorCaptura:(field,message,code)=>errores.push({field,code}),
    logAction:x=>events.push(x),cargarUsuariosLogin(){},closeModal(){},refreshActiveModule(){},renderUsuarios(){},
    rhEtiquetaRol:()=> 'Dirección',alert:message=>errores.push({message}),
    window:{},Date,Map,Set,Number,String
});
vm.runInContext(forms + '\n'+render,ctx);
// En estas pruebas de formulario no se monta el DOM completo de la tabla de usuarios.
vm.runInContext('renderUsuarios = () => {};', ctx);
const call=(f)=>vm.runInContext(f+'({preventDefault(){}})',ctx);
let checks=0;
const ok=label=>{checks++;console.log('PASS '+label)};

assert.equal(vm.runInContext("validarNuevaClaveAcceso('1234')",ctx),false);
assert.equal(vm.runInContext("validarNuevaClaveAcceso('sinNumerosMuyLarga')",ctx),false);
assert.equal(vm.runInContext("validarNuevaClaveAcceso('ClaveSegura2046')",ctx),true);
ok('clave inicial no es default y exige robustez mínima');

set('nv-nombre','Asesor Nuevo');set('nv-password','');
call('guardarNuevoVendedor');
assert.equal(records.length,1);
assert.equal(errores.at(-1).code,'RH-AUTH-101');
ok('no permite alta sin contraseña individual');

set('nv-password','ClaveAsesor2031');
call('guardarNuevoVendedor');
assert.equal(records.length,2);
assert.equal(records[1].password,'ClaveAsesor2031');
ok('alta nueva guarda clave válida elegida explícitamente');

set('usr-edit-id','user-1');set('usr-edit-nombre','Directora nueva');
set('usr-edit-correo','demo@example.invalid');set('usr-edit-telefono','555000');
set('usr-edit-password','');
call('guardarUsuarioEditado');
assert.equal(records[0].displayName,'Directora nueva');
assert.equal(records[0].password,'ClaveAntigua879');
ok('edición de nombre conserva contraseña anterior');

set('usr-edit-password','1234');
call('guardarUsuarioEditado');
assert.equal(records[0].password,'ClaveAntigua879');
assert.equal(errores.at(-1).code,'RH-AUTH-101');
ok('contraseña débil rechazada sin mutar registro');

set('usr-edit-password','CambioClave2027');
call('guardarUsuarioEditado');
assert.equal(records[0].password,'CambioClave2027');
ok('cambio voluntario de contraseña exige clave nueva válida');

set('perfil-nombre','Directora perfil');set('perfil-correo','');set('perfil-telefono','');
set('perfil-password','');
call('guardarMiPerfil');
assert.equal(records[0].password,'CambioClave2027');
ok('editar perfil propio con contraseña vacía no la modifica');

set('usr-edit-password','secreto que no debe quedar');
vm.runInContext("abrirEditorUsuario('user-1')",ctx);
assert.equal(read('usr-edit-password'),'');
set('perfil-password','otro secreto visible');
vm.runInContext("abrirMiPerfil()",ctx);
assert.equal(read('perfil-password'),'');
ok('formularios de perfil/usuario nunca precargan contraseña');

assert.equal(records[0].activo,true);
assert.ok(writes>=4);
ok('operaciones conservan otras propiedades del usuario');
const auth = readFileSync(fileURLToPath(new URL('../js/auth.js', import.meta.url)), 'utf8');
assert.equal(auth.includes("user.password || cfg.PASSWORD_INICIAL || '1234'"),false);
assert.ok(auth.includes('const esperada = user.password;'));
ok('login no permite fallback global de credenciales sin clave');
console.log(JSON.stringify({checks,scope:'synthetic-no-production-auth'}));
