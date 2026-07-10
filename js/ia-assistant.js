/**
 * Revive Hogar — Luna, asistente IA (chat + copiloto)
 */

const IA_HISTORIAL_MAX = 40;
let iaHistorial = [];
let iaAbierto = false;
let iaEnviando = false;

const IA_SALUDOS = {
    Direccion: 'Puedo mostrarte el pulso del negocio, detectar cuellos de botella y **guiarte paso a paso** en cualquier módulo del sistema.',
    Marketing: 'Analizo tus campañas y te explico **cómo asignar prospectos**, registrar campañas y medir costos.',
    Vendedor: 'Te ayudo a priorizar contactos, avanzar prospectos y te guío en **cada botón y formulario** de tu módulo.',
    Administradora: 'Reviso expedientes, el pipeline y te explico **cómo completar propuestas**, costos y cambios de estatus.'
};

const IA_QUICK = {
    Direccion: [
        { label: '🗺️ Guía del sistema', action: 'lunaGuiaSistema' },
        { label: '☀️ Briefing de hoy', msg: 'Dame mi briefing de hoy con prioridades claras.', tipo: 'briefing' },
        { label: '📊 Resumen ejecutivo', msg: 'Resumen del negocio: prospectos, conversión, pipeline y alertas.', tipo: 'reporte_semanal' },
        { label: '⚠️ Cuellos de botella', msg: '¿Dónde se atora el flujo? Sé específico con los datos.', tipo: 'chat' },
        { label: '🔮 Simular escenario', action: 'lunaSimularEscenario' },
        { label: '🗺️ Mapa de riesgos', msg: 'Lista casos con mayor riesgo operativo según adeudos, escrituras e invasión.', tipo: 'riesgos' }
    ],
    Marketing: [
        { label: '🗺️ ¿Cómo usar Marketing?', action: 'lunaGuiaModulo' },
        { label: '☀️ Briefing de hoy', msg: 'Briefing de campañas y prioridades de hoy.', tipo: 'briefing' },
        { label: '📢 ROI campañas', msg: 'Analiza ROI de cada campaña: costo/prospecto y costo/firmado.', tipo: 'resumen_campana' },
        { label: '➕ Asignar prospecto', msg: 'Explícame paso a paso cómo crear una campaña y asignar un prospecto a un vendedor.', tipo: 'guia_sistema' },
        { label: '🎯 Dónde invertir', msg: '¿Dónde enfocar el presupuesto según los datos?', tipo: 'chat' }
    ],
    Vendedor: [
        { label: '🗺️ ¿Cómo usar mi módulo?', action: 'lunaGuiaModulo' },
        { label: '☀️ Briefing de hoy', msg: '¿A quién contacto primero hoy y por qué?', tipo: 'briefing' },
        { label: '🔥 Priorizar hoy', msg: 'Ordena mis prospectos por urgencia de contacto.', tipo: 'prioridad_kanban' },
        { label: '📋 Enviar a admin', msg: 'Explícame paso a paso cómo llevar un prospecto de Interesado hasta enviarlo a administradora.', tipo: 'guia_sistema' },
        { label: '✍️ Cerrar venta', msg: '¿Cómo cierro Firmado o Declinado cuando la propuesta está lista?', tipo: 'guia_sistema' },
        { label: '📞 Guión de llamada', msg: 'Dame un guión general para mis prospectos en seguimiento.', tipo: 'guion_llamada' }
    ],
    Administradora: [
        { label: '🗺️ ¿Cómo usar mi bandeja?', action: 'lunaGuiaModulo' },
        { label: '☀️ Briefing de hoy', msg: 'Checklist del día: expedientes, pipeline y alertas.', tipo: 'briefing' },
        { label: '📁 Expedientes urgentes', msg: '¿Qué expedientes están más urgentes y qué les falta?', tipo: 'caso_checklist' },
        { label: '🏠 Pipeline y costos', msg: 'Explícame cómo cambiar estatus en pipeline y registrar costos de remodelación.', tipo: 'guia_sistema' },
        { label: '✅ Checklist del día', msg: 'Lista todo lo que debo revisar hoy.', tipo: 'caso_checklist' }
    ]
};

