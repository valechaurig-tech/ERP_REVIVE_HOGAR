/**
 * Revive Hogar — Traspasos y saldos de corte.
 * Exclusivo para cuentas de Dirección validadas por /api/sesion.
 * No acepta roles ni IDs de usuario enviados desde el navegador.
 */
'use strict';
const { randomUUID } = require('node:crypto');
const HOSTS = new Set(['revive-hogar.vercel.app','revive-hogar-echauri-apps.vercel.app']);
const PREVIEW = /^revive-hogar-[a-z0-9]+-echauri-apps\.vercel\.app$/;
const ID = /^[A-Za-z0-9_-]{1,128}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function json(res,status,value){
  res.statusCode=status; res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  res.end(JSON.stringify(value));
}
class FinError extends Error { constructor(status,msg){super(msg);this.status=status;} }
function check(ok,status,msg){if(!ok)throw new FinError(status,msg);}
function config(env){
  const endpoint=(env.SUPABASE_URL||env.RH_SUPABASE_URL||'').replace(/\/$/,'');
  const key=env.SUPABASE_SERVICE_ROLE_KEY||env.RH_SUPABASE_SERVICE_ROLE_KEY;
  check(/^https:\/\/[a-z0-9.-]+$/i.test(endpoint)&&!!key,503,'Finanzas no está configurado en este entorno.');
  return {endpoint,key};
}
function getHost(req){
  const raw=String(req.headers.host||'').toLowerCase();
  check(HOSTS.has(raw)||PREVIEW.test(raw),400,'Host no autorizado.');
  return raw;
}
async function rest(conf,path,method='GET',body){
  const response=await fetch(conf.endpoint+'/rest/v1/'+path,{
    method,redirect:'error',cache:'no-store',
    headers:{apikey:conf.key,Authorization:'Bearer '+conf.key,
      'Accept':'application/json',...(body?{'Content-Type':'application/json'}:{})},
    ...(body?{body:JSON.stringify(body)}:{})
  });
  const text=await response.text();
  if(!response.ok) throw new FinError(response.status>=500?503:400,'La base no confirmó la operación.');
  try{return text?JSON.parse(text):null;}catch{throw new FinError(502,'Respuesta de base inválida.');}
}
async function direction(req,conf,host){
  const cookie=String(req.headers.cookie||'');
  check(cookie.includes('__Host-rh-session='),401,'Abre Revive e inicia sesión.');
  // Reutilizar la misma validación de sesión en servidor (firma, vigencia y cuenta real).
  const s=await fetch('https://'+host+'/api/sesion',{
    method:'GET',headers:{cookie,'Cache-Control':'no-store'},
    cache:'no-store',redirect:'error'
  });
  check(s.ok,401,'Tu sesión ha vencido. Vuelve a ingresar.');
  const session=await s.json();
  check(ID.test(String(session.userId||'')),401,'Sesión inválida.');
  const profiles=await rest(conf,'rh_records?collection=eq.usuariosLogin&record_id=eq.'+
    encodeURIComponent(session.userId)+'&select=data&limit=1');
  const u=profiles?.[0]?.data;
  check(u&&u.id===session.userId&&u.activo!==false&&u.rol==='Direccion',
    403,'Solo Dirección puede gestionar dinero de la empresa.');
  return session.userId;
}
function requestBody(req){
  check(/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||''),415,'Se requiere JSON.');
  check(Number(req.headers['content-length']||0)<6000,413,'Solicitud demasiado grande.');
  check(req.body&&typeof req.body==='object'&&!Array.isArray(req.body),400,'Solicitud inválida.');
  return req.body;
}
module.exports = async function handler(req,res){
  try{
    check(['GET','POST'].includes(req.method),405,'Método no admitido.');
    const host=getHost(req);
    if(req.method==='POST'){
      check(req.headers.origin==='https://'+host,403,'Origen no autorizado.');
      check(req.headers['x-rh-finanzas']==='1',403,'Solicitud no autorizada.');
    }
    const conf=config(process.env);
    const actor=await direction(req,conf,host);
    if(req.method==='GET'){
      const [t,a]=await Promise.all([
        rest(conf,'rh_fin_transferencias?select=id,request_id,fecha,cuenta_origen_id,cuenta_destino_id,monto,concepto,creado_en&order=creado_en.asc&limit=5000'),
        rest(conf,'rh_fin_aperturas?select=cuenta_id,fecha_corte,saldo_inicial,estado&order=cuenta_id.asc')
      ]);
      return json(res,200,{transferencias:t||[],aperturas:a||[],limite:5000});
    }
    const data=requestBody(req);
    if(data.action==='confirmar_apertura'){
      check(data.confirmado===true,400,'Debes confirmar que el saldo fue conciliado.');
      check(ID.test(String(data.cuentaId||'')),400,'Cuenta inválida.');
      check(DATE.test(String(data.fecha||'')),400,'Fecha inválida.');
      check(/^-?\d+(?:\.\d{1,2})?$/.test(String(data.saldo||'')),
        400,'Captura un saldo con hasta dos decimales.');
      const saldo=Number(data.saldo);
      check(Number.isFinite(saldo)&&Math.abs(saldo)<=999999999.99,
        400,'Saldo fuera de rango.');
      const ok=await rest(conf,'rpc/rh_fin_confirmar_apertura','POST',{
        p_cuenta:data.cuentaId,p_fecha:data.fecha,p_saldo:saldo,p_actor:actor
      });
      check(ok===true,502,'La confirmación no fue guardada.');
      return json(res,200,{ok:true,cuentaId:data.cuentaId});
    }
    check(UUID.test(String(data.requestId||'')),400,'Identificador de traspaso inválido.');
    check(DATE.test(String(data.fecha||''))&&!Number.isNaN(Date.parse(data.fecha+'T12:00:00Z')),
      400,'Fecha inválida.');
    check(ID.test(String(data.origen||''))&&ID.test(String(data.destino||''))&&data.origen!==data.destino,
      400,'Selecciona dos cuentas diferentes.');
    const monto=Number(data.monto);
    check(/^\d+(?:\.\d{1,2})?$/.test(String(data.monto||''))&&Number.isFinite(monto)&&monto>0&&monto<=999999999.99,
      400,'Monto inválido.');
    check(typeof data.concepto==='string'&&data.concepto.length<=500,400,'Descripción demasiado larga.');
    const result=await rest(conf,'rpc/rh_fin_registrar_traspaso','POST',{
      p_request_id:data.requestId,p_fecha:data.fecha,
      p_origen:data.origen,p_destino:data.destino,
      p_monto:monto,p_concepto:data.concepto,p_actor:actor
    });
    check(UUID.test(String(result)),502,'No se confirmó el folio del traspaso.');
    return json(res,201,{ok:true,folio:result});
  }catch(err){
    const status=err instanceof FinError ? err.status:500;
    if(status>=500)console.error('RH-FIN: servicio no disponible',err?.message);
    return json(res,status,{ok:false,message:status>=500?'No se pudo confirmar el movimiento. Reintenta con el mismo folio.':err.message});
  }
};
