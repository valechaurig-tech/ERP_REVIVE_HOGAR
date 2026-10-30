/**
 * Revive Hogar — control financiero integral por propiedad.
 * Reemplaza la hoja de cálculo operativa con presupuesto, egresos,
 * inversiones, retornos y pagos trazables.
 */

const RH_CONCEPTOS_PRESUPUESTO = [
    ['ADEUDO AGUA', 0],
    ['ADEUDO PREDIAL', 0],
    ['ADEUDO LUZ', 0],
    ['ADEUDO INFONAVIT', 0],
    ['PAGO REFERIDO', 0],
    ['REMODELACIÓN', 0],
    ['GASTOS ADMINISTRATIVOS', 0],
    ['CANCELACIÓN DE INFONAVIT', 0],
    ['PODER', 5500],
    ['GASTOS OPERATIVOS', 0],
    ['EXTRAS', 0],
    ['OTROS', 0],
    ['COMISIÓN POR VENTA', 0],
    ['PROPIETARIO', 0],
    ['DESALOJO', 0],
    ['ESCRITURAS', 0],
    ['AVALÚO', 0],
    ['INTERÉS POR INVERSIÓN', 0]
];

const RH_TIPOS_EGRESO = [
    'Remodelación',
    'Gastos administrativos',
    'Pagos a Tío Fabio (remodelación)',
    'Infonavit / crédito',
    'Propietario',
    'Escrituras',
    'Otro'
];

let gastoPropiedadActivaId = null;

function puedeGestionarGastos() {
    return !!currentUser && (rhEsDireccion(currentUser) || currentUser.rol === 'Administradora');
}

function normalizarLista(valor) {
    return Array.isArray(valor) ? valor : [];
}

function crearPartidasPresupuesto(casa, prospecto) {
    const partidas = RH_CONCEPTOS_PRESUPUESTO.map(([concepto, monto]) => ({
        id: DB.getId(),
        concepto,
        monto,
        fecha: '',
        nota: '',
        automatico: false
    }));
    const setMonto = (concepto, monto, nota) => {
        const partida = partidas.find(x => x.concepto === concepto);
        if (!partida) return;
        partida.monto = Number(monto || 0);
        partida.nota = nota || '';
        partida.automatico = partida.monto > 0;
    };

    setMonto('ADEUDO AGUA', prospecto?.adeudoAguaEstado === 'No aplica' ? 0 : prospecto?.adeudoAgua, 'Importado del expediente');
    setMonto('ADEUDO PREDIAL', prospecto?.adeudoPredialEstado === 'No aplica' ? 0 : prospecto?.adeudoPredial, 'Importado del expediente');
    setMonto('ADEUDO LUZ', prospecto?.adeudoLuzEstado === 'No aplica' ? 0 : prospecto?.adeudoLuz, 'Importado del expediente');
    const liquidaInfonavit = prospecto?.datosExpediente?.liquidaInfonavit === 'Si';
    const adeudoCredito = prospecto?.adeudoCreditoEstado === 'No aplica' ? 0 : Number(prospecto?.adeudoCredito || 0);
    setMonto('ADEUDO INFONAVIT', liquidaInfonavit ? adeudoCredito * 0.87 : adeudoCredito,
        liquidaInfonavit ? 'Liquidación INFONAVIT calculada al 87%' : 'Importado del expediente');
    setMonto('CANCELACIÓN DE INFONAVIT', liquidaInfonavit ? 5500 : 0, liquidaInfonavit ? 'Gasto previsto de cancelación' : '');
    setMonto('PROPIETARIO', casa?.montoAdquisicion || prospecto?.montoAdquisicion, 'Monto acordado con propietario');
    setMonto('REMODELACIÓN', prospecto?.datosExpediente?.presupuestoRemodelacion, 'Definido por Regina antes de propuesta');
    setMonto('GASTOS ADMINISTRATIVOS', prospecto?.datosExpediente?.gastosAdministrativos, 'Definido por Regina antes de propuesta');
    setMonto('PODER', prospecto?.datosExpediente?.requierePoder === 'Si' ? 5500 : 0, 'Según revisión de Regina');
    setMonto('PAGO REFERIDO', prospecto?.datosExpediente?.tieneReferido === 'Si' ? prospecto?.datosExpediente?.referidoComision : 0,
        prospecto?.datosExpediente?.tieneReferido === 'Si' && prospecto?.datosExpediente?.referidoNombre ? `Referido: ${prospecto.datosExpediente.referidoNombre}` : '');
    if ((prospecto?.estatusPropiedad || (prospecto?.invadida === 'Si' ? 'Invadida' : '')) === 'Invadida') {
        setMonto('DESALOJO', 20000, 'Sugerido por inmueble invadido');
    }
    if (prospecto?.tieneEscrituras === 'No') {
        const existeNotaria = prospecto?.existeNotariaEscritura === 'Si';
        setMonto(
            'ESCRITURAS',
            existeNotaria ? 5000 : 15000,
            existeNotaria ? 'Segundo testimonio en notaría' : 'Recuperación en Archivo Público'
        );
    }
    return partidas;
}

function crearPresupuestoCasa(casa, prospectoDirecto) {
    const prospecto = prospectoDirecto || getProspectoById(casa?.prospectoId);
    return {
        id: DB.getId(),
        casaId: casa?.id || null,
        prospectoId: prospecto?.id || casa?.prospectoId,
        fechaCreacion: new Date().toISOString(),
        actualizadoEn: new Date().toISOString(),
        modeloVersion: 2,
        cabecera: {
            propiedad: casa?.direccionPropiedad || prospecto?.direccionPropiedad || '',
            vendedor: prospecto?.nombreCompleto || casa?.nombreCompleto || '',
            comprador: '',
            nss: prospecto?.datosExpediente?.nss || '',
            fechaInicio: casa?.fechaFirma ? String(casa.fechaFirma).slice(0, 10) : hoyISO(),
            fechaCierre: '',
            encargadoObra: '',
            estatusAdmin: 'Disponible',
            estatusFisico: 'Levantamiento',
            importante: '',
            mesesViviendo: Number(prospecto?.mesesViviendo || 0)
        },
        partidas: crearPartidasPresupuesto(casa || {}, prospecto),
        egresos: [],
        inversionistas: [],
        retornos: [],
        pagosComprador: [],
        ventaPropiedad: Number(casa?.precioVenta || 0),
        comisionVenta: {
            tipo: 'Porcentaje',
            valor: prospecto?.datosExpediente?.tieneComisionVenta === 'Si'
                ? Number(prospecto?.datosExpediente?.comisionVentaValor || 0) : 0
        },
        apartadosRecibidos: 0,
        porcentajeUtilidadSocios: 0,
        notas: ''
    };
}

