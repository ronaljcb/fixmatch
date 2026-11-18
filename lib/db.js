import { neon } from "@neondatabase/serverless";

export function database() {
  if (!process.env.DATABASE_URL)
    throw new Error("Falta la configuración de la base de datos");
  return neon(process.env.DATABASE_URL);
}

export const fichaSelect = `f.id, f.numero::text, f.tipo_falla AS "tipoFalla", f.ubicacion,
  f.distrito, f.descripcion, f.estado, f.tecnico_id AS "tecnicoId",
  f.fecha_envio AS "fechaEnvio", f.fecha_creacion AS "fechaCreacion", t.nombre AS "tecnicoNombre"`;

export const presupuestoSelect = `CASE WHEN p.ficha_id IS NULL THEN NULL ELSE jsonb_build_object(
  'manoObra', p.mano_obra, 'materiales', p.materiales, 'visita', p.visita,
  'exclusiones', p.exclusiones, 'total', p.total, 'fechaEnvio', p.fecha_envio,
  'decision', p.decision, 'fechaDecision', p.fecha_decision
) END AS presupuesto`;
