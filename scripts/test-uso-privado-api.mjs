import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../api/uso.js',import.meta.url),'utf8');
const sample=[{day:'2026-11-21',event:'module_open',target:'mod-dashboard',count:2},
 {day:'2026-11-21',event:'transition',target:'mod-dashboard>mod-administradora',count:1}];
async function simular({method='GET',role='Direccion',session=true,origin=true,events=sample}={}){
 const logs=[];const ctx={
  module:{exports:{}},process:{env:{SUPABASE_URL:'https://test.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'fake'}},
  console,Date,URL,fetch:async(url,opts)=>{
   logs.push({url,options:opts});
   if(url.endsWith('/api/sesion'))return{ok:session,status:session?200:401,json:async()=>({userId:'usr-1'})};
   if(url.includes('rh_records?'))return{ok:true,status:200,text:async()=>JSON.stringify([{data:{id:'usr-1',rol:role,activo:true}}])};
   if(url.includes('rpc/rh_uso_registrar_lote'))return{ok:true,status:200,text:async()=>JSON.stringify(true)};
   if(url.includes('rh_uso_diario?'))return{ok:true,status:200,text:async()=>JSON.stringify([])};
   throw Error('Unexpected URL: '+url);
  }
 };
 vm.createContext(ctx);vm.runInContext(source,ctx);
 const req={method,headers:{host:'revive-hogar.vercel.app',cookie:'__Host-rh-session=segura',
 ...(method==='POST'?{origin:origin?'https://revive-hogar.vercel.app':'https://otro.com','x-rh-uso':'1'}:{})},
 body:{batchId:'b1a21111-1111-4111-8111-111111111111',events}};
 const res={statusCode:0,setHeader(){},end(v){this.data=JSON.parse(v)}};
 await ctx.module.exports(req,res);
 return {res,logs};
}
test('nada sin sesión',async()=>{
 const x=await simular({session:false});
 assert.equal(x.res.statusCode,401);
 assert.equal(x.logs.some(v=>v.url.includes('rh_uso_diario?')),false);
});
test('GET del equipo solo Dirección',async()=>{
 const v=await simular({role:'Vendedor'});
 assert.equal(v.res.statusCode,403);
 const d=await simular();
 assert.equal(d.res.statusCode,200);
 assert.deepEqual(d.res.data.rows,[]);
});
test('vendedor sí puede contribuir agregados pero no leer',async()=>{
 const v=await simular({method:'POST',role:'Vendedor'});
 assert.equal(v.res.statusCode,200);
 assert.equal(v.res.data.ok,true);
});
test('rechaza procedencia maliciosa y etiquetas arbitrarias',async()=>{
 const x=await simular({method:'POST',origin:false});
 assert.equal(x.res.statusCode,403);
 const bad=await simular({method:'POST',events:[{day:'2026-11-21',event:'module_open',target:'documento-Secreto',count:1}]});
 assert.equal(bad.res.statusCode,400);
 assert.equal(bad.logs.some(v=>v.url.includes('rpc/rh_uso_registrar_lote')),false);
});
test('datos de identidad no aparecen en los lotes registrados',async()=>{
 const v=await simular({method:'POST'});
 const post=v.logs.find(x=>x.url.includes('rpc/rh_uso_registrar_lote'));
 assert.ok(post);
 assert.doesNotMatch(post.options.body,/usr-1/);
 assert.match(post.options.body,/"p_rol":"Direccion"/);
 assert.equal(v.res.statusCode,200);
});
