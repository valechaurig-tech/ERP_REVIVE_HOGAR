import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const code=readFileSync(new URL('../js/prueba-nota.js',import.meta.url),'utf8');
const KEY='rh_pruebas_borrador_temporal_v1';
function fake({storage=new Map(),owner='qa_1',capture=false,fetcher,uuid='00000000-0000-4000-8000-000000000011'}={}){
 const elements=new Map(),listeners=new Map(),calls=[];
 const names=['','panel','receipt','privacy','remove','preview-image','trigger','report-entry','message','comment','send','type','confirmed','context','preview-label','privacy-text','capture','attach','file','form','folio','dismiss'];
 for(const name of names){
  const elem={id:name,hidden:['','panel','receipt','privacy','remove','preview-image'].includes(name),
   value:name==='type'?'error':'',checked:false,disabled:false,readOnly:false,
   textContent:'',dataset:{},src:'',isConnected:true,scrollTop:0,
   setAttribute(){},removeAttribute(){delete this.src;},focus(){},
   querySelectorAll(){return[];},
   addEventListener(event,fn){listeners.set(name+':'+event,fn);}};
  elements.set('rh-pruebas'+(name?'-'+name:''),elem);
 }
 const get=name=>elements.get('rh-pruebas-'+name);
 const context={console,Date,Object,Uint8Array,AbortController,DOMException,TextDecoder,
  crypto:{randomUUID:()=>uuid},
  currentUser:{id:owner},activeModuleId:'mod-dashboard',
  RH_MODULE_LABELS:{'mod-dashboard':'Panel'},
  window:{RH_CONFIG:{APP_VERSION:'QA1'},
   sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),
      removeItem:k=>storage.delete(k)},
   addEventListener:(event,fn)=>listeners.set('window:'+event,fn)},
  document:{getElementById:id=>elements.get(id)||null,
    querySelector:()=>({content:'QA1'}),activeElement:null,body:{}},
  rhPruebasImagen:{fromPage:async()=>{
     if(!capture)throw Error('Captura deshabilitada en prueba');
     return 'BASE64_SECRETO_NO_PERSISTIR';
    },fromFile:async()=>{throw Error('Sin archivo');}},
  setTimeout:()=>1,clearTimeout:()=>{},
  fetch:async(url,opts)=>{const body=JSON.parse(opts.body);calls.push(body);
    return fetcher?fetcher(body):{ok:true,status:200,json:async()=>({folio:'RH-199'})};}
 };
 vm.createContext(context);
 vm.runInContext(code+';globalThis.qaPruebas=rhPruebas;',context,{timeout:5000});
 const emit=(name,event)=>listeners.get(name+':'+event)?.({
    currentTarget:get(name),preventDefault(){}});
 const open=()=>{context.qaPruebas.init();context.qaPruebas.visible(true);emit('trigger','click');};
 return {storage,calls,get,open,emit,context};
}
async function settle(){for(let i=0;i<12;i++)await Promise.resolve();
 await new Promise(resolve=>setImmediate(resolve));}
test('el comentario se recupera despues de recargar la misma pestaña',async()=>{
 const q=fake();q.open();q.get('comment').value='Revisar presupuesto';
 q.get('type').value='mejora';q.emit('comment','input');q.emit('type','change');
 const saved=JSON.parse(q.storage.get(KEY));
 assert.equal(saved.comment,'Revisar presupuesto');
 const next=fake({storage:q.storage});next.open();
 assert.equal(next.get('comment').value,'Revisar presupuesto');
 assert.equal(next.get('type').value,'mejora');
});
test('no se muestran borradores de otro usuario',async()=>{
 const q=fake();q.open();q.get('comment').value='Privado';
 q.emit('comment','input');
 const next=fake({storage:q.storage,owner:'qa_2'});next.open();
 assert.equal(next.get('comment').value,'');
 assert.equal(next.storage.has(KEY),false);
});
test('caduca a los treinta minutos',async()=>{
 const q=fake();q.open();q.get('comment').value='Antiguo';
 q.emit('comment','input');
 const record=JSON.parse(q.storage.get(KEY));record.savedAt=Date.now()-31*60000;
 q.storage.set(KEY,JSON.stringify(record));
 const next=fake({storage:q.storage});next.open();
 assert.equal(next.get('comment').value,'');
 assert.equal(next.storage.has(KEY),false);
});
test('las capturas no quedan guardadas en la sesion del navegador',async()=>{
 const q=fake({capture:true});q.open();await settle();
 assert.match(q.get('preview-image').src,/BASE64_SECRETO/);
 const raw=q.storage.get(KEY);
 assert.equal(raw.includes('BASE64_SECRETO'),false);
 assert.equal(JSON.parse(raw).missingFile,true);
 const reload=fake({storage:q.storage,capture:true});reload.open();await settle();
 assert.match(reload.get('message').textContent,/vuelve a adjuntar/);
 assert.equal(reload.get('preview-image').src,'');
});
test('el reintento sin adjunto conserva el mismo requestId tras la recarga',async()=>{
 const q=fake({uuid:'00000000-0000-4000-8000-000000000011',
    fetcher:async()=>{throw Error('QA: sin red')}});
 q.open();await settle();q.get('comment').value='Problema de QA';q.emit('comment','input');
 q.emit('form','submit');await settle();
 assert.equal(q.calls.length,1);
 assert.equal(JSON.parse(q.storage.get(KEY)).pending.requestId,q.calls[0].requestId);
 const again=fake({storage:q.storage,uuid:'00000000-0000-4000-8000-000000000022'});
 again.open();assert.equal(again.get('send').textContent,'Reintentar envío');
 again.emit('form','submit');await settle();
 assert.equal(again.calls.length,1);
 assert.equal(again.calls[0].requestId,q.calls[0].requestId);
 assert.equal(again.get('folio').textContent,'RH-199');
 assert.equal(q.storage.has(KEY),false);
});
test('el borrador se elimina al confirmar envio y al cerrar la sesion',async()=>{
 const q=fake();q.open();await settle();q.get('comment').value='Comentario';
 q.emit('comment','input');assert.equal(q.storage.has(KEY),true);
 q.emit('form','submit');await settle();assert.equal(q.storage.has(KEY),false);
 const other=fake();other.open();other.get('comment').value='Otro borrador';
 other.emit('comment','input');other.context.qaPruebas.visible(false);
 assert.equal(other.storage.has(KEY),false);
});
