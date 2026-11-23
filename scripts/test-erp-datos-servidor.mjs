import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const source=readFileSync(new URL('../api/datos.js',import.meta.url),'utf8');
function setup({method='GET',collection='usuariosLogin',login=false,role='Direccion',authenticated=true,
  payload,origin=true,sello='2026-11-21T10:00:00Z'}={}){
 const requests=[];
 const user={id:'rh_vendedor',tipo:'vendedor',rol:role,displayName:'Usuario QA',password:'NUNCA_COMPARTIR',activo:true};
 const prospects=[
  {record_id:'p_mio',data:{id:'p_mio',vendedorId:'rh_vendedor',estatus:'En seguimiento'},updated_at:sello},
  {record_id:'p_otro',data:{id:'p_otro',vendedorId:'rh_ajeno',estatus:'En seguimiento'},updated_at:sello}
 ];
 const table={
   usuariosLogin:[{record_id:'rh_vendedor',data:user,updated_at:sello}],
   prospectos:prospects,
   casas:[
     {record_id:'c_mia',updated_at:sello,data:{id:'c_mia',vendedorId:'rh_vendedor',nombreCompleto:'Casa sintética propia'}},
     {record_id:'c_ajena',updated_at:sello,data:{id:'c_ajena',vendedorId:'rh_ajeno',nombreCompleto:'Casa sintética ajena'}}
   ],
   alertas:[
     {record_id:'al_propia',data:{id:'al_propia',targetUserId:'rh_vendedor',targetRoles:[],mensaje:'Propia'},updated_at:sello},
     {record_id:'al_ajena',data:{id:'al_ajena',targetUserId:'rh_ajeno',targetRoles:[],mensaje:'Ajena'},updated_at:sello},
     {record_id:'al_roles',data:{id:'al_roles',targetUserId:'',targetRoles:['Vendedor','Administradora'],mensaje:'Grupo'},updated_at:sello}
   ],
   cuentasBancarias:[{record_id:'c1',data:{id:'c1',saldo:1000},updated_at:sello}],
   gastosEmpresa:[{record_id:'g1',data:{id:'g1',monto:450},updated_at:sello}]
 };
 const handlers={
   fetch:async(url,options)=>{
     requests.push({url,options});
     if(url.endsWith('/api/sesion')){
       return {ok:authenticated,status:authenticated?200:401,json:async()=>({userId:'rh_vendedor'})};
     }
     const u=new URL(url);
     if(u.pathname==='/rest/v1/rh_records'){
       const col=u.searchParams.get('collection')?.replace('eq.','')||options.body&&JSON.parse(options.body).collection;
       if(options.method==='PATCH'){
         const before=table[col]||[];
         const key=u.searchParams.get('record_id')?.replace('eq.','');
         const selloApi=u.searchParams.get('updated_at')?.replace('eq.','');
         const matching=before.find(r=>r.record_id===key&&r.updated_at===selloApi);
         if(!matching)return {ok:true,status:200,text:async()=>JSON.stringify([])};
         const next=JSON.parse(options.body);
         matching.data=next.data;
         matching.updated_at=next.updated_at;
         return {ok:true,status:200,text:async()=>JSON.stringify([matching])};
       }
       if(options.method==='POST'){
         const data=JSON.parse(options.body);
         const row={record_id:data.record_id,updated_at:data.updated_at,data:data.data};
         (table[col]??=[]).push(row);
         return {ok:true,status:201,text:async()=>JSON.stringify([row])};
       }
       if(options.method==='DELETE')return {ok:true,status:200,text:async()=>JSON.stringify([{record_id:'p_mio'}])};
       let rows=table[col]||[];
       const rid=u.searchParams.get('record_id');
       if(rid)rows=rows.filter(r=>r.record_id===rid.replace('eq.',''));
       return {ok:true,status:200,text:async()=>JSON.stringify(rows)};
     }
     throw Error('Unexpected request '+url);
   }
 };
 const runtime={module:{exports:{}},require,console,URL,Buffer,Date,
   process:{env:{SUPABASE_URL:'https://qa.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'TEST_ONLY'}},
   ...handlers};
 vm.createContext(runtime);
 vm.runInContext(source,runtime,{timeout:2000});
 const url='/api/datos?collection='+collection+(login?'&login=1':'');
 const req={method,url,headers:{
   host:'revive-hogar.vercel.app',
   ...(authenticated?{cookie:'__Host-rh-session=TEST_ONLY'}:{}),
   ...(method==='POST'?{
     origin:origin?'https://revive-hogar.vercel.app':'https://external.example',
     'x-rh-datos':'1','content-type':'application/json'
   }:{})
 },body:payload};
 const response={statusCode:0,headers:{},setHeader(k,v){this.headers[k]=v;},
  end(raw){this.data=JSON.parse(raw)}};
 return {run:async()=>{await runtime.module.exports(req,response);return response;},requests,table};
}
test('login lista usuarios sin contraseña y sin cookie',async()=>{
 const s=setup({login:true,authenticated:false});
 const r=await s.run();
 assert.equal(r.statusCode,200);
 assert.equal(r.data.rows[0].data.displayName,'Usuario QA');
 assert.equal(JSON.stringify(r.data).includes('NUNCA_COMPARTIR'),false);
 assert.equal(s.requests.some(x=>x.url.endsWith('/api/sesion')),false);
});
test('sin cookie no puede leer expedientes',async()=>{
 const s=setup({collection:'prospectos',authenticated:false});
 assert.equal((await s.run()).statusCode,401);
});
test('la sesión autenticada nunca entrega el password del ERP',async()=>{
 const s=setup({collection:'usuariosLogin'});
 const r=await s.run();
 assert.equal(r.statusCode,200);
 assert.equal(JSON.stringify(r.data).includes('NUNCA_COMPARTIR'),false);
});
test('vendedor solo recibe sus prospectos, no los de otros',async()=>{
 const s=setup({collection:'prospectos',role:'Vendedor'});
 const r=await s.run();
 assert.equal(r.statusCode,200);
 assert.deepEqual(r.data.rows.map(x=>x.record_id),['p_mio']);
});
test('vendedor no puede leer ni modificar cuentas financieras',async()=>{
 const get=setup({collection:'cuentasBancarias',role:'Vendedor'});
 const result=await get.run();
 assert.equal(result.statusCode,200);
 assert.deepEqual(result.data.rows,[]);
 const post=setup({method:'POST',collection:'cuentasBancarias',role:'Vendedor',
   payload:{action:'insert',collection:'cuentasBancarias',record_id:'c2',data:{id:'c2',saldo:0}}});
 assert.equal((await post.run()).statusCode,403);
 assert.equal(post.requests.some(x=>x.options.method==='POST'&&x.url.includes('/rest/v1')),false);
});
test('impide cambios de cuentas desde otro origen',async()=>{
 const s=setup({method:'POST',collection:'prospectos',origin:false,
   payload:{action:'insert',collection:'prospectos',record_id:'p_new',data:{id:'p_new'}}});
 assert.equal((await s.run()).statusCode,403);
});
test('con sello correcto guarda cambio y respeta escritura optimista',async()=>{
 const s=setup({method:'POST',collection:'prospectos',
  payload:{action:'update',collection:'prospectos',record_id:'p_mio',data:{id:'p_mio',vendedorId:'rh_vendedor',estatus:'Interesado'},sello:'2026-11-21T10:00:00Z'}});
 const r=await s.run();
 assert.equal(r.statusCode,200);
 assert.equal(s.table.prospectos[0].data.estatus,'Interesado');
});
test('rechaza sello desactualizado sin guardar cambios',async()=>{
 const s=setup({method:'POST',collection:'prospectos',
  payload:{action:'update',collection:'prospectos',record_id:'p_mio',data:{id:'p_mio',estatus:'Eliminado'},sello:'2020-01-01T00:00:00Z'}});
 assert.equal((await s.run()).statusCode,409);
 assert.equal(s.table.prospectos[0].data.estatus,'En seguimiento');
});

test('vendedor puede editar su perfil sin cambiar permisos ni contraseña previa',async()=>{
 const data={id:'rh_vendedor',tipo:'vendedor',rol:'Vendedor',activo:true,
  displayName:'Vendedor QA actualizado',nombreLuna:'Vendedor QA',correo:'qa@example.test',
  telefono:'0000000000'};
 const x=setup({method:'POST',collection:'usuariosLogin',role:'Vendedor',
  payload:{action:'update',collection:'usuariosLogin',record_id:'rh_vendedor',
   sello:'2026-11-21T10:00:00Z',data}});
 const r=await x.run();
 assert.equal(r.statusCode,200);
 assert.equal(x.table.usuariosLogin[0].data.rol,'Vendedor');
 assert.equal(x.table.usuariosLogin[0].data.password,'NUNCA_COMPARTIR');
 assert.equal(x.table.usuariosLogin[0].data.displayName,'Vendedor QA actualizado');
 assert.equal(JSON.stringify(r.data).includes('NUNCA_COMPARTIR'),false);
});
test('autogestión de perfil no puede otorgar rol Dirección',async()=>{
 const data={id:'rh_vendedor',tipo:'vendedor',rol:'Direccion',activo:true,
  displayName:'Ataque QA',nombreLuna:'QA',correo:'',telefono:''};
 const x=setup({method:'POST',collection:'usuariosLogin',role:'Vendedor',
  payload:{action:'update',collection:'usuariosLogin',record_id:'rh_vendedor',
   sello:'2026-11-21T10:00:00Z',data}});
 assert.equal((await x.run()).statusCode,403);
 assert.equal(x.table.usuariosLogin[0].data.rol,'Vendedor');
 assert.equal(x.requests.some(p=>p.options.method==='PATCH'),false);
});
test('un vendedor no puede editar el perfil de otro usuario',async()=>{
 const x=setup({method:'POST',collection:'usuariosLogin',role:'Vendedor',
  payload:{action:'update',collection:'usuariosLogin',record_id:'rh_ajeno',
   sello:'2026-11-21T10:00:00Z',
   data:{id:'rh_ajeno',tipo:'general',rol:'Direccion',activo:true,displayName:'QA'}}});
 assert.equal((await x.run()).statusCode,403);
});

test('vendedor solo recibe las casas que le corresponden',async()=>{
 const x=setup({collection:'casas',role:'Vendedor'});
 const r=await x.run();
 assert.equal(r.statusCode,200);
 assert.deepEqual(r.data.rows.map(x=>x.record_id),['c_mia']);
});
test('los datos de contacto de otros usuarios no se entregan al vendedor',async()=>{
 const x=setup({collection:'usuariosLogin',role:'Vendedor'});
 x.table.usuariosLogin.push({record_id:'rh_ajeno',
   updated_at:'2026-11-21T10:00:00Z',
   data:{id:'rh_ajeno',rol:'Direccion',tipo:'general',activo:true,
     displayName:'Otro usuario',correo:'privado@correo.test',telefono:'0000000000',
     nombreLuna:'Otro nombre',password:'OTRA_CLAVE'}});
 const r=await x.run();
 assert.equal(r.statusCode,200);
 const own=r.data.rows.find(x=>x.record_id==='rh_vendedor');
 const other=r.data.rows.find(x=>x.record_id==='rh_ajeno');
 assert.ok(own&&other);
 assert.equal(other.data.correo,undefined);
 assert.equal(other.data.telefono,undefined);
 assert.equal(other.data.nombreLuna,undefined);
 assert.equal(other.data.password,undefined);
 assert.equal(other.data.displayName,'Otro usuario');
});

test('alertas privadas solo se entregan a su destinatario o rol correspondiente',async()=>{
 const vendedor=setup({collection:'alertas',role:'Vendedor'});
 const r=await vendedor.run();
 assert.equal(r.statusCode,200);
 assert.deepEqual(r.data.rows.map(x=>x.record_id),['al_propia','al_roles']);
 const marketing=setup({collection:'alertas',role:'Marketing'});
 assert.deepEqual((await marketing.run()).data.rows.map(x=>x.record_id),[]);
 const admin=setup({collection:'alertas',role:'Administradora'});
 assert.deepEqual((await admin.run()).data.rows.map(x=>x.record_id),['al_roles']);
 const direccion=setup({collection:'alertas',role:'Direccion'});
 assert.equal((await direccion.run()).data.rows.length,3);
});
test('vendedor no puede editar una alerta destinada a otra persona',async()=>{
 const x=setup({method:'POST',collection:'alertas',role:'Vendedor',
  payload:{action:'update',collection:'alertas',record_id:'al_ajena',
    sello:'2026-11-21T10:00:00Z',
    data:{id:'al_ajena',targetUserId:'rh_ajeno',targetRoles:[],mensaje:'Suplantado'}}});
 assert.equal((await x.run()).statusCode,403);
 assert.equal(x.table.alertas[1].data.mensaje,'Ajena');
});
test('un usuario no puede cambiar los destinatarios de una alerta existente',async()=>{
 const x=setup({method:'POST',collection:'alertas',role:'Vendedor',
  payload:{action:'update',collection:'alertas',record_id:'al_propia',
    sello:'2026-11-21T10:00:00Z',
    data:{id:'al_propia',targetUserId:'rh_ajeno',targetRoles:[],mensaje:'Privada'}}});
 assert.equal((await x.run()).statusCode,403);
 assert.equal(x.table.alertas[0].data.targetUserId,'rh_vendedor');
});
test('crear una alerta para Dirección conserva el remitente verificado por la sesión',async()=>{
 const x=setup({method:'POST',collection:'alertas',role:'Vendedor',
  payload:{action:'insert',collection:'alertas',record_id:'al_nueva',
    data:{id:'al_nueva',targetUserId:'',targetRoles:['Direccion'],
      mensaje:'Aviso',creadoPor:'rh_ajeno'}}});
 assert.equal((await x.run()).statusCode,201);
 assert.equal(x.table.alertas.find(a=>a.record_id==='al_nueva').data.creadoPor,'rh_vendedor');
});
