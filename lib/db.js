import { neon } from "@neondatabase/serverless";

export function database() {
  if (!process.env.DATABASE_URL)
    throw new Error("Falta la configuración de la base de datos");
  return neon(process.env.DATABASE_URL);
}

export const fichaSelect = `f.id, f.numero::text, f.tipo_falla AS "tipoFalla", f.ubicacion,
  f.distrito, f.descripcion, f.estado, f.tecnico_id AS "tecnicoId",
  f.fecha_envio AS "fechaEnvio", f.fecha_creacion AS "fechaCreacion", t.nombre AS "tecnicoNombre"`;
