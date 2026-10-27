/**
 * Revive Hogar — reglas globales controladas por Dirección.
 * Define obligatoriedad y orden sin duplicar validaciones en cada módulo.
 */

const RH_CONFIG_REQUISITOS_ID = 'config_requisitos';
let configuracionRequisitosDraft = null;

function construirReglasRequisitosDefault() {
    const asesor = [
        ['ase_direccion', 'Dirección de la propiedad', 'campo', 'direccionPropiedad', 'siempre', true],
        ['ase_tipo_credito', 'Tipo de crédito', 'campo', 'tipoCredito', 'siempre', true],
        ['ase_tiene_escrituras', '¿Tiene escrituras?', 'campo', 'tieneEscrituras', 'siempre', true],
        ['ase_estatus_propiedad', 'Estatus actual de la propiedad', 'campo', 'estatusPropiedad', 'siempre', true],
        ['ase_ine_frente', 'INE por el frente', 'archivo', 'ine_frente', 'siempre'],
        ['ase_ine_reverso', 'INE por el reverso', 'archivo', 'ine_reverso', 'siempre'],
        ['ase_ine_domicilio', 'Confirmar domicilio de la INE', 'campo', 'ineDomicilioPropiedad', 'siempre'],
        ['ase_cfe_respuesta', 'Confirmar CFE a nombre del vendedor', 'campo', 'cfeNombreYDomicilio', 'siempre'],
        ['ase_meses_viviendo', 'Meses viviendo en el inmueble', 'campoNumero', 'mesesViviendo', 'siempre'],
        ['ase_adeudo_credito_estado', 'Estado de revisión del adeudo crédito', 'campo', 'adeudoCreditoEstado', 'siempre'],
        ['ase_adeudo_agua_estado', 'Estado de revisión del adeudo de agua', 'campo', 'adeudoAguaEstado', 'siempre'],
        ['ase_adeudo_luz_estado', 'Estado de revisión del adeudo de luz', 'campo', 'adeudoLuzEstado', 'siempre'],
        ['ase_adeudo_predial_estado', 'Estado de revisión del adeudo predial', 'campo', 'adeudoPredialEstado', 'siempre'],
        ['ase_adeudo_credito', 'Monto de adeudo crédito', 'campoAdeudo', 'adeudoCredito', 'siempre'],
        ['ase_adeudo_agua', 'Monto de adeudo de agua', 'campoAdeudo', 'adeudoAgua', 'siempre'],
        ['ase_adeudo_luz', 'Monto de adeudo de luz', 'campoAdeudo', 'adeudoLuz', 'siempre'],
        ['ase_adeudo_predial', 'Monto de adeudo predial', 'campoAdeudo', 'adeudoPredial', 'siempre'],
        ['ase_precio_venta', 'Precio de venta estimado por el asesor', 'campoMonto', 'precioVentaEstimadoAsesor', 'siempre'],
        ['ase_cfe_archivo', 'Recibo CFE', 'archivo', 'cfe_asesor', 'cfeSi'],
        ['ase_escrituras_archivo', 'Foto o PDF de escrituras', 'archivo', 'escrituras_asesor', 'escriturasSi'],
        ['ase_notaria', 'Confirmar existencia de la notaría', 'campo', 'existeNotariaEscritura', 'escriturasNo']
    ].map(([id, nombre, tipo, fuente, condicion, obligatorio = false], orden) => ({
        id, nombre, tipo, fuente, condicion, grupo: 'asesor', obligatorio, orden
    }));

    const camposAdmin = [
        ['adm_nombre', 'Nombre completo', 'nombreCompleto', 'siempre', false],
        ['adm_idmex', 'IDMEX de la INE', 'idmex', 'siempre', false],
        ['adm_celular', 'Celular', 'celular', 'siempre', false],
        ['adm_correo', 'Correo electrónico', 'correo', 'siempre', false],
        ['adm_casado', 'Estado civil', 'esCasado', 'siempre', false],
        ['adm_conyuge', 'Participación del cónyuge', 'conyugeParticipa', 'casado', false],
        ['adm_fecha_nacimiento', 'Fecha de nacimiento', 'fechaNacimiento', 'siempre', false],
        ['adm_lugar_nacimiento', 'Lugar de nacimiento', 'lugarNacimiento', 'siempre', false],
        ['adm_cuenta_mancomunada', 'Cuenta mancomunada', 'cuentaMancomunada', 'siempre', false],
        ['adm_isr', 'Forma de exención de ISR', 'exentaISRCon', 'siempre', false],
        ['adm_monto_adquisicion', 'Precio de compra', 'montoAdquisicion', 'siempre', true],
        ['adm_presupuesto_remodelacion', 'Presupuesto de remodelación', 'presupuestoRemodelacion', 'siempre', true],
        ['adm_gastos_administrativos', 'Gastos administrativos previstos', 'gastosAdministrativos', 'siempre', true],
        ['adm_requiere_poder', 'Definir si se necesita poder', 'requierePoder', 'siempre', true],
        ['adm_liquida_infonavit', 'Definir si se liquidará INFONAVIT', 'liquidaInfonavit', 'siempre', true],
        ['adm_tiene_referido', 'Definir si la operación tiene referido', 'tieneReferido', 'siempre', true],
        ['adm_referido_nombre', 'Nombre de quien refirió', 'referidoNombre', 'referidoSi', true],
        ['adm_referido_comision', 'Comisión del referido', 'referidoComision', 'referidoSi', true],
        ['adm_tiene_comision_venta', 'Definir si habrá comisión por venta', 'tieneComisionVenta', 'siempre', true],
        ['adm_comision_venta_valor', 'Porcentaje de comisión por venta', 'comisionVentaValor', 'comisionVentaSi', true],
        ['adm_oferta_pago_firma', 'Pago al firmar acuerdos', 'ofertaPagoFirma', 'oferta', true],
        ['adm_oferta_pago_ine', 'Pago al cambio de INE y apertura de cuenta (opcional)', 'ofertaPagoIneCuenta', 'oferta', false],
        ['adm_oferta_pago_venta', 'Pago a la venta de la propiedad', 'ofertaPagoVenta', 'oferta', true],
        ['adm_razon_social', 'Razón social responsable', 'razonSocial', 'kit', true],
        ['adm_domicilio_responsable', 'Domicilio del responsable', 'domicilioResponsable', 'kit', true],
        ['adm_correo_privacidad', 'Correo de privacidad', 'correoPrivacidad', 'kit', true],
        ['adm_comprador', 'Nombre del comprador / gestor', 'compradorNombre', 'kit', true],
        ['adm_escritura_numero', 'Número de escritura', 'escrituraNumero', 'escriturasNoOKit', true],
        ['adm_escritura_fecha', 'Fecha de escritura', 'escrituraFecha', 'escriturasNoOKit', true],
        ['adm_notario', 'Nombre del notario', 'notarioNombre', 'escriturasNoOKit', true],
        ['adm_notaria_numero', 'Número de notaría', 'notariaNumero', 'escriturasNoOKit', true],
        ['adm_notaria_municipio', 'Municipio de la notaría', 'notariaMunicipio', 'escriturasNoOKit', true],
        ['adm_folio_real', 'Folio real', 'folioReal', 'kit', true],
        ['adm_cuenta_predial', 'Cuenta predial', 'cuentaPredial', 'escriturasNo', true],
        ['adm_credito_numero', 'Número de crédito', 'creditoNumero', 'kit', true],
        ['adm_precio_venta', 'Posible precio de venta', 'precioVentaEstimado', 'siempre', true],
        ['adm_lugar_firma', 'Lugar de firma', 'lugarFirma', 'kit', true],
        ['adm_fecha_firma', 'Fecha de firma', 'fechaFirma', 'siempre', true],
        ['adm_adeudos_adicionales', 'Adeudos o acuerdos adicionales', 'adeudosAdicionales', 'siempre', false]
    ].map(([id, nombre, fuente, condicion, obligatorio], orden) => ({
        id, nombre, tipo: 'campoAdmin', fuente, condicion,
        grupo: 'administradora_campos', obligatorio, orden
    }));

    const documentos = (typeof RH_DOCUMENTOS_EXPEDIENTE !== 'undefined' ? RH_DOCUMENTOS_EXPEDIENTE : [])
        .map((doc, orden) => ({
            id: `doc_${doc.tipo}`,
            nombre: doc.nombre,
            tipo: 'documentoAdmin',
            fuente: doc.tipo,
            condicion: 'documento',
            grupo: 'administradora_documentos',
            obligatorio: !!doc.requerido,
            orden
        }));
    const camposOperacionAdmin = [
        ['adm_tipo_credito', 'Tipo de crédito', 'tipoCredito', 'siempre', false],
        ['adm_tiene_escrituras', '¿Tiene escrituras?', 'tieneEscrituras', 'siempre', false],
        ['adm_existe_notaria', '¿Existe la notaría de la escritura?', 'existeNotariaEscritura', 'escriturasNo', false],
        ['adm_estatus_propiedad', 'Estatus actual de la propiedad', 'estatusPropiedad', 'siempre', false],
        ['adm_adeudo_credito', 'Monto de adeudo crédito', 'adeudoCredito', 'siempre', false],
        ['adm_adeudo_agua', 'Monto de adeudo de agua', 'adeudoAgua', 'siempre', false],
        ['adm_adeudo_luz', 'Monto de adeudo de luz', 'adeudoLuz', 'siempre', false],
        ['adm_adeudo_predial', 'Monto de adeudo predial', 'adeudoPredial', 'siempre', false],
        ['adm_adeudo_credito_estado', 'Estado del adeudo crédito', 'adeudoCreditoEstado', 'siempre', false],
        ['adm_adeudo_agua_estado', 'Estado del adeudo de agua', 'adeudoAguaEstado', 'siempre', false],
        ['adm_adeudo_luz_estado', 'Estado del adeudo de luz', 'adeudoLuzEstado', 'siempre', false],
        ['adm_adeudo_predial_estado', 'Estado del adeudo predial', 'adeudoPredialEstado', 'siempre', false]
    ].map(([id, nombre, fuente, condicion, obligatorio], orden) => ({
        id, nombre, tipo: fuente.startsWith('adeudo') && !fuente.endsWith('Estado')
            ? 'campoAdeudoProspectoAdmin' : 'campoProspectoAdmin', fuente, condicion,
        grupo: 'administradora_campos', obligatorio, orden: camposAdmin.length + orden
    }));
    return [...asesor, ...camposAdmin, ...camposOperacionAdmin, ...documentos];
}

