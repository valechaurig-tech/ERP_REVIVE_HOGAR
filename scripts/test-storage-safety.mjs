import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const dbSource = readFileSync(fileURLToPath(new URL('../js/db.js', import.meta.url)), 'utf8');
const serviceSource = readFileSync(fileURLToPath(new URL('../js/services.js', import.meta.url)), 'utf8');

let passed = 0;
const ok = label => { passed++; console.log('PASS '+label); };
function createDB({errorOnConnect = false, missingSdk = false, missingKey = false} = {}) {
    let reads = 0, upserts = 0, selects = 0;
    const rows = new Map();
    const supabase = {
        from(table) {
            assert.equal(table,'rh_records');
            return {
                select(field,options) {
                    selects++;
                    if (field==='collection') return {limit: async () => ({
                        data: errorOnConnect ? null : [],
                        error: errorOnConnect ? {message:'simulated offline'} : null
                    })};
                    if (options?.count==='exact') throw Error('No se permite comprobar la nube para migración automática');
                    if (field==='data' || field==='data, record_id, updated_at') return {eq(key,value) {
                        return {order() { return {range: async () => ({data: [...(rows.get(value)||[])], error:null})}; }};
                    }};
                    throw Error('Unexpected cloud read '+field);
                },
                upsert() {upserts++;throw Error('Unexpected automatic cloud write');}
            };
        },
        channel() {return {on(){return this;},subscribe(){return this;}};}
    };
    const store = new Map([['revive_hogar_usuariosLogin',JSON.stringify([{id:'local-demo',password:'1234'}])]]);
    const context=vm.createContext({
        window:{RH_CONFIG:{SUPABASE_URL:'https://corp.invalid',SUPABASE_ANON_KEY:missingKey ? '' : 'fake',LOGIN_REQUIERE_PASSWORD:true},
            supabase:missingSdk ? undefined : {createClient:()=>supabase},addEventListener(){}},
        document:{getElementById:()=>({textContent:'',className:''})},
        localStorage:{getItem:key=>{reads++;return store.get(key)||null;},setItem:(key,value)=>store.set(key,value)},
        setTimeout:()=>1,clearTimeout(){},console:{log(){},warn(){},error(){}},
        Date,Math,JSON,Set,Map
    });
    vm.runInContext(dbSource+';globalThis.__db=DB;',context);
    return { DB:context.__db, get reads(){return reads;},get upserts(){return upserts;},get selects(){return selects;} };
}
{
    const h=createDB({errorOnConnect:true});
    await assert.rejects(h.DB.init(), /RH-DB-007/);
    assert.equal(h.DB.mode(),'unavailable');
    assert.equal(h.DB.isReady(),false);
    assert.equal(h.reads,0);
    ok('nube caída bloquea acceso sin cargar expedientes locales');
}
{
    const h=createDB();
    await h.DB.init();
    assert.equal(h.DB.mode(),'cloud');
    assert.equal(h.DB.isReady(),true);
    assert.equal(h.upserts,0);
    assert.equal(h.reads,0);
    ok('nube vacía no importa automáticamente información de navegador');
}
{
    const h=createDB({missingSdk:true});
    await assert.rejects(h.DB.init(),/RH-DB-007/);
    assert.equal(h.DB.mode(),'unavailable');
    assert.equal(h.reads,0);
    ok('sin biblioteca Supabase tampoco se entra a datos locales');
}
{
    const h=createDB({missingKey:true});
    await assert.rejects(h.DB.init(),/RH-DB-007/);
    assert.equal(h.DB.mode(),'unavailable');
    assert.equal(h.reads,0);
    ok('configuración parcial de nube se bloquea en vez de degradarse a local');
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
