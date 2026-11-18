ALTER TABLE fichas ADD COLUMN IF NOT EXISTS fotos jsonb NOT NULL DEFAULT '[]'::jsonb
  CHECK (jsonb_typeof(fotos)='array' AND jsonb_array_length(fotos)<=3 AND octet_length(fotos::text)<=1200100);