function initIAAssistant() {
    const fab = document.getElementById('ia-fab');
    const close = document.getElementById('ia-close');
    const form = document.getElementById('ia-form');
    const headerAvatar = document.getElementById('ia-header-avatar');
    const fabAvatar = document.getElementById('ia-fab-avatar');

    if (headerAvatar && typeof getLunaAvatarHtml === 'function') {
        headerAvatar.innerHTML = getLunaAvatarHtml('lg');
    }
    if (fabAvatar && typeof getLunaSvg === 'function') {
        fabAvatar.innerHTML = getLunaSvg('luna-svg luna-svg--fab', { animated: true });
    }

    if (fab) fab.addEventListener('click', toggleIAPanel);
    if (close) close.addEventListener('click', () => setIAPanel(false));
    if (form) form.addEventListener('submit', enviarMensajeIA);
    const input = document.getElementById('ia-input');
    if (input) {
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                document.getElementById('ia-form')?.requestSubmit();
            }
        });
    }
    renderIAQuickActions();
}

function mostrarIAWidget(visible) {
    const w = document.getElementById('ia-widget');
    if (w) w.classList.toggle('hidden', !visible);
    if (!visible) {
        setIAPanel(false);
        iaHistorial = [];
    }
}

function iniciarSesionIA() {
    iaHistorial = [];
    mostrarIAWidget(true);
    renderIAMessages();

    if (typeof crearAlertasProactivasLuna === 'function') crearAlertasProactivasLuna();

    const nombre = getNombreLuna(currentUser);
    const rol = currentUser?.rol || 'Direccion';
    const saludo = IA_SALUDOS[rol] || IA_SALUDOS.Direccion;
    agregarMensajeIA('assistant',
        `¡Hola, **${nombre}**! Soy **Luna**, tu guía inteligente en Revive Hogar. ✨\n\n${saludo}\n\nPregúntame *"¿cómo hago…?"* o usa los accesos rápidos — conozco todo el flujo del sistema.`
    );
    renderIAQuickActions();
    setIAEstado('En línea · lista para ayudarte');
}

function toggleIAPanel() {
    setIAPanel(!iaAbierto);
    if (typeof marcarBadgeLuna === 'function') marcarBadgeLuna();
}

function setIAPanel(open) {
    iaAbierto = open;
    const panel = document.getElementById('ia-panel');
    const fab = document.getElementById('ia-fab');
    if (panel) panel.classList.toggle('ia-panel--open', open);
    if (fab) fab.classList.toggle('ia-fab--hidden', open);
    if (open) {
        const input = document.getElementById('ia-input');
        if (input) setTimeout(() => input.focus(), 200);
        scrollIAMessages();
    }
}

function renderIAQuickActions() {
    const wrap = document.getElementById('ia-quick');
    if (!wrap || !currentUser) return;
    const items = IA_QUICK[currentUser.rol] || IA_QUICK.Direccion;
    wrap.innerHTML = items.map((q, i) => {
        if (q.action) {
            return `<button type="button" class="ia-quick-btn" data-action="${escapeHtml(q.action)}">${escapeHtml(q.label)}</button>`;
        }
        return `<button type="button" class="ia-quick-btn" data-msg="${escapeHtml(q.msg)}" data-tipo="${escapeHtml(q.tipo || 'chat')}">${escapeHtml(q.label)}</button>`;
    }).join('');
    wrap.querySelectorAll('.ia-quick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            if (action && typeof window[action] === 'function') {
                window[action]();
                return;
            }
            const msg = btn.dataset.msg;
            const tipo = btn.dataset.tipo || 'chat';
            if (msg) consultarIA({ mensaje: msg, tipo });
        });
    });
}

