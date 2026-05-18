-- Migration: agregar columna 'sentido' a os_items para puestos de alcoholemia
-- Aplicado en dev: 2026-05-15

ALTER TABLE os_items
  ADD COLUMN IF NOT EXISTS sentido TEXT;

ALTER TABLE os_items
  DROP CONSTRAINT IF EXISTS os_items_sentido_check;

ALTER TABLE os_items
  ADD CONSTRAINT os_items_sentido_check
  CHECK (sentido IS NULL OR sentido = ANY (ARRAY['norte'::text,'sur'::text,'este'::text,'oeste'::text,'ambos'::text]));
