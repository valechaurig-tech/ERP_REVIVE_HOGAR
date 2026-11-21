import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {Readable} from 'node:stream';
const source=readFileSync(new URL('../api/archivos.js',import.meta.url),'utf8');
function harness({cookie=true,origin=true,role='Vendedor',owner='u1',target='p1',action='signedUrl',body}={}){
 const calls=[],payload={path:'prospectos/'+target+'/ine_frente/qa.pdf'};
 const ctx={
  module:{exports:{}},console,Buffer,URLSearchParams,
  process:{env:{SUPABASE_URL:'https://qa.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'SOLO_QA'}},
  fetch:async(url,opts)=>{
   calls.push({url,opts});
   if(url.endsWith('/api/sesion'))return{ok:true,json:async()=>({userId:'u1'})};
   if(url.includes('/rest/v1/rh_records')){
    const u=new URL(url);
    const name=u.searchParams.get('collection')||'';
    const data=name==='eq.usuariosLogin'?{id:'u1',rol:role,activo:true}
      :{id:target,vendedorId:owner};
    return{ok:true,json:async()=>[{data}]};
   }
   if(url.includes('/storage/v1/object/sign/'))
    return {ok:true,status:200,text:async()=>JSON.stringify({signedURL:'/object/sign/rh-archivos/qa?token=firma'})};
   if(url.includes('/storage/v1/object/'))
    return {ok:true,status:200,text:async()=>JSON.stringify({ok:true})};
   throw new Error('Unexpected fetch '+url);
  }
 };
 vm.createContext(ctx);
 vm.runInContext(source,ctx,{timeout:2000});
 const req=Readable.from(body ? [body] : []);
 req.method='POST';req.query={action,path:payload.path};req.headers={
  host:'revive-hogar.vercel.app',...(cookie?{cookie:'__Host-rh-session=firmada'}:{}),
  ...(origin?{origin:'https://revive-hogar.vercel.app','x-rh-archivos':'1'}:{}),
  'content-type':action==='upload'?'application/pdf':'application/json'
 };
 const res={statusCode:0,headers:{},setHeader(k,v){this.headers[k]=v;},
  end(s){this.data=s?JSON.parse(s):null;}};
 return {calls,req,res,run:async()=>{await ctx.module.exports(req,res);return res;}};
}
test('sin cookie no firma ni borra documentos',async()=>{
 for(const action of ['signedUrl','delete','upload']){
  const s=harness({cookie:false,action});
  const r=await s.run();
  assert.equal(r.statusCode,401,action);
  assert.equal(s.calls.length,0);
 }
});
test('origin de terceros no puede usar la cookie del ERP',async()=>{
 const s=harness({origin:false});
 assert.equal((await s.run()).statusCode,403);
 assert.equal(s.calls.length,0);
});
test('vendedor solo puede consultar documentos de sus prospectos',async()=>{
 const own=harness();
 const r=await own.run();
 assert.equal(r.statusCode,200);
 assert.match(r.data.signedUrl,/https:\/\/qa\.supabase\.co\/storage\/v1/);
 const other=harness({owner:'otro'});
 assert.equal((await other.run()).statusCode,403);
 assert.equal(other.calls.some(x=>x.url.includes('/storage/v1')),false);
});
test('Marketing no puede acceder a expedientes',async()=>{
 const s=harness({role:'Marketing'});
 assert.equal((await s.run()).statusCode,403);
});
test('Dirección puede autorizar documentos de otros propietarios',async()=>{
 const s=harness({role:'Direccion',owner:'otro'});
 assert.equal((await s.run()).statusCode,200);
});
test('subir documento válido solo con sesión autorizada',async()=>{
 const s=harness({action:'upload',body:Buffer.from('%PDF-1.5\nQA sintético')});
 const r=await s.run();
 assert.equal(r.statusCode,200);
 assert.equal(s.calls.some(x=>x.url.includes('/storage/v1/object/rh-archivos')),true);
});
test('nunca acepta rutas que salgan de prospectos',async()=>{
 const s=harness();
 s.req.query.path='probe/archivo.pdf';
 assert.equal((await s.run()).statusCode,400);
 assert.equal(s.calls.some(x=>x.url.includes('/storage/v1')),false);
});
