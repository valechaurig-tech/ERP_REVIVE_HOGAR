/**
 * Revive Hogar — Base de conocimiento para Luna (guía del sistema)
 */

const LUNA_KNOWLEDGE = {
    empresa: {
        nombre: 'Revive Hogar',
        mision: 'Apoyar a familias con créditos en riesgo (Infonavit, Fovissste), invasiones o adeudos para encontrar una solución habitacional digna.',
        url: 'https://erp-revive-hogar.vercel.app',
        producto: 'ERP web para captación, venta, administración y pipeline de propiedades'
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
            modulos: ['Resumen Ejecutivo', 'Tareas y Alertas', 'Marketing', 'Mis Prospectos', 'Bandeja Administradora', 'Propiedades', 'Bitácora', 'Usuarios'],
            responsabilidades: 'Visión global, KPIs, conversión, finanzas, auditoría y gestión de usuarios.',
            pasosDiarios: ['Revisar Resumen Ejecutivo', 'Leer briefing de Luna', 'Revisar alertas en Planner', 'Identificar cuellos de botella en pipeline']
        },
        Marketing: {
            modulos: ['Campañas y prospectos', 'Tareas y Alertas'],
            responsabilidades: 'Registrar campañas con costo, captar prospectos y asignarlos al vendedor correcto.',
            pasosDiarios: ['Revisar KPIs de campañas', 'Asignar nuevos prospectos con vendedor', 'Analizar costo/prospecto con Luna']
        },
        Vendedor: {
            modulos: ['Mis Prospectos', 'Tareas y Alertas'],
            responsabilidades: 'Contactar prospectos asignados, completar datos, enviar a admin y cerrar ventas.',
            pasosDiarios: ['Ver prospectos sin contactar', 'Actualizar estatus', 'Completar datos antes de Interesado', 'Enviar a administradora cuando esté listo', 'Cerrar Firmado/Declinado cuando admin termine propuesta']
        },
        Administradora: {
            modulos: ['Bandeja Administradora', 'Propiedades', 'Usuarios', 'Tareas y Alertas'],
            responsabilidades: 'Expedientes, propuestas, documentos, pipeline y costos de remodelación.',
            pasosDiarios: ['Revisar expedientes pendientes', 'Completar propuesta y monto adquisición', 'Cambiar estatus en pipeline', 'Registrar costos de remodelación']
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
        'mod-planner': 'Planner: kanban de tareas, alertas del sistema (prospectos nuevos, propuestas listas, Luna estancamiento), historial reciente.',
        'mod-dashboard': 'Resumen Ejecutivo: inversión campañas, prospectos, firmados, pipeline, costos remodelación, utilidad.',
        'mod-marketing': 'Marketing: + Agregar campaña, + Asignar prospecto (elegir vendedor). Tablas de campañas y prospectos captados.',
        'mod-vendedor': 'Vendedor: + Registrar prospecto (campo), tabla con Gestionar. Mis propiedades muestra casas firmadas.',
        'mod-administradora': 'Admin: expedientes pendientes, botón Expediente para propuesta y documentos.',
        'mod-pipeline': 'Pipeline: filtrar por estatus, Ver registro, Costos, Cambiar estatus (solo admin/dirección).',
        'mod-usuarios': 'Usuarios: alta de vendedores (máx 5), editar contraseña y estado.',
        'mod-auditoria': 'Bitácora: quién hizo qué; solo Dirección.'
    },
    formularios: {
        'form-campana': 'Campaña: nombre libre, canal (Facebook/Instagram/Google/Otros), costo, fecha inicio, días duración.',
        'form-prospecto': 'Prospecto: nombre, teléfono, dirección, campaña, vendedor (marketing) o auto-asignación (vendedor).',
        'form-gestion-prospecto': 'Gestión: estatus, tipo crédito, escrituras, invasión, adeudos. Botón Enviar a administradora cuando Interesado.',
        'form-expediente-admin': 'Expediente: precio de compra a la familia, documentos. Marca Propuesta lista.',
        'form-pipeline': 'Pipeline: nuevo estatus; precio venta al pasar a En venta o Cerrada.',
        'form-costo-remodelacion': 'Costo remodelación: concepto, categoría, monto, nota (tab Remodelación en detalle de propiedad).',
        'form-tarea': 'Tarea: título, descripción, asignado, prioridad, fecha límite.',
        'form-mensaje-caso': 'Comunicación interna vendedor ↔ administradora por caso.'
    },
    finanzas: {
        formulaUtilidad: 'Utilidad = Precio de venta − (Monto adquisición + Costos de remodelación)',
        indicadores: ['Inversión campañas', 'Costos remodelación total', 'Inversión propiedades', 'Utilidad realizada (cerradas)', 'Utilidad proyectada (en venta)'],
        dondeRegistrarCostos: 'Detalle de propiedad → tab Remodelación → Agregar costo'
    },
    faq: [
        { p: '¿Contraseña demo?', r: '1234 para todos los usuarios demo (Dirección, Marketing, Administradora, Vendedor 1 y 2).' },
        { p: '¿Por qué no veo un prospecto?', r: 'Vendedor solo ve los asignados a su usuario. Marketing ve todos en su módulo.' },
        { p: '¿Cuándo aparece en bandeja admin?', r: 'Cuando el vendedor presiona Enviar a administradora (estatus En administradora).' },
        { p: '¿Cómo cierra el vendedor?', r: 'Solo cuando estatus es Propuesta lista; botones Firmado o Declinado en gestión.' },
        { p: '¿Dónde hablo con el equipo?', r: 'Detalle del caso → tab Comunicación, o Planner para tareas.' },
        { p: '¿Luna puede dar asesoría legal?', r: 'No. Solo borradores y orientación operativa; siempre revisión humana.' }
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
        faq: LUNA_KNOWLEDGE.faq
    };
}

function getLunaKnowledgeCompact() {
    return LUNA_KNOWLEDGE;
}
