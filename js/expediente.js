/**
 * Revive Hogar — expediente profesional de Administradora (Regi).
 */

const RH_DOCUMENTOS_EXPEDIENTE = [
    { tipo: 'ine_frente', nombre: 'INE vigente y legible · frente', requerido: true },
    { tipo: 'ine_reverso', nombre: 'INE vigente y legible · reverso', requerido: true },
    { tipo: 'acta_nacimiento', nombre: 'Acta de nacimiento (no mayor a 6 meses)', requerido: true },
    { tipo: 'curp', nombre: 'CURP', requerido: true },
    { tipo: 'constancia_fiscal', nombre: 'Constancia de situación fiscal', requerido: true },
    { tipo: 'acta_matrimonio', nombre: 'Acta de matrimonio (no mayor a 6 meses)', condicional: 'matrimonio' },
    { tipo: 'escritura_original', nombre: 'Escritura original y completa', requerido: true },
    { tipo: 'boleta_registral', nombre: 'Boleta registral', requerido: true },
    { tipo: 'aviso_transmision', nombre: 'Aviso de transmisión patrimonial', requerido: true },
    { tipo: 'recibo_predial', nombre: 'Recibo de pago predial', requerido: true },
    { tipo: 'recibo_agua', nombre: 'Recibo de pago de agua', requerido: true },
    { tipo: 'recibos_cfe_6m', nombre: 'Últimos 6 meses de recibos CFE', condicional: 'cfe' },
    { tipo: 'estado_cuenta', nombre: 'Estado de cuenta del vendedor (no mayor a 2 meses)', condicional: 'cuenta' },
    { tipo: 'poder', nombre: 'Poder', condicional: 'poder' },
    { tipo: 'contrato_firmado', nombre: 'Contrato de prestación de servicios firmado', condicional: 'kit' },
    { tipo: 'privacidad_firmado', nombre: 'Aviso de privacidad firmado', condicional: 'kit' },
    { tipo: 'pantallazo_gravamen', nombre: 'Pantallazo de gravamen', condicional: 'gravamen' },
    { tipo: 'isr_exencion', nombre: 'Soporte ISR · cómo se exenta (INE o CFE)', requerido: true },
    { tipo: 'convenio_desocupacion', nombre: 'Convenio de desocupación voluntaria', condicional: 'invasion' },
    { tipo: 'carta_indemnizacion', nombre: 'Carta de indemnización firmada', condicional: 'abonos' },
    { tipo: 'oferta_formal_firmada', nombre: 'Oferta formal de compra firmada', condicional: 'oferta' }
];

function getMetaChecklist(p, tipo) {
    return p?.checklistDocumental?.[tipo] || {};
}

function documentoAplica(p, doc) {
    if (!doc.condicional) return true;
    const d = p.datosExpediente || {};
    const meta = getMetaChecklist(p, doc.tipo);
    if (meta.aplica === 'No') return false;
    if (doc.condicional === 'matrimonio') return d.esCasado === 'Si';
    if (doc.condicional === 'cfe') return p.cfeNombreYDomicilio === 'Si';
    if (doc.condicional === 'invasion') return p.estatusPropiedad === 'Invadida' || p.invadida === 'Si';
    if (doc.condicional === 'kit') return typeof kitAperturaDisponible === 'function' && kitAperturaDisponible(p);
    if (doc.condicional === 'poder') return d.requierePoder === 'Si' || meta.aplica === 'Si';
    if (doc.condicional === 'oferta') {
        return [RH_ESTATUS_PROSPECTO.PROPUESTA_LISTA, RH_ESTATUS_PROSPECTO.FIRMADO].includes(p.estatus) ||
            !!getArchivoProspecto(p.id, doc.tipo) || meta.aplica === 'Si';
    }
    if (doc.condicional === 'abonos') {
        const presupuesto = typeof getPresupuestoProspecto === 'function'
            ? getPresupuestoProspecto(p.id, false)
            : (typeof getPresupuestoCasa === 'function' ? getPresupuestoCasa(p.id, false) : null);
        const propietarioId = presupuesto?.partidas?.find(x => x.concepto === 'PROPIETARIO')?.id;
        return presupuesto?.egresos?.some(x => x.partidaId === propietarioId || x.categoria === 'Propietario') || meta.aplica === 'Si';
    }
    if (doc.condicional === 'gravamen') return meta.aplica === 'Si';
    if (doc.condicional === 'cuenta') return meta.aplica !== 'No';
    return false;
}

