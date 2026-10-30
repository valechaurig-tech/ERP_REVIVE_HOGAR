/**
 * Revive Hogar — Plano operativo para Aurora.
 * Este objeto es el manual que Aurora recibe en cada consulta.
 */

const LUNA_KNOWLEDGE = {
    asistente: 'Aurora',
    empresa: {
        nombre: 'Revive Hogar',
        mision: 'Acompañar familias con crédito en riesgo, invasión o adeudos hasta una salida habitacional ordenada.',
        url: 'https://revive-hogar.vercel.app',
        producto: 'ERP web de captación, expediente, pipeline, finanzas y venta'
    },
    flujoPrincipal: [
        '1. Marketing crea campañas y asigna prospectos a un vendedor',
        '2. Vendedor da seguimiento: No contactado → En contacto → Interesado',
        '3. Vendedor envía expediente a Administradora (con datos completos)',
        '4. Administradora investiga, genera propuesta y documentos → Propuesta lista',
        '5. Vendedor cierra: Firmado o Declinado',
        '6. Si Firmado: la propiedad entra al Pipeline (Espera remodelación → En remodelación → En venta → Cerrada)',
        '7. En remodelación se registran costos; al cerrar se calcula utilidad (precio venta − adquisición − remodelación)'
    ],
    roles: {
        Direccion: {
            modulos: ['Resumen Ejecutivo', 'Tareas y Alertas', 'Gestor de proyectos', 'Marketing', 'Mis Prospectos', 'Bandeja Administradora', 'Propiedades', 'Compradores', 'Gastos y Presupuestos', 'Gastos de Empresa', 'Operaciones de venta', 'Referidos y Comisiones', 'Configuración', 'Bitácora', 'Usuarios'],
            responsabilidades: 'Visión global, KPIs, conversión, finanzas, auditoría y gestión de usuarios.',
            pasosDiarios: ['Revisar Resumen Ejecutivo', 'Leer el briefing de Aurora', 'Revisar alertas en Planner', 'Identificar cuellos de botella en pipeline']
        },
        Marketing: {
            modulos: ['Campañas y prospectos', 'Tareas y Alertas'],
            responsabilidades: 'Registrar campañas con costo, captar prospectos y asignarlos al vendedor correcto.',
            pasosDiarios: ['Revisar KPIs de campañas', 'Asignar nuevos prospectos con vendedor', 'Analizar costo por prospecto con Aurora']
        },
        Vendedor: {
            modulos: ['Mis Prospectos', 'Tareas y Alertas'],
            responsabilidades: 'Contactar prospectos asignados, completar datos, enviar a admin y cerrar ventas.',
            pasosDiarios: ['Ver prospectos sin contactar', 'Actualizar estatus', 'Completar datos antes de Interesado', 'Enviar a administradora cuando esté listo', 'Cerrar Firmado/Declinado cuando admin termine propuesta']
        },
        Administradora: {
            modulos: ['Bandeja Administradora', 'Propiedades', 'Compradores', 'Gastos y Presupuestos', 'Operaciones de venta', 'Usuarios', 'Tareas y Alertas'],
            responsabilidades: 'Expedientes, checklist documental, kit de apertura, propuestas, pipeline y control financiero por propiedad.',
            pasosDiarios: ['Revisar expedientes pendientes', 'Validar documentos del propietario', 'Completar ficha legal y kit', 'Actualizar presupuesto y egresos', 'Cambiar estatus en pipeline']
        }
    },
    estatusProspecto: {
        'No contactado': 'Recién asignado; el vendedor debe llamar o visitar.',
        'En contacto': 'Ya hubo comunicación; seguir nutriendo.',
        'Interesado': 'Requiere: nombre, dirección, teléfono, tipo crédito, escrituras, invasión, adeudos.',
        'En administradora': 'Expediente enviado; admin trabaja propuesta.',
        'Propuesta lista': 'Admin terminó; vendedor puede cerrar Firmado o Declinado.',
        Firmado: 'Venta cerrada; se crea propiedad en pipeline.',
        Declinado: 'Prospecto no continúa.'
    },
    estatusPipeline: {
        'Espera remodelación': 'Casa firmada, pendiente de iniciar obra.',
        'En remodelación': 'Obra en curso; registrar costos en tab Remodelación.',
        'En venta': 'Lista para comercializar; indicar precio de venta para utilidad proyectada.',
        Cerrada: 'Venta finalizada; precio de venta obligatorio para utilidad realizada.'
    },
    modulosDetalle: {
        'mod-proyectos': 'Gestor de proyectos (solo Dirección): kanban del equipo, asignar tareas, filtrar por persona. Cada usuario tiene tablero independiente en Tareas y Alertas.',
        'mod-planner': 'Tareas y Alertas: resumen + tablero personal (cada quien solo las suyas). Dirección ve resumen del equipo y botón al gestor.',
        'mod-dashboard': 'Resumen Ejecutivo: inversión campañas, prospectos, firmados, pipeline, costos remodelación, utilidad.',
        'mod-marketing': 'Marketing: + Agregar campaña, + Asignar prospecto (elegir vendedor). Tablas de campañas y prospectos captados.',
        'mod-vendedor': 'Vendedor: + Registrar prospecto (campo), tabla con Gestionar. Mis propiedades muestra casas firmadas.',
        'mod-administradora': 'Admin: expedientes pendientes, botón Expediente para propuesta y documentos.',
        'mod-pipeline': 'Pipeline: filtrar por estatus, Ver registro, Costos, Cambiar estatus (solo admin/dirección).',
        'mod-gastos': 'Gastos y Presupuestos: control por propiedad de presupuesto previsto, egresos reales, inversiones Revive/socios, retornos, pagos del comprador y utilidad.',
        'mod-gastos-empresa': 'Gastos de Empresa (solo Dirección): ingresos y egresos corporativos, presupuesto mensual por categoría, balance neto e integración con egresos de propiedades.',
        'mod-referidos': 'Referidos y Comisiones (solo Dirección): muestra a quién se le debe comisión, total pactado, pagos realizados y saldo pendiente por propiedad.',
        'mod-configuracion': 'Configuración (solo Dirección): ordena documentos y campos, y define cuáles bloquean el avance por ser obligatorios o cuáles solo generan aviso.',
        'mod-usuarios': 'Usuarios: alta y estado de las cuentas del equipo.',
        'mod-auditoria': 'Bitácora: quién hizo qué. También muestra qué módulos, pestañas y formularios se usan, cuáles no, y las notas del botón Prueba. Solo Dirección.',
        'mod-compradores': 'Compradores: ficha de quien compra, aparte del propietario del inmueble.',
        'mod-operaciones': 'Operaciones de venta: etapa, captador y vendedor. La comisión aquí es una estimación. No genera un pago ni mueve bancos.',
        copropietarios: 'En la ficha de la propiedad, Copropietarios declara titulares. No crea pagos.',
        documentosPropiedad: 'Abrir ficha → pestaña Expediente. Ahí están los archivos. Paquete de notaría y paquete de avalúo solo agrupan lo ya cargado. No inventes la lista del despacho.',
        finanzasPropiedad: 'En Gastos, un egreso elige partida, cuenta bancaria y, si aplica, el referido. La cuenta baja su saldo. El pago de referido aparece en Referidos. La comisión de la casa acepta porcentaje o monto fijo. Los apartados se desglosan como pagos con la palabra Apartado y deben cuadrar con Apartados recibidos. Lo pagado a la partida PROPIETARIO se resta de lo que falta entregar al firmar. Las deudas (crédito, agua, luz, predial) son otras partidas.'
    },
    formularios: {
        'form-campana': 'Campaña: nombre libre, canal (Facebook/Instagram/Google/Otros), costo, fecha inicio, días duración.',
        'form-prospecto': 'Prospecto: nombre, teléfono, dirección, campaña, vendedor (marketing) o auto-asignación (vendedor).',
        'form-gestion-prospecto': 'Gestión desde En contacto: INE ambos lados, validación de domicilio, CFE, escrituras, invasión y adeudos. Botón Enviar a administradora cuando Interesado.',
        'form-expediente-admin': 'Expediente de Regi: datos personales, ficha legal/económica, checklist de archivos y kit documental. Marca Propuesta lista.',
        'form-pipeline': 'Pipeline: nuevo estatus; precio venta al pasar a En venta o Cerrada.',
        'form-costo-remodelacion': 'Costo remodelación: concepto, categoría, monto, nota (tab Remodelación en detalle de propiedad).',
        'form-tarea': 'Tarea: título, descripción, asignado, prioridad, fecha límite.',
        'form-mensaje-caso': 'Comunicación interna vendedor ↔ administradora por caso.'
    },
    finanzas: {
        formulaUtilidad: 'Utilidad proyectada = venta − presupuesto maestro. Utilidad sobre egresos = venta − egresos reales registrados.',
        indicadores: ['Presupuesto maestro', 'Egresos reales', 'Inversión Revive y socios', 'Retornos', 'Saldo de caja', 'Utilidad proyectada', 'Utilidad sobre egresos', 'Balance corporativo', 'Presupuesto empresa'],
        dondeRegistrarCostos: 'Por propiedad: Gastos y Presupuestos. Corporativos: Gastos de Empresa (solo Dirección).'
    },
    faq: [
        { p: '¿Por qué no veo un prospecto?', r: 'Vendedor solo ve los asignados a su usuario. Marketing ve los de su módulo.' },
        { p: '¿Cuándo aparece en bandeja admin?', r: 'Cuando el vendedor guarda y envía a administradora.' },
        { p: '¿Cómo cierra el vendedor?', r: 'Solo en Propuesta lista, con Firmado o Declinado.' },
        { p: '¿Dónde están los documentos de una casa?', r: 'Ficha de la propiedad, pestaña Expediente. No hace falta abrir el recorrido.' },
        { p: '¿Aurora puede dar asesoría legal?', r: 'No. Orienta el uso del sistema. Los documentos son borradores para revisión humana.' },
        { p: '¿Dónde se mueve el dinero?', r: 'El egreso de la propiedad descuenta la cuenta elegida. La operación de venta no mueve dinero.' }
    ],
    demoUsuarios: ['Dirección', 'Marketing', 'Administradora', 'Vendedor 1', 'Vendedor 2']
};