function getRegistroConfiguracionRequisitos() {
    return DB.get('configuracion').find(x => x.id === RH_CONFIG_REQUISITOS_ID) || null;
}

function getReglasRequisitos() {
    const base = construirReglasRequisitosDefault();
    const guardadas = getRegistroConfiguracionRequisitos()?.reglas || [];
    const porId = new Map(guardadas.map(x => [x.id, x]));
    return base.map(regla => {
        const guardada = porId.get(regla.id);
        return {
            ...regla,
            obligatorio: guardada ? !!guardada.obligatorio : regla.obligatorio,
            orden: Number.isFinite(Number(guardada?.orden)) ? Number(guardada.orden) : regla.orden
        };
    })
        .sort((a, b) => a.grupo.localeCompare(b.grupo) || Number(a.orden) - Number(b.orden));
}

function getReglaRequisito(id) {
    return getReglasRequisitos().find(x => x.id === id);
}

function esReglaObligatoria(id) {
    return !!getReglaRequisito(id)?.obligatorio;
}

function aplicarIndicadoresRequisitos() {
    document.querySelectorAll('[data-requisito]').forEach(label => {
        const obligatorio = esReglaObligatoria(label.dataset.requisito) ||
            (label.dataset.requisitoSecundario && esReglaObligatoria(label.dataset.requisitoSecundario));
        label.classList.toggle('rh-label-required', !!obligatorio);
    });
}

