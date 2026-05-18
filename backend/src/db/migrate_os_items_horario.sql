-- Migration: agregar horario por item (relevante para OS alcoholemia)
-- Aplicado en dev: 2026-05-15

ALTER TABLE os_items
  ADD COLUMN IF NOT EXISTS hora_inicio TIME,
  ADD COLUMN IF NOT EXISTS hora_fin    TIME;