function construirContextoIA() {
    const prospectos = DB.get('prospectos');
    const casas = DB.get('casas');
    const campanas = DB.get('campanas');
    const alertas = DB.get('alertas').filter(a => typeof alertaVisibleParaUsuario === 'function' && alertaVisibleParaUsuario(a));
    const tareas = DB.get('tareas').filter(t => typeof tareaVisibleParaUsuario === 'function' && tareaVisibleParaUsuario(t));

    let misProspectos = prospectos;
    let misCasas = casas;
    if (currentUser?.rol === 'Vendedor') {
        misProspectos = prospectos.filter(p => p.vendedorId === currentUser.id);
        misCasas = casas.filter(c => c.vendedorId === currentUser.id);
    }

    const porEstatus = (lista, campo) => {
        const map = {};
        lista.forEach(item => {
            const k = item[campo] || 'Sin estatus';
            map[k] = (map[k] || 0) + 1;
        });
        return map;
    };

    const presupuesto = campanas.reduce((s, c) => s + Number(c.costo || 0), 0);
    const firmados = prospectos.filter(p => p.estatus === 'Firmado').length;
    const estancados = typeof prospectosEstancados === 'function' ? prospectosEstancados(misProspectos).length : 0;
    const fin = typeof calcularIndicadoresFinancieros === 'function' ? calcularIndicadoresFinancieros() : {};

    const ctx = {
        fecha: new Date().toLocaleString('es-MX'),
        usuario: {
            nombre: getNombreLuna(currentUser),
            nombreCompleto: currentUser?.displayName,
            correo: currentUser?.correo || '',
            telefono: currentUser?.telefono || '',
            rol: currentUser?.rol,
            rolEtiqueta: rhEtiquetaRol(currentUser?.rol)
        },
        moduloActivo: RH_MODULE_LABELS[activeModuleId] || activeModuleId || '—',
        resumen: {
            campanas: campanas.length,
            campanasActivas: campanas.filter(c => c.estatus === 'Activa').length,
            inversionTotal: presupuesto,
            prospectosTotal: prospectos.length,
            prospectosActivos: prospectos.filter(p => !['Firmado', 'Declinado'].includes(p.estatus)).length,
            prospectosEstancados: estancados,
            firmados,
            declinados: prospectos.filter(p => p.estatus === 'Declinado').length,
            tasaConversion: prospectos.length ? Math.round((firmados / prospectos.length) * 100) : 0,
            costoPorProspecto: prospectos.length ? Math.round(presupuesto / prospectos.length) : 0,
            costoPorFirmado: firmados ? Math.round(presupuesto / firmados) : null,
            propiedadesPipeline: casas.length,
            propiedadesEnVenta: casas.filter(c => c.estatusPipeline === 'En venta').length,
            alertasPendientes: alertas.filter(a => a.estado !== 'Resuelta').length,
            tareasActivas: tareas.filter(t => t.estado !== 'Completada').length,
            tareasUrgentes: tareas.filter(t => t.estado !== 'Completada' && ['Alta', 'Urgente'].includes(t.priority)).length,
            costosRemodelacion: fin.costosRemodelacion || 0,
            inversionPropiedades: fin.inversionPropiedades || 0,
            utilidadRealizada: fin.utilidadRealizada || 0,
            utilidadProyectada: fin.utilidadProyectada || 0
        },
        prospectosPorEstatus: porEstatus(misProspectos, 'estatus'),
        pipelinePorEstatus: porEstatus(misCasas, 'estatusPipeline'),
        campanas: campanas.slice(0, 10).map(c => {
            const st = estadisticasCampana(c.id, prospectos);
            return {
                id: c.identificador,
                nombre: c.nombre,
                costo: c.costo,
                estatus: c.estatus,
                prospectos: st.total,
                firmados: st.firmados,
                costoPorFirmado: st.firmados ? Math.round(c.costo / st.firmados) : null
            };
        }),
        prospectosRecientes: misProspectos.slice(0, 12).map(p => ({
            id: p.id,
            nombre: p.nombreCompleto,
            estatus: p.estatus,
            direccion: p.direccionPropiedad,
            credito: p.tipoCredito || '—',
            adeudoCredito: p.adeudoCredito,
            diasSinMovimiento: typeof diasDesde === 'function' ? diasDesde(p.fechaISO || p.fechaCaptura) : null
        })),
        propiedadesRecientes: misCasas.slice(0, 10).map(c => ({
            nombre: c.nombreCompleto,
            estatus: c.estatusPipeline,
            direccion: c.direccionPropiedad,
            propuesta: c.montoAdquisicion ? formatearMoneda(c.montoAdquisicion) : '—'
        })),
        tareasActivasLista: tareas.filter(t => t.estado !== 'Completada').slice(0, 8).map(t => ({
            titulo: t.titulo,
            prioridad: t.priority,
            estado: t.estado
        }))
    };

    if (typeof getLunaKnowledgeForRole === 'function') {
        ctx.guiaSistema = getLunaKnowledgeForRole(currentUser?.rol);
    }

    if (typeof detalleActivoId !== 'undefined' && detalleActivoId) {
        if (typeof detalleModo !== 'undefined' && detalleModo === 'casa') {
            const c = casas.find(x => x.id === detalleActivoId);
            if (c) ctx.casoAbierto = { tipo: 'propiedad', nombre: c.nombreCompleto, estatus: c.estatusPipeline };
        } else if (typeof detalleModo !== 'undefined' && detalleModo === 'prospecto') {
            const p = getProspectoById(detalleActivoId);
            if (p) ctx.casoAbierto = { tipo: 'prospecto', nombre: p.nombreCompleto, estatus: p.estatus };
        }
    }
    return ctx;
}