function generarCamposExpedienteAdmin(p) {
    const d = p.datosExpediente || {};
    return `<section class="exp-pro-section">
        <div class="exp-pro-heading"><span>01</span><div><h4>Identificación del propietario</h4><p>Datos que Regi valida y complementa.</p></div></div>
        <div class="form-grid">
            <div class="form-group"><label>Nombre completo</label><input id="exp-dato-nombre" class="form-control" value="${escapeHtml(d.nombreCompleto || p.nombreCompleto || '')}"></div>
            <div class="form-group"><label>IDMEX de la INE</label><input id="exp-dato-idmex" class="form-control" value="${escapeHtml(d.idmex || '')}"></div>
            <div class="form-group"><label>NSS (número de seguro social)</label><input id="exp-dato-nss" class="form-control" value="${escapeHtml(d.nss || '')}" placeholder="11 dígitos"></div>
            <div class="form-group"><label>Contraseña INFONAVIT / portal</label><input type="password" id="exp-dato-password-infonavit" class="form-control" value="${escapeHtml(d.passwordInfonavit || '')}" placeholder="Solo uso interno autorizado" autocomplete="off"></div>
            <div class="form-group"><label>Celular</label><input id="exp-dato-celular" class="form-control" value="${escapeHtml(d.celular || p.telefono || '')}"></div>
            <div class="form-group"><label>Correo electrónico</label><input type="email" id="exp-dato-correo" class="form-control" value="${escapeHtml(d.correo || '')}"></div>
            <div class="form-group"><label>¿Es casado(a)?</label><select id="exp-dato-casado" class="form-control"><option value="">—</option><option value="Si" ${d.esCasado === 'Si' ? 'selected' : ''}>Sí</option><option value="No" ${d.esCasado === 'No' ? 'selected' : ''}>No</option></select></div>
            <div class="form-group"><label>¿Cónyuge participa en la venta?</label><select id="exp-dato-conyuge" class="form-control"><option value="">—</option><option value="Si" ${d.conyugeParticipa === 'Si' ? 'selected' : ''}>Sí</option><option value="No" ${d.conyugeParticipa === 'No' ? 'selected' : ''}>No</option></select></div>
            <div class="form-group"><label>Fecha de nacimiento</label><input type="date" id="exp-dato-nacimiento" class="form-control" value="${escapeHtml(d.fechaNacimiento || '')}"></div>
            <div class="form-group"><label>Lugar de nacimiento</label><input id="exp-dato-lugar" class="form-control" value="${escapeHtml(d.lugarNacimiento || '')}"></div>
            <div class="form-group full-width"><label>Domicilio capturado por el vendedor</label><input class="form-control field-locked" value="${escapeHtml(p.direccionPropiedad || '')}" readonly></div>
            <div class="form-group"><label>Cuenta mancomunada</label><select id="exp-dato-cuenta-mancomunada" class="form-control"><option value="">—</option><option value="Si" ${d.cuentaMancomunada === 'Si' ? 'selected' : ''}>Sí</option><option value="No" ${d.cuentaMancomunada === 'No' ? 'selected' : ''}>No</option></select></div>
            <div class="form-group"><label>ISR se exenta con</label><select id="exp-dato-isr" class="form-control"><option value="">Pendiente</option><option value="INE" ${d.exentaISRCon === 'INE' ? 'selected' : ''}>INE</option><option value="CFE" ${d.exentaISRCon === 'CFE' ? 'selected' : ''}>CFE</option><option value="No exenta" ${d.exentaISRCon === 'No exenta' ? 'selected' : ''}>No exenta</option></select></div>
        </div>
    </section>
    <section class="exp-pro-section">
        <div class="exp-pro-heading"><span>02</span><div><h4>Ficha legal y económica</h4><p>Fuente única para generar todo el kit sin inconsistencias.</p></div></div>
        <div class="form-grid">
            <div class="form-group"><label>Razón social responsable</label><input id="exp-legal-razon-social" class="form-control" value="${escapeHtml(d.razonSocial || 'Grupo Kosmos Estratégico S.A. de C.V.')}"></div>
            <div class="form-group"><label>Domicilio del responsable</label><input id="exp-legal-domicilio-responsable" class="form-control" value="${escapeHtml(d.domicilioResponsable || '')}"></div>
            <div class="form-group"><label>Correo de privacidad</label><input type="email" id="exp-legal-correo-privacidad" class="form-control" value="${escapeHtml(d.correoPrivacidad || '')}"></div>
            <div class="form-group"><label>Nombre del comprador</label><input id="exp-legal-comprador" class="form-control" value="${escapeHtml(d.compradorNombre || '')}"></div>
            <div class="form-group"><label>¿Hay co-comprador?</label><select id="exp-tiene-cocomprador" class="form-control" onchange="actualizarCamposCocompradorExpediente()"><option value="">—</option><option value="Si" ${d.tieneCocomprador === 'Si' ? 'selected' : ''}>Sí</option><option value="No" ${d.tieneCocomprador === 'No' ? 'selected' : ''}>No</option></select></div>
            <div class="form-group exp-cocomprador-detalle"><label>Nombre del co-comprador</label><input id="exp-cocomprador-nombre" class="form-control" value="${escapeHtml(d.cocompradorNombre || '')}"></div>
            <div class="form-group exp-cocomprador-detalle"><label>Teléfono co-comprador</label><input id="exp-cocomprador-telefono" class="form-control" value="${escapeHtml(d.cocompradorTelefono || '')}"></div>
            <div class="form-group full-width exp-cocomprador-detalle"><label>Documentos del co-comprador</label>
                <div class="rh-upload-grid">
                    ${typeof uploadCardHtml === 'function' ? uploadCardHtml(p.id, 'cocomprador_ine_frente', 'INE co-comprador · frente', false, 'administradora') : ''}
                    ${typeof uploadCardHtml === 'function' ? uploadCardHtml(p.id, 'cocomprador_ine_reverso', 'INE co-comprador · reverso', false, 'administradora') : ''}
                </div>
                <small class="field-hint">Se guardan en el expediente digital del prospecto (nube o este dispositivo).</small>
            </div>
            <div class="form-group"><label>Número de escritura</label><input id="exp-legal-escritura-numero" class="form-control" value="${escapeHtml(d.escrituraNumero || '')}"></div>
            <div class="form-group"><label>Fecha de escritura</label><input type="date" id="exp-legal-escritura-fecha" class="form-control" value="${escapeHtml(d.escrituraFecha || '')}"></div>
            <div class="form-group"><label>Nombre del notario</label><input id="exp-legal-notario" class="form-control" value="${escapeHtml(d.notarioNombre || '')}"></div>
            <div class="form-group"><label>Número de notaría</label><input id="exp-legal-notaria-numero" class="form-control" value="${escapeHtml(d.notariaNumero || '')}"></div>
            <div class="form-group"><label>Municipio de la notaría</label><input id="exp-legal-notaria-municipio" class="form-control" value="${escapeHtml(d.notariaMunicipio || '')}"></div>
            <div class="form-group"><label>Folio real</label><input id="exp-legal-folio-real" class="form-control" value="${escapeHtml(d.folioReal || '')}"></div>
            <div class="form-group"><label>Cuenta predial</label><input id="exp-legal-cuenta-predial" class="form-control" value="${escapeHtml(d.cuentaPredial || '')}"></div>
            <div class="form-group"><label>Número de crédito</label><input id="exp-legal-credito-numero" class="form-control" value="${escapeHtml(d.creditoNumero || '')}"></div>
            <div class="form-group"><label>Posible precio de venta</label><input type="number" min="0" step="0.01" id="exp-legal-precio-venta" class="form-control" value="${Number(d.precioVentaEstimado || p.precioVentaEstimadoAsesor || 0)}"><small class="field-hint">${p.precioVentaEstimadoAsesor ? `Asesor estimó ${formatearMoneda(p.precioVentaEstimadoAsesor)}` : 'Sin estimación del asesor'}</small></div>
            <div class="form-group"><label>Presupuesto de remodelación</label><input type="number" min="0" step="0.01" id="exp-presupuesto-remodelacion" class="form-control" value="${Number(d.presupuestoRemodelacion || 0)}"></div>
            <div class="form-group"><label>Gastos administrativos previstos</label><input type="number" min="0" step="0.01" id="exp-gastos-administrativos" class="form-control" value="${Number(d.gastosAdministrativos || 0)}"></div>
            <div class="form-group"><label>¿Se necesitará firmar poder?</label><select id="exp-requiere-poder" class="form-control"><option value="">Pendiente de revisar</option><option value="Si" ${d.requierePoder === 'Si' ? 'selected' : ''}>Sí</option><option value="No" ${d.requierePoder === 'No' ? 'selected' : ''}>No</option></select></div>
            <div class="form-group"><label>¿Se liquidará INFONAVIT?</label><select id="exp-liquida-infonavit" class="form-control"><option value="">Pendiente de revisar</option><option value="Si" ${d.liquidaInfonavit === 'Si' ? 'selected' : ''}>Sí · presupuestar 87%</option><option value="No" ${d.liquidaInfonavit === 'No' ? 'selected' : ''}>No</option></select></div>
            <div class="form-group"><label>¿Esta operación tiene referido?</label><select id="exp-tiene-referido" class="form-control" onchange="actualizarCamposReferidoExpediente()"><option value="">Pendiente de revisar</option><option value="Si" ${d.tieneReferido === 'Si' ? 'selected' : ''}>Sí</option><option value="No" ${d.tieneReferido === 'No' ? 'selected' : ''}>No</option></select></div>
            <div class="form-group exp-referido-detalle"><label>Nombre de quien refirió *</label><input id="exp-referido-nombre" class="form-control" value="${escapeHtml(d.referidoNombre || '')}" placeholder="Persona a quien se pagará la comisión"></div>
            <div class="form-group exp-referido-detalle"><label>Comisión del referido ($) *</label><input type="number" min="0" step="0.01" id="exp-referido-comision" class="form-control" value="${Number(d.referidoComision || 0)}" placeholder="Monto a pagar al referido"></div>
            <div class="form-group full-width exp-referido-detalle"><small class="field-hint">Al marcar Sí y guardar, el referido aparece en <strong>Referidos y Comisiones</strong> para registrar pagos. Si aún no hay presupuesto, se crea/sincroniza automáticamente.</small></div>
            <div class="form-group"><label>¿Habrá comisión por venta?</label><select id="exp-tiene-comision-venta" class="form-control" onchange="actualizarCamposComisionVentaExpediente()"><option value="">Pendiente de revisar</option><option value="Si" ${d.tieneComisionVenta === 'Si' ? 'selected' : ''}>Sí</option><option value="No" ${d.tieneComisionVenta === 'No' ? 'selected' : ''}>No</option></select></div>
            <div class="form-group exp-comision-detalle"><label>Comisión por venta (%)</label><input type="number" min="0" max="100" step="0.01" id="exp-comision-venta-valor" class="form-control" value="${Number(d.comisionVentaValor || 0)}" placeholder="Ej. 5"><small class="field-hint">Siempre en porcentaje del precio de venta.</small></div>
            <input type="hidden" id="exp-comision-venta-tipo" value="Porcentaje">
            <div class="form-group"><label>Pago al firmar acuerdos</label><input type="number" min="0" step="0.01" id="exp-oferta-pago-firma" class="form-control" value="${Number(d.ofertaPagoFirma || 0)}"></div>
            <div class="form-group"><label>Pago al cambio de INE y apertura de cuenta <span class="section-badge-lectura">opcional</span></label><input type="number" min="0" step="0.01" id="exp-oferta-pago-ine" class="form-control" value="${Number(d.ofertaPagoIneCuenta || 0)}"><small class="field-hint">No bloquea el envío si queda en 0.</small></div>
            <div class="form-group"><label>Pago a la venta de la propiedad</label><input type="number" min="0" step="0.01" id="exp-oferta-pago-venta" class="form-control" value="${Number(d.ofertaPagoVenta || 0)}"></div>
            <div class="form-group"><label>Lugar de firma</label><input id="exp-legal-lugar-firma" class="form-control" value="${escapeHtml(d.lugarFirma || 'Guadalajara, Jalisco')}"></div>
            <div class="form-group"><label>Fecha de firma</label><input type="date" id="exp-legal-fecha-firma" class="form-control" value="${escapeHtml(d.fechaFirma || hoyISO())}"></div>
            <div class="form-group full-width"><label>Adeudos o acuerdos adicionales</label><textarea id="exp-legal-adeudos-adicionales" class="form-control" rows="2">${escapeHtml(d.adeudosAdicionales || '')}</textarea></div>
        </div>
    </section>`;
}