function getLunaKnowledgeForRole(rol) {
    const rolKey = rol || 'Direccion';
    return {
        empresa: LUNA_KNOWLEDGE.empresa,
        flujo: LUNA_KNOWLEDGE.flujoPrincipal,
        tuRol: LUNA_KNOWLEDGE.roles[rolKey] || LUNA_KNOWLEDGE.roles.Direccion,
        estatusProspecto: LUNA_KNOWLEDGE.estatusProspecto,
        estatusPipeline: LUNA_KNOWLEDGE.estatusPipeline,
        modulos: LUNA_KNOWLEDGE.modulosDetalle,
        formularios: LUNA_KNOWLEDGE.formularios,
        finanzas: LUNA_KNOWLEDGE.finanzas,
        faq: LUNA_KNOWLEDGE.faq,
        planos: {
            asistente: LUNA_KNOWLEDGE.asistente,
            documentos: LUNA_KNOWLEDGE.modulosDetalle.documentosPropiedad,
            finanzas: LUNA_KNOWLEDGE.modulosDetalle.finanzasPropiedad,
            operaciones: LUNA_KNOWLEDGE.modulosDetalle['mod-operaciones']
        }
    };
}

function getLunaKnowledgeCompact() {
    return LUNA_KNOWLEDGE;
}
