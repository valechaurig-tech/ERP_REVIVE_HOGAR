import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../js/db.js',import.meta.url),'utf8');
function fixture(){
 const rows={
  usuariosLogin:[{record_id:'u1',updated_at:'2026-11-20T10:00:00Z',data:
   {id:'u1',displayName:'Dirección',tipo:'general',rol:'Direccion',activo:true}}],
  prospectos:[{record_id:'p1',updated_at:'2026-11-20T10:00:00Z',
   data:{id:'p1',vendedorId:'u1',estatus:'Seguimiento'}}]
 };
 const fetches=[],store=new Map(),window={
  RH_CONFIG:{SUPABASE_URL:'https://test.supabase.co',SUPABASE_ANON_KEY:'clave-publica'},
  addEventListener(){},setInterval(){},clearInterval(){}
 };
 const ctx={window,console,Date,JSON,Map,Set,String,Number,
   localStorage:{getItem:k=>store.get(k)??null,
    setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},
   document:{getElementById:()=>null},setTimeout:()=>1,clearTimeout:()=>{},
   setInterval:()=>2,clearInterval:()=>{},fetch:async(url,opt={})=>{
      fetches.push({url,method:opt.method??'GET',body:opt.body});
      const q=new URL(url,'https://revive-hogar.vercel.app');
      assert.equal(q.pathname,'/api/datos');
      const collection=q.searchParams.get('collection')||(opt.body?JSON.parse(opt.body).collection:null);
      const original=rows[collection]||[];
      if(!opt.method){
        return {ok:true,status:200,json:async()=>({rows: original.map(r=>{
          return {...r,data:{...r.data}};
        })})};
      }
      const data=JSON.parse(opt.body);
      if(data.action==='update'){
        const updated=original.find(r=>r.record_id===data.record_id);
        if(!updated||updated.updated_at!==data.sello)return {ok:false,status:409,json:async()=>({message:'Conflicto'})};
        updated.data={...data.data};
        updated.updated_at='2026-11-21T10:00:00Z';
        return {ok:true,status:200,json:async()=>({rows:[updated]})};
      }
      return {ok:true,status:201,json:async()=>({rows:[{record_id:data.record_id,updated_at:'2026-11-21T10:00:00Z'}]})};
   }};
 vm.createContext(ctx);
 vm.runInContext(source,ctx,{timeout:3000});
 return {ctx,rows,fetches,store};
}
test('inicio de sesión solo descarga el catálogo seguro de usuarios',async()=>{
 const x=fixture();
 await vm.runInContext('DB.init()',x.ctx);
 const users=vm.runInContext("DB.get('usuariosLogin')",x.ctx);
 assert.equal(users.length,1);
 assert.equal(users[0].id,'u1');
 assert.equal(users[0].password,undefined);
 assert.equal(vm.runInContext("DB.get('prospectos').length",x.ctx),0);
 assert.equal(x.fetches.some(v=>v.url.includes('login=1')),true);
});
test('después de autenticar carga los datos completos del equipo',async()=>{
 const x=fixture();
 await vm.runInContext('DB.init()',x.ctx);
 await vm.runInContext('DB.cargarDatosProtegidos()',x.ctx);
 assert.equal(vm.runInContext("DB.get('prospectos').length",x.ctx),1);
 assert.equal(x.fetches.some(v=>v.url.includes('collection=prospectos')),true);
});
test('editar un prospecto conserva bloqueo optimista al escribir',async()=>{
 const x=fixture();
 await vm.runInContext('DB.init()',x.ctx);
 await vm.runInContext('DB.cargarDatosProtegidos()',x.ctx);
 vm.runInContext("DB.set('prospectos',[{id:'p1',vendedorId:'u1',estatus:'Interesado'}]);",x.ctx);
 await vm.runInContext('DB.flush()',x.ctx);
 const req=x.fetches.find(v=>v.method==='POST'&&JSON.parse(v.body).collection==='prospectos');
 assert.equal(JSON.parse(req.body).action,'update');
 assert.equal(JSON.parse(req.body).sello,'2026-11-20T10:00:00Z');
 assert.equal(x.rows.prospectos[0].data.estatus,'Interesado');
});
test('salir borra expedientes en memoria y no conserva contraseñas',async()=>{
 const x=fixture();
 await vm.runInContext('DB.init()',x.ctx);
 await vm.runInContext('DB.cargarDatosProtegidos()',x.ctx);
 vm.runInContext('DB.limpiarDatosSesion()',x.ctx);
 assert.equal(vm.runInContext("DB.get('prospectos').length",x.ctx),0);
 assert.equal(x.store.size,0);
});