function guardarDatosExpedienteAdmin(p) {
    p.datosExpediente = {
        ...(p.datosExpediente || {}),
        nombreCompleto: document.getElementById('exp-dato-nombre')?.value.trim() || p.nombreCompleto,
        idmex: document.getElementById('exp-dato-idmex')?.value.trim() || '',
        nss: document.getElementById('exp-dato-nss')?.value.trim() || '',
        passwordInfonavit: document.getElementById('exp-dato-password-infonavit')?.value || '',
        celular: document.getElementById('exp-dato-celular')?.value.trim() || p.telefono,
        correo: document.getElementById('exp-dato-correo')?.value.trim() || '',
        esCasado: document.getElementById('exp-dato-casado')?.value || '',
        conyugeParticipa: document.getElementById('exp-dato-conyuge')?.value || '',
        fechaNacimiento: document.getElementById('exp-dato-nacimiento')?.value || '',
        lugarNacimiento: document.getElementById('exp-dato-lugar')?.value.trim() || '',
        cuentaMancomunada: document.getElementById('exp-dato-cuenta-mancomunada')?.value || '',
        exentaISRCon: document.getElementById('exp-dato-isr')?.value || '',
        razonSocial: document.getElementById('exp-legal-razon-social')?.value.trim() || 'Grupo Kosmos Estratégico S.A. de C.V.',
        domicilioResponsable: document.getElementById('exp-legal-domicilio-responsable')?.value.trim() || '',
        correoPrivacidad: document.getElementById('exp-legal-correo-privacidad')?.value.trim() || '',
        compradorNombre: document.getElementById('exp-legal-comprador')?.value.trim() || '',
        tieneCocomprador: document.getElementById('exp-tiene-cocomprador')?.value || '',
        cocompradorNombre: document.getElementById('exp-cocomprador-nombre')?.value.trim() || '',
        cocompradorTelefono: document.getElementById('exp-cocomprador-telefono')?.value.trim() || '',
        escrituraNumero: document.getElementById('exp-legal-escritura-numero')?.value.trim() || '',
        escrituraFecha: document.getElementById('exp-legal-escritura-fecha')?.value || '',
        notarioNombre: document.getElementById('exp-legal-notario')?.value.trim() || '',
        notariaNumero: document.getElementById('exp-legal-notaria-numero')?.value.trim() || '',
        notariaMunicipio: document.getElementById('exp-legal-notaria-municipio')?.value.trim() || '',
        folioReal: document.getElementById('exp-legal-folio-real')?.value.trim() || '',
        cuentaPredial: document.getElementById('exp-legal-cuenta-predial')?.value.trim() || '',
        creditoNumero: document.getElementById('exp-legal-credito-numero')?.value.trim() || '',
        precioVentaEstimado: Number(document.getElementById('exp-legal-precio-venta')?.value || 0),
        indemnizacion: Number(p.montoAdquisicion || 0),
        presupuestoRemodelacion: Number(document.getElementById('exp-presupuesto-remodelacion')?.value || 0),
        gastosAdministrativos: Number(document.getElementById('exp-gastos-administrativos')?.value || 0),
        requierePoder: document.getElementById('exp-requiere-poder')?.value || '',
        liquidaInfonavit: document.getElementById('exp-liquida-infonavit')?.value || '',
        tieneReferido: document.getElementById('exp-tiene-referido')?.value || '',
        referidoNombre: document.getElementById('exp-referido-nombre')?.value.trim() || '',
        referidoComision: Number(document.getElementById('exp-referido-comision')?.value || 0),
        tieneComisionVenta: document.getElementById('exp-tiene-comision-venta')?.value || '',
        comisionVentaTipo: 'Porcentaje',
        comisionVentaValor: Number(document.getElementById('exp-comision-venta-valor')?.value || 0),
        ofertaPagoFirma: Number(document.getElementById('exp-oferta-pago-firma')?.value || 0),
        ofertaPagoIneCuenta: Number(document.getElementById('exp-oferta-pago-ine')?.value || 0),
        ofertaPagoVenta: Number(document.getElementById('exp-oferta-pago-venta')?.value || 0),
        lugarFirma: document.getElementById('exp-legal-lugar-firma')?.value.trim() || 'Guadalajara, Jalisco',
        fechaFirma: document.getElementById('exp-legal-fecha-firma')?.value || hoyISO(),
        adeudosAdicionales: document.getElementById('exp-legal-adeudos-adicionales')?.value.trim() || ''
    };
}

