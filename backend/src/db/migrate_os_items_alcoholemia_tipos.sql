-- Migration: agregar 'puesto' e 'itinerante' como tipos válidos de os_items
-- para soportar la estructura específica de OS alcoholemia.
-- Aplicado en dev: 2026-05-15
--
-- Mapeo conceptual:
--   - puesto      → equivale a 'servicio' pero específico para alcoholemia (control fijo)
--   - itinerante  → equivale a 'mision'   pero para recorridos itinerantes en alcoholemia

ALTER TABLE os_items
  DROP CONSTRAINT IF EXISTS os_items_tipo_check;

ALTER TABLE os_items
  ADD CONSTRAINT os_items_tipo_check
  CHECK (tipo = ANY (ARRAY['servicio'::text, 'mision'::text, 'puesto'::text, 'itinerante'::text]));
