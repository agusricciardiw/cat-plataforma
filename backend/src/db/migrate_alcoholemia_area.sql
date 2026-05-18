-- Migration: agregar 'area' como tipo de acceso en os_alcoholemia_accesos
-- Aplicado en dev: 2026-05-15

ALTER TABLE os_alcoholemia_accesos
  DROP CONSTRAINT IF EXISTS os_alcoholemia_accesos_tipo_check;

ALTER TABLE os_alcoholemia_accesos
  ADD CONSTRAINT os_alcoholemia_accesos_tipo_check
  CHECK (tipo = ANY (ARRAY['base'::text, 'role'::text, 'profile'::text, 'grupo'::text, 'area'::text]));
