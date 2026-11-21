/**
 * Revive Hogar | Acceso a colecciones desde el servidor.
 * Etapa de migración: debe verificarse por todos los roles antes de revocar CRUD anónimo.
 * Nunca envía contraseñas del ERP al cliente.
 */
'use strict';
const ID=/^[A-Za-z0-9_-]{1,128}$/;
const COLLECTIONS=new Set([
 'campanas','prospectos','casas','usuariosLogin','alertas','historial','auditoria',
 'tareas','presupuestos','archivos','configuracion','gastosEmpresa','presupuestoEmpresa',
 'cuentasBancarias','compradores','copropietarios','operacionesVenta','actividadUso'
]);
const HOSTS=new Set(['revive-hogar.vercel.app','revive-hogar-echauri-apps.vercel.app']);
const PREVIEW=/^revive-hogar-[a-z0-9]+-echauri-apps\.vercel\.app$/;
const MAX_PAYLOAD=1050000,MAX_BATCH=1000;
const READ={
  Direccion:new Set([...COLLECTIONS]),
  Administradora:new Set([...COLLECTIONS].filter(x=>!['actividadUso'].includes(x))),
  Marketing:new Set(['campanas','prospectos','casas','usuariosLogin','tareas','historial','alertas','configuracion']),
  Vendedor:new Set(['campanas','prospectos','casas','usuariosLogin','tareas','historial','alertas','archivos','compradores','copropietarios','operacionesVenta','configuracion'])
};
const WRITE={
  Direccion:new Set([...COLLECTIONS]),
  Administradora:new Set(['prospectos','archivos','presupuestos','operacionesVenta','historial','auditoria','alertas','tareas','copropietarios','casas']),
  Marketing:new Set(['campanas','tareas','historial','auditoria','alertas']),
  Vendedor:new Set(['prospectos','archivos','compradores','operacionesVenta','historial','auditoria','alertas','tareas'])
};
class ApiError extends Error{constructor(status,message){super(message);this.status=status;}}
function check(condition,status,message){if(!condition)throw new ApiError(status,message);}
function json(res,status,data){
 res.statusCode=status;
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control','private, no-store, max-age=0');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.end(JSON.stringify(data));
}
function hostDe(req){
 const host=String(req.headers.host||'').toLowerCase();
 check(HOSTS.has(host)||PREVIEW.test(host),400,'Dominio no autorizado.');
 return host;
}
function config(env){
 const url=String(env.SUPABASE_URL||env.RH_SUPABASE_URL||'').replace(/\/$/,'');
 const key=env.SUPABASE_SERVICE_ROLE_KEY||env.RH_SUPABASE_SERVICE_ROLE_KEY;
 check(/^https:\/\/[a-z0-9.-]+$/i.test(url)&&!!key,503,'Base de datos no disponible.');
 return {url,key};
}
async function request(conf,path,{method='GET',body,prefer}={}){
 const url=conf.url+'/rest/v1/'+path;
 const resp=await fetch(url,{
  method,cache:'no-store',redirect:'error',
  headers:{apikey:conf.key,Authorization:'Bearer '+conf.key,
   Accept:'application/json',...(body?{'Content-Type':'application/json'}:{}),
   ...(prefer?{Prefer:prefer}:{})},
  ...(body?{body:JSON.stringify(body)}:{})
 });
 const text=await resp.text();
 if(!resp.ok){
  if(resp.status===409||resp.status===412)throw new ApiError(409,'Otro usuario cambió el registro. Recarga antes de guardar.');
  throw new ApiError(resp.status>=500?503:400,'No fue posible confirmar la operación en la base.');
 }
 let data=null;
 try{data=text?JSON.parse(text):null;}catch{throw new ApiError(502,'Respuesta de base inválida.');}
 return data;
}
function perfilPublico(u){
 return {id:u.id,tipo:u.tipo,rol:u.rol,displayName:u.displayName,activo:u.activo!==false};
}
async function getRows(conf,collection,params=''){
 const path='rh_records?collection=eq.'+encodeURIComponent(collection)+
  '&select=record_id,data,updated_at&order=record_id.asc'+params;
 return (await request(conf,path))||[];
}
async function identity(req,conf,host){
 const cookie=String(req.headers.cookie||'');
 check(cookie.includes('__Host-rh-session='),401,'Inicia sesión en Revive.');
 const response=await fetch('https://'+host+'/api/sesion',{
  method:'GET',cache:'no-store',redirect:'error',
  headers:{cookie,'Cache-Control':'no-store'}
 });
 check(response.ok,401,'Tu sesión venció.');
 const sess=await response.json();
 const userId=String(sess.userId||'');
 check(ID.test(userId),401,'Sesión inválida.');
 const rows=await getRows(conf,'usuariosLogin','&record_id=eq.'+encodeURIComponent(userId)+'&limit=1');
 const user=rows[0]?.data;
 check(user&&user.id===userId&&user.activo!==false,403,'Usuario no activo.');
 check(READ[user.rol]&&WRITE[user.rol],403,'Rol no autorizado.');
 return {userId,role:user.rol};
}
function ownerCheck(row,collection,userId,role,write=false){
 if(role!=='Vendedor')return true;
 if(collection==='prospectos')return row?.vendedorId===userId;
 if(collection==='compradores')return row?.asesorId===userId;
 if(collection==='operacionesVenta')return row?.vendedorId===userId||row?.asesorId===userId;
 if(collection==='archivos')return !write; // Documentos: escritura solo por API específica de archivos.
 if(['auditoria','historial','tareas','alertas'].includes(collection))return write ? row?.usuarioId===userId||row?.actorId===userId : true;
 return true;
}
function sanitizeRow(row,collection,role){
 if(!row||typeof row!=='object')return row;
 const data=JSON.parse(JSON.stringify(row));
 if(collection==='usuariosLogin')delete data.password;
 if(role==='Vendedor'&&collection==='prospectos'){
   // Los campos del expediente propio siguen visibles a su asesor, nunca los de otro.
 }
 return data;
}
function validData(data,collection){
 check(data&&typeof data==='object'&&!Array.isArray(data),400,'Registro inválido.');
 check(ID.test(String(data.id||'')),400,'Identificador inválido.');
 const bytes=Buffer.byteLength(JSON.stringify(data),'utf8');
 check(bytes<=MAX_PAYLOAD,413,'Registro demasiado grande.');
 check(collection!=='actividadUso',403,'Utiliza la API de métricas privadas.');
}
function canDo(user,collection,write=false){
 return (write?WRITE[user.role]:READ[user.role])?.has(collection)===true;
}
function strictDate(value){
 const t=Date.parse(value);
 return typeof value==='string'&&Number.isFinite(t);
}
module.exports=async function handler(req,res){
 try{
  check(['GET','POST'].includes(req.method),405,'Método no permitido.');
  const host=hostDe(req),conf=config(process.env);
  const url=new URL(req.url,'https://'+host);
  const collection=url.searchParams.get('collection')||req.body?.collection;
  check(COLLECTIONS.has(collection),400,'Colección no permitida.');
  if(req.method==='GET'&&collection==='usuariosLogin'&&url.searchParams.get('login')==='1'){
   const rows=await getRows(conf,'usuariosLogin','&limit=200');
   return json(res,200,{rows:rows.filter(r=>r.data?.id).map(r=>({
    record_id:r.record_id,
    data:perfilPublico(r.data),
    updated_at:r.updated_at
   }))});
  }
  if(req.method==='POST'){
   check(req.headers.origin==='https://'+host&&req.headers['x-rh-datos']==='1',
    403,'Origen no autorizado.');
   check(/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||''),
    415,'Se requiere JSON.');
   check(Number(req.headers['content-length']||0)<=MAX_PAYLOAD+2048,
    413,'Solicitud demasiado grande.');
  }
  const user=await identity(req,conf,host);
  check(canDo(user,collection,req.method==='POST'),403,'No tienes acceso a esta operación.');
  if(req.method==='GET'){
   let offset=Number(url.searchParams.get('offset')||0);
   let limit=Number(url.searchParams.get('limit')||1000);
   check(Number.isSafeInteger(offset)&&offset>=0&&Number.isSafeInteger(limit)&&limit>0&&limit<=MAX_BATCH,
    400,'Paginación inválida.');
   const rows=await getRows(conf,collection,'&offset='+offset+'&limit='+limit);
   return json(res,200,{rows:rows
    .filter(r=>ownerCheck(r.data,collection,user.userId,user.role))
    .map(r=>({record_id:r.record_id,updated_at:r.updated_at,data:sanitizeRow(r.data,collection,user.role)}))});
  }
  const body=req.body||{},action=body.action;
  check(['insert','update','delete'].includes(action),400,'Acción inválida.');
  const id=String(body.record_id||body.data?.id||'');
  check(ID.test(id),400,'Folio inválido.');
  if(action==='delete'){
   const current=await getRows(conf,collection,'&record_id=eq.'+encodeURIComponent(id)+'&limit=1');
   check(current.length===1,404,'Registro no encontrado.');
   check(ownerCheck(current[0].data,collection,user.userId,user.role,true),403,'Registro fuera de tu alcance.');
   const rows=await request(conf,'rh_records?collection=eq.'+encodeURIComponent(collection)+'&record_id=eq.'+encodeURIComponent(id),
    {method:'DELETE',prefer:'return=representation'});
   check(rows?.length===1,409,'Registro modificado por otro usuario.');
   return json(res,200,{rows:[]});
  }
  const data=body.data;
  validData(data,collection);
  check(data.id===id,400,'Folio no coincide.');
  check(ownerCheck(data,collection,user.userId,user.role,true),403,'Registro fuera de tu alcance.');
  const path='rh_records?collection=eq.'+encodeURIComponent(collection)+
   '&record_id=eq.'+encodeURIComponent(id);
  if(action==='insert'){
   const obj={collection,record_id:id,data,
    updated_at:new Date().toISOString()};
   const rows=await request(conf,'rh_records',{method:'POST',body:obj,prefer:'return=representation'});
   check(rows?.length===1,502,'No se confirmó el registro.');
   return json(res,201,{rows:rows.map(r=>({record_id:r.record_id,updated_at:r.updated_at}))});
  }
  const sello=body.sello;
  check(strictDate(sello),400,'Sello de edición inválido.');
  const current=await getRows(conf,collection,'&record_id=eq.'+encodeURIComponent(id)+'&limit=1');
  check(current.length===1,404,'Registro no encontrado.');
  check(current[0].updated_at===sello,409,'El registro fue actualizado por otra persona.');
  check(ownerCheck(current[0].data,collection,user.userId,user.role,true),403,'Registro fuera de tu alcance.');
  // Nunca borrar la contraseña almacenada al recibir un usuario sin ese campo.
  const stored=collection==='usuariosLogin' ? current[0].data:{};
  const payload=collection==='usuariosLogin'?
   {...stored,...data,password: typeof data.password==='string'&&data.password.length?data.password:stored.password}:data;
  const rows=await request(conf,path+'&updated_at=eq.'+encodeURIComponent(sello),{
   method:'PATCH',body:{data:payload,updated_at:new Date().toISOString()},prefer:'return=representation'});
  check(rows?.length===1,409,'El registro cambió mientras guardabas.');
  return json(res,200,{rows:rows.map(r=>({record_id:r.record_id,updated_at:r.updated_at}))});
 }catch(e){
  const status=e instanceof ApiError?e.status:500;
  if(status>=500)console.error('RH-DATOS: indisponible',e?.message);
  return json(res,status,{ok:false,message:status>=500?'No se pudo comunicar con el servidor.':e.message});
 }
};
