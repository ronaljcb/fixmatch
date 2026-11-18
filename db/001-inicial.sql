CREATE TABLE IF NOT EXISTS tecnicos (
  id text PRIMARY KEY,
  nombre text NOT NULL,
  distrito text NOT NULL,
  especialidad text NOT NULL,
  tipos_falla jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS fichas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  sesion_id uuid NOT NULL,
  tipo_falla text NOT NULL CHECK (tipo_falla IN ('fuga','goteo','baja_presion','atoro')),
  ubicacion text NOT NULL CHECK (ubicacion IN ('Cocina','Baño','Lavandería')),
  distrito text NOT NULL CHECK (length(distrito) BETWEEN 2 AND 80),
  descripcion text NOT NULL DEFAULT '' CHECK (length(descripcion) <= 500),
  estado text NOT NULL DEFAULT 'Borrador' CHECK (estado IN ('Borrador','Enviada')),
  tecnico_id text REFERENCES tecnicos(id),
  fecha_envio timestamptz,
  fecha_creacion timestamptz NOT NULL DEFAULT now(),
  CHECK ((estado = 'Borrador' AND tecnico_id IS NULL AND fecha_envio IS NULL)
    OR (estado = 'Enviada' AND tecnico_id IS NOT NULL AND fecha_envio IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS fichas_sesion_fecha ON fichas(sesion_id, fecha_creacion DESC);
