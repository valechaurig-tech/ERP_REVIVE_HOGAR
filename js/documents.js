/**
 * Revive Hogar — kit documental profesional.
 * Todas las plantillas usan una ficha maestra; no se editan cláusulas
 * directamente para evitar nombres, créditos o importes contradictorios.
 */

const RH_DOCUMENTOS_KIT = [
    { id: 'contrato', titulo: 'Contrato de prestación de servicios', plantilla: 'contrato' },
    { id: 'privacidad', titulo: 'Aviso de privacidad simplificado', plantilla: 'privacidad' },
    { id: 'proceso', titulo: 'Proceso Revive Hogar', plantilla: 'proceso' },
    { id: 'cronograma', titulo: 'Cronograma de gestión y comercialización', plantilla: 'cronograma' },
    { id: 'oferta', titulo: 'Oferta formal de compra', plantilla: 'oferta' },
    { id: 'indemnizacion', titulo: 'Carta de indemnización', plantilla: 'carta_indemnizacion' }
];
let rhDocumentoInstancia = 0;

function kitAperturaDisponible(p) {
    return !!p?.kitAperturaHabilitado ||
        !!getArchivoProspecto(p?.id, 'escrituras_asesor') ||
        !!getArchivoProspecto(p?.id, 'escritura_original');
}

function generarVistaDocumentos(prospecto) {
    const instancia = ++rhDocumentoInstancia;
    const kitId = `exp-kit-documental-${instancia}`;
    const kitAttrs = `id="${kitId}" data-kit-prospecto="${escapeHtml(prospecto?.id || '')}"`;
    if (!kitAperturaDisponible(prospecto)) {
        if (prospecto?.tieneEscrituras === 'No') {
            const datos = recolectarDatosDocumento(prospecto);
            const solicitud = { id: 'segundo-testimonio', titulo: 'Solicitud de segundo testimonio', plantilla: 'segundo_testimonio' };
            return `<section ${kitAttrs} class="doc-suite">
                <div class="exp-pro-heading"><span>04</span><div><h4>Gestión previa de escrituras</h4><p>Genera la solicitud necesaria para recuperar el segundo testimonio.</p></div></div>
                <div class="doc-suite-grid">${documentoKitCardHtml(solicitud, datos, instancia)}</div>
                <div class="doc-suite-lock"><span>◇</span><div><strong>Kit de apertura pendiente</strong><p>Contrato, aviso, proceso y cronograma se habilitarán al cargar las escrituras completas.</p></div></div>
            </section>`;
        }
        return `<section ${kitAttrs} class="doc-suite doc-suite--locked">
            <div class="doc-suite-lock"><span>◇</span><div><strong>Kit de apertura pendiente</strong><p>Se habilitará automáticamente al cargar las escrituras completas.</p></div></div>
        </section>`;
    }
    const datos = recolectarDatosDocumento(prospecto);
    const documentos = [...RH_DOCUMENTOS_KIT];
    if (prospecto.tieneEscrituras === 'No') {
        documentos.push({ id: 'segundo-testimonio', titulo: 'Solicitud de segundo testimonio', plantilla: 'segundo_testimonio' });
    }
    return `<section ${kitAttrs} class="doc-suite">
        <div class="exp-pro-heading"><span>04</span><div><h4>Kit de apertura</h4><p>Contrato, aviso, proceso y cronograma salen de la ficha legal. Los archivos que subes quedan en la nube del expediente (rh-archivos), no en el PDF impreso.</p></div></div>
        <div class="doc-suite-grid">
            ${documentos.map(doc => documentoKitCardHtml(doc, datos, instancia)).join('')}
        </div>
    </section>`;
}

function documentoKitCardHtml(doc, datos, instancia = 0) {
    const html = plantillaDocumento(doc.plantilla, datos);
    const prospecto = getProspectoById(datos.folio);
    const faltantesConfigurados = prospecto && typeof validarReglasObligatorias === 'function'
        ? validarReglasObligatorias(prospecto, 'administradora_campos')
        : validarDatosDocumento(doc.plantilla, datos);
    const faltantes = [...faltantesConfigurados, ...validarCoherenciaDocumento(doc.plantilla, datos)];
    const elementId = `doc-${doc.id}-${instancia}`;
    return `<article class="doc-suite-card">
        <div class="doc-suite-card-head">
            <span class="doc-suite-icon">▤</span>
            <div><strong>${escapeHtml(doc.titulo)}</strong><small>Listo para vista previa e impresión</small></div>
            <span class="${faltantes.length ? 'doc-suite-pending' : 'doc-suite-ready'}">${faltantes.length ? 'COMPLETAR' : 'LISTO'}</span>
        </div>
        <div class="doc-preview-body doc-preview-professional" id="${elementId}">${html}</div>
        <div class="doc-suite-actions">
            <button type="button" class="btn btn-outline btn-small" onclick="toggleVistaDocumento('${elementId}',this)">Vista previa</button>
            <button type="button" class="btn btn-primary btn-small" onclick="imprimirDocumentoKit('${doc.plantilla}','${elementId}','${escapeHtml(doc.titulo)}','${escapeHtml(datos.folio)}')">Imprimir</button>
        </div>
    </article>`;
}

function documentoPendienteHtml(titulo, detalle) {
    return `<article class="doc-suite-card is-pending">
        <div class="doc-suite-card-head"><span class="doc-suite-icon">○</span><div><strong>${escapeHtml(titulo)}</strong><small>${escapeHtml(detalle)}</small></div><span class="doc-suite-pending">PENDIENTE</span></div>
    </article>`;
}

function toggleVistaDocumento(id, btn) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('is-open');
    if (btn) btn.textContent = el.classList.contains('is-open') ? 'Ocultar vista' : 'Vista previa';
}