function aplicarIndicadoresRequisitosAdmin() {
    const ids = {
        adm_nombre: 'exp-dato-nombre',
        adm_idmex: 'exp-dato-idmex',
        adm_celular: 'exp-dato-celular',
        adm_correo: 'exp-dato-correo',
        adm_casado: 'exp-dato-casado',
        adm_conyuge: 'exp-dato-conyuge',
        adm_fecha_nacimiento: 'exp-dato-nacimiento',
        adm_lugar_nacimiento: 'exp-dato-lugar',
        adm_cuenta_mancomunada: 'exp-dato-cuenta-mancomunada',
        adm_isr: 'exp-dato-isr',
        adm_monto_adquisicion: 'exp-monto-adquisicion',
        adm_presupuesto_remodelacion: 'exp-presupuesto-remodelacion',
        adm_gastos_administrativos: 'exp-gastos-administrativos',
        adm_requiere_poder: 'exp-requiere-poder',
        adm_liquida_infonavit: 'exp-liquida-infonavit',
        adm_tiene_referido: 'exp-tiene-referido',
        adm_referido_nombre: 'exp-referido-nombre',
        adm_referido_comision: 'exp-referido-comision',
        adm_tiene_comision_venta: 'exp-tiene-comision-venta',
        adm_comision_venta_valor: 'exp-comision-venta-valor',
        adm_oferta_pago_firma: 'exp-oferta-pago-firma',
        adm_oferta_pago_ine: 'exp-oferta-pago-ine',
        adm_oferta_pago_venta: 'exp-oferta-pago-venta',
        adm_razon_social: 'exp-legal-razon-social',
        adm_domicilio_responsable: 'exp-legal-domicilio-responsable',
        adm_correo_privacidad: 'exp-legal-correo-privacidad',
        adm_comprador: 'exp-legal-comprador',
        adm_escritura_numero: 'exp-legal-escritura-numero',
        adm_escritura_fecha: 'exp-legal-escritura-fecha',
        adm_notario: 'exp-legal-notario',
        adm_notaria_numero: 'exp-legal-notaria-numero',
        adm_notaria_municipio: 'exp-legal-notaria-municipio',
        adm_folio_real: 'exp-legal-folio-real',
        adm_cuenta_predial: 'exp-legal-cuenta-predial',
        adm_credito_numero: 'exp-legal-credito-numero',
        adm_precio_venta: 'exp-legal-precio-venta',
        adm_lugar_firma: 'exp-legal-lugar-firma',
        adm_fecha_firma: 'exp-legal-fecha-firma',
        adm_adeudos_adicionales: 'exp-legal-adeudos-adicionales',
        adm_tipo_credito: 'exp-tipo-credito',
        adm_tiene_escrituras: 'exp-escrituras',
        adm_existe_notaria: 'exp-existe-notaria',
        adm_estatus_propiedad: 'exp-estatus-propiedad',
        adm_adeudo_credito: 'exp-adeudo-credito',
        adm_adeudo_agua: 'exp-adeudo-agua',
        adm_adeudo_luz: 'exp-adeudo-luz',
        adm_adeudo_predial: 'exp-adeudo-predial',
        adm_adeudo_credito_estado: 'exp-adeudo-credito-estado',
        adm_adeudo_agua_estado: 'exp-adeudo-agua-estado',
        adm_adeudo_luz_estado: 'exp-adeudo-luz-estado',
        adm_adeudo_predial_estado: 'exp-adeudo-predial-estado'
    };
    const estadoPorLabel = new Map();
    Object.entries(ids).forEach(([reglaId, inputId]) => {
        const label = document.getElementById(inputId)?.closest('.form-group')?.querySelector('label');
        if (label) estadoPorLabel.set(label, (estadoPorLabel.get(label) || false) || esReglaObligatoria(reglaId));
    });
    estadoPorLabel.forEach((obligatorio, label) => label.classList.toggle('rh-label-required', obligatorio));
}

