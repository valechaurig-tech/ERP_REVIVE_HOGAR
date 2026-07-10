# Registro maestro — Revive Hogar

| ID | Fase | Qué | Quién | Planificado | Real inicio | Real fin | Estado |
|----|------|-----|-------|-------------|-------------|----------|--------|
| F0.1 | Visión | Definición de flujo y roles | Usuario + Agente | 2026-07-06 | 2026-07-06 | 2026-07-06 | hecho |
| F4.1 | Base | Estructura proyecto + UI rebrand | Agente | 2026-07-06 | 2026-07-06 | 2026-07-06 | hecho |
| F5.1 | Módulos | Marketing (campañas + prospectos) | Agente | 2026-07-06 | 2026-07-06 | 2026-07-06 | hecho |
| F5.2 | Módulos | Vendedor (seguimiento + registro) | Agente | 2026-07-06 | 2026-07-06 | 2026-07-06 | hecho |
| F5.3 | Módulos | Administradora (propuesta + docs) | Agente | 2026-07-06 | 2026-07-06 | 2026-07-06 | hecho |
| F5.4 | Módulos | Pipeline propiedades | Agente | 2026-07-06 | 2026-07-06 | 2026-07-06 | hecho |
| F5.5 | Módulos | Usuarios, alertas, auditoría | Agente | 2026-07-06 | 2026-07-06 | 2026-07-06 | hecho |
| F7.1 | Deploy | Vercel + Supabase dedicado | Agente | 2026-07-06 | 2026-07-06 | 2026-07-06 | hecho |
| F5.6 | Docs | Plantillas legales oficiales | Usuario | — | — | — | pendiente |
| F8.1 | UX | Detalle caso (tabs) + chat + planner Asana | Agente | 2026-07-06 | 2026-07-06 | 2026-07-06 | hecho |
| V1.0 | Release | **Baseline congelada — Revive Hogar V1** | — | 2026-07-06 | — | 2026-07-06 | **congelada** |
| V1.1 | IA | Chat asistente Gemini (flotante, contexto por rol) | Agente | 2026-07-06 | 2026-07-06 | — | en curso |

## Revive Hogar V1 — baseline (congelada 2026-07-06)

**URL producción:** https://revive-hogar.vercel.app

**Stack:** HTML/CSS/JS vanilla (SPA) · Vercel estático · Supabase `rh_records` · localStorage fallback `revive_hogar_`

**Módulos V1:**
- Login por rol (Oficina / Vendedores)
- Resumen Ejecutivo (Dirección)
- Marketing (campañas + prospectos)
- Mis Prospectos (Vendedor) + propiedades firmadas en pipeline
- Bandeja Administradora (expediente + propuesta)
- Propiedades / Pipeline
- Detalle del caso (modal con tabs: Resumen, Historial, Expediente, Comunicación)
- Planner Tareas y Alertas (kanban, prioridades, KPIs)
- Usuarios y vendedores
- Bitácora auditoría

**Supabase dedicado:** `bhmpagptbzajnzgumyka` · tabla `rh_records`

**Usuarios demo:** contraseña `1234` — Dirección, Marketing, Administradora, Vendedor 1, Vendedor 2

**Pendiente post-V1:** plantillas legales oficiales, realtime Supabase (opcional), capa IA estratégica

## Entradas

### [2026-07-06] F4.1 — Base del sistema
- **Qué:** Proyecto independiente `Revive_hogar` con misma interfaz que Operacion_Ventas_V1, paleta teal, lógica propia.
- **Quién:** Agente (implementación), Usuario (requisitos).
- **Entregable:** `index.html`, `css/app.css`, módulos JS, `vercel.json`, `supabase/schema.sql`.
- **Notas:** Sin compartir datos ni código de negocio con ERP-SELECTAS. Tabla `rh_records`, prefijo `revive_hogar_`.

### Usuarios demo (contraseña `1234`)
| Usuario | Rol |
|---------|-----|
| Dirección | Acceso total |
| Marketing | Campañas y asignación |
| Administradora | Propuestas, pipeline, usuarios |
| Vendedor 1 / 2 | Mis prospectos |