function normalizarPresupuesto(p, casa, prospecto) {
    let requiereGuardar = false;
    if (!p.cabecera) {
        p.cabecera = crearPresupuestoCasa(casa, prospecto).cabecera;
        requiereGuardar = true;
    }
    if (!Array.isArray(p.partidas) || p.partidas.length === 0) {
        p.partidas = crearPartidasPresupuesto(casa || {}, prospecto || getProspectoById(casa?.prospectoId));
        requiereGuardar = true;
    } else {
        const base = crearPartidasPresupuesto(casa || {}, prospecto || getProspectoById(casa?.prospectoId));
        base.forEach(partida => {
            if (!p.partidas.some(x => x.concepto === partida.concepto)) {
                p.partidas.push(partida);
                requiereGuardar = true;
            }
        });
    }
    if (Number(p.modeloVersion || 0) < 2) {
        const d = (prospecto || getProspectoById(casa?.prospectoId))?.datosExpediente || {};
        const migrarMonto = (concepto, montoLegacy, nuevoMonto = 0) => {
            const partida = p.partidas.find(x => x.concepto === concepto);
            if (partida && Number(partida.monto || 0) === montoLegacy && !partida.nota) {
                partida.monto = Number(nuevoMonto || 0);
                partida.automatico = partida.monto > 0;
            }
        };
        migrarMonto('PAGO REFERIDO', 5000, d.tieneReferido === 'Si' ? d.referidoComision : 0);
        migrarMonto('GASTOS ADMINISTRATIVOS', 10000, d.gastosAdministrativos);
        migrarMonto('CANCELACIÓN DE INFONAVIT', 5500, d.liquidaInfonavit === 'Si' ? 5500 : 0);
        migrarMonto('GASTOS OPERATIVOS', 10000);
        migrarMonto('EXTRAS', 20000);
        migrarMonto('INTERÉS POR INVERSIÓN', 1200);
        p.modeloVersion = 2;
        requiereGuardar = true;
    }
    p.egresos = normalizarLista(p.egresos);
    const partidaPorConcepto = concepto => p.partidas.find(x => x.concepto === concepto)?.id || null;
    p.egresos.forEach(egreso => {
        if (egreso.partidaId) return;
        const concepto = {
            'Propietario': 'PROPIETARIO',
            'Administrativo': 'GASTOS ADMINISTRATIVOS',
            'Gastos administrativos': 'GASTOS ADMINISTRATIVOS',
            'Pago referido': 'PAGO REFERIDO',
            'Infonavit / crédito': 'ADEUDO INFONAVIT',
            'Escrituras': 'ESCRITURAS',
            'Remodelación': 'REMODELACIÓN',
            'Pagos a Tío Fabio (remodelación)': 'REMODELACIÓN'
        }[egreso.categoria];
        if (concepto) {
            egreso.partidaId = partidaPorConcepto(concepto);
            requiereGuardar = true;
        }
    });
    p.inversionistas = normalizarLista(p.inversionistas);
    p.retornos = normalizarLista(p.retornos);
    p.pagosComprador = normalizarLista(p.pagosComprador);
    p.comisionVenta = p.comisionVenta || { tipo: 'Porcentaje', valor: 0 };
    if (p.comisionVenta.tipo !== 'Monto' && p.comisionVenta.tipo !== 'Porcentaje') p.comisionVenta.tipo = 'Porcentaje';
    if (casa && !Number(p.ventaPropiedad || 0) && Number(casa.precioVenta || 0)) {
        p.ventaPropiedad = Number(casa.precioVenta);
        requiereGuardar = true;
    }
    if (casa && sincronizarCostosPipelineEnPresupuesto(p, casa)) requiereGuardar = true;
    if (requiereGuardar) guardarPresupuesto(p);
    return p;
}

function sincronizarCostosPipelineEnPresupuesto(p, casa) {
    const costos = getCostosRemodelacionCasa(casa);
    const idsVigentes = new Set(costos.map(c => c.id));
    const cantidadAnterior = p.egresos.length;
    p.egresos = p.egresos.filter(x =>
        x.origenSistema !== 'pipeline_remodelacion' || idsVigentes.has(x.origenId)
    );
    let cambio = p.egresos.length !== cantidadAnterior;
    costos.forEach(costo => {
        let egreso = p.egresos.find(x => x.origenSistema === 'pipeline_remodelacion' && x.origenId === costo.id);
        if (!egreso) {
            egreso = { id: `rem-${costo.id}`, origenSistema: 'pipeline_remodelacion', origenId: costo.id };
            p.egresos.push(egreso);
            cambio = true;
        }
        const actualizado = {
            fecha: costo.fecha || '',
            categoria: costo.categoria || 'Remodelación',
            origen: 'Revive',
            concepto: costo.concepto || 'Remodelación',
            nota: costo.nota || 'Registrado desde Propiedades',
            monto: Number(costo.monto || 0),
            registradoPor: costo.registradoPor || ''
        };
        const conceptoPartida = costo.categoria === 'Gastos administrativos'
            ? 'GASTOS ADMINISTRATIVOS'
            : 'REMODELACIÓN';
        actualizado.partidaId = p.partidas.find(x => x.concepto === conceptoPartida)?.id || null;
        Object.entries(actualizado).forEach(([campo, valor]) => {
            if (egreso[campo] !== valor) { egreso[campo] = valor; cambio = true; }
        });
    });
    return cambio;
}

function consolidarPresupuestosDuplicados(presupuestos, prospecto, casa) {
    if (!prospecto) return null;
    const coincidentes = presupuestos.filter(x =>
        x.prospectoId === prospecto.id || (casa && x.casaId === casa.id)
    );
    if (coincidentes.length <= 1) return coincidentes[0] || null;
    coincidentes.sort((a, b) => {
        const aCasa = a.casaId === casa?.id ? 1 : 0;
        const bCasa = b.casaId === casa?.id ? 1 : 0;
        return bCasa - aCasa || String(b.actualizadoEn || '').localeCompare(String(a.actualizadoEn || ''));
    });
    const principal = coincidentes[0];
    const fusionarLista = campo => {
        const mapa = new Map(normalizarLista(principal[campo]).map(x => [x.id, x]));
        coincidentes.slice(1).forEach(origen => normalizarLista(origen[campo]).forEach(x => {
            if (!mapa.has(x.id)) mapa.set(x.id, x);
        }));
        principal[campo] = Array.from(mapa.values());
    };
    ['egresos', 'inversionistas', 'retornos', 'pagosComprador'].forEach(fusionarLista);
    principal.partidas = normalizarLista(principal.partidas);
    coincidentes.slice(1).forEach(origen => normalizarLista(origen.partidas).forEach(partida => {
        const existente = principal.partidas.find(x => x.id === partida.id || x.concepto === partida.concepto);
        if (!existente) principal.partidas.push(partida);
        else if (!Number(existente.monto || 0) && Number(partida.monto || 0)) Object.assign(existente, partida);
    }));
    principal.cabecera = principal.cabecera || {};
    coincidentes.slice(1).forEach(origen => Object.entries(origen.cabecera || {}).forEach(([key, value]) => {
        if ((principal.cabecera[key] === '' || principal.cabecera[key] == null) && value !== '' && value != null) {
            principal.cabecera[key] = value;
        }
    }));
    if (!Number(principal.ventaPropiedad || 0)) {
        principal.ventaPropiedad = Math.max(...coincidentes.map(x => Number(x.ventaPropiedad || 0)));
    }
    if (casa) principal.casaId = casa.id;
    principal.prospectoId = prospecto.id;
    principal.actualizadoEn = new Date().toISOString();
    const idsDuplicados = new Set(coincidentes.slice(1).map(x => x.id));
    DB.set('presupuestos', presupuestos.filter(x => !idsDuplicados.has(x.id)));
    coincidentes.slice(1).forEach(x => DB.remove('presupuestos', x.id).catch(console.warn));
    logAction(`Presupuestos duplicados consolidados: ${prospecto.nombreCompleto || prospecto.id}`);
    return principal;
}

function getPresupuestoCasa(casaId, crear = true) {
    const casas = DB.get('casas');
    const casaDirecta = casas.find(c => c.id === casaId);
    const prospecto = casaDirecta
        ? getProspectoById(casaDirecta.prospectoId)
        : getProspectoById(casaId);
    if (!casaDirecta && !prospecto) return null;
    const casa = casaDirecta || casas.find(c => c.prospectoId === prospecto.id) || null;
    const presupuestos = DB.get('presupuestos');
    let p = consolidarPresupuestosDuplicados(presupuestos, prospecto, casa) ||
        presupuestos.find(x =>
            (casa && x.casaId === casa.id) ||
            (!!prospecto && x.prospectoId === prospecto.id)
        );
    if (p && casa && p.casaId !== casa.id) {
        p.casaId = casa.id;
        guardarPresupuesto(p);
    }
    if (!p && crear) {
        p = crearPresupuestoCasa(casa, prospecto);
        presupuestos.push(p);
        DB.set('presupuestos', presupuestos);
    }
    return p ? normalizarPresupuesto(p, casa, prospecto) : null;
}