function refrescarKitDocumental(prospectoId) {
    const p = getProspectoById(prospectoId);
    const actual = Array.from(document.querySelectorAll('.doc-suite[data-kit-prospecto]'))
        .find(el => el.dataset.kitProspecto === prospectoId &&
            (el.closest('#modal-expediente-admin') || !document.querySelector('#modal-expediente-admin.active'))) ||
        Array.from(document.querySelectorAll('.doc-suite[data-kit-prospecto]'))
            .find(el => el.dataset.kitProspecto === prospectoId);
    if (!p || !actual) return;
    const temp = document.createElement('div');
    temp.innerHTML = generarVistaDocumentos(p);
    actual.replaceWith(temp.firstElementChild);
}

function recolectarDatosDocumento(p) {
    const d = p.datosExpediente || {};
    const vendedor = DB.get('usuariosLogin').find(u => u.id === p.vendedorId);
    const presupuesto = typeof getPresupuestoProspecto === 'function'
        ? getPresupuestoProspecto(p.id, false)
        : (typeof getPresupuestoCasa === 'function' ? getPresupuestoCasa(p.id, false) : null);
    const resumen = presupuesto && typeof calcularResumenPresupuesto === 'function' ? calcularResumenPresupuesto(presupuesto) : null;
    const pagosPropietario = presupuesto?.egresos
        ?.filter(x => x.partidaId === presupuesto.partidas.find(y => y.concepto === 'PROPIETARIO')?.id || x.categoria === 'Propietario')
        .reduce((s, x) => s + Number(x.monto || 0), 0) || 0;
    return {
        folio: p.id,
        razonSocial: d.razonSocial || 'Revive Hogar',
        domicilioResponsable: d.domicilioResponsable || '',
        correoPrivacidad: d.correoPrivacidad || '',
        propietario: d.nombreCompleto || p.nombreCompleto || '',
        idmex: d.idmex || '',
        telefono: d.celular || p.telefono || '',
        correo: d.correo || '',
        direccionPropiedad: p.direccionPropiedad || '',
        comprador: d.compradorNombre || '',
        asesor: vendedor?.displayName || '',
        tipoCredito: p.tipoCredito || 'INFONAVIT',
        numeroCredito: d.creditoNumero || '',
        adeudoCredito: Number(p.adeudoCredito || 0),
        adeudoCreditoEstado: p.adeudoCreditoEstado || 'Pendiente de revisar',
        adeudoAgua: Number(p.adeudoAgua || 0),
        adeudoLuz: Number(p.adeudoLuz || 0),
        adeudoPredial: Number(p.adeudoPredial || 0),
        escrituraNumero: d.escrituraNumero || '',
        escrituraFecha: d.escrituraFecha || '',
        notarioNombre: d.notarioNombre || '',
        notariaNumero: d.notariaNumero || '',
        notariaMunicipio: d.notariaMunicipio || '',
        folioReal: d.folioReal || '',
        cuentaPredial: d.cuentaPredial || '',
        precioVenta: Number(d.precioVentaEstimado || 0),
        indemnizacion: Number(p.montoAdquisicion || d.indemnizacion || 0),
        precioCompra: Number(p.montoAdquisicion || d.indemnizacion || 0),
        inversionTotal: Number(resumen?.presupuesto || 0),
        pagoOfertaFirma: Number(d.ofertaPagoFirma || 0),
        pagoOfertaIne: Number(d.ofertaPagoIneCuenta || 0),
        pagoOfertaVenta: Number(d.ofertaPagoVenta || 0),
        pagosPropietario,
        saldoPropietario: Math.max(0, Number(p.montoAdquisicion || 0) - pagosPropietario),
        liquidaInfonavit: d.liquidaInfonavit || '',
        tieneComisionVenta: d.tieneComisionVenta || '',
        comisionVentaTipo: 'Porcentaje',
        comisionVentaValor: Number(d.comisionVentaValor || 0),
        directorGeneral: d.directorGeneral || 'TEÓFILO ALEXIS RAMOS GAVIDIA',
        adeudosAdicionales: d.adeudosAdicionales || '',
        lugarFirma: d.lugarFirma || 'Guadalajara, Jalisco',
        fechaFirmaISO: d.fechaFirma || hoyISO(),
        fechaFirma: formatearFechaDocumento(d.fechaFirma || hoyISO()),
        estatusPropiedad: p.estatusPropiedad || (p.invadida === 'Si' ? 'Invadida' : ''),
        tieneEscrituras: p.tieneEscrituras || '',
        existeNotaria: p.existeNotariaEscritura || '',
        requiereCambioIne: !!p.requiereCambioIne,
        cfeValido: p.cfeNombreYDomicilio === 'Si',
        mesesViviendo: Number(p.mesesViviendo || 0)
    };
}

function formatearFechaDocumento(iso) {
    if (!iso) return '';
    const fecha = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
    return fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}

function sumarDiasHabiles(iso, dias) {
    const fecha = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
    let restantes = Number(dias || 0);
    while (restantes > 0) {
        fecha.setDate(fecha.getDate() + 1);
        if (fecha.getDay() !== 0 && fecha.getDay() !== 6) restantes--;
    }
    return fecha.toISOString().slice(0, 10);
}

function valorDoc(valor, fallback = 'PENDIENTE DE CAPTURA') {
    return escapeHtml(String(valor || fallback));
}

