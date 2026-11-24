/**
 * Prueba de navegador contra la interfaz pública (solo lectura de recursos estáticos).
 * Todos los endpoints, la sesión y Supabase están aislados en memoria. NUNCA escribe
 * en el sistema de producción ni usa contraseñas o expedientes reales.
 * Ejecutar en GitHub Actions Ubuntu 24.04 + Playwright Chromium.
 */
import {chromium} from 'playwright';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const BASE='https://revive-hogar.vercel.app';
const dbScript=readFileSync(new URL('../js/db.js',import.meta.url),'utf8');
const authScript=readFileSync(new URL('../js/auth.js',import.meta.url),'utf8');
const ROLES=[
 {id:'qa_dir_browser',rol:'Direccion',tipo:'general',displayName:'QA Dirección'},
 {id:'qa_adm_browser',rol:'Administradora',tipo:'general',displayName:'QA Administradora'},
 {id:'qa_mkt_browser',rol:'Marketing',tipo:'general',displayName:'QA Marketing'},
 {id:'qa_vend_browser',rol:'Vendedor',tipo:'vendedor',displayName:'QA Vendedor'}
];
const PLACEHOLDER_PWD='QA_LOCAL_SINTETICO_123';
const STAMP='2026-11-23T12:00:00.000Z';
const deepClone=x=>JSON.parse(JSON.stringify(x));
function mockRows(){
 const data=new Map();
 data.set('usuariosLogin',ROLES.map(user=>({record_id:user.id,updated_at:STAMP,
  data:{...user,activo:true,correo:'',telefono:'',nombreLuna:user.displayName}})));
 data.set('prospectos',[
  {record_id:'qa_prop_vendedor',updated_at:STAMP,
   data:{id:'qa_prop_vendedor',vendedorId:'qa_vend_browser',nombreCompleto:'FICHA FICTICIA UNO',
    estatus:'En administradora',tipoCredito:'Infonavit',direccionPropiedad:'Dirección ficticia 1'}},
  {record_id:'qa_prop_otro',updated_at:STAMP,
   data:{id:'qa_prop_otro',vendedorId:'qa_dir_browser',nombreCompleto:'FICHA FICTICIA DOS',
    estatus:'En administradora',direccionPropiedad:'Dirección ficticia 2'}}
 ]);
 data.set('casas',[
  {record_id:'qa_casa_vendedor',updated_at:STAMP,
   data:{id:'qa_casa_vendedor',vendedorId:'qa_vend_browser',estatus:'Disponible',
      direccion:'Dirección ficticia 1'}},
  {record_id:'qa_casa_otra',updated_at:STAMP,
   data:{id:'qa_casa_otra',vendedorId:'qa_dir_browser',estatus:'Disponible',
      direccion:'Dirección ficticia 2'}}
 ]);
 return data;
}
function controlBackend(page){
 let userId=null, writes=[],usedRealAPI=false;
 const db=mockRows(),headers={'Content-Type':'application/json','Cache-Control':'no-store'};
 async function answer(route,status,obj){
  await route.fulfill({status,contentType:'application/json',
   headers,body:JSON.stringify(obj)});
 }
 page.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url()),path=url.pathname;
  if(url.origin!==BASE){
   // Nunca acceder a Supabase con claves anónimas ni usar telemetría real.
   return route.abort('blockedbyclient');
  }
  if(path==='/js/db.js')return route.fulfill({status:200,
    contentType:'application/javascript',body:dbScript});
  if(path==='/js/auth.js')return route.fulfill({status:200,
    contentType:'application/javascript',body:authScript});
  if(path==='/api/sesion'){
   if(req.method()==='POST'){
    const body=JSON.parse(req.postData()||'{}');
    const u=ROLES.find(x=>x.id===body.userId);
    if(!u || body.password!==PLACEHOLDER_PWD ||
       body.mode!==u.tipo)return answer(route,401,{message:'No autorizado'});
    userId=u.id;
    return answer(route,200,{userId});
   }
   if(req.method()==='DELETE'){userId=null;return answer(route,200,{ok:true});}
   return answer(route,userId?200:401,userId?{userId}:{message:'Sin sesión'});
  }
  if(path==='/api/datos'){
   const collection=url.searchParams.get('collection');
   if(req.method()==='GET'&&collection==='usuariosLogin'&&url.searchParams.get('login')==='1'){
    return answer(route,200,{rows:deepClone(db.get('usuariosLogin'))});
   }
   if(!userId)return answer(route,401,{message:'Sin sesión'});
   const role=ROLES.find(x=>x.id===userId).rol;
   if(req.method()==='GET'){
    let rows=deepClone(db.get(collection)||[]);
    if(role==='Vendedor'&&['prospectos','casas'].includes(collection))
      rows=rows.filter(x=>x.data.vendedorId===userId);
    const offset=Number(url.searchParams.get('offset')||0);
    const limit=Number(url.searchParams.get('limit')||1000);
    return answer(route,200,{rows:rows.slice(offset,offset+limit)});
   }
   if(req.method()==='POST'){
    let body=JSON.parse(req.postData()||'{}');
    writes.push({collection:body.collection,action:body.action,record_id:body.record_id});
    const list=db.get(body.collection)||[];
    const existing=list.find(x=>x.record_id===body.record_id);
    if(body.action==='insert'&&existing)return answer(route,409,{message:'Duplicado'});
    if(body.action==='update'&&(!existing||body.sello!==existing.updated_at))
      return answer(route,409,{message:'Edición simultánea'});
    if(body.action==='delete'){
      db.set(body.collection,list.filter(x=>x.record_id!==body.record_id));
      return answer(route,200,{rows:[]});
    }
    const timestamp=new Date(Date.now()+10000).toISOString();
    if(existing){existing.data=deepClone(body.data);existing.updated_at=timestamp;}
    else list.push({record_id:body.record_id,updated_at:timestamp,data:deepClone(body.data)});
    db.set(body.collection,list);
    return answer(route,200,{rows:[{record_id:body.record_id,updated_at:timestamp}]});
   }
   return answer(route,405,{message:'Método no permitido'});
  }
  if(path.startsWith('/api/')){
   if(!userId)return answer(route,401,{message:'Sin sesión'});
   return answer(route,200,{ok:true,rows:[],data:[]});
  }
  if(req.method()!=='GET'){
   usedRealAPI=true;
   return route.abort('blockedbyclient');
  }
  return route.continue();
 });
 return {db,get userId(){return userId},get writes(){return writes},get usedRealAPI(){return usedRealAPI}};
}
async function testRole(browser,person){
 const context=await browser.newContext({baseURL:BASE});
 const page=await context.newPage();
 const mock=controlBackend(page);
 let pageErrors=[];
 page.on('pageerror',error=>pageErrors.push(error.message));
 try{
  await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:35000});
  await page.waitForFunction(()=>typeof DB!=='undefined'&&DB.mode?.()==='cloud',
   {timeout:20000});
  await page.waitForFunction(()=>DB.get('usuariosLogin').length>=4,{timeout:15000});
  assert.equal(await page.evaluate(()=>DB.get('usuariosLogin').some(x=>Object.hasOwn(x,'password'))),
   false,'No exponer contraseñas en el catálogo de acceso');
  if(person.tipo==='vendedor'){
   await page.locator('.role-option[data-mode="vendedor"]').click();
   await page.locator('#login-vendedor-user').selectOption(person.id);
  }else{
   await page.locator('.role-option[data-mode="general"]').click();
   await page.locator('#login-general-user').selectOption(person.id);
  }
  await page.locator('#login-password').fill(PLACEHOLDER_PWD);
  await page.locator('#login-form button[type="submit"]').click();
  await page.waitForFunction(expected=>currentUser?.id===expected,person.id,
   {timeout:25000});
  assert.equal(await page.locator('#app-screen').evaluate(el=>getComputedStyle(el).display!=='none'),true);
  assert.equal(mock.userId,person.id);
  const seen=await page.evaluate(()=>DB.get('prospectos').map(x=>x.id));
  if(person.rol==='Vendedor'){
   assert(seen.includes('qa_prop_vendedor'));
   assert(!seen.includes('qa_prop_otro'),'No debe cargar expedientes ajenos');
  }
  if(person.rol==='Administradora'){
   const hasRender=await page.evaluate(()=>typeof renderAdministradora==='function');
   assert.equal(hasRender,true);
   await page.evaluate(()=>showModule('mod-administradora',null,true));
   await page.waitForTimeout(300);
   const labels=await page.locator('#table-administradora tbody').innerText();
   assert.match(labels,/FICHA FICTICIA/);
  }
  const userId=person.id;
  await page.evaluate(async()=>{
   const v=DB.get('tareas');
   v.push({id:'qa_tarea_browser',titulo:'Tarea de prueba ficticia',usuarioId:currentUser.id});
   DB.set('tareas',v);
   await DB.flush();
  });
  assert(mock.writes.some(x=>x.collection==='tareas'),
    'El cliente nuevo debe enviar registros por /api/datos');
  const loggedOut=await page.evaluate(()=>logout());
  assert.equal(loggedOut,true);
  assert.equal(mock.userId,null);
  const final=await page.evaluate(()=>({
   prospectos:DB.get('prospectos').length,
   password:DB.get('usuariosLogin').some(x=>Object.hasOwn(x,'password')),
   currentUser:typeof currentUser==='undefined'?undefined:currentUser
  }));
  assert.equal(final.prospectos,0,'La sesión debe limpiar expedientes en memoria');
  assert.equal(final.currentUser,null);
  assert.equal(final.password,false);
  assert.equal(mock.usedRealAPI,false,'No debe enviar datos al ERP real');
  console.log('PASS E2E sintético '+person.rol+' navegador e inicio/guardado/salida');
  if(pageErrors.length)console.log('PAGE WARNINGS '+person.rol+': '+pageErrors.slice(0,3).join('; '));
 }finally{await context.close();}
}
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const p of ROLES)await testRole(browser,p);
}finally{await browser.close();}