function getPresupuestoProspecto(prospectoId, crear = true) {
    const casa = DB.get('casas').find(c => c.prospectoId === prospectoId);
    return getPresupuestoCasa(casa?.id || prospectoId, crear);
}

function guardarPresupuesto(p) {
    const presupuestos = DB.get('presupuestos');
    const idx = presupuestos.findIndex(x => x.id === p.id);
    p.actualizadoEn = new Date().toISOString();
    if (idx >= 0) presupuestos[idx] = p;
    else presupuestos.push(p);
    DB.set('presupuestos', presupuestos);
    vigilarSaldoCajaPropiedad(p);
}

function vigilarSaldoCajaPropiedad(p) {
    if (!p || typeof createAlert !== 'function' || typeof calcularResumenPresupuesto !== 'function') return;
    const r = calcularResumenPresupuesto(p);
    const id = p.casaId || p.prospectoId || p.id;
    if (r.saldoCaja < -0.009) {
        createAlert({
            titulo: 'Saldo de caja negativo',
            mensaje: `${p.cabecera?.propiedad || 'Propiedad'}: caja ${formatearMoneda(r.saldoCaja)}. Revisa inversiones, egresos y retornos.`,
            targetRoles: ['Direccion', 'Administradora'],
            relatedId: id,
            tipo: 'saldo_caja_negativo'
        });
    } else if (typeof resolverAlertasPorRelatedId === 'function') {
        resolverAlertasPorRelatedId(id, 'saldo_caja_negativo');
    }
}

function sincronizarPresupuestoProspecto(prospecto) {
    if (!prospecto?.id || !prospecto.direccionPropiedad) return;
    const casa = DB.get('casas').find(c => c.prospectoId === prospecto.id);
    const p = getPresupuestoCasa(casa?.id || prospecto.id, true);
    if (!p) return;
    const d = prospecto.datosExpediente || {};
    if (d.nss) p.cabecera.nss = d.nss;
    if (d.compradorNombre) p.cabecera.comprador = d.compradorNombre;
    const precioVenta = Number(d.precioVentaEstimado || prospecto.precioVentaEstimadoAsesor || 0);
    const comisionVenta = d.tieneComisionVenta !== 'Si' ? 0
        : precioVenta * (Number(d.comisionVentaValor || 0) / 100);
    const montos = {
        'ADEUDO AGUA': prospecto.adeudoAguaEstado === 'No aplica' ? 0 : Number(prospecto.adeudoAgua || 0),
        'ADEUDO PREDIAL': prospecto.adeudoPredialEstado === 'No aplica' ? 0 : Number(prospecto.adeudoPredial || 0),
        'ADEUDO LUZ': prospecto.adeudoLuzEstado === 'No aplica' ? 0 : Number(prospecto.adeudoLuz || 0),
        'ADEUDO INFONAVIT': prospecto.adeudoCreditoEstado === 'No aplica' ? 0 :
            (d.liquidaInfonavit === 'Si' ? Number(prospecto.adeudoCredito || 0) * 0.87 : Number(prospecto.adeudoCredito || 0)),
        'CANCELACIÓN DE INFONAVIT': d.liquidaInfonavit === 'Si' ? 5500 : 0,
        'PROPIETARIO': Number(casa?.montoAdquisicion || prospecto.montoAdquisicion || 0),
        'REMODELACIÓN': Number(d.presupuestoRemodelacion || 0),
        'GASTOS ADMINISTRATIVOS': Number(d.gastosAdministrativos || 0),
        'PODER': d.requierePoder === 'Si' ? 5500 : 0,
        'PAGO REFERIDO': d.tieneReferido === 'Si' ? Number(d.referidoComision || 0) : 0,
        'COMISIÓN POR VENTA': comisionVenta,
        'DESALOJO': (prospecto.estatusPropiedad === 'Invadida' || (!prospecto.estatusPropiedad && prospecto.invadida === 'Si')) ? 20000 : 0,
        'ESCRITURAS': prospecto.tieneEscrituras === 'No'
            ? (prospecto.existeNotariaEscritura === 'Si' ? 5000 :
                (prospecto.existeNotariaEscritura === 'No' ? 15000 : 0))
            : 0
    };
    Object.entries(montos).forEach(([concepto, monto]) => {
        const partida = p.partidas.find(x => x.concepto === concepto);
        const sincronizadoDesdeExpediente = ['REMODELACIÓN', 'GASTOS ADMINISTRATIVOS', 'CANCELACIÓN DE INFONAVIT', 'PODER', 'PAGO REFERIDO', 'COMISIÓN POR VENTA'].includes(concepto);
        const estadoAdeudoActual = {
            'ADEUDO AGUA': prospecto.adeudoAguaEstado,
            'ADEUDO PREDIAL': prospecto.adeudoPredialEstado,
            'ADEUDO LUZ': prospecto.adeudoLuzEstado,
            'ADEUDO INFONAVIT': prospecto.adeudoCreditoEstado
        }[concepto];
        const forzarNoAplica = estadoAdeudoActual === 'No aplica';
        if (partida && (sincronizadoDesdeExpediente || forzarNoAplica || partida.automatico || Number(partida.monto || 0) === 0)) {
            partida.monto = monto;
            partida.automatico = monto > 0;
            if (concepto === 'ESCRITURAS' && monto) {
                partida.nota = monto === 5000 ? 'Segundo testimonio en notaría' : 'Recuperación en Archivo Público';
            } else if (concepto === 'ADEUDO INFONAVIT' && d.liquidaInfonavit === 'Si') {
                partida.nota = `87% de ${formatearMoneda(prospecto.adeudoCredito)}`;
            } else if (concepto === 'CANCELACIÓN DE INFONAVIT' && monto) {
                partida.nota = 'Gasto previsto de cancelación';
            } else if (concepto === 'PAGO REFERIDO' && d.referidoNombre) {
                partida.nota = `Pagar a ${d.referidoNombre}`;
            } else if (concepto === 'COMISIÓN POR VENTA' && d.tieneComisionVenta === 'Si') {
                partida.nota = `${Number(d.comisionVentaValor || 0)}% de ${formatearMoneda(precioVenta)}`;
            } else {
                if (estadoAdeudoActual) partida.nota = estadoAdeudoActual;
            }
        }
    });
    if (!Number(p.ventaPropiedad || 0) && precioVenta) p.ventaPropiedad = precioVenta;
    if (p.comisionVenta?.tipo !== 'Monto') {
        p.comisionVenta = {
            tipo: 'Porcentaje',
            valor: d.tieneComisionVenta === 'Si' ? Number(d.comisionVentaValor || 0) : 0
        };
    }
    guardarPresupuesto(p);
}

function sincronizarCasaEnPresupuesto(casa) {
    if (!casa?.id) return;
    const p = getPresupuestoCasa(casa.id, true);
    if (!p) return;
    p.ventaPropiedad = Number(casa.precioVenta || 0);
    recalcularComisionVentaPresupuesto(p);
    const propietario = p.partidas.find(x => x.concepto === 'PROPIETARIO');
    if (propietario && (propietario.automatico || Number(propietario.monto || 0) === 0)) {
        propietario.monto = Number(casa.montoAdquisicion || 0);
        propietario.automatico = propietario.monto > 0;
    }
    sincronizarCostosPipelineEnPresupuesto(p, casa);
    guardarPresupuesto(p);
}

