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
 if(collection==='prospectos'||collection==='casas')return row?.vendedorId===userId;
 if(collection==='compradores')return row?.asesorId===userId;
 if(collection==='operacionesVenta')return row?.vendedorId===userId||row?.asesorId===userId;
 if(collection==='archivos')return true; // El propietario se verifica con la ficha del prospecto.
 if(['auditoria','historial','tareas','alertas'].includes(collection))return write ? row?.usuarioId===userId||row?.actorId===userId : true;
 return true;
}
function sanitizeRow(row,collection,role,userId){
 if(!row||typeof row!=='object')return row;
 const data=JSON.parse(JSON.stringify(row));
 if(collection==='usuariosLogin'){
   delete data.password;
   // Un asesor solo necesita sus propios contactos y el nombre/rol de sus colegas.
   if(role==='Vendedor'&&data.id!==userId){
     delete data.correo;
     delete data.telefono;
     delete data.nombreLuna;
   }
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
async function verificarPropiedadArchivo(conf,user,row){
 if(user.role!=='Vendedor')return;
 const prospectoId=String(row?.prospectoId||'');
 check(ID.test(prospectoId),403,'El archivo debe pertenecer a tu prospecto.');
 const candidates=await getRows(conf,'prospectos',
   '&record_id=eq.'+encodeURIComponent(prospectoId)+'&limit=1');
 check(candidates[0]?.data?.vendedorId===user.userId,403,
   'No puedes modificar documentos de otro vendedor.');
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
   return json(res,200,{rows:rows.filter(r=>r.data?.id&&r.data.activo!==false).map(r=>({
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
  if(req.method==='GET'&&!canDo(user,collection,false))
    return json(res,200,{rows:[]}); // No filtradas: ningún dato ajeno se revela.
  const personal=req.method==='POST' && collection==='usuariosLogin' &&
    req.body?.action==='update' && String(req.body.record_id||'')===user.userId;
  if(req.method==='POST')
    check(canDo(user,collection,true)||personal,403,'No tienes acceso a esta operación.');
  if(req.method==='GET'){
   let offset=Number(url.searchParams.get('offset')||0);
   let limit=Number(url.searchParams.get('limit')||1000);
   check(Number.isSafeInteger(offset)&&offset>=0&&Number.isSafeInteger(limit)&&limit>0&&limit<=MAX_BATCH,
    400,'Paginación inválida.');
   const rows=await getRows(conf,collection,'&offset='+offset+'&limit='+limit);
   let ownProspects=null;
   if(user.role==='Vendedor'&&['archivos','historial'].includes(collection)){
     const own=await getRows(conf,'prospectos','&limit=1000');
     ownProspects=new Set(own.filter(p=>p.data?.vendedorId===user.userId)
       .map(p=>p.record_id));
   }
   return json(res,200,{rows:rows
    .filter(r=>ownerCheck(r.data,collection,user.userId,user.role))
    .filter(r=>!ownProspects||
      (collection==='archivos'?ownProspects.has(r.data?.prospectoId):
       (ownProspects.has(r.data?.prospectoId)||r.data?.usuarioId===user.userId)))
    .map(r=>({record_id:r.record_id,updated_at:r.updated_at,data:sanitizeRow(r.data,collection,user.role,user.userId)}))});
  }
  const body=req.body||{},action=body.action;
  check(['insert','update','delete'].includes(action),400,'Acción inválida.');
  const id=String(body.record_id||body.data?.id||'');
  check(ID.test(id),400,'Folio inválido.');
  if(action==='delete'){
   check(!(user.role==='Vendedor'&&['auditoria','historial'].includes(collection)),403,
     'No se permite borrar auditoría.');
   const current=await getRows(conf,collection,'&record_id=eq.'+encodeURIComponent(id)+'&limit=1');
   check(current.length===1,404,'Registro no encontrado.');
   check(ownerCheck(current[0].data,collection,user.userId,user.role,true),403,'Registro fuera de tu alcance.');
   if(collection==='archivos')await verificarPropiedadArchivo(conf,user,current[0].data);
   const rows=await request(conf,'rh_records?collection=eq.'+encodeURIComponent(collection)+'&record_id=eq.'+encodeURIComponent(id),
    {method:'DELETE',prefer:'return=representation'});
   check(rows?.length===1,409,'Registro modificado por otro usuario.');
   return json(res,200,{rows:[]});
  }
  const data=body.data;
  validData(data,collection);
  check(data.id===id,400,'Folio no coincide.');
  if(collection==='archivos')await verificarPropiedadArchivo(conf,user,data);
  if(user.role==='Vendedor'&&['auditoria','historial'].includes(collection)) {
    check(action==='insert',403,'No se permite modificar historial existente.');
    data.actorId=user.userId;
    data.usuarioId=user.userId;
  } else check(ownerCheck(data,collection,user.userId,user.role,true),403,'Registro fuera de tu alcance.');
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
  if(collection==='archivos')await verificarPropiedadArchivo(conf,user,current[0].data);
  // Nunca borrar la contraseña almacenada al recibir un usuario sin ese campo.
  const stored=collection==='usuariosLogin' ? current[0].data:{};
  if(personal) {
    // Todos pueden actualizar su propio perfil, nunca su rol, estado o identidad.
    check(stored.id===user.userId && stored.rol===user.role &&
      data.rol===stored.rol && data.tipo===stored.tipo &&
      data.activo===stored.activo && data.id===stored.id,
      403,'No puedes cambiar los permisos de tu cuenta.');
    const permitted=new Set(['id','rol','tipo','activo','displayName','nombreLuna',
       'correo','telefono','password']);
    check(Object.keys(data).every(k=>permitted.has(k)),
      403,'El perfil contiene campos no permitidos.');
    const nombre=String(data.displayName||'').trim();
    check(nombre.length>=2 && nombre.length<=120,400,'Nombre inválido.');
    for(const key of ['correo','telefono','nombreLuna']) {
      check(typeof data[key]==='string'&&data[key].length<=180,400,
        'Campo de perfil inválido.');
    }
    if(data.password) check(typeof data.password==='string'&&data.password.length>=10&&
      data.password.length<=128&&/[a-zA-Z]/.test(data.password)&&/\d/.test(data.password),
      400,'La nueva contraseña requiere 10 caracteres, letras y números.');
  }
  const payload=collection==='usuariosLogin'?
   (personal ?
     {...stored,displayName:data.displayName,nombreLuna:data.nombreLuna,
       correo:data.correo,telefono:data.telefono,
       password:data.password||stored.password} :
     {...stored,...data,password:typeof data.password==='string'&&data.password.length?data.password:stored.password}) : data;
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