function validarDatosDocumento(tipo, d) {
    const campos = {
        contrato: [
            ['Nombre completo del propietario', d.propietario],
            ['Dirección de la propiedad', d.direccionPropiedad],
            ['Nombre del comprador / gestor', d.comprador],
            ['Tipo de crédito', d.tipoCredito],
            ['Número de crédito', d.numeroCredito],
            ['Número y fecha de escritura', d.escrituraNumero && d.escrituraFecha],
            ['Nombre y número del notario', d.notarioNombre && d.notariaNumero],
            ['Municipio de la notaría', d.notariaMunicipio],
            ['Folio real', d.folioReal],
            ['Importe de indemnización', d.indemnizacion],
            ['Posible precio de venta', d.precioVenta],
            ['Lugar y fecha de firma', d.lugarFirma && d.fechaFirmaISO]
        ],
        privacidad: [
            ['Nombre completo del propietario', d.propietario],
            ['Razón social responsable', d.razonSocial],
            ['Domicilio del responsable', d.domicilioResponsable],
            ['Correo de privacidad', d.correoPrivacidad],
            ['Lugar y fecha de firma', d.lugarFirma && d.fechaFirmaISO]
        ],
        proceso: [
            ['Nombre completo del propietario', d.propietario],
            ['Dirección de la propiedad', d.direccionPropiedad],
            ['Asesor', d.asesor]
        ],
        cronograma: [
            ['Nombre completo del propietario', d.propietario],
            ['Fecha base', d.fechaFirmaISO],
            ['Tipo de crédito', d.tipoCredito]
        ],
        segundo_testimonio: [
            ['Nombre completo del propietario', d.propietario],
            ['Dirección de la propiedad', d.direccionPropiedad],
            ['Número y fecha de escritura', d.escrituraNumero && d.escrituraFecha],
            ['Nombre y número del notario', d.notarioNombre && d.notariaNumero],
            ['Municipio de la notaría', d.notariaMunicipio],
            ['Cuenta predial', d.cuentaPredial],
            ['Teléfono o correo', d.telefono || d.correo]
        ],
        oferta: [
            ['Nombre completo del propietario', d.propietario],
            ['Dirección de la propiedad', d.direccionPropiedad],
            ['Inversión total requerida', d.inversionTotal],
            ['Precio de compra', d.precioCompra],
            ['Lugar y fecha', d.lugarFirma && d.fechaFirmaISO]
        ],
        carta_indemnizacion: [
            ['Nombre completo del propietario', d.propietario],
            ['Dirección de la propiedad', d.direccionPropiedad],
            ['Precio de compra', d.precioCompra],
            ['Lugar y fecha', d.lugarFirma && d.fechaFirmaISO]
        ]
    };
    const faltantes = (campos[tipo] || []).filter(([, valor]) => !valor || Number(valor) === 0).map(([nombre]) => nombre);
    if (tipo === 'contrato' && Number(d.indemnizacion || 0) > Number(d.precioVenta || 0)) {
        faltantes.push('La indemnización no puede superar el posible precio de venta');
    }
    return faltantes;
}

function validarCoherenciaDocumento(tipo, d) {
    const errores = [];
    if (['contrato', 'oferta'].includes(tipo) &&
        Number(d.indemnizacion || d.precioCompra || 0) > Number(d.precioVenta || 0) &&
        Number(d.precioVenta || 0) > 0) {
        errores.push('El precio de compra/indemnización no puede superar el posible precio de venta');
    }
    if (tipo === 'oferta') {
        const pagos = Number(d.pagoOfertaFirma || 0) + Number(d.pagoOfertaIne || 0) + Number(d.pagoOfertaVenta || 0);
        if (pagos > 0 && Math.abs(pagos - Number(d.precioCompra || 0)) > 0.01) {
            errores.push('El calendario de pagos debe sumar exactamente el precio de compra');
        }
        if (d.liquidaInfonavit === 'Si' &&
            (d.adeudoCreditoEstado === 'No aplica' || Number(d.adeudoCredito || 0) <= 0)) {
            errores.push('No se puede liquidar INFONAVIT sin un adeudo de crédito confirmado');
        }
        if (d.tieneComisionVenta === 'Si' && Number(d.comisionVentaValor || 0) > 100) {
            errores.push('El porcentaje de comisión por venta no puede superar 100%');
        }
    }
    return errores;
}

function imprimirDocumentoKit(tipo, elementId, titulo, prospectoIdExplicito) {
    const prospectoId = prospectoIdExplicito || document.getElementById('exp-id')?.value;
    const p = prospectoId ? getProspectoById(prospectoId) : null;
    if (p) {
        const faltantes = [...(typeof validarReglasObligatorias === 'function'
            ? validarReglasObligatorias(p, 'administradora_campos')
            : validarDatosDocumento(tipo, recolectarDatosDocumento(p))),
            ...validarCoherenciaDocumento(tipo, recolectarDatosDocumento(p))];
        if (faltantes.length) {
            alert('Antes de imprimir completa en la ficha legal:\n• ' + faltantes.join('\n• '));
            return;
        }
    }
    logAction(`Documento impreso: ${titulo}${p ? ` · ${p.nombreCompleto}` : ''}`);
    imprimirDocumento(elementId, titulo);
}

function monedaDoc(valor) {
    return Number(valor || 0) > 0 ? formatearMoneda(Number(valor)) : 'PENDIENTE DE CAPTURA';
}