function recalcularComisionVentaPresupuesto(p) {
    if (!p?.comisionVenta) return;
    const partida = p.partidas.find(x => x.concepto === 'COMISIÓN POR VENTA');
    if (!partida) return;
    if (p.comisionVenta.tipo === 'Monto') {
        partida.monto = Number(p.comisionVenta.valor || 0);
        partida.nota = `Monto fijo ${formatearMoneda(partida.monto)}`;
    } else {
        partida.monto = Number(p.ventaPropiedad || 0) * (Number(p.comisionVenta.valor || 0) / 100);
        partida.nota = `${Number(p.comisionVenta.valor || 0)}% de ${formatearMoneda(p.ventaPropiedad)}`;
    }
    partida.automatico = true;
}

function calcularResumenPresupuesto(p) {
    p.partidas = normalizarLista(p.partidas);
    p.egresos = normalizarLista(p.egresos);
    p.inversionistas = normalizarLista(p.inversionistas);
    p.retornos = normalizarLista(p.retornos);
    p.pagosComprador = normalizarLista(p.pagosComprador);
    const presupuesto = p.partidas.reduce((s, x) => s + Number(x.monto || 0), 0);
    const egresos = p.egresos.reduce((s, x) => s + Number(x.monto || 0), 0);
    const inversionRevive = p.inversionistas
        .filter(x => x.tipo === 'Revive')
        .reduce((s, x) => s + Number(x.monto || 0), 0);
    const inversionSocios = p.inversionistas
        .filter(x => x.tipo === 'Socio')
        .reduce((s, x) => s + Number(x.monto || 0), 0);
    const inversionTotal = inversionRevive + inversionSocios;
    const venta = Number(p.ventaPropiedad || 0);
    const adquisicionAcordada = Number(p.partidas.find(x => x.concepto === 'PROPIETARIO')?.monto || 0);
    const partidaPropietarioId = p.partidas.find(x => x.concepto === 'PROPIETARIO')?.id;
    const pagosPropietario = p.egresos
        .filter(x => x.partidaId === partidaPropietarioId || x.categoria === 'Propietario')
        .reduce((s, x) => s + Number(x.monto || 0), 0);
    const costoRealReconocido = egresos + Math.max(0, adquisicionAcordada - pagosPropietario);
    const utilidad = venta && costoRealReconocido > 0 ? venta - costoRealReconocido : null;
    const utilidadProyectada = venta ? venta - presupuesto : null;
    const tipoUtilidadSocios = p.utilidadSociosTipo === 'Monto' ? 'Monto' : 'Porcentaje';
    const utilidadSocios = utilidad == null ? 0 : (tipoUtilidadSocios === 'Monto'
        ? Math.min(utilidad, Math.max(0, Number(p.utilidadSociosMonto || 0)))
        : utilidad * (Number(p.porcentajeUtilidadSocios || 0) / 100));
    const utilidadRevive = utilidad == null ? 0 : utilidad - utilidadSocios;
    const retornado = p.retornos.reduce((s, x) => s + Number(x.monto || 0), 0);
    const pagosComprador = p.pagosComprador.reduce((s, x) => s + Number(x.monto || 0), 0);
    const ingresosCaja = inversionTotal + Number(p.apartadosRecibidos || 0) + pagosComprador;
    const saldoCaja = ingresosCaja - egresos - retornado;
    const faltantePorPartidas = p.partidas.reduce((s, partida) =>
        s + Math.max(0, Number(partida.monto || 0) - totalAplicadoPartida(p, partida.id)), 0);
    return {
        presupuesto,
        egresos,
        faltante: faltantePorPartidas,
        inversionRevive,
        inversionSocios,
        inversionTotal,
        venta,
        utilidad,
        costoRealReconocido,
        utilidadProyectada,
        utilidadSocios,
        utilidadRevive,
        retornado,
        pendienteRetorno: Math.max(0, inversionTotal + Math.max(0, utilidad || 0) - retornado),
        pagosComprador,
        ingresosCaja,
        saldoCaja
    };
}

function totalAplicadoPartida(p, partidaId) {
    return p.egresos
        .filter(x => x.partidaId === partidaId)
        .reduce((s, x) => s + Number(x.monto || 0), 0);
}

function renderGastos() {
    if (!puedeGestionarGastos()) return;
    const casas = DB.get('casas');
    const prospectosConCasa = new Set(casas.map(c => c.prospectoId));
    const prospectosPreliminares = DB.get('prospectos').filter(p =>
        !prospectosConCasa.has(p.id) &&
        [
            RH_ESTATUS_PROSPECTO.EN_CONTACTO,
            RH_ESTATUS_PROSPECTO.INTERESADO,
            RH_ESTATUS_PROSPECTO.EN_ADMIN,
            RH_ESTATUS_PROSPECTO.PROPUESTA_LISTA
        ].includes(p.estatus) &&
        p.direccionPropiedad
    );
    const entidades = [
        ...casas.map(c => ({ id: c.id, texto: c.direccionPropiedad || c.nombreCompleto, preliminar: false })),
        ...prospectosPreliminares.map(p => ({ id: p.id, texto: p.direccionPropiedad || p.nombreCompleto, preliminar: true }))
    ];
    const select = document.getElementById('gastos-propiedad-select');
    const vacio = document.getElementById('gastos-empty');
    const detalle = document.getElementById('gastos-detalle');
    if (!select || !detalle) return;

    select.innerHTML = entidades.length
        ? entidades.map(x => `<option value="${escapeHtml(x.id)}">${x.preliminar ? 'Preliminar · ' : ''}${escapeHtml(x.texto || 'Propiedad')}</option>`).join('')
        : '<option value="">Sin propiedades disponibles</option>';

    if (!entidades.length) {
        gastoPropiedadActivaId = null;
        vacio?.classList.remove('hidden');
        detalle.innerHTML = '';
        actualizarKpisGastos(null);
        return;
    }
    vacio?.classList.add('hidden');
    if (!entidades.some(x => x.id === gastoPropiedadActivaId)) gastoPropiedadActivaId = entidades[0].id;
    select.value = gastoPropiedadActivaId;
    renderDetalleGastos(gastoPropiedadActivaId);
}

function seleccionarPropiedadGastos(casaId) {
    gastoPropiedadActivaId = casaId;
    renderDetalleGastos(casaId);
}

function actualizarKpisGastos(resumen) {
    setText('gastos-kpi-presupuesto', resumen ? formatearMoneda(resumen.presupuesto) : '$0.00');
    setText('gastos-kpi-egresos', resumen ? formatearMoneda(resumen.egresos) : '$0.00');
    setText('gastos-kpi-faltante', resumen ? formatearMoneda(resumen.faltante) : '$0.00');
    setText('gastos-kpi-inversion', resumen ? formatearMoneda(resumen.inversionTotal) : '$0.00');
    setText('gastos-kpi-utilidad', resumen?.utilidadProyectada != null ? formatearMoneda(resumen.utilidadProyectada) : '—');
    setText('gastos-kpi-utilidad-real', resumen?.utilidad != null ? formatearMoneda(resumen.utilidad) : '—');
}

function opcionesHtml(items, actual) {
    return items.map(x => `<option value="${escapeHtml(x)}" ${x === actual ? 'selected' : ''}>${escapeHtml(x)}</option>`).join('');
}

