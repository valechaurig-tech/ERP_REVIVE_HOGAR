/**
 * REVIVE HOGAR | Preparación de operaciones de compraventa (sin ejecución financiera).
 * Nunca cambia casas, presupuestos, bancos, pagos ni contratos.
 * Tasas/valores de comisión: escenarios internos, NO comisiones devengadas.
 */
const RH_ETAPAS_OPERACION = ['Borrador','En negociación','Apartado preliminar','Documentación','En notaría','Cancelada','Archivada'];
const RH_ESTADOS_ACTIVOS = ['Borrador','En negociación','Apartado preliminar','Documentación','En notaría'];

function puedeGestionarOperaciones() {
    return !!currentUser && ['Direccion','Administradora'].includes(currentUser.rol);
}
function dineroOperativo(valor, campo, max = 1e12) {
    const texto = String(valor ?? '').trim();
    if (!texto) return 0;
    const n = Number(texto);
    if (!Number.isFinite(n) || n < 0 || n > max || !/^\d+(\.\d{1,2})?$/.test(texto)) {
        throw Object.assign(new Error('El importe debe ser positivo, sin separadores y con máximo dos decimales.'),{campo,codigo:'RH-SALE-004'});
    }
    return Math.round(n * 100) / 100;
}
function calcularComisionesOperacion(datos) {
    const precio = dineroOperativo(datos.precioPactado,'op-precio');
    const una = (tipo,valor,campo) => {
        if (!['Porcentaje','Monto fijo'].includes(tipo)) return 0;
        const numero = dineroOperativo(valor,campo,tipo==='Porcentaje'?100:1e12);
        return Math.round((tipo==='Porcentaje' ? precio * numero / 100 : numero) * 100) / 100;
    };
    const captacion = una(datos.tipoComisionCaptacion,datos.comisionCaptacion,'op-comision-captacion');
    const cierre = una(datos.tipoComisionCierre,datos.comisionCierre,'op-comision-cierre');
    if (captacion + cierre > precio && precio > 0) {
        throw Object.assign(new Error('Las comisiones estimadas exceden el precio pactado.'),{campo:'op-comision-cierre',codigo:'RH-SALE-005'});
    }
    // Misma persona en dos funciones: resumen por persona, no dos pagos.
    const porAsesor = {};
    if(datos.asesorCaptacionId) porAsesor[datos.asesorCaptacionId]=(porAsesor[datos.asesorCaptacionId]||0)+captacion;
    if(datos.asesorCierreId) porAsesor[datos.asesorCierreId]=(porAsesor[datos.asesorCierreId]||0)+cierre;
    for(const id of Object.keys(porAsesor)) porAsesor[id]=Math.round(porAsesor[id]*100)/100;
    return {precioPactado:precio,comisionCaptacionEstimada:captacion,comisionCierreEstimada:cierre,
        totalComisionesEstimadas:Math.round((captacion+cierre)*100)/100,porAsesor};
}