function numeroEnteroEnLetras(numero) {
    const n = Math.floor(Math.abs(Number(numero || 0)));
    const unidades = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
    const decenas = ['', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
    const centenas = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
    const menosMil = valor => {
        if (valor === 0) return '';
        if (valor === 100) return 'cien';
        const c = Math.floor(valor / 100);
        const resto = valor % 100;
        if (resto < 30) return [centenas[c], unidades[resto]].filter(Boolean).join(' ');
        const d = Math.floor(resto / 10);
        const u = resto % 10;
        return [centenas[c], decenas[d] + (u ? ` y ${unidades[u]}` : '')].filter(Boolean).join(' ');
    };
    if (n === 0) return 'cero';
    const millones = Math.floor(n / 1000000);
    const miles = Math.floor((n % 1000000) / 1000);
    const resto = n % 1000;
    return [
        millones ? (millones === 1 ? 'un millón' : `${menosMil(millones)} millones`) : '',
        miles ? (miles === 1 ? 'mil' : `${menosMil(miles)} mil`) : '',
        menosMil(resto)
    ].filter(Boolean).join(' ');
}

function montoEnLetras(valor) {
    const numero = Number(valor || 0);
    if (!numero) return 'PENDIENTE DE CAPTURA';
    const centavos = Math.round((numero - Math.floor(numero)) * 100);
    return `${numeroEnteroEnLetras(numero)} pesos ${String(centavos).padStart(2, '0')}/100 M.N.`;
}

function plantillaDocumento(tipo, d) {
    const plantillas = {
        contrato: plantillaContratoServicios,
        privacidad: plantillaAvisoPrivacidad,
        proceso: plantillaProcesoCliente,
        cronograma: plantillaCronograma,
        segundo_testimonio: plantillaSegundoTestimonio,
        oferta: plantillaOfertaFormal,
        carta_indemnizacion: plantillaCartaIndemnizacion
    };
    return (plantillas[tipo] || plantillaProcesoCliente)(d);
}

function encabezadoDocumento(titulo, d, subtitulo = '') {
    return `<header class="legal-head">
        <div class="legal-brand"><strong>Revive</strong><span>Hogar</span></div>
        <div class="legal-head-copy"><h1>${escapeHtml(titulo)}</h1>${subtitulo ? `<p>${escapeHtml(subtitulo)}</p>` : ''}</div>
        <div class="legal-folio">EXP. ${escapeHtml(String(d.folio || '').slice(-8).toUpperCase())}</div>
    </header>`;
}

function pieDocumento(d) {
    return `<footer class="legal-footer"><span>${escapeHtml(d.razonSocial)}</span><span>Documento generado desde expediente · ${new Date().toLocaleDateString('es-MX')}</span></footer>`;
}

function firmasDocumento(firmas) {
    return `<div class="legal-signatures">${firmas.map(f => `<div><i></i><strong>${escapeHtml(f.nombre || 'NOMBRE Y FIRMA')}</strong><span>${escapeHtml(f.rol)}</span></div>`).join('')}</div>`;
}

function plantillaContratoServicios(d) {
    const credito = valorDoc(d.tipoCredito).toUpperCase();
    const indemnizacion = monedaDoc(d.indemnizacion);
    return `<div class="legal-document">
        <section class="legal-page">
            ${encabezadoDocumento('Contrato de prestación de servicios', d, `Compra con crédito ${credito} y reconocimiento de pago por indemnización`)}
            <p class="legal-intro">Contrato que celebran por una parte <strong>${valorDoc(d.comprador)}</strong>, a quien en lo sucesivo se le denominará “El Comprador”, y por la otra <strong>${valorDoc(d.propietario)}</strong>, a quien en lo sucesivo se le denominará “La Parte Propietaria”, al tenor de las siguientes declaraciones y cláusulas:</p>
            <h2>DECLARACIONES</h2>
            <h3>I. Declara “La Parte Propietaria”</h3>
            <ol>
                <li>Ser legítima propietaria del inmueble ubicado en <strong>${valorDoc(d.direccionPropiedad)}</strong>, propiedad acreditada mediante escritura pública número <strong>${valorDoc(d.escrituraNumero)}</strong>, de fecha <strong>${valorDoc(formatearFechaDocumento(d.escrituraFecha))}</strong>, otorgada ante la fe de <strong>${valorDoc(d.notarioNombre)}</strong>, Notario Público número <strong>${valorDoc(d.notariaNumero)}</strong> de <strong>${valorDoc(d.notariaMunicipio)}</strong>, inscrita bajo el folio real <strong>${valorDoc(d.folioReal)}</strong>.</li>
                <li>Reconocer que el inmueble tiene una deuda vigente con <strong>${credito}</strong>, crédito número <strong>${valorDoc(d.numeroCredito)}</strong>, por un monto aproximado de <strong>${monedaDoc(d.adeudoCredito)}</strong>, sujeto a verificación al formalizar la compraventa.</li>
                <li>Tener plena capacidad legal para enajenar el inmueble y autorizar a “El Comprador” a realizar las gestiones necesarias para facilitar su venta.</li>
            </ol>
            <h3>II. Declara “El Comprador”</h3>
            <ol>
                <li>Tener interés en adquirir el inmueble mencionado a través de un tercero que utilizará crédito <strong>${credito}</strong>.</li>
                <li>Asumir el compromiso de liquidar el crédito y los adeudos vinculados al inmueble; realizar las mejoras necesarias para facilitar la venta; y entregar a “La Parte Propietaria” la cantidad de <strong>${indemnizacion} (${escapeHtml(montoEnLetras(d.indemnizacion))})</strong> como indemnización, una vez liberado el pago.</li>
                <li>Reconocer como precio estimado de comercialización <strong>${monedaDoc(d.precioVenta)}</strong>. La indemnización indicada constituye la compensación económica pactada con “La Parte Propietaria”.</li>
            </ol>
            ${pieDocumento(d)}
        </section>
        <section class="legal-page">
            ${encabezadoDocumento('Cláusulas', d)}
            <h3>PRIMERA. OBJETO</h3><p>“La Parte Propietaria” encarga a “El Comprador” la gestión, mejora, negociación y cierre de la compraventa del inmueble, mediante un tercero que utilizará crédito ${credito}.</p>
            <h3>SEGUNDA. LIQUIDACIÓN DE ADEUDOS</h3><p>“El Comprador” se obliga a liquidar el crédito ${credito} y los adeudos vigentes del inmueble —incluidos predial, agua, energía eléctrica y los que resulten aplicables— con cargo al monto obtenido por la venta, antes de entregar la indemnización pactada.</p>
            ${d.adeudosAdicionales ? `<div class="legal-note"><strong>Acuerdos adicionales:</strong> ${escapeHtml(d.adeudosAdicionales)}</div>` : ''}
            <h3>TERCERA. MEJORAS AL INMUEBLE</h3><p>“El Comprador” podrá realizar mejoras, reparaciones y adecuaciones necesarias con la finalidad de facilitar la venta y procurar la escrituración ante notario.</p>
            <h3>CUARTA. INDEMNIZACIÓN</h3><p>Una vez que el crédito haya sido depositado en favor del vendedor, “El Comprador” se compromete a entregar a “La Parte Propietaria” la cantidad única de <strong>${indemnizacion} (${escapeHtml(montoEnLetras(d.indemnizacion))})</strong> como compensación por su participación, cesión de derechos y autorización de uso de la propiedad para fines de compraventa.</p>
            <h3>QUINTA. AUTORIZACIÓN DE SOBREPRECIO</h3><p>“La Parte Propietaria” autoriza que el inmueble pueda venderse a un precio superior al estimado y reconoce que su derecho económico será la indemnización única de <strong>${indemnizacion}</strong>.</p>
            <h3>SEXTA. VIGENCIA</h3><p>El contrato tendrá una vigencia de 180 días naturales desde su firma y podrá renovarse por escrito de mutuo acuerdo.</p>
            <h3>SÉPTIMA. JURISDICCIÓN</h3><p>Las partes se someten a los tribunales del Primer Partido Judicial del Estado de Jalisco, renunciando a cualquier otro fuero que pudiera corresponderles.</p>
            ${pieDocumento(d)}
        </section>
        <section class="legal-page">
            ${encabezadoDocumento('Aceptación y firmas', d)}
            <div class="legal-place-date"><span>Lugar</span><strong>${valorDoc(d.lugarFirma)}</strong><span>Fecha</span><strong>${valorDoc(d.fechaFirma)}</strong></div>
            <p>Leído que fue el presente contrato y enteradas las partes de su contenido y alcance, lo firman por duplicado para constancia.</p>
            ${firmasDocumento([{ nombre: d.propietario, rol: 'La Parte Propietaria' }, { nombre: d.comprador, rol: 'El Comprador' }])}
            <div class="legal-warning">Documento generado con la versión operativa proporcionada. Antes de su uso legal, debe ser revisado y aprobado por el responsable jurídico de Revive Hogar.</div>
            ${pieDocumento(d)}
        </section>
    </div>`;
}

function plantillaAvisoPrivacidad(d) {
    const responsable = valorDoc(d.razonSocial || 'Grupo Kosmos Estratégico S.A. de C.V.');
    return `<div class="legal-document"><section class="legal-page">
        ${encabezadoDocumento('Aviso de privacidad simplificado', d, responsable)}
        <p><strong>${responsable}</strong>, con domicilio en <strong>${valorDoc(d.domicilioResponsable)}</strong>, marca comercial <strong>Revive Hogar</strong>, es responsable del tratamiento, uso y protección de los datos personales recabados durante la gestión, comercialización y formalización de operaciones inmobiliarias.</p>
        <h2>Datos personales recabados</h2>
        <p>Datos de identificación, contacto, fiscales, patrimoniales, financieros, laborales (incluido NSS cuando aplique), familiares y documentación relacionada con la propiedad, crédito y operación inmobiliaria.</p>
        <h2>Finalidades</h2>
        <p>Integrar y validar el expediente; gestionar propuestas, ofertas y contratos; realizar trámites ante instituciones crediticias, notarías, registros y autoridades; administrar pagos, adeudos, remodelación y comercialización; y cumplir obligaciones legales y contractuales.</p>
        <h2>Transferencias</h2>
        <p>Los datos podrán compartirse, cuando resulte necesario, con notarías, instituciones financieras y de vivienda, autoridades, proveedores y terceros participantes en la operación, exclusivamente para las finalidades descritas.</p>
        <h2>Derechos ARCO</h2>
        <p>El titular podrá solicitar acceso, rectificación, cancelación u oposición mediante el correo <strong>${valorDoc(d.correoPrivacidad)}</strong>.</p>
        <div class="legal-consent"><p>Declaro haber leído este aviso y otorgo mi conformidad para el tratamiento de mis datos conforme a las finalidades aquí descritas.</p></div>
        <div class="legal-place-date"><span>Titular</span><strong>${valorDoc(d.propietario)}</strong><span>Fecha</span><strong>${valorDoc(d.fechaFirma)}</strong></div>
        ${firmasDocumento([{ nombre: d.propietario, rol: 'Titular de los datos' }])}
        ${pieDocumento(d)}
    </section></div>`;
}

function plantillaProcesoCliente(d) {
    const pasos = [
        ['1', 'Firma y apertura', 'Firma de acuerdos, validación de identidad e integración del expediente.'],
        ['2', 'Situación del inmueble', 'Desocupación, acceso, llaves y definición de trabajos requeridos.'],
        ['3', 'Adecuación y remodelación', 'Ejecución y seguimiento de mejoras autorizadas.'],
        ['4', 'Promoción comercial', 'Difusión, atención de interesados y selección de comprador.'],
        ['5', `Gestión ${d.tipoCredito}`, 'Integración, seguimiento y formalización del expediente de compraventa.'],
        ['6', 'Firma ante notario', 'Formalización jurídica de la operación.'],
        ['7', 'Distribución del recurso', 'Liquidación de adeudos y entrega de la contraprestación acordada.']
    ];
    return `<div class="legal-document"><section class="legal-page">
        ${encabezadoDocumento('Proceso de gestión Revive Hogar', d, 'Guía de etapas para el propietario')}
        <div class="process-owner"><span>Propietario</span><strong>${valorDoc(d.propietario)}</strong><span>Propiedad</span><strong>${valorDoc(d.direccionPropiedad)}</strong><span>Asesor</span><strong>${valorDoc(d.asesor)}</strong></div>
        <div class="process-timeline">${pasos.map(p => `<div><b>${p[0]}</b><section><strong>${escapeHtml(p[1])}</strong><p>${escapeHtml(p[2])}</p></section><i>□</i></div>`).join('')}</div>
        <div class="legal-note">Los tiempos son estimados y pueden variar por actuaciones de instituciones crediticias, notarías, dependencias, compradores u otros terceros.</div>
        ${firmasDocumento([{ nombre: d.propietario, rol: 'Propietario · enterado y conforme' }, { nombre: d.asesor, rol: 'Asesor Revive Hogar' }])}
        ${pieDocumento(d)}
    </section></div>`;
}

function obtenerEtapasCronograma(d) {
    const base = d.fechaFirmaISO;
    const etapas = [
        { fecha: base, titulo: 'Firma de acuerdos y apertura', detalle: 'Contrato, aviso de privacidad, proceso, cronograma y validación de identificación.' }
    ];
    if (d.tieneEscrituras === 'No' && d.existeNotaria === 'Si') {
        etapas.push({ fecha: sumarDiasHabiles(base, 1), titulo: 'Solicitud de segundo testimonio', detalle: 'Solicitud en notaría. Presupuesto automático: $5,000.00.' });
        etapas.push({ fecha: sumarDiasHabiles(base, 6), titulo: 'Recepción estimada de escrituras', detalle: 'Cinco días hábiles posteriores a la solicitud.' });
    } else if (d.tieneEscrituras === 'No') {
        etapas.push({ fecha: sumarDiasHabiles(base, 1), titulo: 'Recuperación de escrituras en Archivo Público', detalle: 'Presupuesto automático: $15,000.00.' });
        etapas.push({ fecha: sumarDiasHabiles(base, 26), titulo: 'Recepción estimada de escrituras', detalle: 'Veinticinco días hábiles posteriores a la solicitud.' });
    } else {
        etapas.push({ fecha: sumarDiasHabiles(base, 1), titulo: 'Validación de escrituras originales', detalle: 'Revisión de integridad, datos notariales y registro.' });
    }
    if (d.requiereCambioIne && !d.cfeValido) {
        etapas.push({ fecha: sumarDiasHabiles(base, 10), titulo: 'Actualización de domicilio en INE', detalle: 'Plazo estimado de dos semanas desde la firma; sujeto al módulo INE.' });
    }
    const inicioComercial = d.tieneEscrituras === 'No'
        ? sumarDiasHabiles(base, d.existeNotaria === 'Si' ? 7 : 27)
        : sumarDiasHabiles(base, 2);
    etapas.push(
        { fecha: inicioComercial, titulo: 'Remodelación y promoción', detalle: 'Inicio de adecuaciones y estrategia de difusión comercial.' },
        { fecha: sumarDiasHabiles(inicioComercial, 65), titulo: 'Comprador y expediente de compraventa', detalle: `Localización de comprador y gestión ante ${d.tipoCredito}. Fecha máxima estimada.` },
        { fecha: sumarDiasHabiles(inicioComercial, 85), titulo: 'Recepción y distribución de recursos', detalle: 'Liquidación de adeudos y entrega de contraprestación conforme a los acuerdos.' }
    );
    return etapas.sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
}

function plantillaCronograma(d) {
    const etapas = obtenerEtapasCronograma(d);
    return `<div class="legal-document"><section class="legal-page">
        ${encabezadoDocumento('Cronograma de gestión y comercialización', d, 'Calendario estimado de actividades')}
        <div class="legal-place-date"><span>Propietario</span><strong>${valorDoc(d.propietario)}</strong><span>Fecha base</span><strong>${valorDoc(d.fechaFirma)}</strong></div>
        <p>Este cronograma se elabora con tiempos estimados. Las etapas sujetas a instituciones, dependencias, notarías, compradores o condiciones del inmueble podrán modificarse. Revive Hogar dará seguimiento oportuno y comunicará cualquier ajuste.</p>
        <table class="legal-schedule"><thead><tr><th>#</th><th>Fecha estimada</th><th>Actividad</th><th>Control</th></tr></thead><tbody>
            ${etapas.map((x, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(formatearFechaDocumento(x.fecha))}</td><td><strong>${escapeHtml(x.titulo)}</strong><p>${escapeHtml(x.detalle)}</p></td><td>□ Pendiente<br>□ Completado</td></tr>`).join('')}
        </tbody></table>
        <div class="legal-note"><strong>Nota:</strong> La entrega de INE, escrituras, autorizaciones y trámites depende de los tiempos de las instituciones competentes.</div>
        ${firmasDocumento([{ nombre: d.propietario, rol: 'Propietario · firma de conformidad' }])}
        ${pieDocumento(d)}
    </section></div>`;
}

function plantillaOfertaFormal(d) {
    const pagos = [
        [d.pagoOfertaFirma, 'A la firma de acuerdos.'],
        [d.pagoOfertaIne, 'Al cambio de domicilio de la propiedad a vender en INE y apertura de cuenta bancaria.'],
        [d.pagoOfertaVenta, 'A la venta de la propiedad y recepción del recurso.']
    ].filter(([monto]) => Number(monto || 0) > 0);
    const sumaPagos = pagos.reduce((s, [monto]) => s + Number(monto || 0), 0);
    return `<div class="legal-document"><section class="legal-page">
        ${encabezadoDocumento('Oferta formal de compra', d)}
        <p class="legal-date">${escapeHtml(d.fechaFirma)}, ${escapeHtml(d.lugarFirma)}</p>
        <p>Por medio de la presente se hace llegar a <strong>${valorDoc(d.propietario)}</strong> una oferta formal de compra por la propiedad ubicada en <strong>${valorDoc(d.direccionPropiedad)}</strong>.</p>
        <p>Después del análisis del inmueble, la validación de adeudos y las remodelaciones necesarias derivadas de su estado actual, se determinó que la inversión total requerida asciende aproximadamente a <strong>${monedaDoc(d.inversionTotal)} (${escapeHtml(montoEnLetras(d.inversionTotal))})</strong>.</p>
        <div class="legal-callout"><span>OFERTA FORMAL</span><strong>${monedaDoc(d.precioCompra)}</strong><small>${escapeHtml(montoEnLetras(d.precioCompra))}</small></div>
        <p>La cantidad ofrecida sería entregada de la siguiente manera:</p>
        ${pagos.length ? `<ul>${pagos.map(([monto, detalle]) => `<li><strong>${monedaDoc(monto)}</strong> ${escapeHtml(detalle)}</li>`).join('')}</ul>` : '<div class="legal-note">El calendario de pagos queda pendiente de captura en la ficha económica.</div>'}
        ${pagos.length && Math.abs(sumaPagos - Number(d.precioCompra || 0)) > 0.01 ? `<div class="legal-note"><strong>Atención:</strong> Los pagos capturados suman ${monedaDoc(sumaPagos)} y deben conciliarse con la oferta de ${monedaDoc(d.precioCompra)}.</div>` : ''}
        <p>Durante el proceso y hasta la conclusión de la operación, se cubrirán a favor de la parte propietaria los descuentos que INFONAVIT realice vía nómina, conforme sean aplicados y según los acuerdos documentados en el expediente.</p>
        <p>Leído el presente documento y enteradas las partes de su contenido y alcance, manifiestan su conformidad firmando para constancia.</p>
        ${firmasDocumento([{ nombre: d.directorGeneral, rol: 'Director General' }, { nombre: d.propietario, rol: 'Propietario(a)' }])}
        ${pieDocumento(d)}
    </section></div>`;
}

function plantillaCartaIndemnizacion(d) {
    return `<div class="legal-document"><section class="legal-page">
        ${encabezadoDocumento('Carta de indemnización', d)}
        <p class="legal-date">${escapeHtml(d.fechaFirma)}, ${escapeHtml(d.lugarFirma)}</p>
        <p>Por medio de la presente, yo, <strong>${valorDoc(d.propietario)}</strong>, hago constar que he recibido la cantidad de <strong>${monedaDoc(d.pagosPropietario)} (${escapeHtml(montoEnLetras(d.pagosPropietario))})</strong> por concepto de indemnización relacionada con mi propiedad ubicada en <strong>${valorDoc(d.direccionPropiedad)}</strong>.</p>
        <p>Asimismo, queda establecido que existe un saldo pendiente de <strong>${monedaDoc(d.saldoPropietario)} (${escapeHtml(montoEnLetras(d.saldoPropietario))})</strong>, el cual será cubierto conforme al calendario de pagos acordado y a las condiciones de remodelación, venta y recepción del recurso.</p>
        <p>Me comprometo a proporcionar toda la documentación, información y apoyo necesarios para facilitar el proceso de remodelación, venta y trámites correspondientes.</p>
        ${firmasDocumento([{ nombre: d.propietario, rol: 'Propietario(a) · Recibí de conformidad' }])}
        ${pieDocumento(d)}
    </section></div>`;
}

function imprimirDocumentoProspecto(prospectoId, tipo) {
    const p = getProspectoById(prospectoId);
    if (!p) return;
    const datos = recolectarDatosDocumento(p);
    const faltantes = [...(typeof validarReglasObligatorias === 'function'
        ? validarReglasObligatorias(p, 'administradora_campos')
        : validarDatosDocumento(tipo, datos)),
        ...validarCoherenciaDocumento(tipo, datos)];
    if (faltantes.length) {
        alert('Antes de imprimir completa:\n• ' + faltantes.join('\n• '));
        return;
    }
    const contenedor = document.createElement('div');
    contenedor.id = `documento-directo-${Date.now()}`;
    contenedor.style.display = 'none';
    contenedor.innerHTML = plantillaDocumento(tipo, datos);
    document.body.appendChild(contenedor);
    const titulo = tipo === 'oferta' ? 'Oferta formal de compraventa' : 'Carta de indemnización';
    logAction(`Documento impreso: ${titulo} · ${p.nombreCompleto}`);
    imprimirDocumento(contenedor.id, titulo);
    setTimeout(() => contenedor.remove(), 1000);
}

function plantillaSegundoTestimonio(d) {
    return `<div class="legal-document"><section class="legal-page">
        ${encabezadoDocumento('Solicitud de expedición de segundo testimonio', d)}
        <p class="legal-subject"><strong>ASUNTO:</strong> Solicitud de expedición de Segundo Testimonio.</p>
        <p><strong>DIRECCIÓN DE ARCHIVO DE INSTRUMENTOS PÚBLICOS DEL ESTADO DE JALISCO<br>P R E S E N T E.</strong></p>
        <p><strong>${valorDoc(d.propietario)}</strong>, por mi propio derecho, señalando como medio de contacto el teléfono <strong>${valorDoc(d.telefono)}</strong> y correo <strong>${valorDoc(d.correo)}</strong>, comparezco respetuosamente para exponer:</p>
        <p>Con fundamento en los artículos 129 y 130 y demás aplicables de la Ley del Notariado del Estado de Jalisco, solicito se expida a mi costa <strong>SEGUNDO TESTIMONIO</strong> de la escritura pública número <strong>${valorDoc(d.escrituraNumero)}</strong>, de fecha <strong>${valorDoc(formatearFechaDocumento(d.escrituraFecha))}</strong>, otorgada ante la fe de <strong>${valorDoc(d.notarioNombre)}</strong>, Notario Público número <strong>${valorDoc(d.notariaNumero)}</strong> de <strong>${valorDoc(d.notariaMunicipio)}</strong>, con cuenta predial <strong>${valorDoc(d.cuentaPredial)}</strong>.</p>
        <p>La solicitud se formula debido a que pretendo realizar un acto traslativo de dominio sobre el inmueble ubicado en <strong>${valorDoc(d.direccionPropiedad)}</strong>. Adjunto identificación oficial y recibo predial vigente para acreditar el interés jurídico y facilitar la localización del antecedente.</p>
        <p>Solicito se me indiquen los derechos estatales a cubrir y el procedimiento para la expedición del documento.</p>
        <p class="legal-att">ATENTAMENTE<br><strong>${valorDoc(d.lugarFirma)}, ${valorDoc(d.fechaFirma)}</strong></p>
        ${firmasDocumento([{ nombre: d.propietario, rol: `Solicitante · ${d.telefono} · ${d.correo}` }])}
        ${pieDocumento(d)}
    </section></div>`;
}

function imprimirDocumento(elementId, titulo) {
    const el = document.getElementById(elementId);
    if (!el) return;
    imprimirDocumentoHtml(el.innerHTML, titulo, true);
}

function imprimirDocumentoHtml(html, titulo, esLegal = false) {
    const ventana = window.open('', '_blank');
    if (!ventana) { alert('Permite ventanas emergentes para imprimir.'); return; }
    ventana.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(titulo)}</title>
        <style>${estilosImpresionDocumentos(esLegal)}</style></head><body>${html}</body></html>`);
    ventana.document.close();
    ventana.focus();
    setTimeout(() => ventana.print(), 300);
}