function renderDetalleGastos(casaId) {
    const casaReal = DB.get('casas').find(c => c.id === casaId);
    const prospectoPreliminar = casaReal ? null : getProspectoById(casaId);
    const casa = casaReal || (prospectoPreliminar ? {
        id: prospectoPreliminar.id,
        prospectoId: prospectoPreliminar.id,
        nombreCompleto: prospectoPreliminar.nombreCompleto,
        direccionPropiedad: prospectoPreliminar.direccionPropiedad,
        montoAdquisicion: prospectoPreliminar.montoAdquisicion || 0,
        precioVenta: 0
    } : null);
    const p = getPresupuestoCasa(casaId);
    const detalle = document.getElementById('gastos-detalle');
    if (!casa || !p || !detalle) return;
    const r = calcularResumenPresupuesto(p);
    actualizarKpisGastos(r);
    const partidaPropietario = p.partidas.find(x => x.concepto === 'PROPIETARIO');
    const pagadoPropietario = partidaPropietario ? totalAplicadoPartida(p, partidaPropietario.id) : 0;
    const faltaPropietario = Math.max(0, Number(partidaPropietario?.monto || 0) - pagadoPropietario);
    const pagos = normalizarLista(p.pagosComprador);
    const sumaPagos = pagos.reduce((s, x) => s + Number(x.monto || 0), 0);
    const sumaApartados = pagos.filter(x => /apartado/i.test(x.concepto || '')).reduce((s, x) => s + Number(x.monto || 0), 0);
    const apartadosDeclarados = Number(p.apartadosRecibidos || 0);
    const recibidoComprador = sumaPagos + Math.max(0, apartadosDeclarados - sumaApartados);
    const faltaAlFirmar = Math.max(0, Number(p.ventaPropiedad || 0) - recibidoComprador);
    const apartadosCuadran = apartadosDeclarados <= 0 || Math.abs(sumaApartados - apartadosDeclarados) < 0.01;

    detalle.innerHTML = `
        <section class="fin-property-hero">
            <div>
                <span class="fin-eyebrow">${casaReal ? 'Control financiero de propiedad' : 'Presupuesto preliminar · antes de firma'}</span>
                <h4>${escapeHtml(casa.direccionPropiedad || casa.nombreCompleto)}</h4>
                <p>${escapeHtml(casa.nombreCompleto || '')} · Actualizado ${new Date(p.actualizadoEn).toLocaleString()}</p>
            </div>
            <button type="button" class="btn btn-outline btn-toolbar" onclick="imprimirPresupuestoPropiedad('${escapeHtml(casa.id)}')">Imprimir reporte</button>
        </section>

        <section class="fin-section">
            <div class="fin-section-heading"><div><span>01</span><h4>Ficha operativa</h4></div><small>Datos generales del inmueble y obra</small></div>
            <div class="form-grid fin-header-grid">
                ${campoGasto('Propiedad', 'propiedad', p.cabecera.propiedad)}
                ${campoGasto('Vendedor / propietario', 'vendedor', p.cabecera.vendedor)}
                ${campoGasto('Comprador', 'comprador', p.cabecera.comprador)}
                ${campoGasto('NSS', 'nss', p.cabecera.nss)}
                ${campoGasto('Fecha inicio', 'fechaInicio', p.cabecera.fechaInicio, 'date')}
                ${campoGasto('Fecha cierre', 'fechaCierre', p.cabecera.fechaCierre, 'date')}
                ${campoGasto('Encargado de obra', 'encargadoObra', p.cabecera.encargadoObra)}
                ${campoGasto('Estatus administrativo', 'estatusAdmin', p.cabecera.estatusAdmin)}
                ${campoGasto('Estatus físico', 'estatusFisico', p.cabecera.estatusFisico)}
                ${campoGasto('Meses viviendo ahí', 'mesesViviendo', p.cabecera.mesesViviendo, 'number')}
                <div class="form-group full-width"><label>Importante / pendientes</label><textarea class="form-control" rows="2" onchange="actualizarCabeceraGasto('importante',this.value)">${escapeHtml(p.cabecera.importante || '')}</textarea></div>
            </div>
        </section>

        <section class="fin-section">
            <div class="fin-section-heading"><div><span>02</span><h4>Presupuesto maestro</h4></div><small>Montos previstos, todos editables</small></div>
            <div class="table-responsive table-clean">
                <table class="fin-table"><thead><tr><th>#</th><th>Fecha</th><th>Concepto</th><th>Nota</th><th class="text-right">Presupuesto</th><th class="text-right">Pagado</th><th class="text-right">Por pagar</th></tr></thead>
                <tbody>${p.partidas.map((x, i) => `
                    <tr>
                        <td>${i + 1}</td>
                        <td><input type="date" class="fin-cell-input" value="${escapeHtml(x.fecha || '')}" onchange="actualizarPartidaGasto('${x.id}','fecha',this.value)"></td>
                        <td><input class="fin-cell-input fin-cell-concept" value="${escapeHtml(x.concepto)}" onchange="actualizarPartidaGasto('${x.id}','concepto',this.value)"></td>
                        <td><input class="fin-cell-input" value="${escapeHtml(x.nota || '')}" onchange="actualizarPartidaGasto('${x.id}','nota',this.value)"></td>
                        <td><input type="number" min="0" step="0.01" class="fin-cell-input fin-cell-money" value="${Number(x.monto || 0)}" onchange="actualizarPartidaGasto('${x.id}','monto',this.value)"></td>
                        <td class="text-right">${formatearMoneda(totalAplicadoPartida(p, x.id))}</td>
                        <td class="text-right"><strong>${formatearMoneda(Math.max(0, Number(x.monto || 0) - totalAplicadoPartida(p, x.id)))}</strong></td>
                    </tr>`).join('')}</tbody>
                <tfoot><tr><th colspan="4">TOTAL PRESUPUESTADO</th><th class="text-right">${formatearMoneda(r.presupuesto)}</th><th class="text-right">${formatearMoneda(p.egresos.filter(x => x.partidaId).reduce((s,x) => s + Number(x.monto || 0), 0))}</th><th class="text-right">${formatearMoneda(r.faltante)}</th></tr></tfoot></table>
            </div>
        </section>

        <section class="fin-section">
            <div class="fin-section-heading"><div><span>03</span><h4>Egresos reales</h4></div><small>Cada cargo descuenta una partida. El propietario y las deudas no se mezclan.</small></div>
            <div class="fin-closing-grid fin-closing-grid--compact">
                <div class="fin-result-card"><span>Ya entregado al propietario</span><strong>${formatearMoneda(pagadoPropietario)}</strong><small>Sale de la partida PROPIETARIO</small></div>
                <div class="fin-result-card"><span>Falta entregar al firmar</span><strong>${formatearMoneda(faltaPropietario)}</strong><small>Presupuesto del propietario menos lo ya pagado</small></div>
            </div>
            <form class="fin-inline-form" onsubmit="agregarEgresoGasto(event)">
                <input type="date" id="gasto-egreso-fecha" class="form-control" value="${hoyISO()}" required>
                <select id="gasto-egreso-tipo" class="form-control">${RH_TIPOS_EGRESO.map(x => `<option>${x}</option>`).join('')}</select>
                <select id="gasto-egreso-origen" class="form-control"><option>Revive</option><option>Socio</option><option>No aplica retorno</option></select>
                <select id="gasto-egreso-partida" class="form-control" required><option value="">Descontar de…</option>${p.partidas.map(x => `<option value="${x.id}">${escapeHtml(x.concepto)} · resta ${formatearMoneda(Math.max(0, Number(x.monto || 0) - totalAplicadoPartida(p, x.id)))}</option>`).join('')}</select>
                <select id="gasto-egreso-cuenta" class="form-control">${opcionesCuentaBancariaHtml()}</select>
                <select id="gasto-egreso-referido" class="form-control">${opcionesReferidoEgresoHtml(p)}</select>
                <input id="gasto-egreso-concepto" class="form-control" placeholder="Concepto" required>
                <input id="gasto-egreso-nota" class="form-control" placeholder="Nota / comprobante">
                <input type="number" id="gasto-egreso-monto" class="form-control" min="0.01" step="0.01" placeholder="$ Monto" required>
                <button class="btn btn-primary btn-toolbar">Agregar</button>
            </form>
            ${tablaMovimientosGastos(p.egresos, 'egreso')}
        </section>

        <div class="fin-two-columns">
            <section class="fin-section">
                <div class="fin-section-heading"><div><span>04</span><h4>Inversión y socios</h4></div><small>Aportaciones de capital</small></div>
                <form class="fin-stack-form" onsubmit="agregarInversionGasto(event)">
                    <input id="gasto-inv-nombre" class="form-control" placeholder="Inversionista / Revive" required>
                    <div class="fin-form-row"><select id="gasto-inv-tipo" class="form-control" onchange="alCambiarTipoInversionSocio(this.value)"><option>Revive</option><option>Socio</option></select><input type="number" id="gasto-inv-monto" class="form-control" min="0.01" step="0.01" placeholder="$ Aportación" required></div>
                    <input type="date" id="gasto-inv-fecha" class="form-control" value="${hoyISO()}" required>
                    <button class="btn btn-primary btn-toolbar">Registrar inversión</button>
                </form>
                ${tablaMovimientosGastos(p.inversionistas, 'inversion')}
            </section>
            <section class="fin-section">
                <div class="fin-section-heading"><div><span>05</span><h4>Retornos</h4></div><small>Pagos de inversión y utilidad</small></div>
                <form class="fin-stack-form" onsubmit="agregarRetornoGasto(event)">
                    <input id="gasto-ret-nombre" class="form-control" placeholder="Beneficiario" required>
                    <div class="fin-form-row"><select id="gasto-ret-tipo" class="form-control"><option>Inversión</option><option>Utilidad</option><option>Inversión + utilidad</option></select><input type="number" id="gasto-ret-monto" class="form-control" min="0.01" step="0.01" placeholder="$ Abono" required></div>
                    <input type="date" id="gasto-ret-fecha" class="form-control" value="${hoyISO()}" required>
                    <button class="btn btn-primary btn-toolbar">Registrar retorno</button>
                </form>
                ${tablaMovimientosGastos(p.retornos, 'retorno')}
            </section>
        </div>

        <section class="fin-section">
            <div class="fin-section-heading"><div><span>06</span><h4>Venta, utilidad y pagos del comprador</h4></div><small>Resultado final de la operación</small></div>
            <div class="fin-closing-grid">
                <label>Venta de propiedad<input type="number" class="form-control" value="${Number(p.ventaPropiedad || 0)}" onchange="actualizarDatoGasto('ventaPropiedad',this.value)"></label>
                <label>Apartados recibidos<input type="number" class="form-control" value="${Number(p.apartadosRecibidos || 0)}" onchange="actualizarDatoGasto('apartadosRecibidos',this.value)"></label>
                <label>Comisión de venta
                    <select class="form-control" onchange="actualizarComisionVenta('tipo', this.value)">
                        <option value="Porcentaje" ${p.comisionVenta?.tipo !== 'Monto' ? 'selected' : ''}>Porcentaje %</option>
                        <option value="Monto" ${p.comisionVenta?.tipo === 'Monto' ? 'selected' : ''}>Monto fijo $</option>
                    </select>
                </label>
                <label>${p.comisionVenta?.tipo === 'Monto' ? 'Monto de comisión' : '% de comisión'}<input type="number" min="0" step="0.01" class="form-control" value="${Number(p.comisionVenta?.valor || 0)}" onchange="actualizarComisionVenta('valor', this.value)"></label>
                <label>Utilidad socios
                    <select class="form-control" onchange="actualizarDatoGasto('utilidadSociosTipo',this.value)">
                        <option value="Porcentaje" ${p.utilidadSociosTipo !== 'Monto' ? 'selected' : ''}>Porcentaje %</option>
                        <option value="Monto" ${p.utilidadSociosTipo === 'Monto' ? 'selected' : ''}>Cantidad $</option>
                    </select>
                </label>
                ${p.utilidadSociosTipo === 'Monto'
                    ? `<label>Monto utilidad socios ($)<input type="number" min="0" step="0.01" class="form-control" value="${Number(p.utilidadSociosMonto || 0)}" onchange="actualizarDatoGasto('utilidadSociosMonto',this.value)"></label>`
                    : `<label>% utilidad socios<input type="number" min="0" max="100" class="form-control" value="${Number(p.porcentajeUtilidadSocios || 0)}" onchange="actualizarDatoGasto('porcentajeUtilidadSocios',this.value)"></label>`}
                <div class="fin-result-card" title="Precio de venta − presupuesto maestro"><span>Utilidad proyectada</span><strong>${r.utilidadProyectada == null ? '—' : formatearMoneda(r.utilidadProyectada)}</strong><small>Venta − presupuesto</small></div>
                <div class="fin-result-card" title="Precio de venta − costo real (egresos + propietario pendiente)"><span>Utilidad sobre egresos reales</span><strong>${r.utilidad == null ? '—' : formatearMoneda(r.utilidad)}</strong><small>Venta − costo real</small></div>
                <div class="fin-result-card"><span>Utilidad socios</span><strong>${formatearMoneda(r.utilidadSocios)}</strong><small>${p.utilidadSociosTipo === 'Monto' ? 'Monto fijo' : '% sobre utilidad real'}</small></div>
                <div class="fin-result-card fin-result-primary" title="Utilidad real menos la parte de socios"><span>Utilidad Revive</span><strong>${formatearMoneda(r.utilidadRevive)}</strong><small>Utilidad real − socios</small></div>
                <div class="fin-result-card"><span>Saldo de caja trazado</span><strong>${formatearMoneda(r.saldoCaja)}</strong></div>
            </div>
            <div class="fin-closing-grid fin-closing-grid--compact">
                <div class="fin-result-card"><span>Apartados desglosados</span><strong>${formatearMoneda(sumaApartados)}</strong><small>${apartadosCuadran ? 'Cuadra con lo declarado' : `Declarado ${formatearMoneda(apartadosDeclarados)}. Captura cada depósito con la palabra Apartado.`}</small></div>
                <div class="fin-result-card"><span>Recibido del comprador</span><strong>${formatearMoneda(recibidoComprador)}</strong></div>
                <div class="fin-result-card"><span>Resta por recibir</span><strong>${formatearMoneda(faltaAlFirmar)}</strong><small>Venta menos apartados y abonos</small></div>
            </div>
            <form class="fin-inline-form fin-inline-form--short" onsubmit="agregarPagoComprador(event)">
                <input type="date" id="gasto-pago-fecha" class="form-control" value="${hoyISO()}" required>
                <input id="gasto-pago-concepto" class="form-control" placeholder="Pago del comprador (sin apartados)" required>
                <input type="number" id="gasto-pago-monto" class="form-control" min="0.01" step="0.01" placeholder="$ Abono" required>
                <button class="btn btn-primary btn-toolbar">Agregar pago</button>
            </form>
            ${tablaMovimientosGastos(p.pagosComprador, 'pago')}
        </section>`;
}

