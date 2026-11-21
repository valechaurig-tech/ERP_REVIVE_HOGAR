import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const source=readFileSync(new URL('../api/finanzas.js',import.meta.url),'utf8');

async function responder({user=true,role='Direccion',body=null,method='GET',origin=true}={}){
 const hits=[];
 const c={
   module:{exports:{}},require,process:{env:{SUPABASE_URL:'https://test.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'solo-para-pruebas'}},
   console,URL,crypto:globalThis.crypto,
   fetch:async(url,opts)=>{
     hits.push({url:String(url),method:opts.method});
     if(String(url).endsWith('/api/sesion'))
       return {ok:user,status:user?200:401,json:async()=>({userId:'usuario-1'})};
     if(String(url).includes('rh_records?'))
       return {ok:true,status:200,text:async()=>JSON.stringify([{data:{id:'usuario-1',rol:role,activo:true}}])};
     if(String(url).includes('rpc/rh_fin_registrar_traspaso'))
       return {ok:true,status:200,text:async()=>JSON.stringify('b1a21111-1111-4111-8111-111111111111')};
     if(String(url).includes('rh_fin_transferencias?'))return {ok:true,status:200,text:async()=>JSON.stringify([])};
     if(String(url).includes('rh_fin_aperturas?'))return {ok:true,status:200,text:async()=>JSON.stringify([])};
     throw new Error('Unexpected request: '+url);
   }
 };
 vm.createContext(c);
 vm.runInContext(source,c,{timeout:2000});
 const req={method,headers:{
   host:'revive-hogar.vercel.app',
   cookie:'__Host-rh-session=firmada',
   ...(method==='POST'?{'content-type':'application/json','x-rh-finanzas':'1',
     origin:origin?'https://revive-hogar.vercel.app':'https://tercero.com'}:{})
 },body:body??{requestId:'b1a21111-1111-4111-8111-111111111111',
 fecha:'2026-11-21',origen:'cuenta-1',destino:'cuenta-2',monto:'0.29',concepto:'Traspaso validación'}};
 const res={statusCode:0,headers:{},setHeader(k,v){this.headers[k]=v;},end(txt){this.data=JSON.parse(txt);}};
 await c.module.exports(req,res);
 return {res,hits};
}
test('sin sesión no revela saldos ni registros',async()=>{
 const r=await responder({user:false});
 assert.equal(r.res.statusCode,401);
 assert.equal(r.hits.some(x=>x.url.includes('rh_fin_aperturas')),false);
});
test('solo Dirección accede a saldos',async()=>{
 const r=await responder({role:'Vendedor'});
 assert.equal(r.res.statusCode,403);
});
test('bloquea POST desde otro origen',async()=>{
 const r=await responder({method:'POST',origin:false});
 assert.equal(r.res.statusCode,403);
 assert.equal(r.hits.length,0);
});
test('POST válido en centavos exactos guarda por RPC',async()=>{
 const r=await responder({method:'POST'});
 assert.equal(r.res.statusCode,201);
 assert.equal(r.res.data.ok,true);
 assert.equal(r.hits.filter(x=>x.url.includes('rpc/')).length,1);
});
test('rechaza cuenta de origen igual a destino',async()=>{
 const r=await responder({method:'POST',body:{requestId:'b1a21111-1111-4111-8111-111111111111',fecha:'2026-11-21',origen:'a',destino:'a',monto:'12.00',concepto:''}});
 assert.equal(r.res.statusCode,400);
 assert.equal(r.hits.some(x=>x.url.includes('rpc/')),false);
});
test('rechaza tres decimales, cantidades negativas y fechas inválidas',async()=>{
 for(const monto of ['0.001','-12.00','1000000000.00']){
  const r=await responder({method:'POST',body:{requestId:'b1a21111-1111-4111-8111-111111111111',fecha:'2026-11-21',origen:'a',destino:'b',monto,concepto:''}});
  assert.equal(r.res.statusCode,400,monto);
 }
});
test('GET devuelve estructuras para corte, nunca contraseña',async()=>{
 const r=await responder();
 assert.equal(r.res.statusCode,200);
 assert.deepEqual(Object.keys(r.res.data).sort(),['aperturas','limite','transferencias']);
 assert.equal(JSON.stringify(r.res.data).includes('usuario-1'),false);
});
