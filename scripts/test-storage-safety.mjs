import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const dbSource=readFileSync(fileURLToPath(new URL('../js/db.js',import.meta.url)),'utf8');
const serviceSource=readFileSync(fileURLToPath(new URL('../js/services.js',import.meta.url)),'utf8');
let passed=0;
const ok=label=>{passed++;console.log('PASS '+label)};
function createDB({errorOnConnect=false,missingFetch=false,missingKey=false}={}){
 let reads=0,writes=0,networkReads=0;
 const local=new Map([['revive_hogar_usuariosLogin',
  JSON.stringify([{id:'local-demo',password:'1234'}])]]);
 const ctx=vm.createContext({
  window:{RH_CONFIG:{SUPABASE_URL:'https://qa.supabase.co',SUPABASE_ANON_KEY:missingKey?'':'QA_KEY'},
   addEventListener(){}},
  document:{getElementById:()=>({textContent:'',className:''})},
  localStorage:{getItem:key=>{reads++;return local.get(key)||null;},
    setItem:()=>{writes++},removeItem:()=>{}},
  fetch:missingFetch?undefined:async(url,opts={})=>{
   networkReads++;
   if(errorOnConnect)return{ok:false,status:503,json:async()=>({message:'Sin red'})};
   return{ok:true,status:200,json:async()=>({rows:[]})};
  },
  setTimeout:()=>1,clearTimeout:()=>{},setInterval:()=>2,clearInterval:()=>{},
  console:{log(){},warn(){},error(){}},Date,Math,JSON,Set,Map
 });
 vm.runInContext(dbSource+';globalThis.__db=DB;',ctx);
 return{DB:ctx.__db,get reads(){return reads},get writes(){return writes},get networkReads(){return networkReads}};
}
{
 const h=createDB({errorOnConnect:true});
 await assert.rejects(h.DB.init(),/RH-DB-007/);
 assert.equal(h.DB.mode(),'unavailable');
 assert.equal(h.DB.isReady(),false);
 assert.equal(h.reads,0);
 ok('API corporativa caída bloquea acceso sin usar expedientes locales');
}
{
 const h=createDB();
 await h.DB.init();
 assert.equal(h.DB.mode(),'cloud');
 assert.equal(h.DB.isReady(),true);
 assert.equal(h.writes,0);
 assert.equal(h.reads,0);
 assert.equal(h.networkReads,1);
 ok('arranque corporativo solo consulta lista pública y no importa información local');
}
{
 const h=createDB({missingFetch:true});
 await assert.rejects(h.DB.init(),/RH-DB-007/);
 assert.equal(h.DB.mode(),'unavailable');
 assert.equal(h.reads,0);
 ok('si no hay conexión de red, no se entra a datos locales');
}
{
 const h=createDB({missingKey:true});
 await assert.rejects(h.DB.init(),/RH-DB-007/);
 assert.equal(h.DB.mode(),'unavailable');
 assert.equal(h.reads,0);
 ok('configuración parcial de nube bloquea entrada');
}
function seed(mode) {
    let users=[],writes=0;
    const ctx=vm.createContext({
        DB_KEYS:['usuariosLogin'],
        DB:{mode:()=>mode,get:key=>key==='usuariosLogin'?users:[],set:(key,value)=>{assert.equal(key,'usuariosLogin');users=value;writes++;},getId:()=> 'demo-'+writes},
        RH_STORAGE_PREFIX:'rh_',localStorage:{getItem:()=>null,setItem(){}},
        Date,Array,JSON
    });
    vm.runInContext(serviceSource+';initSeedData();',ctx);
    return {users,writes};
}
{
    const cloud=seed('cloud');
    assert.equal(cloud.users.length,0);
    ok('Supabase empresarial no recibe usuarios demo 1234');
}
{
    const demo=seed('local');
    assert.equal(demo.users.length,5);
    ok('entorno local conserva cuentas sintéticas para QA aislada');
}
console.log(JSON.stringify({passed,mode:'isolated-storage-mocks'}));
