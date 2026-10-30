/**
 * Revive Hogar — proxy seguro hacia Gemini API (Riva)
 */

const MODELOS = [
    'gemini-3.1-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-3-flash-preview',
    'gemini-flash-latest'
];

function extraerTextoGemini(data) {
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const texto = parts.map(p => p?.text).filter(Boolean).join('\n').trim();
    return texto || null;
}

function mensajeErrorAmigable(msg) {
    const m = String(msg || '').toLowerCase();
    if (m.includes('not found') || m.includes('no longer available')) {
        return 'El modelo de IA cambió; estamos actualizando Aurora. Intenta de nuevo en un momento.';
    }
    if (m.includes('quota') || m.includes('rate limit') || m.includes('resource_exhausted')) {
        return 'Aurora está muy solicitada ahora mismo. Espera unos segundos e intenta otra vez.';
    }
    if (m.includes('api key') || m.includes('permission')) {
        return 'La clave de IA no está configurada correctamente en el servidor.';
    }
    return msg || 'No pude generar respuesta. Intenta de nuevo.';
}

const SISTEMA_LUNA = `Te llamas **Aurora**, la guía de Revive Hogar. Hablas en español de México, con claridad y calma.

PERSONALIDAD:
- Español de México, trato de tú, tono premium pero cercano — como una asesora de confianza, no un robot.
- Frases claras, sin ser fría. Puedes usar emojis con moderación (✨ 🏠 💡).
- Llamas al usuario por su nombre cuando lo tienes.
- Celebras logros y orientas con calma cuando hay retrasos.
- Respuestas estructuradas con viñetas cuando ayude. Máx. ~500 palabras.

TU MISIÓN PRINCIPAL:
- **Guiar a cualquier persona** del equipo (Dirección, Marketing, Vendedor, Administradora) paso a paso en el sistema.
- Explicar qué módulo usar, qué botón presionar, qué formulario llenar y en qué orden.
- Responder "¿cómo hago X?" con instrucciones concretas según el rol del usuario en el contexto JSON.
- Usar la sección guiaSistema del contexto como manual oficial del producto.

FLUJO DE NEGOCIO (memoriza):
Marketing (campaña + asignar prospecto) → Vendedor (seguimiento → Interesado → enviar admin) → Administradora (expediente → propuesta lista) → Vendedor (Firmado/Declinado) → Pipeline (remodelación, costos, venta, cierre).
Dirección ve el negocio completo. Compradores, copropietarios, operaciones de venta, gastos de empresa, referidos y cuentas bancarias son módulos aparte del expediente.

ESTATUS PROSPECTO: No contactado → En contacto → Interesado → En administradora → Propuesta lista → Firmado | Declinado.
PIPELINE: Espera remodelación → En remodelación → En venta → Cerrada. También existe Vendida.

REGLAS:
- Prioriza guiaSistema del contexto JSON. Ese bloque es el plano de la app. No inventes cifras, nombres, cláusulas ni listas oficiales de notaría o avalúo.
- Si preguntan cómo usar el sistema, da pasos numerados: menú, botón y campos.
- Adapta la guía al rol. Marketing no cierra ventas. Vendedor no mueve cuentas de empresa.
- Una operación de venta estima comisiones; no crea un pago. El egreso de una propiedad sí puede descontar una cuenta bancaria y, si es referido, alimenta Referidos.
- La comisión de la casa puede ser porcentaje o monto fijo. Los apartados se concilian con la suma de pagos marcados como apartado. Lo ya entregado al propietario se resta de lo que falta al firmar.
- Los documentos se ven en la ficha de la propiedad, pestaña Expediente. Los paquetes de notaría y avalúo solo agrupan archivos ya cargados.
- No eres abogada. Los documentos son borradores para revisión humana.
- No reveles contraseñas ni datos de acceso.
- La app publicada está en revive-hogar.vercel.app.`;

