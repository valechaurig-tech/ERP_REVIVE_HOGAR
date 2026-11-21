#!/usr/bin/env node
/**
 * Pruebas de sincronización por API protegida, con base falsa en memoria.
 * No accede a producción, credenciales, ni expedientes reales.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const code=readFileSync(new URL('../js/db.js',import.meta.url),'utf8');
async function setup(initial=[
 {id:'a1',nombreCompleto:'Prospecto sintético uno'},
 {id:'a2',nombreCompleto:'Prospecto sintético dos'}
]){
 const rows=new Map(initial.map(x=>[x.id,{data:structuredClone(x),
  updated_at:'2026-11-20T10:00:00Z'}]));
 const calls=[],local=new Map();
 let failWrite=false,failDelete=false;
 const ctx={
  window:{RH_CONFIG:{SUPABASE_URL:'https://qa.supabase.co',SUPABASE_ANON_KEY:'ANON_TEST'},addEventListener(){}},
  document:{getElementById:()=>null},
  localStorage:{getItem:k=>local.get(k)||null,setItem:(k,v)=>local.set(k,v),removeItem:k=>local.delete(k)},
  setTimeout:()=>1,clearTimeout:()=>{},setInterval:()=>2,clearInterval:()=>{},
  console,Date,Math,Map,Set,JSON,
  fetch:async(url,opt={})=>{
   const q=new URL(url,'https://revive-hogar.vercel.app');
   const action=opt.method==='POST'?JSON.parse(opt.body).action:'read';
   const body=opt.method==='POST'?JSON.parse(opt.body):null;
   const collection=q.searchParams.get('collection')||body?.collection;
   calls.push({action,collection,body,url});
   if(!opt.method||opt.method==='GET'){
    const data=collection==='prospectos'?[...rows].map(([record_id,r])=>({record_id,...structuredClone(r)})):[];
    const offset=Number(q.searchParams.get('offset')||0);
    const limit=Number(q.searchParams.get('limit')||1000);
    return{ok:true,status:200,json:async()=>({rows:data.slice(offset,offset+limit)})};
   }
   if(action==='delete'){
    if(failDelete)return{ok:false,status:503,json:async()=>({message:'Error sintético delete'})};
    rows.delete(body.record_id);
    return{ok:true,status:200,json:async()=>({rows:[]})};
   }
   if(failWrite)return{ok:false,status:503,json:async()=>({message:'Error sintético de escritura'})};
   if(action==='update'){
    const row=rows.get(body.record_id);
    if(!row||row.updated_at!==body.sello)return{ok:false,status:409,json:async()=>({message:'Conflicto'})};
    row.data=structuredClone(body.data);
    row.updated_at='2026-11-21T14:50:00Z';
    return{ok:true,status:200,json:async()=>({rows:[{record_id:body.record_id,updated_at:row.updated_at}]})};
   }
   if(action==='insert'){
    if(rows.has(body.record_id))return{ok:false,status:409,json:async()=>({message:'Duplicado'})};
    rows.set(body.record_id,{data:structuredClone(body.data),updated_at:'2026-11-21T14:50:00Z'});
    return{ok:true,status:201,json:async()=>({rows:[{record_id:body.record_id,updated_at:'2026-11-21T14:50:00Z'}]})};
   }
   throw Error('Acción inesperada: '+action);
  }
 };
 vm.createContext(ctx);
 vm.runInContext(code,ctx,{timeout:3000});
 await vm.runInContext('DB.init()',ctx);
 await vm.runInContext('DB.cargarDatosProtegidos()',ctx);
 return{ctx,rows,calls,
   get:(key)=>vm.runInContext('DB.get('+JSON.stringify(key)+')',ctx),
   set:(key,val)=>vm.runInContext('DB.set('+JSON.stringify(key)+','+JSON.stringify(val)+')',ctx),
   flush:()=>vm.runInContext('DB.flush()',ctx),
   failWrite(v){failWrite=v},failDelete(v){failDelete=v}
 };
}
test('la lectura y los cambios se realizan desde la API, no con Supabase directo',async()=>{
 const s=await setup();
 assert.equal(s.get('prospectos').length,2);
 s.set('prospectos',[{id:'a1',nombreCompleto:'Modificado'},{id:'a2',nombreCompleto:'Dos'}]);
 await s.flush();
 assert.equal(s.rows.get('a1').data.nombreCompleto,'Modificado');
 assert.equal(s.calls.filter(x=>x.action==='update'&&x.collection==='prospectos').length,2);
});
test('crear un nuevo expediente nunca usa upsert masivo',async()=>{
 const s=await setup([]);
 s.set('prospectos',[{id:'nuevo1',nombreCompleto:'QA'}]);
 await s.flush();
 assert.equal(s.rows.get('nuevo1').data.nombreCompleto,'QA');
 assert.equal(s.calls.filter(x=>x.action==='insert').length,1);
});
test('escritura con sello viejo es rechazada y no sobreescribe',async()=>{
 const s=await setup();
 s.rows.get('a1').updated_at='2026-11-21T20:00:00Z';
 s.set('prospectos',[{id:'a1',nombreCompleto:'Borrador invalidado'},{id:'a2',nombreCompleto:'Prospecto sintético dos'}]);
 await assert.rejects(s.flush(),/RH-DB-001|RH-DB-008/);
 assert.equal(s.rows.get('a1').data.nombreCompleto,'Prospecto sintético uno');
});
test('una caída de red no declara guardada la información',async()=>{
 const s=await setup();
 s.failWrite(true);
 s.set('prospectos',[{id:'a1',nombreCompleto:'No guardado'},{id:'a2',nombreCompleto:'Prospecto sintético dos'}]);
 await assert.rejects(s.flush(),/RH-DB-001/);
 assert.equal(s.rows.get('a1').data.nombreCompleto,'Prospecto sintético uno');
});
test('borrado de un registro se transmite por ruta protegida y no borra otros',async()=>{
 const s=await setup();
 const result=await vm.runInContext("DB.remove('prospectos','a1')",s.ctx);
 assert.equal(result,true);
 assert.equal(s.rows.has('a1'),false);
 assert.equal(s.rows.has('a2'),true);
});
test('borrado fallido conserva en memoria el registro',async()=>{
 const s=await setup();
 s.failDelete(true);
 const result=await vm.runInContext("DB.remove('prospectos','a1')",s.ctx);
 assert.equal(result,false);
 assert.equal(s.get('prospectos').length,2);
 assert.equal(s.rows.has('a1'),true);
});
test('cargar más de 1000 registros respeta paginación y límite de datos',async()=>{
 const data=Array.from({length:1050},(_,i)=>({id:'case_'+String(i).padStart(5,'0'),nombreCompleto:'QA'}));
 const s=await setup(data);
 assert.equal(s.get('prospectos').length,1050);
 assert.equal(s.calls.filter(x=>x.action==='read'&&x.collection==='prospectos').length,2);
});