function estilosImpresionDocumentos() {
    return `@page{size:Letter;margin:14mm}*{box-sizing:border-box}body{margin:0;font-family:"Arial",sans-serif;color:#182d3b;line-height:1.46;font-size:10.5pt}
    .legal-page{position:relative;min-height:0;padding:0 2mm 8mm;page-break-after:auto}
    .legal-head{display:grid;grid-template-columns:100px 1fr auto;gap:14px;align-items:center;border-bottom:2px solid #084d6e;padding-bottom:9px;margin-bottom:18px}
    .legal-brand{font-size:17pt}.legal-brand strong{color:#084d6e}.legal-brand span{color:#f68853;font-weight:800}.legal-head h1{font-size:14pt;margin:0;color:#084d6e;text-transform:uppercase}.legal-head p{margin:2px 0 0;color:#60717c;font-size:8pt}.legal-folio{font-size:7pt;color:#82919a}
    h2{font-size:11pt;color:#084d6e;border-left:3px solid #f68853;padding-left:7px;margin:18px 0 8px}h3{font-size:9.5pt;color:#084d6e;margin:14px 0 5px}p{margin:7px 0;text-align:justify}li{margin:6px 0}.legal-intro{font-size:10pt}
    .legal-footer{position:static;display:flex;justify-content:space-between;border-top:1px solid #dce5e9;padding-top:5px;margin-top:12px;color:#7a8b95;font-size:6.5pt}
    .legal-signatures{display:grid;grid-template-columns:repeat(2,1fr);gap:34px;margin-top:56px}.legal-signatures>div{text-align:center}.legal-signatures i{display:block;border-top:1px solid #334e5d}.legal-signatures strong,.legal-signatures span{display:block;margin-top:6px}.legal-signatures strong{font-size:8pt}.legal-signatures span{color:#687b87;font-size:7pt}
    .legal-place-date,.process-owner{display:grid;grid-template-columns:auto 1fr;gap:6px 14px;padding:12px;background:#f4f8fa;border:1px solid #e0e9ed;border-radius:8px;margin:14px 0}.legal-place-date span,.process-owner span{color:#647986;font-size:7pt;text-transform:uppercase}.legal-place-date strong,.process-owner strong{font-size:9pt}
    .legal-note,.legal-warning,.legal-consent{padding:10px 12px;border-left:3px solid #f68853;background:#fff7f2;margin:13px 0;font-size:8.5pt}.legal-warning{margin-top:55px;color:#7c2d12}.legal-consent{background:#f4f8fa;border-color:#084d6e}
    .legal-date{text-align:right;color:#64748b;font-weight:700}.legal-callout{display:grid;gap:4px;margin:18px 0;padding:15px;text-align:center;border:1px solid #b9d2de;border-radius:10px;background:#f1f7fa}.legal-callout span{color:#64748b;font-size:8pt;font-weight:800;letter-spacing:.1em}.legal-callout strong{color:#084d6e;font-size:19pt}.legal-callout small{color:#475569;font-size:8pt;text-transform:uppercase}
    .process-timeline>div{display:grid;grid-template-columns:27px 1fr 20px;gap:9px;align-items:center;padding:9px;border-bottom:1px solid #e3eaee}.process-timeline b{display:grid;place-items:center;width:25px;height:25px;border-radius:50%;background:#084d6e;color:#fff}.process-timeline p{margin:2px 0;color:#5f737f;font-size:8pt}.process-timeline i{font-style:normal;font-size:14pt}
    .legal-schedule{width:100%;border-collapse:collapse;margin:14px 0;font-size:8pt}.legal-schedule th{padding:7px;background:#084d6e;color:#fff;text-align:left}.legal-schedule td{padding:7px;border:1px solid #dbe5ea;vertical-align:top}.legal-schedule p{margin:2px 0}.legal-subject{margin-bottom:28px}.legal-att{text-align:center;margin-top:35px}
    .print-brand{border-bottom:2px solid #084d6e;padding-bottom:10px;margin-bottom:20px}.print-brand h1{color:#084d6e}.print-brand h1 span{color:#f68853}.print-brand p{margin:2px 0;color:#64748b}
    table:not(.legal-schedule){width:100%;border-collapse:collapse;margin:16px 0;font-size:9pt}table:not(.legal-schedule) th{background:#084d6e;color:#fff;text-align:left;padding:7px}table:not(.legal-schedule) td{padding:7px;border-bottom:1px solid #dfe7eb}
    .print-summary{margin-left:auto;width:280px;border-top:2px solid #f68853}.print-summary p{display:flex;justify-content:space-between;margin:0;padding:7px;border-bottom:1px solid #e5e7eb}`;
}

function guardarDocumentosDesdeExpediente(prospectoId, prospectoActualizado) {
    const prospectos = DB.get('prospectos');
    const idx = prospectos.findIndex(p => p.id === prospectoId);
    if (idx < 0) return;
    const p = prospectoActualizado || prospectos[idx];
    const datos = recolectarDatosDocumento(p);
    p.documentos = p.documentos || {};
    const docs = [...RH_DOCUMENTOS_KIT];
    if (p.tieneEscrituras === 'No') docs.push({ id: 'segundo-testimonio', plantilla: 'segundo_testimonio' });
    docs.forEach(doc => {
        p.documentos[doc.id] = {
            html: plantillaDocumento(doc.plantilla, datos),
            version: 1,
            generadoEn: new Date().toISOString(),
            generadoPor: getUsuarioActual()
        };
    });
    prospectos[idx] = p;
    DB.set('prospectos', prospectos);
}