function condicionReglaAplica(p, regla) {
    if (!p || !regla) return false;
    if (regla.condicion === 'cfeSi') return p.cfeNombreYDomicilio === 'Si';
    if (regla.condicion === 'escriturasSi') return p.tieneEscrituras === 'Si';
    if (regla.condicion === 'escriturasNo') return p.tieneEscrituras === 'No';
    if (regla.condicion === 'casado') return p.datosExpediente?.esCasado === 'Si';
    if (regla.condicion === 'referidoSi') return p.datosExpediente?.tieneReferido === 'Si';
    if (regla.condicion === 'comisionVentaSi') return p.datosExpediente?.tieneComisionVenta === 'Si';
    if (regla.condicion === 'oferta') return Number(p.montoAdquisicion || 0) > 0;
    if (regla.condicion === 'kit') return typeof kitAperturaDisponible === 'function' && kitAperturaDisponible(p);
    if (regla.condicion === 'escriturasNoOKit') {
        return p.tieneEscrituras === 'No' || (typeof kitAperturaDisponible === 'function' && kitAperturaDisponible(p));
    }
    if (regla.condicion === 'documento') {
        const doc = RH_DOCUMENTOS_EXPEDIENTE.find(x => x.tipo === regla.fuente);
        return !!doc && documentoAplica(p, doc);
    }
    return true;
}

