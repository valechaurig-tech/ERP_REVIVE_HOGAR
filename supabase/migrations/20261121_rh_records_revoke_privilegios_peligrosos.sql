-- Revive Hogar / 2026-11-21.
-- Reducción segura de permisos de DDL destructivos del cliente.
-- Aplicado y verificado en producción. No revoca CRUD que todavía usa la app.
revoke truncate, references, trigger on table public.rh_records from anon, authenticated;
-- IMPORTANTE: El CRUD anónimo de rh_records sigue abierto por compatibilidad
-- con el frontend actual y se debe migrar a API protegida con sesión ERP.
-- Nunca confundir esta migración con cierre total de la seguridad.