function agregarMensajeIA(role, text, extraClass) {
    iaHistorial.push({ role, text, ts: Date.now() });
    if (iaHistorial.length > IA_HISTORIAL_MAX) iaHistorial.shift();
    renderIAMessages(extraClass);
}

function renderIAMessages(extraClass) {
    const wrap = document.getElementById('ia-messages');
    if (!wrap) return;
    const lunaMini = typeof getLunaMiniHtml === 'function' ? getLunaMiniHtml() : '';
    wrap.innerHTML = iaHistorial.map((m, i) => {
        const isLast = i === iaHistorial.length - 1;
        const extra = extraClass && isLast ? ' ' + extraClass : '';
        if (m.role === 'user') {
            return `<div class="ia-msg-row ia-msg-row--user${extra}">
                <div class="ia-msg ia-msg--user">${escapeHtml(m.text)}</div>
            </div>`;
        }
        const html = m.text === '…' ? '<span class="ia-typing-dots"><span></span><span></span><span></span></span>' : renderIAMarkdown(m.text);
        return `<div class="ia-msg-row ia-msg-row--bot${extra}">
            ${lunaMini}
            <div class="ia-msg ia-msg--bot">${html}</div>
        </div>`;
    }).join('');
    scrollIAMessages();
}

function renderIAMarkdown(text) {
    let s = escapeHtml(text);
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/^- (.+)$/gm, '<li>$1</li>');
    s = s.replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`);
    s = s.replace(/\n/g, '<br>');
    return s;
}

function scrollIAMessages() {
    const wrap = document.getElementById('ia-messages');
    if (wrap) wrap.scrollTop = wrap.scrollHeight;
}

function setIAEstado(estado) {
    const el = document.getElementById('ia-status');
    if (el) el.textContent = estado;
    const btn = document.querySelector('#ia-form button[type="submit"]');
    if (btn) btn.disabled = iaEnviando;
    const input = document.getElementById('ia-input');
    if (input) input.disabled = iaEnviando;
    const fab = document.getElementById('ia-fab');
    if (fab) fab.classList.toggle('ia-fab--thinking', iaEnviando);
}

async function enviarMensajeIA(e) {
    e.preventDefault();
    const input = document.getElementById('ia-input');
    const texto = input?.value.trim();
    if (!texto || iaEnviando) return;
    input.value = '';
    await consultarIA({ mensaje: texto, tipo: 'chat' });
}

async function consultarIA({ mensaje, tipo, contextoExtra, abrirPanel }) {
    if (!mensaje || iaEnviando || !currentUser) return;
    if (abrirPanel !== false && !iaAbierto) setIAPanel(true);

    agregarMensajeIA('user', mensaje);
    iaEnviando = true;
    setIAEstado('Luna está pensando…');
    agregarMensajeIA('assistant', '…', 'ia-msg--typing');

    const history = iaHistorial
        .filter(m => m.text !== '…')
        .slice(0, -1)
        .map(m => ({ role: m.role, text: m.text }));

    const context = contextoExtra || construirContextoIA();

    try {
        const res = await fetch('/api/ia', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: mensaje, history, context, tipo: tipo || 'chat' })
        });
        const data = await res.json();
        iaHistorial = iaHistorial.filter(m => m.text !== '…');

        if (!res.ok) {
            agregarMensajeIA('assistant', `Ups, algo salió mal: ${data.mensaje || data.error || 'Intenta de nuevo en un momento.'}`);
            return;
        }
        agregarMensajeIA('assistant', data.respuesta || 'No tengo respuesta ahora, ¿me lo repites?');
    } catch (err) {
        iaHistorial = iaHistorial.filter(m => m.text !== '…');
        agregarMensajeIA('assistant', 'No pude conectar. Revisa tu internet o que la IA esté configurada en el servidor.');
        console.error('IA error:', err);
    } finally {
        iaEnviando = false;
        setIAEstado('En línea · lista para ayudarte');
        if (typeof marcarBadgeLuna === 'function') marcarBadgeLuna();
    }
}

async function enviarTextoIA(texto, opts) {
    return consultarIA({ mensaje: texto, tipo: opts?.tipo, contextoExtra: opts?.contextoExtra });
}