function valorReglaCapturado(p, regla) {
    if (regla.tipo === 'archivo' || regla.tipo === 'documentoAdmin') {
        return !!getArchivoProspecto(p.id, regla.fuente);
    }
    if (regla.tipo === 'campo') return p[regla.fuente];
    if (regla.tipo === 'campoNumero') return p[regla.fuente] !== '' && p[regla.fuente] != null;
    if (regla.tipo === 'campoMonto') return Number(p[regla.fuente] || 0) > 0;
    if (regla.tipo === 'campoAdeudo' || regla.tipo === 'campoAdeudoProspectoAdmin') {
        const estado = p[`${regla.fuente}Estado`];
        return estado === 'No aplica' || Number(p[regla.fuente] || 0) > 0;
    }
    if (regla.tipo === 'campoProspectoAdmin') {
        const valor = p[regla.fuente];
        return typeof valor === 'number' ? valor >= 0 : !!String(valor || '').trim();
    }
    if (regla.tipo === 'campoAdmin') {
        if (regla.fuente === 'montoAdquisicion') return Number(p.montoAdquisicion || 0) > 0;
        const valor = p.datosExpediente?.[regla.fuente];
        return typeof valor === 'number' ? valor > 0 : !!String(valor || '').trim();
    }
    return false;
}

function validarReglasObligatorias(p, grupo) {
    return getReglasRequisitos()
        .filter(x => x.grupo === grupo && x.obligatorio && condicionReglaAplica(p, x))
        .filter(x => !valorReglaCapturado(p, x))
        .map(x => x.nombre);
}

function getPendientesOpcionales(p, grupos) {
    const listaGrupos = Array.isArray(grupos) ? grupos : [grupos];
    return getReglasRequisitos()
        .filter(x => listaGrupos.includes(x.grupo) && !x.obligatorio && condicionReglaAplica(p, x))
        .filter(x => !valorReglaCapturado(p, x))
        .map(x => x.nombre);
}

function ordenarDocumentosExpediente(documentos) {
    const orden = new Map(getReglasRequisitos()
        .filter(x => x.grupo === 'administradora_documentos')
        .map(x => [x.fuente, Number(x.orden)]));
    return [...documentos].sort((a, b) => (orden.get(a.tipo) ?? 999) - (orden.get(b.tipo) ?? 999));
}

function renderConfiguracionRequisitos() {
    if (!rhEsDireccion(currentUser)) return;
    configuracionRequisitosDraft = getReglasRequisitos().map(x => ({ ...x }));
    renderConfiguracionRequisitosDraft();
}

function renderConfiguracionRequisitosDraft() {
    const wrap = document.getElementById('configuracion-requisitos-content');
    if (!wrap || !configuracionRequisitosDraft) return;
    const secciones = [
        ['asesor', '01', 'Requisitos del Asesor', 'Se evalúan al marcar Interesado y enviar a Administradora.'],
        ['administradora_campos', '02', 'Campos del expediente de Regi', 'Se evalúan al guardar y enviar la propuesta al vendedor.'],
        ['administradora_documentos', '03', 'Documentos del expediente', 'Respeta las reglas automáticas de aplica / no aplica.']
    ];
    wrap.innerHTML = secciones.map(([grupo, numero, titulo, descripcion]) => {
        const reglas = configuracionRequisitosDraft.filter(x => x.grupo === grupo)
            .sort((a, b) => Number(a.orden) - Number(b.orden));
        return `<section class="cfg-section">
            <div class="cfg-section-head"><span>${numero}</span><div><h4>${escapeHtml(titulo)}</h4><p>${escapeHtml(descripcion)}</p></div></div>
            <div class="cfg-rule-list">
                ${reglas.map((regla, i) => reglaConfiguracionHtml(regla, i, reglas.length)).join('')}
            </div>
        </section>`;
    }).join('');
}

