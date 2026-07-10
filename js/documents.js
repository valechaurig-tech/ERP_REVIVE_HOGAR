/**
 * Revive Hogar — documentos (plantillas pendientes)
 */

function generarVistaDocumentos(prospecto) {
    const datos = recolectarDatosDocumento(prospecto);
    const bloques = [
        { titulo: 'Contrato de servicios', id: 'doc-contrato' },
        { titulo: 'Acuerdo de confidencialidad', id: 'doc-confidencialidad' },
        { titulo: 'Aviso de privacidad', id: 'doc-privacidad' }
    ];
    return bloques.map(b => `
        <section class="doc-preview-card mkt-section">
            <h4 class="section-title">${escapeHtml(b.titulo)}</h4>
            <div class="doc-preview-body" id="${b.id}" contenteditable="true">${plantillaDocumento(b.titulo, datos)}</div>
            <button type="button" class="btn btn-outline btn-small" onclick="imprimirDocumento('${b.id}', '${escapeHtml(b.titulo)}')">Imprimir</button>
        </section>`).join('');
}

function recolectarDatosDocumento(p) {
    return {
        nombreCompleto: p.nombreCompleto || '',
        telefono: p.telefono || '',
        direccionPropiedad: p.direccionPropiedad || '',
        tipoCredito: p.tipoCredito || '',
        tieneEscrituras: p.tieneEscrituras || '',
        invadida: p.invadida || '',
        adeudoCredito: formatearMoneda(p.adeudoCredito),
        adeudoAgua: formatearMoneda(p.adeudoAgua),
        adeudoLuz: formatearMoneda(p.adeudoLuz),
        adeudoPredial: formatearMoneda(p.adeudoPredial),
        montoAdquisicion: formatearMoneda(p.montoAdquisicion),
        fecha: new Date().toLocaleDateString('es-MX')
    };
}

function plantillaDocumento(tipo, d) {
    return `<p><strong>${escapeHtml(tipo)}</strong></p>
        <p>Fecha: ${escapeHtml(d.fecha)}</p>
        <p>En Revive Hogar, con domicilio operativo en México, y el/la C. <strong>${escapeHtml(d.nombreCompleto)}</strong>, teléfono ${escapeHtml(d.telefono)}, propiedad ubicada en <strong>${escapeHtml(d.direccionPropiedad)}</strong>, con crédito <strong>${escapeHtml(d.tipoCredito)}</strong>, escrituras: <strong>${escapeHtml(d.tieneEscrituras)}</strong>, situación de invasión: <strong>${escapeHtml(d.invadida)}</strong>.</p>
        <p>Adeudos reportados — Crédito: ${escapeHtml(d.adeudoCredito)}; Agua: ${escapeHtml(d.adeudoAgua)}; Luz: ${escapeHtml(d.adeudoLuz)}; Predial: ${escapeHtml(d.adeudoPredial)}.</p>
        <p><strong>Precio de compra acordado:</strong> ${escapeHtml(d.montoAdquisicion || '—')}</p>
        <p><em>Plantilla provisional — sustituir cuando se entreguen los formatos oficiales.</em></p>`;
}

function imprimirDocumento(elementId, titulo) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const ventana = window.open('', '_blank');
    if (!ventana) { alert('Permite ventanas emergentes para imprimir.'); return; }
    ventana.document.write(`<!DOCTYPE html><html><head><title>${escapeHtml(titulo)}</title>
        <style>body{font-family:Segoe UI,sans-serif;padding:40px;line-height:1.6;color:#111}</style></head><body>${el.innerHTML}</body></html>`);
    ventana.document.close();
    ventana.focus();
    ventana.print();
}

function guardarDocumentosDesdeExpediente(prospectoId) {
    const prospectos = DB.get('prospectos');
    const idx = prospectos.findIndex(p => p.id === prospectoId);
    if (idx < 0) return;
    prospectos[idx].documentos = {
        contrato: document.getElementById('doc-contrato')?.innerHTML || '',
        confidencialidad: document.getElementById('doc-confidencialidad')?.innerHTML || '',
        privacidad: document.getElementById('doc-privacidad')?.innerHTML || ''
    };
    DB.set('prospectos', prospectos);
}
