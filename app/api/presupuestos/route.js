import { database, fichaSelect } from "../../../lib/db";
import { json, session, serverError } from "../../../lib/http";

// Acceso de demostración: solo fichas de la sesión actual, sin exponer otras sesiones.
export async function GET(request) {
  const owner = session(request);
  if (!owner) return json([]);
  try {
    const rows = await database().query(
      `SELECT ${fichaSelect},
      CASE WHEN p.ficha_id IS NULL THEN NULL ELSE jsonb_build_object(
        'manoObra',p.mano_obra,'materiales',p.materiales,'visita',p.visita,
        'exclusiones',p.exclusiones,'total',p.total,'fechaEnvio',p.fecha_envio) END AS presupuesto
      FROM fichas f JOIN tecnicos t ON t.id=f.tecnico_id
      LEFT JOIN presupuestos p ON p.ficha_id=f.id
      WHERE f.sesion_id=$1 AND f.estado='Enviada'
      ORDER BY f.fecha_envio DESC, f.numero DESC LIMIT 100`,
      [owner],
    );
    return json(rows);
  } catch (error) {
    return serverError(error);
  }
}