function normalizarOperacionVenta(datos, anterior, casas, compradores, usuarios, operaciones) {
    const etapa = String(datos.etapa || 'Borrador');
    if(!RH_ETAPAS_OPERACION.includes(etapa)) throw Object.assign(new Error('Etapa de operación no válida.'),{campo:'op-etapa',codigo:'RH-SALE-001'});
    const casa = casas.find(x=>x.id===datos.casaId);
    const comprador = compradores.find(x=>x.id===datos.compradorId && x.estatus!=='Archivado');
    if(!casa) throw Object.assign(new Error('El inmueble no existe.'),{campo:'op-casa',codigo:'RH-SALE-002'});
    if(!comprador) throw Object.assign(new Error('Selecciona un comprador activo válido.'),{campo:'op-comprador',codigo:'RH-SALE-003'});
    if(comprador.propiedadInteresId && comprador.propiedadInteresId!==casa.id) {
        throw Object.assign(new Error('La propiedad de interés del comprador no coincide; confirma o corrige su ficha.'),{campo:'op-comprador',codigo:'RH-SALE-006'});
    }
    if(['Vendida','Cerrada'].includes(casa.estatusPipeline) && !anterior)
        throw Object.assign(new Error('Este inmueble ya aparece vendido/cerrado en el Pipeline.'),{campo:'op-casa',codigo:'RH-SALE-007'});
    if(RH_ESTADOS_ACTIVOS.includes(etapa) && operaciones.some(x=>x.id!==anterior?.id && x.casaId===casa.id && RH_ESTADOS_ACTIVOS.includes(x.etapa))) {
        throw Object.assign(new Error('Ya existe una operación activa para esta propiedad.'),{campo:'op-casa',codigo:'RH-SALE-008'});
    }
    for(const [id,campo] of [[datos.asesorCaptacionId,'op-captador'],[datos.asesorCierreId,'op-vendedor']]) {
        if(id && !usuarios.some(u=>u.id===id && u.rol==='Vendedor')) {
            throw Object.assign(new Error('El asesor seleccionado no existe o no es vendedor.'),{campo,codigo:'RH-SALE-009'});
        }
    }
    const calculo=calcularComisionesOperacion(datos);
    if(etapa==='Apartado preliminar' && calculo.precioPactado<=0)
        throw Object.assign(new Error('Captura el precio pactado antes de apartar.'),{campo:'op-precio',codigo:'RH-SALE-010'});
    return {
        ...(anterior||{}),
        id:anterior?.id||DB.getId(), casaId:casa.id, compradorId:comprador.id, etapa,
        asesorCaptacionId:String(datos.asesorCaptacionId||''),
        asesorCierreId:String(datos.asesorCierreId||''),
        tipoComisionCaptacion:String(datos.tipoComisionCaptacion||'Porcentaje'),
        comisionCaptacion:dineroOperativo(datos.comisionCaptacion,'op-comision-captacion', datos.tipoComisionCaptacion==='Porcentaje'?100:1e12),
        tipoComisionCierre:String(datos.tipoComisionCierre||'Porcentaje'),
        comisionCierre:dineroOperativo(datos.comisionCierre,'op-comision-cierre', datos.tipoComisionCierre==='Porcentaje'?100:1e12),
        precioPactado:calculo.precioPactado,
        comisionCaptacionEstimada:calculo.comisionCaptacionEstimada,
        comisionCierreEstimada:calculo.comisionCierreEstimada,
        totalComisionesEstimadas:calculo.totalComisionesEstimadas,
        observaciones:String(datos.observaciones||'').trim().slice(0,1500),
        fechaCreacion:anterior?.fechaCreacion||new Date().toISOString(),
        fechaActualizacion:new Date().toISOString(),actualizadoPor:currentUser?.id||'',
        // Ninguna operación realiza cobro, pago, devengo ni firma legal.
        naturaleza:'planeacion_no_financiera'
    };
}
function opcionOperacion(id,text,selected='') {
    return '<option value="'+escapeHtml(id)+'"'+(id===selected?' selected':'')+'>'+escapeHtml(text)+'</option>';
}
function abrirEditorOperacion(id='') {
    if(!puedeGestionarOperaciones())return;
    const registro=id?DB.get('operacionesVenta').find(x=>x.id===id):null;
    if(id&&!registro)return;
    const form=document.getElementById('form-operacion');
    if(!form)return;
    form.reset();
    const poner=(s,v)=>{const el=document.getElementById('op-'+s);if(el)el.value=v??'';};
    poner('id',registro?.id||'');
    const casas=DB.get('casas'), compradores=DB.get('compradores'), asesores=DB.get('usuariosLogin').filter(x=>x.rol==='Vendedor');
    document.getElementById('op-casa').innerHTML=opcionOperacion('','Seleccionar inmueble', '')
       + casas.map(c=>opcionOperacion(c.id,c.direccionPropiedad||c.nombreCompleto||c.id,registro?.casaId)).join('');
    document.getElementById('op-comprador').innerHTML=opcionOperacion('','Seleccionar comprador','')
       + compradores.filter(x=>x.estatus!=='Archivado'||x.id===registro?.compradorId)
           .map(x=>opcionOperacion(x.id,x.nombreCompleto,registro?.compradorId)).join('');
    for(const campo of ['captador','vendedor']) {
        const select=document.getElementById('op-'+campo);
        const selected=registro?.[campo==='captador'?'asesorCaptacionId':'asesorCierreId']||'';
        select.innerHTML=opcionOperacion('','Sin definir','')
            + asesores.map(a=>opcionOperacion(a.id,a.displayName||a.id,selected)).join('');
        select.value=selected;
    }
    for(const [f,k] of [['casa','casaId'],['comprador','compradorId'],['etapa','etapa'],
        ['precio','precioPactado'],['comision-captacion','comisionCaptacion'],['comision-cierre','comisionCierre'],
        ['tipo-captacion','tipoComisionCaptacion'],['tipo-cierre','tipoComisionCierre'],
        ['observaciones','observaciones']])poner(f,registro?.[k]??(f==='etapa'?'Borrador':f.startsWith('tipo-')?'Porcentaje':''));
    document.getElementById('op-editor').classList.remove('hidden');
    document.getElementById('op-editor-titulo').textContent=registro?'Editar preparación de venta':'Nueva preparación de venta';
    actualizarEstimacionOperacion();
}
function cerrarEditorOperacion(){document.getElementById('op-editor')?.classList.add('hidden');}
function datosFormularioOperacion(){
    const val=x=>document.getElementById('op-'+x)?.value||'';
    return {casaId:val('casa'),compradorId:val('comprador'),etapa:val('etapa'),precioPactado:val('precio'),
       asesorCaptacionId:val('captador'),asesorCierreId:val('vendedor'),
       tipoComisionCaptacion:val('tipo-captacion'),comisionCaptacion:val('comision-captacion'),
       tipoComisionCierre:val('tipo-cierre'),comisionCierre:val('comision-cierre'),
       observaciones:val('observaciones')};
}
function actualizarEstimacionOperacion(){
    const el=document.getElementById('op-estimacion');if(!el)return;
    try{
        const c=calcularComisionesOperacion(datosFormularioOperacion());
        el.textContent='Comisión captación: '+formatearMoneda(c.comisionCaptacionEstimada)
            +' · Comisión cierre: '+formatearMoneda(c.comisionCierreEstimada)
            +' · Total estimado: '+formatearMoneda(c.totalComisionesEstimadas);
    }catch(error){el.textContent=(error.codigo||'RH-SALE-004')+': '+error.message;}
}
function guardarOperacionVenta(e){
    e.preventDefault();
    if(!puedeGestionarOperaciones())return;
    const id=document.getElementById('op-id').value, anteriores=DB.get('operacionesVenta');
    const anterior=id?anteriores.find(x=>x.id===id):null;
    if(id&&!anterior)return;
    let nuevo;
    try{
        nuevo=normalizarOperacionVenta(datosFormularioOperacion(),anterior,
            DB.get('casas'),DB.get('compradores'),DB.get('usuariosLogin'),anteriores);
    }catch(error){informarErrorCaptura(error.campo||'op-casa',error.message,error.codigo||'RH-SALE-000');return;}
    DB.set('operacionesVenta',anterior?anteriores.map(x=>x.id===id?nuevo:x):[...anteriores,nuevo]);
    if(typeof logAction==='function')logAction('Preparación de venta actualizada: '+nuevo.id+' ('+nuevo.etapa+')');
    cerrarEditorOperacion();renderOperacionesVenta();
}
function archivarOperacionVenta(id){
    if(!puedeGestionarOperaciones())return;
    const arr=DB.get('operacionesVenta'),x=arr.find(x=>x.id===id);
    if(!x||x.etapa==='Archivada'||!confirmAction('¿Archivar esta preparación sin borrar el registro?'))return;
    DB.set('operacionesVenta',arr.map(a=>a.id===id?{...a,etapa:'Archivada',fechaActualizacion:new Date().toISOString()}:a));
    if(typeof logAction==='function')logAction('Preparación de venta archivada: '+id);
    renderOperacionesVenta();
}
function renderOperacionesVenta(){
    if(!puedeGestionarOperaciones())return;
    const casas=new Map(DB.get('casas').map(c=>[c.id,c.direccionPropiedad||c.nombreCompleto||c.id]));
    const personas=new Map(DB.get('compradores').map(c=>[c.id,c.nombreCompleto]));
    const asesores=new Map(DB.get('usuariosLogin').map(u=>[u.id,u.displayName||u.id]));
    const arr=DB.get('operacionesVenta');
    const tabla=document.querySelector('#table-operaciones tbody');if(!tabla)return;
    const filtro=document.getElementById('op-filtrar-archivadas')?.checked;
    const activos=arr.filter(x=>x.etapa!=='Archivada');
    const total=document.getElementById('op-total');if(total)total.textContent=String(activos.length);
    const estimado=document.getElementById('op-comisiones-total');
    if(estimado)estimado.textContent=formatearMoneda(activos.reduce((s,x)=>s+Number(x.totalComisionesEstimadas||0),0));
    tabla.innerHTML=arr.filter(x=>filtro||x.etapa!=='Archivada').map(x=>'<tr>'
        +'<td>'+escapeHtml(casas.get(x.casaId)||'Propiedad no encontrada')+'</td>'
        +'<td>'+escapeHtml(personas.get(x.compradorId)||'Comprador no encontrado')+'</td>'
        +'<td>'+escapeHtml(x.etapa)+'</td>'
        +'<td>'+escapeHtml(asesores.get(x.asesorCaptacionId)||'Sin definir')+'</td>'
        +'<td>'+escapeHtml(asesores.get(x.asesorCierreId)||'Sin definir')+'</td>'
        +'<td>'+formatearMoneda(x.precioPactado)+'</td>'
        +'<td>'+formatearMoneda(x.totalComisionesEstimadas)+'</td>'
        +'<td><button type="button" class="btn btn-secondary btn-sm" data-op-edit="'+escapeHtml(x.id)+'">Editar</button> '
        +(x.etapa==='Archivada'?'':'<button type="button" class="btn btn-secondary btn-sm" data-op-archive="'+escapeHtml(x.id)+'">Archivar</button>')+'</td></tr>')
        .join('')||'<tr><td colspan="8" class="celda-vacia">Aún no hay operaciones registradas.</td></tr>';
}
function inicializarOperacionesVenta(){
    document.getElementById('form-operacion')?.addEventListener('submit',guardarOperacionVenta);
    document.getElementById('op-nueva')?.addEventListener('click',()=>abrirEditorOperacion());
    document.getElementById('op-cancelar')?.addEventListener('click',cerrarEditorOperacion);
    document.getElementById('op-filtrar-archivadas')?.addEventListener('change',renderOperacionesVenta);
    document.getElementById('form-operacion')?.addEventListener('input',actualizarEstimacionOperacion);
    document.querySelector('#table-operaciones tbody')?.addEventListener('click',e=>{
        const editar=e.target.closest('[data-op-edit]'),archivar=e.target.closest('[data-op-archive]');
        if(editar)abrirEditorOperacion(editar.dataset.opEdit);
        if(archivar)archivarOperacionVenta(archivar.dataset.opArchive);
    });
}