function campoGasto(label, key, value, type = 'text') {
    return `<div class="form-group"><label>${escapeHtml(label)}</label><input type="${type}" class="form-control" value="${escapeHtml(String(value ?? ''))}" onchange="actualizarCabeceraGasto('${key}',this.value)"></div>`;
}

function tablaMovimientosGastos(items, tipo) {
    if (!items.length) return '<p class="fin-empty">Sin movimientos registrados.</p>';
    const muestraOrigen = tipo === 'egreso' || tipo === 'inversion';
    return `<div class="table-responsive table-clean"><table class="fin-table fin-table--mov">
        <thead><tr><th>Fecha</th><th>Concepto / persona</th><th>Clasificación</th>${muestraOrigen ? '<th>Quién pagó</th>' : ''}<th class="text-right">Monto</th><th></th></tr></thead>
        <tbody>${items.map(x => {
            const origen = x.origen || x.tipo || '—';
            const badge = origen === 'Socio' ? 'fin-origen-socio' : (origen === 'Revive' ? 'fin-origen-revive' : 'fin-origen-otro');
            return `<tr>
            <td>${escapeHtml(x.fecha || '—')}</td>
            <td><strong>${escapeHtml(x.concepto || x.nombre || '—')}</strong>${x.nota ? `<small>${escapeHtml(x.nota)}</small>` : ''}</td>
            <td>${escapeHtml(x.categoria || x.tipo || '—')}${x.partidaId ? `<small>Descuenta de: ${escapeHtml(getPresupuestoCasa(gastoPropiedadActivaId)?.partidas.find(p => p.id === x.partidaId)?.concepto || 'Partida')}</small>` : ''}</td>
            ${muestraOrigen ? `<td><span class="fin-origen-badge ${badge}">${escapeHtml(origen)}</span></td>` : ''}
            <td class="text-right">${formatearMoneda(x.monto)}</td>
            <td>${x.origenSistema === 'pipeline_remodelacion'
                ? '<span class="fin-sync-label" title="Se edita desde Propiedades">Sincronizado</span>'
                : `<button type="button" class="btn-icon-danger" onclick="eliminarMovimientoGasto('${tipo}','${x.id}')" aria-label="Eliminar">×</button>`}</td>
        </tr>`;
        }).join('')}</tbody></table></div>`;
}

