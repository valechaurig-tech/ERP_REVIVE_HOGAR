/**
 * Revive Hogar — métricas colectivas mínimas, sin identificadores personales.
 * Escritura por sesión ERP validada y lectura exclusiva de Dirección.
 */
'use strict';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ID=/^[A-Za-z0-9_-]{1,128}$/;
const HOSTS=new Set(['revive-hogar.vercel.app','revive-hogar-echauri-apps.vercel.app']);
const PREVIEW=/^revive-hogar-[a-z0-9]+-echauri-apps\.vercel\.app$/;
const ROLES=new Set(['Direccion','Administradora','Marketing','Vendedor']);
const EVENTS=new Set(['module_open','form_open','form_attempt','tab_open','session_start','transition']);
const MODULES=new Set(['mod-planner','mod-proyectos','mod-dashboard','mod-marketing',
 'mod-vendedor','mod-compradores','mod-operaciones','mod-administradora','mod-pipeline',
 'mod-gastos','mod-gastos-empresa','mod-referidos','mod-configuracion','mod-auditoria','mod-usuarios']);
const FORMS=new Set(['form-campana','form-prospecto','form-gestion-prospecto',
 'form-expediente-admin','form-pipeline','form-costo-remodelacion','form-montos-casa',
 'form-nuevo-vendedor','form-usuario','form-mi-perfil','form-tarea','form-mensaje-caso',
 'form-autorizacion','form-pago-referido','form-comprador','form-operacion',
 'form-nueva-propiedad','form-cuenta-bancaria','form-movimiento-empresa','form-copropietario',
 'form-traspaso-empresa']);
const TABS=new Set(['detalle:resumen','detalle:historial','detalle:expediente','detalle:remodelacion',
 'detalle:recorrido','detalle:comunicacion','captura:contacto','captura:identidad',
 'captura:adeudos','captura:datos','captura:ubicacion','captura:documentos']);
function allowed(event,target){
 if(event==='module_open')return MODULES.has(target);
 if(event==='form_open'||event==='form_attempt')return FORMS.has(target);
 if(event==='tab_open')return TABS.has(target);
 if(event==='session_start')return target==='app';
 if(event==='transition'){
  const x=String(target).split('>');
  return x.length===2&&MODULES.has(x[0])&&MODULES.has(x[1])&&x[0]!==x[1];
 }
 return false;
}
class ApiError extends Error{constructor(status,msg){super(msg);this.status=status;}}
function check(ok,status,msg){if(!ok)throw new ApiError(status,msg);}
function json(res,status,data){
 res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 res.end(JSON.stringify(data));
}
function config(env){
 const url=(env.SUPABASE_URL||env.RH_SUPABASE_URL||'').replace(/\/$/,'');
 const key=env.SUPABASE_SERVICE_ROLE_KEY||env.RH_SUPABASE_SERVICE_ROLE_KEY;
 check(/^https:\/\/[a-z0-9.-]+$/i.test(url)&&!!key,503,'Analítica no disponible.');
 return {url,key};
}
async function rest(conf,path,method='GET',data){
 const response=await fetch(conf.url+'/rest/v1/'+path,{
  method,cache:'no-store',redirect:'error',
  headers:{apikey:conf.key,Authorization:'Bearer '+conf.key,Accept:'application/json',
   ...(data?{'Content-Type':'application/json'}:{})},
  ...(data?{body:JSON.stringify(data)}:{})
 });
 const raw=await response.text();
 if(!response.ok)throw new ApiError(response.status>=500?503:400,'No se confirmó el registro.');
 try{return raw?JSON.parse(raw):null;}catch{throw new ApiError(502,'Respuesta inválida de base.');}
}
async function usuario(req,conf,host){
 const cookie=String(req.headers.cookie||'');
 check(cookie.includes('__Host-rh-session='),401,'Inicia sesión en Revive.');
 const session=await fetch('https://'+host+'/api/sesion',{
  method:'GET',headers:{cookie,'Cache-Control':'no-store'},cache:'no-store',redirect:'error'
 });
 check(session.ok,401,'Tu sesión venció.');
 const data=await session.json();
 check(ID.test(String(data.userId||'')),401,'Sesión inválida.');
 const result=await rest(conf,'rh_records?collection=eq.usuariosLogin&record_id=eq.'+
  encodeURIComponent(data.userId)+'&select=data&limit=1');
 const profile=result?.[0]?.data;
 check(profile&&profile.id===data.userId&&profile.activo!==false&&ROLES.has(profile.rol),
  403,'Cuenta sin acceso.');
 return profile.rol;
}
module.exports=async function(req,res){
 try{
  check(['GET','POST'].includes(req.method),405,'Método no permitido.');
  const host=String(req.headers.host||'').toLowerCase();
  check(HOSTS.has(host)||PREVIEW.test(host),400,'Host inválido.');
  if(req.method==='POST'){
   check(req.headers.origin==='https://'+host&&req.headers['x-rh-uso']==='1',
    403,'Solicitud no autorizada.');
  }
  const conf=config(process.env);
  const role=await usuario(req,conf,host);
  if(req.method==='GET'){
   check(role==='Direccion',403,'Solo Dirección puede consultar las métricas del equipo.');
   const cutoff=new Date(Date.now()-31*86400000).toISOString().slice(0,10);
   const data=await rest(conf,'rh_uso_diario?select=dia,rol,evento,destino,conteo&dia=gte.'+
     cutoff+'&order=dia.desc&limit=5000');
   return json(res,200,{rows:data||[],aggregate:true,dias:30});
  }
  check(req.body&&typeof req.body==='object'&&!Array.isArray(req.body),
   400,'Lote inválido.');
  const {batchId,events}=req.body;
  check(UUID.test(String(batchId||''))&&Array.isArray(events)&&events.length<=100,
   400,'Lote inválido.');
  const cutoff=Date.now()-9*86400000;
  const sanitized=events.map(e=>{
   check(e&&typeof e==='object'&&!Array.isArray(e),400,'Evento inválido.');
   const date=Date.parse(String(e.day)+'T12:00:00Z');
   check(/^\d{4}-\d{2}-\d{2}$/.test(String(e.day))&&Number.isFinite(date)&&date>cutoff&&date<Date.now()+2*86400000,
    400,'Día inválido.');
   check(EVENTS.has(e.event)&&allowed(e.event,e.target),400,'Destino no permitido.');
   check(Number.isSafeInteger(e.count)&&e.count>0&&e.count<=1000,400,'Conteo inválido.');
   return {day:e.day,event:e.event,target:e.target,count:e.count};
  });
  const accepted=await rest(conf,'rpc/rh_uso_registrar_lote','POST',{
   p_id:batchId,p_rol:role,p_eventos:sanitized
  });
  check(typeof accepted==='boolean',502,'No se confirmó el lote.');
  return json(res,200,{ok:true,duplicate:!accepted});
 }catch(err){
  const status=err instanceof ApiError?err.status:500;
  if(status>=500)console.error('RH-USO: fallo del servicio',err?.message);
  return json(res,status,{ok:false,message:status>=500?'Métricas temporalmente no disponibles.':err.message});
 }
};
