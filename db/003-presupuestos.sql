CREATE TABLE IF NOT EXISTS presupuestos (
  ficha_id uuid PRIMARY KEY REFERENCES fichas(id) ON DELETE CASCADE,
  mano_obra integer NOT NULL CHECK (mano_obra BETWEEN 0 AND 100000000),
  materiales integer NOT NULL CHECK (materiales BETWEEN 0 AND 100000000),
  visita integer NOT NULL CHECK (visita BETWEEN 0 AND 100000000),
  exclusiones text NOT NULL CHECK (length(trim(exclusiones)) BETWEEN 1 AND 1000),
  total integer GENERATED ALWAYS AS (mano_obra + materiales + visita) STORED,
  fecha_envio timestamptz NOT NULL DEFAULT now()
);