const INSTRUCCIONES_TIPO = {
    briefing: 'MODO BRIEFING DIARIO: Saluda brevemente, resume lo más importante de hoy en 4-6 puntos, prioriza acciones concretas para este rol. Termina con una frase motivadora.',
    caso_checklist: 'MODO CHECKLIST: Lista qué falta en el caso abierto para avanzar al siguiente estatus. Formato checklist con ✅ pendiente y ⚡ urgente.',
    propuesta_borrador: 'MODO PROPUESTA: Sugiere borrador de propuesta basado en adeudos. Indica claramente "BORRADOR — revisar con administradora".',
    guion_llamada: 'MODO GUIÓN: Escribe guión natural para llamada o visita, corto, con apertura, puntos clave y cierre.',
    resumen_campana: 'MODO CAMPAÑAS: Analiza ROI, costo/prospecto, costo/firmado. Recomienda escalar, mantener o pausar campañas.',
    reporte_semanal: 'MODO REPORTE: Formato ejecutivo semanal con métricas, tendencias y 3 recomendaciones estratégicas.',
    resumen_hilo: 'MODO RESUMEN CHAT: Resume mensajes del caso: acuerdos, dudas pendientes, próximo paso para cada rol.',
    riesgos: 'MODO RIESGOS: Identifica riesgos por severidad (alto/medio/bajo) según adeudos, escrituras, invasión, estancamiento.',
    simulacion: 'MODO SIMULACIÓN: Proyecta impacto del escenario hipotético en pipeline, conversión y carga de trabajo.',
    prioridad_kanban: 'MODO PRIORIDAD: Ordena tareas/acciones sugeridas por urgencia real con razones breves.',
    score_cierre: 'MODO SCORE: Asigna probabilidad 0-100 de cierre con 3 razones basadas solo en datos disponibles.',
    guia_sistema: 'MODO GUÍA DEL SISTEMA: Explica paso a paso cómo usar Revive Hogar para la tarea que preguntan. Indica módulo del menú lateral, botones exactos y campos del formulario. Pasos numerados, lenguaje simple, adaptado al rol del usuario.',
    onboarding: 'MODO ONBOARDING: Tour de bienvenida para alguien nuevo en su rol: qué módulos ve, qué hace cada día, primeros 3 pasos para empezar hoy, y dónde está Aurora para ayuda.',
    chat: 'MODO CHAT: Responde la pregunta del usuario de forma útil y amigable. Si es sobre el sistema, incluye pasos concretos de navegación.'
};

function buildSystemPrompt(context, tipo) {
    const instruccion = INSTRUCCIONES_TIPO[tipo] || INSTRUCCIONES_TIPO.chat;
    let prompt = `${SISTEMA_LUNA}\n\n${instruccion}`;
    if (context) {
        prompt += `\n\nCONTEXTO ACTUAL (datos reales del sistema):\n${JSON.stringify(context, null, 2)}`;
    }
    return prompt;
}

function geminiHeaders(apiKey) {
    return { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey };
}

async function llamarGemini(apiKey, systemPrompt, contents) {
    let ultimoError = null;
    const body = JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
    });

    for (const modelo of MODELOS) {
        try {
            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`,
                { method: 'POST', headers: geminiHeaders(apiKey), body }
            );
            const data = await res.json();
            if (!res.ok) {
                ultimoError = data?.error?.message || `Error ${res.status} en ${modelo}`;
                continue;
            }
            const texto = extraerTextoGemini(data);
            if (texto) return { texto, modelo };
            ultimoError = data?.promptFeedback?.blockReason
                ? `Contenido bloqueado: ${data.promptFeedback.blockReason}`
                : 'Respuesta vacía del modelo';
        } catch (err) {
            ultimoError = err.message;
        }
    }
    throw new Error(ultimoError || 'No se pudo contactar a Gemini');
}

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(503).json({
            error: 'IA no configurada',
            mensaje: 'Agrega GEMINI_API_KEY en Vercel y redeploya.'
        });
    }

    try {
        const { message, history, context, tipo } = req.body || {};
        if (!message || typeof message !== 'string' || !message.trim()) {
            return res.status(400).json({ error: 'Mensaje requerido' });
        }

        const systemPrompt = buildSystemPrompt(context, tipo || 'chat');
        const contents = [];
        (history || []).slice(-12).forEach(h => {
            if (!h?.text) return;
            contents.push({
                role: h.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: String(h.text).slice(0, 4000) }]
            });
        });
        contents.push({ role: 'user', parts: [{ text: message.trim().slice(0, 4000) }] });

        const { texto, modelo } = await llamarGemini(apiKey, systemPrompt, contents);
        return res.status(200).json({ respuesta: texto, modelo });
    } catch (err) {
        console.error('Error IA:', err);
        return res.status(500).json({
            error: 'Error al generar respuesta',
            mensaje: mensajeErrorAmigable(err.message)
        });
    }
};