function actualizarCamposReferidoExpediente() {
    const si = document.getElementById('exp-tiene-referido')?.value === 'Si';
    document.querySelectorAll('.exp-referido-detalle').forEach(el => el.classList.toggle('hidden', !si));
}

function actualizarCamposComisionVentaExpediente() {
    const si = document.getElementById('exp-tiene-comision-venta')?.value === 'Si';
    document.querySelectorAll('.exp-comision-detalle').forEach(el => el.classList.toggle('hidden', !si));
}

function actualizarCamposCocompradorExpediente() {
    const si = document.getElementById('exp-tiene-cocomprador')?.value === 'Si';
    document.querySelectorAll('.exp-cocomprador-detalle').forEach(el => el.classList.toggle('hidden', !si));
}

function generarChecklistDocumental(p) {
    const documentosOrdenados = typeof ordenarDocumentosExpediente === 'function'
        ? ordenarDocumentosExpediente(RH_DOCUMENTOS_EXPEDIENTE) : RH_DOCUMENTOS_EXPEDIENTE;
    const aplicables = documentosOrdenados.filter(doc => documentoAplica(p, doc));
    const completos = aplicables.filter(doc => getArchivoProspecto(p.id, doc.tipo)).length;
    const validados = aplicables.filter(doc =>
        getArchivoProspecto(p.id, doc.tipo) && getMetaChecklist(p, doc.tipo).estado === 'Validado'
    ).length;
    return `<section class="exp-pro-section">
        <div class="exp-pro-heading"><span>03</span><div><h4>Checklist documental</h4><p>${completos} de ${aplicables.length} cargados · ${validados} validados por Regi.</p></div><strong class="exp-progress">${Math.round((completos / Math.max(1, aplicables.length)) * 100)}%</strong></div>
        <div class="exp-progress-bar"><i style="width:${Math.round((completos / Math.max(1, aplicables.length)) * 100)}%"></i></div>
        <div class="exp-doc-grid">
            ${documentosOrdenados.map(doc => checklistDocumentoHtml(p, doc)).join('')}
        </div>
    </section>`;
}

