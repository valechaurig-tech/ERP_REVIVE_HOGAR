/**
 * Revive Hogar — capacidades IA de Luna (proactivas + por módulo)
 */

const LUNA_DIAS_ESTANCAMIENTO = 7;

function diasDesde(fechaStr) {
    if (!fechaStr) return 999;
    const d = new Date(fechaStr);
    if (isNaN(d)) return 999;
    return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function prospectosEstancados(lista) {
    return lista.filter(p => {
        if (['Firmado', 'Declinado'].includes(p.estatus)) return false;
        const ref = p.fechaISO || p.fechaCaptura;
        return diasDesde(ref) >= LUNA_DIAS_ESTANCAMIENTO;
    });
}

function crearAlertasProactivasLuna() {
    if (!currentUser) return;
    const prospectos = DB.get('prospectos');
    let lista = prospectos;
    if (currentUser.rol === 'Vendedor') {
        lista = prospectos.filter(p => p.vendedorId === currentUser.id);
    }
    prospectosEstancados(lista).forEach(p => {
        createAlert({
            titulo: `Luna: prospecto sin movimiento`,
            mensaje: `${p.nombreCompleto} lleva +${LUNA_DIAS_ESTANCAMIENTO} días sin avance (${p.estatus})`,
            targetUserId: p.vendedorId || '',
            targetRoles: currentUser.rol === 'Vendedor' ? [] : ['Vendedor', 'Administradora'],
            relatedId: p.id,
            tipo: 'luna_estancado',
            casoTipo: 'prospecto'
        });
    });
    marcarBadgeLuna();
}

function marcarBadgeLuna() {
    const dot = document.getElementById('ia-fab-badge');
    if (!dot) return;
    const alertas = DB.get('alertas').filter(a =>
        alertaVisibleParaUsuario(a) && a.estado !== 'Resuelta' &&
        (a.tipo?.startsWith('luna') || a.tipo?.startsWith('riva') || a.tipo === 'mensaje_caso')
    );
    dot.classList.toggle('hidden', alertas.length === 0);
    dot.textContent = alertas.length > 9 ? '9+' : String(alertas.length);
}

function construirContextoCasoExtendido() {
    const ctx = construirContextoIA();
    if (!detalleActivoId) return ctx;

    if (detalleModo === 'casa') {
        const c = DB.get('casas').find(x => x.id === detalleActivoId);
        const p = c ? getProspectoById(c.prospectoId) : null;
        if (c) {
            ctx.casoDetalle = {
                tipo: 'propiedad', ...c,
                prospecto: p ? {
                    telefono: p.telefono,
                    adeudos: { credito: p.adeudoCredito, agua: p.adeudoAgua, luz: p.adeudoLuz, predial: p.adeudoPredial },
                    escrituras: p.tieneEscrituras, invadida: p.invadida, notas: p.notas
                } : null,
                mensajes: (c.mensajes || []).slice(-8)
            };
        }
    } else {
        const p = getProspectoById(detalleActivoId);
        if (p) {
            ctx.casoDetalle = {
                tipo: 'prospecto', ...p,
                mensajes: (p.mensajes || []).slice(-8),
                diasSinMovimiento: diasDesde(p.fechaISO || p.fechaCaptura)
            };
        }
    }
    return ctx;
}

function renderPanelLunaCaso() {
    const panel = document.getElementById('detalle-luna-panel');
    if (!panel) return;
    panel.innerHTML = `
        <div class="luna-caso-hero">
            ${getLunaAvatarHtml('xl')}
            <div>
                <h4>Hola, ¿en qué te ayudo?</h4>
                <p class="module-desc">Conozco este caso al detalle. Elige una acción o pregúntame lo que necesites.</p>
            </div>
        </div>
        <div class="luna-caso-grid">
            <button type="button" class="luna-action-card" onclick="lunaChecklistCaso()">
                <span class="luna-action-icon">✅</span>
                <strong>Expediente</strong>
                <small>Qué falta para avanzar</small>
            </button>
            <button type="button" class="luna-action-card" onclick="lunaPropuestaBorrador()">
                <span class="luna-action-icon">💰</span>
                <strong>Propuesta</strong>
                <small>Borrador sugerido</small>
            </button>
            <button type="button" class="luna-action-card" onclick="lunaResumenHiloCaso()">
                <span class="luna-action-icon">💬</span>
                <strong>Comunicación</strong>
                <small>Resumir mensajes</small>
            </button>
            <button type="button" class="luna-action-card" onclick="lunaRiesgosCaso()">
                <span class="luna-action-icon">⚠️</span>
                <strong>Riesgos</strong>
                <small>Alertas del caso</small>
            </button>
            <button type="button" class="luna-action-card" onclick="lunaGuionCaso()">
                <span class="luna-action-icon">📞</span>
                <strong>Guión</strong>
                <small>Seguimiento natural</small>
            </button>
            <button type="button" class="luna-action-card luna-action-card--primary" onclick="setIAPanel(true); document.getElementById('ia-input')?.focus()">
                <span class="luna-action-icon">✨</span>
                <strong>Pregúntame</strong>
                <small>Chat libre con Luna</small>
            </button>
            <button type="button" class="luna-action-card" onclick="lunaGuiaModulo()">
                <span class="luna-action-icon">🗺️</span>
                <strong>Guía del módulo</strong>
                <small>Pasos en este pantallazo</small>
            </button>
        </div>`;
}

function lunaAbrirConMensaje(msg, tipo, contextoExtra) {
    if (typeof setIAPanel === 'function') setIAPanel(true);
    consultarIA({ mensaje: msg, tipo: tipo || 'chat', contextoExtra });
}

function lunaBriefingDiario() {
    const msgs = {
        Direccion: 'Dame mi briefing de hoy: números clave, prioridades y 3 decisiones. Tono cálido y directo.',
        Marketing: 'Briefing de hoy: campañas, costos y dónde enfocar. Máximo 5 puntos claros.',
        Vendedor: 'Briefing de hoy: a quién contactar primero, casos urgentes y mis próximos pasos.',
        Administradora: 'Briefing de hoy: expedientes urgentes, pipeline y checklist del día.'
    };
    lunaAbrirConMensaje(msgs[currentUser?.rol] || msgs.Direccion, 'briefing');
}

function lunaChecklistCaso() {
    lunaAbrirConMensaje('Checklist claro de lo que falta en este caso para avanzar. Viñetas accionables.', 'caso_checklist', construirContextoCasoExtendido());
}

function lunaPropuestaBorrador() {
    lunaAbrirConMensaje('Borrador de propuesta según adeudos. Marca como BORRADOR para revisión humana.', 'propuesta_borrador', construirContextoCasoExtendido());
}

function lunaResumenHiloCaso() {
    lunaAbrirConMensaje('Resume mensajes del caso: acuerdos, dudas y próximo paso.', 'resumen_hilo', construirContextoCasoExtendido());
}

function lunaRiesgosCaso() {
    lunaAbrirConMensaje('Riesgos del caso por severidad (adeudos, escrituras, invasión, estatus).', 'riesgos', construirContextoCasoExtendido());
}

function lunaGuionCaso() {
    lunaAbrirConMensaje('Guión natural y breve para dar seguimiento a este caso según su estatus.', 'guion_llamada', construirContextoCasoExtendido());
}

function lunaGuionProspecto(id) {
    const p = getProspectoById(id);
    if (!p) return;
    detalleModo = 'prospecto';
    detalleActivoId = id;
    lunaGuionCaso();
}

function lunaReporteSemanal() {
    lunaAbrirConMensaje('Reporte ejecutivo semanal: conversión, pipeline, campañas y recomendaciones.', 'reporte_semanal');
}

function lunaPriorizarKanban() {
    lunaAbrirConMensaje('¿Cómo priorizar el kanban hoy? Orden sugerido con razones.', 'prioridad_kanban');
}

function lunaAnalizarCampanas() {
    lunaAbrirConMensaje('Analiza ROI de campañas: costo/prospecto, costo/firmado, escalar o pausar.', 'resumen_campana');
}

function lunaSimularEscenario() {
    const n = prompt('¿Cuántos firmados adicionales simular este mes?', '3');
    if (!n) return;
    lunaAbrirConMensaje(`Impacto de cerrar ${n} firmados más: pipeline, conversión y carga.`, 'simulacion');
}

function lunaGuiaSistema() {
    const rol = currentUser?.rol || 'Direccion';
    lunaAbrirConMensaje(
        `Soy nuevo en Revive Hogar. Dame un tour completo del sistema para mi rol (${rol}): qué módulos veo, flujo de trabajo paso a paso, y los primeros 3 pasos para empezar hoy.`,
        'onboarding'
    );
}

function lunaGuiaModulo() {
    const mod = RH_MODULE_LABELS[activeModuleId] || activeModuleId || 'el sistema';
    lunaAbrirConMensaje(
        `Explícame paso a paso cómo usar el módulo "${mod}": qué botones presionar, qué formularios llenar y en qué orden. Adaptado a mi rol.`,
        'guia_sistema'
    );
}

function lunaAyudaFlujo() {
    lunaAbrirConMensaje(
        'Explícame el flujo completo de Revive Hogar desde campaña hasta cierre de propiedad, con los estatus de prospecto y pipeline.',
        'guia_sistema'
    );
}

function lunaScoreProspecto(id) {
    const p = getProspectoById(id);
    if (!p) return;
    detalleModo = 'prospecto';
    detalleActivoId = id;
    lunaAbrirConMensaje('Score de cierre 0-100 con 3 razones basadas en datos.', 'score_cierre', construirContextoCasoExtendido());
}

/* Alias compatibilidad */
const crearAlertasProactivasRiva = crearAlertasProactivasLuna;
const marcarBadgeRiva = marcarBadgeLuna;
const renderPanelRivaCaso = renderPanelLunaCaso;
const rivaBriefingDiario = lunaBriefingDiario;
const rivaChecklistCaso = lunaChecklistCaso;
const rivaPropuestaBorrador = lunaPropuestaBorrador;
const rivaResumenHiloCaso = lunaResumenHiloCaso;
const rivaRiesgosCaso = lunaRiesgosCaso;
const rivaGuionCaso = lunaGuionCaso;
const rivaGuionProspecto = lunaGuionProspecto;
const rivaReporteSemanal = lunaReporteSemanal;
const rivaPriorizarKanban = lunaPriorizarKanban;
const rivaAnalizarCampanas = lunaAnalizarCampanas;
const rivaSimularEscenario = lunaSimularEscenario;
const rivaScoreProspecto = lunaScoreProspecto;