function reglaConfiguracionHtml(regla, indice, total) {
    return `<article class="cfg-rule ${regla.obligatorio ? 'is-required' : 'is-optional'}">
        <div class="cfg-order">
            <button type="button" ${indice === 0 ? 'disabled' : ''} onclick="moverReglaConfiguracion('${regla.id}',-1)" aria-label="Subir">↑</button>
            <button type="button" ${indice === total - 1 ? 'disabled' : ''} onclick="moverReglaConfiguracion('${regla.id}',1)" aria-label="Bajar">↓</button>
        </div>
        <div class="cfg-rule-copy"><strong>${escapeHtml(regla.nombre)}</strong><small>${escapeHtml(etiquetaCondicionRegla(regla.condicion))}</small></div>
        <label class="cfg-required-toggle">
            <input type="checkbox" ${regla.obligatorio ? 'checked' : ''} onchange="cambiarObligatorioConfiguracion('${regla.id}',this.checked)">
            <span>${regla.obligatorio ? 'Obligatorio' : 'Opcional'}</span>
        </label>
    </article>`;
}

function etiquetaCondicionRegla(condicion) {
    return ({
        siempre: 'Siempre aplica',
        cfeSi: 'Aplica cuando indicó que sí tiene CFE',
        escriturasSi: 'Aplica cuando indicó que sí tiene escrituras',
        escriturasNo: 'Aplica cuando no tiene escrituras',
        casado: 'Aplica cuando el propietario está casado',
        kit: 'Aplica cuando el kit de apertura está habilitado',
        escriturasNoOKit: 'Aplica para recuperar escrituras o generar el kit',
        documento: 'Según la condición propia del documento'
    })[condicion] || 'Según aplique';
}

function cambiarObligatorioConfiguracion(id, obligatorio) {
    const regla = configuracionRequisitosDraft?.find(x => x.id === id);
    if (!regla) return;
    regla.obligatorio = !!obligatorio;
    renderConfiguracionRequisitosDraft();
}

function moverReglaConfiguracion(id, direccion) {
    const regla = configuracionRequisitosDraft?.find(x => x.id === id);
    if (!regla) return;
    const grupo = configuracionRequisitosDraft.filter(x => x.grupo === regla.grupo)
        .sort((a, b) => Number(a.orden) - Number(b.orden));
    const indice = grupo.findIndex(x => x.id === id);
    const destino = grupo[indice + direccion];
    if (!destino) return;
    const ordenActual = regla.orden;
    regla.orden = destino.orden;
    destino.orden = ordenActual;
    renderConfiguracionRequisitosDraft();
}

function guardarConfiguracionRequisitos() {
    if (!rhEsDireccion(currentUser) || !configuracionRequisitosDraft) return;
    const registros = DB.get('configuracion');
    const idx = registros.findIndex(x => x.id === RH_CONFIG_REQUISITOS_ID);
    const registro = {
        id: RH_CONFIG_REQUISITOS_ID,
        reglas: configuracionRequisitosDraft.map(x => ({
            id: x.id,
            obligatorio: !!x.obligatorio,
            orden: Number(x.orden)
        })),
        actualizadoEn: new Date().toISOString(),
        actualizadoPor: getUsuarioActual()
    };
    if (idx >= 0) registros[idx] = registro;
    else registros.push(registro);
    DB.set('configuracion', registros);
    logAction('Configuración de requisitos actualizada');
    alert('Configuración guardada. Las nuevas reglas ya están activas.');
    renderConfiguracionRequisitos();
}

function restaurarConfiguracionRequisitos() {
    if (!rhEsDireccion(currentUser) || !confirmAction('¿Restaurar la configuración inicial de requisitos?')) return;
    configuracionRequisitosDraft = construirReglasRequisitosDefault();
    guardarConfiguracionRequisitos();
}