function checklistDocumentoHtml(p, doc) {
    const aplica = documentoAplica(p, doc);
    const archivo = getArchivoProspecto(p.id, doc.tipo);
    const meta = getMetaChecklist(p, doc.tipo);
    const esCondicionAutomatica = ['matrimonio', 'cfe', 'invasion', 'kit'].includes(doc.condicional);
    const aplicaPorDefecto = doc.condicional === 'cuenta';
    const valorAplica = meta.aplica || (aplicaPorDefecto ? 'Si' : 'No');
    const estado = meta.estado || (archivo ? 'Recibido' : 'Pendiente');
    const requerido = typeof esReglaObligatoria === 'function'
        ? esReglaObligatoria(`doc_${doc.tipo}`) : !!doc.requerido;
    return `<article class="exp-doc-item ${archivo ? 'is-complete' : ''} ${estado === 'Validado' ? 'is-valid' : ''} ${!aplica ? 'is-na' : ''}">
        <div class="exp-doc-state">${archivo ? '✓' : (!aplica ? '—' : '○')}</div>
        <div class="exp-doc-copy"><strong>${escapeHtml(doc.nombre)}</strong><small>${archivo ? `${escapeHtml(archivo.nombre)}${archivo.almacenamiento === 'indexeddb' ? ' · solo este dispositivo' : ''}` : (!aplica ? 'No aplica' : (requerido ? 'Obligatorio por Dirección' : 'Opcional'))}</small></div>
        ${doc.condicional && !esCondicionAutomatica ? `<select class="exp-aplica-select" onchange="actualizarMetaChecklist('${p.id}','${doc.tipo}',this.value)"><option value="Si" ${valorAplica === 'Si' ? 'selected' : ''}>Aplica</option><option value="No" ${valorAplica === 'No' ? 'selected' : ''}>No aplica</option></select>` : ''}
        ${aplica ? `<select class="exp-doc-status" onchange="actualizarEstadoDocumento('${p.id}','${doc.tipo}',this.value)"><option value="Pendiente" ${estado === 'Pendiente' ? 'selected' : ''}>Pendiente</option><option value="Recibido" ${estado === 'Recibido' ? 'selected' : ''}>Recibido</option><option value="Validado" ${estado === 'Validado' ? 'selected' : ''}>Validado</option><option value="Rechazado" ${estado === 'Rechazado' ? 'selected' : ''}>Rechazado</option></select>` : ''}
        ${aplica ? `<label class="exp-doc-upload"><input type="file" accept="image/*,application/pdf" data-prospecto-id="${p.id}" onchange="subirArchivoProspecto(this,'${doc.tipo}','administradora')"><span>${archivo ? 'Reemplazar' : 'Subir'}</span></label>` : ''}
        ${archivo ? `<button type="button" class="exp-doc-view" onclick="abrirArchivoExpediente('${archivo.id}')">Ver</button><button type="button" class="exp-doc-delete" onclick="eliminarArchivoExpediente('${archivo.id}')">×</button>` : ''}
    </article>`;
}