function actualizarCabeceraGasto(campo, valor) {
    const p = getPresupuestoCasa(gastoPropiedadActivaId);
    if (!p) return;
    p.cabecera[campo] = campo === 'mesesViviendo' ? Math.max(0, Number(valor || 0)) : valor;
    guardarPresupuesto(p);
}

function actualizarPartidaGasto(id, campo, valor) {
    const p = getPresupuestoCasa(gastoPropiedadActivaId);
    const partida = p?.partidas.find(x => x.id === id);
    if (!partida) return;
    const anterior = partida[campo];
    partida[campo] = campo === 'monto' ? Math.max(0, Number(valor || 0)) : valor;
    partida.automatico = false;
    guardarPresupuesto(p);
    logAction(`Presupuesto ${partida.concepto}: ${campo} cambió de ${anterior || 'vacío'} a ${partida[campo] || 'vacío'}`);
    renderDetalleGastos(gastoPropiedadActivaId);
}

function actualizarDatoGasto(campo, valor) {
    const p = getPresupuestoCasa(gastoPropiedadActivaId);
    if (!p) return;
    const numero = Number(valor || 0);
    const anterior = p[campo];
    if (campo === 'utilidadSociosTipo') {
        p.utilidadSociosTipo = valor === 'Monto' ? 'Monto' : 'Porcentaje';
    } else if (campo === 'porcentajeUtilidadSocios') {
        p[campo] = Math.min(100, Math.max(0, numero));
    } else if (campo === 'utilidadSociosMonto') {
        p[campo] = Math.max(0, numero);
    } else {
        p[campo] = Math.max(0, numero);
    }
    if (campo === 'ventaPropiedad' && p.casaId) {
        const casas = DB.get('casas');
        const idx = casas.findIndex(c => c.id === p.casaId);
        if (idx >= 0) {
            casas[idx].precioVenta = p[campo];
            DB.set('casas', casas);
        }
    }
    if (campo === 'ventaPropiedad') recalcularComisionVentaPresupuesto(p);
    guardarPresupuesto(p);
    logAction(`Finanzas propiedad: ${campo} cambió de ${anterior || 0} a ${p[campo]}`);
    renderDetalleGastos(gastoPropiedadActivaId);
}

