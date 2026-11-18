ALTER TABLE presupuestos
  ADD COLUMN IF NOT EXISTS decision text
    CHECK (decision IN ('aceptado', 'rechazado')),
  ADD COLUMN IF NOT EXISTS fecha_decision timestamptz
    CHECK ((decision IS NULL) = (fecha_decision IS NULL));