function actualizarMetaChecklist(prospectoId, tipo, aplica) {
    const prospectos = DB.get('prospectos');
    const idx = prospectos.findIndex(p => p.id === prospectoId);
    if (idx < 0) return;
    prospectos[idx].checklistDocumental = prospectos[idx].checklistDocumental || {};
    prospectos[idx].checklistDocumental[tipo] = {
        ...(prospectos[idx].checklistDocumental[tipo] || {}),
        aplica
    };
    DB.set('prospectos', prospectos);
    refrescarChecklistExpediente(prospectoId);
}

function actualizarEstadoDocumento(prospectoId, tipo, estado) {
    const prospectos = DB.get('prospectos');
    const idx = prospectos.findIndex(p => p.id === prospectoId);
    if (idx < 0) return;
    if (estado === 'Validado' && !getArchivoProspecto(prospectoId, tipo)) {
        alert('Carga el archivo antes de marcarlo como validado.');
        refrescarChecklistExpediente(prospectoId);
        return;
    }
    prospectos[idx].checklistDocumental = prospectos[idx].checklistDocumental || {};
    prospectos[idx].checklistDocumental[tipo] = {
        ...(prospectos[idx].checklistDocumental[tipo] || {}),
        estado,
        validadoEn: estado === 'Validado' ? new Date().toISOString() : '',
        validadoPor: estado === 'Validado' ? getUsuarioActual() : ''
    };
    DB.set('prospectos', prospectos);
    refrescarChecklistExpediente(prospectoId);
}