function opcionesCuentaBancariaHtml() {
    const cuentas = typeof getCuentasBancarias === 'function' ? getCuentasBancarias() : [];
    const opciones = cuentas.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(etiquetaCuentaBancaria(c))} · ${formatearMoneda(c.saldo || 0)}</option>`).join('');
    return `<option value="">Sin cuenta bancaria</option>${opciones}`;
}

function opcionesReferidoEgresoHtml(p) {
    const items = typeof getResumenReferidos === 'function'
        ? getResumenReferidos().filter(x => x.entidadId === gastoPropiedadActivaId || x.presupuestoId === p.id || x.entidadId === p.casaId)
        : [];
    const opciones = items.map(x => `<option value="${escapeHtml(x.partidaId || '')}">${escapeHtml(x.referido)} · pendiente ${formatearMoneda(x.pendiente)}</option>`).join('');
    return `<option value="">No es pago de referido</option>${opciones}`;
}

function moverSaldoCuenta(cuentaId, delta) {
    if (!cuentaId || !delta) return;
    const cuentas = DB.get('cuentasBancarias') || [];
    const indice = cuentas.findIndex(c => c.id === cuentaId);
    if (indice < 0) return;
    cuentas[indice].saldo = Number(cuentas[indice].saldo || 0) + Number(delta);
    cuentas[indice].actualizadoEn = new Date().toISOString();
    DB.set('cuentasBancarias', cuentas);
}

function actualizarComisionVenta(campo, valor) {
    const p = getPresupuestoCasa(gastoPropiedadActivaId);
    if (!p) return;
    p.comisionVenta = p.comisionVenta || { tipo: 'Porcentaje', valor: 0 };
    if (campo === 'tipo') p.comisionVenta.tipo = valor === 'Monto' ? 'Monto' : 'Porcentaje';
    else p.comisionVenta.valor = Math.max(0, Number(valor || 0));
    recalcularComisionVentaPresupuesto(p);
    guardarPresupuesto(p);
    renderDetalleGastos(gastoPropiedadActivaId);
}

function agregarEgresoGasto(e) {
    e.preventDefault();
    const p = getPresupuestoCasa(gastoPropiedadActivaId);
    if (!p) return;
    const referidoPartida = document.getElementById('gasto-egreso-referido')?.value || '';
    const cuentaId = document.getElementById('gasto-egreso-cuenta')?.value || '';
    const egreso = {
        id: DB.getId(),
        fecha: document.getElementById('gasto-egreso-fecha').value,
        categoria: document.getElementById('gasto-egreso-tipo').value,
        origen: document.getElementById('gasto-egreso-origen').value,
        partidaId: referidoPartida || document.getElementById('gasto-egreso-partida').value,
        concepto: document.getElementById('gasto-egreso-concepto').value.trim(),
        nota: document.getElementById('gasto-egreso-nota').value.trim(),
        monto: Math.max(0, Number(document.getElementById('gasto-egreso-monto').value || 0)),
        registradoPor: getUsuarioActual()
    };
    if (referidoPartida) {
        egreso.categoria = 'Pago referido';
        egreso.referido = true;
    }
    if (cuentaId) {
        egreso.cuentaId = cuentaId;
        moverSaldoCuenta(cuentaId, -egreso.monto);
    }
    p.egresos.unshift(egreso);
    guardarPresupuesto(p);
    logAction(`Egreso registrado: ${egreso.concepto}`);
    renderDetalleGastos(gastoPropiedadActivaId);
}

function agregarInversionGasto(e) {
    e.preventDefault();
    const p = getPresupuestoCasa(gastoPropiedadActivaId);
    if (!p) return;
    const tipo = document.getElementById('gasto-inv-tipo').value;
    p.inversionistas.unshift({
        id: DB.getId(),
        nombre: document.getElementById('gasto-inv-nombre').value.trim(),
        tipo,
        monto: Math.max(0, Number(document.getElementById('gasto-inv-monto').value || 0)),
        fecha: document.getElementById('gasto-inv-fecha').value,
        registradoPor: getUsuarioActual()
    });
    guardarPresupuesto(p);
    logAction(`Inversión registrada: ${p.inversionistas[0].nombre} — ${formatearMoneda(p.inversionistas[0].monto)}`);
    if (tipo === 'Socio') ofrecerTransferirCargosASocio(p);
    else renderDetalleGastos(gastoPropiedadActivaId);
}

function alCambiarTipoInversionSocio(tipo) {
    if (tipo !== 'Socio') return;
    const p = getPresupuestoCasa(gastoPropiedadActivaId);
    if (!p) return;
    const cargosRevive = (p.egresos || []).filter(x => x.origen === 'Revive');
    if (!cargosRevive.length) return;
    // Solo aviso preventivo; la transferencia se confirma al registrar la inversión.
}

function ofrecerTransferirCargosASocio(presupuesto) {
    const p = presupuesto || getPresupuestoCasa(gastoPropiedadActivaId);
    if (!p) return;
    const cargosRevive = (p.egresos || []).filter(x => x.origen === 'Revive');
    if (!cargosRevive.length) {
        renderDetalleGastos(gastoPropiedadActivaId);
        return;
    }
    const total = cargosRevive.reduce((s, x) => s + Number(x.monto || 0), 0);
    const ok = confirmAction(
        `Ya hay ${cargosRevive.length} cargo(s) registrados por Revive (${formatearMoneda(total)}).\n\n` +
        '¿Deseas pasar los cargos realizados a cargos hechos por el socio?'
    );
    if (ok) {
        p.egresos.forEach(egreso => {
            if (egreso.origen === 'Revive') {
                egreso.origen = 'Socio';
                egreso.nota = [egreso.nota, 'Reclasificado a Socio'].filter(Boolean).join(' · ');
            }
        });
        guardarPresupuesto(p);
        logAction(`Cargos reclasificados a Socio: ${cargosRevive.length} movimientos (${formatearMoneda(total)})`);
        alert(`${cargosRevive.length} cargo(s) pasaron a origen Socio.`);
    }
    renderDetalleGastos(gastoPropiedadActivaId);
}

function agregarRetornoGasto(e) {
    e.preventDefault();
    const p = getPresupuestoCasa(gastoPropiedadActivaId);
    if (!p) return;
    p.retornos.unshift({
        id: DB.getId(),
        nombre: document.getElementById('gasto-ret-nombre').value.trim(),
        tipo: document.getElementById('gasto-ret-tipo').value,
        monto: Math.max(0, Number(document.getElementById('gasto-ret-monto').value || 0)),
        fecha: document.getElementById('gasto-ret-fecha').value,
        registradoPor: getUsuarioActual()
    });
    guardarPresupuesto(p);
    logAction(`Retorno registrado: ${p.retornos[0].nombre} — ${formatearMoneda(p.retornos[0].monto)}`);
    renderDetalleGastos(gastoPropiedadActivaId);
}

function agregarPagoComprador(e) {
    e.preventDefault();
    const p = getPresupuestoCasa(gastoPropiedadActivaId);
    if (!p) return;
    p.pagosComprador.unshift({
        id: DB.getId(),
        fecha: document.getElementById('gasto-pago-fecha').value,
        concepto: document.getElementById('gasto-pago-concepto').value.trim(),
        monto: Math.max(0, Number(document.getElementById('gasto-pago-monto').value || 0)),
        registradoPor: getUsuarioActual()
    });
    guardarPresupuesto(p);
    logAction(`Pago de comprador: ${p.pagosComprador[0].concepto} — ${formatearMoneda(p.pagosComprador[0].monto)}`);
    renderDetalleGastos(gastoPropiedadActivaId);
}

async function eliminarMovimientoGasto(tipo, id) {
    if (!await confirmarAccionFinancieraProtegida('eliminar este movimiento financiero')) return;
    const p = getPresupuestoCasa(gastoPropiedadActivaId);
    if (!p) return;
    const campo = { egreso: 'egresos', inversion: 'inversionistas', retorno: 'retornos', pago: 'pagosComprador' }[tipo];
    if (!campo) return;
    const movimiento = p[campo].find(x => x.id === id);
    if (movimiento?.cuentaId && campo === 'egresos') moverSaldoCuenta(movimiento.cuentaId, Number(movimiento.monto || 0));
    p[campo] = p[campo].filter(x => x.id !== id);
    guardarPresupuesto(p);
    if (movimiento) logAction(`Movimiento financiero eliminado: ${movimiento.concepto || movimiento.nombre || tipo}`);
    renderDetalleGastos(gastoPropiedadActivaId);
}

function imprimirPresupuestoPropiedad(casaId) {
    const casa = DB.get('casas').find(c => c.id === casaId) || getProspectoById(casaId);
    const p = getPresupuestoCasa(casaId);
    if (!casa || !p) return;
    const r = calcularResumenPresupuesto(p);
    const partidas = p.partidas.map((x, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(x.concepto)}</td><td>${escapeHtml(x.nota || '')}</td><td>${formatearMoneda(x.monto)}</td></tr>`).join('');
    const tablaMovimientos = (titulo, items) => `<h3>${escapeHtml(titulo)}</h3>${items.length
        ? `<table><thead><tr><th>Fecha</th><th>Concepto / persona</th><th>Clasificación</th><th>Monto</th></tr></thead><tbody>${items.map(x => `<tr><td>${escapeHtml(x.fecha || '—')}</td><td>${escapeHtml(x.concepto || x.nombre || '—')}</td><td>${escapeHtml(x.categoria || x.origen || x.tipo || '—')}</td><td>${formatearMoneda(x.monto)}</td></tr>`).join('')}</tbody></table>`
        : '<p>Sin movimientos registrados.</p>'}`;
    const html = `<div class="print-brand"><h1>Revive <span>Hogar</span></h1><p>Control financiero de propiedad</p></div>
        <h2>${escapeHtml(casa.direccionPropiedad || casa.nombreCompleto)}</h2>
        <p><strong>Propietario:</strong> ${escapeHtml(p.cabecera.vendedor || '')} · <strong>Fecha:</strong> ${new Date().toLocaleDateString('es-MX')}</p>
        <h3>Presupuesto maestro</h3>
        <table><thead><tr><th>#</th><th>Concepto</th><th>Nota</th><th>Monto</th></tr></thead><tbody>${partidas}</tbody></table>
        ${tablaMovimientos('Egresos reales', p.egresos)}
        ${tablaMovimientos('Inversiones Revive y socios', p.inversionistas)}
        ${tablaMovimientos('Retornos', p.retornos)}
        ${tablaMovimientos('Pagos del comprador', p.pagosComprador)}
        <div class="print-summary">
            <p>Precio de venta: <strong>${formatearMoneda(r.venta)}</strong></p>
            <p>Presupuesto maestro: <strong>${formatearMoneda(r.presupuesto)}</strong></p>
            <p>Egresos reales: <strong>${formatearMoneda(r.egresos)}</strong></p>
            <p>Costo real reconocido: <strong>${formatearMoneda(r.costoRealReconocido)}</strong></p>
            <p>Faltante por partidas: <strong>${formatearMoneda(r.faltante)}</strong></p>
            <p>Inversión registrada: <strong>${formatearMoneda(r.inversionTotal)}</strong></p>
            <p>Retornado: <strong>${formatearMoneda(r.retornado)}</strong></p>
            <p>Saldo de caja: <strong>${formatearMoneda(r.saldoCaja)}</strong></p>
            <p>Utilidad proyectada (venta − presupuesto): <strong>${r.utilidadProyectada == null ? '—' : formatearMoneda(r.utilidadProyectada)}</strong></p>
            <p>Utilidad sobre egresos reales (venta − costo real): <strong>${r.utilidad == null ? '—' : formatearMoneda(r.utilidad)}</strong></p>
            <p>Utilidad socios: <strong>${formatearMoneda(r.utilidadSocios)}</strong></p>
            <p>Utilidad Revive: <strong>${formatearMoneda(r.utilidadRevive)}</strong></p>
        </div>`;
    imprimirDocumentoHtml(html, `Presupuesto — ${casa.direccionPropiedad || casa.nombreCompleto}`);
}