function refrescarChecklistExpediente(prospectoId) {
    const p = getProspectoById(prospectoId);
    const wrap = document.getElementById('exp-checklist-wrap');
    if (p && wrap) wrap.innerHTML = generarChecklistDocumental(p);
}

function habilitarKitPorEscrituras(prospectoId) {
    const prospectos = DB.get('prospectos');
    const idx = prospectos.findIndex(p => p.id === prospectoId);
    if (idx < 0) return;
    if (!prospectos[idx].kitAperturaHabilitado) {
        prospectos[idx].kitAperturaHabilitado = true;
        prospectos[idx].fechaKitApertura = new Date().toISOString();
        agregarEventoProspecto(prospectos[idx], 'Kit de apertura', 'Habilitado al cargar las escrituras');
        DB.set('prospectos', prospectos);
    }
}

function sincronizarEstadoKitPorArchivos(prospectoId) {
    const prospectos = DB.get('prospectos');
    const idx = prospectos.findIndex(p => p.id === prospectoId);
    if (idx < 0) return;
    const disponible = !!getArchivoProspecto(prospectoId, 'escrituras_asesor') ||
        !!getArchivoProspecto(prospectoId, 'escritura_original');
    if (!!prospectos[idx].kitAperturaHabilitado !== disponible) {
        prospectos[idx].kitAperturaHabilitado = disponible;
        if (!disponible) prospectos[idx].fechaKitApertura = '';
        DB.set('prospectos', prospectos);
    }
}
