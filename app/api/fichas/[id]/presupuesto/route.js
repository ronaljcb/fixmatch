import { database } from "../../../../../lib/db";
import {
  json,
  session,
  uuid,
  validOrigin,
  serverError,
} from "../../../../../lib/http";
import { validarPresupuesto, centimos } from "../../../../../lib/presupuesto";

export async function POST(request, { params }) {
  if (!validOrigin(request))
    return json({ error: "Origen no permitido." }, 403);
  const owner = session(request);
  if (!owner)
    return json({ error: "No se encontró tu sesión de prueba." }, 401);
  const { id } = await params;
  if (!uuid.test(id)) return json({ error: "Ficha inválida." }, 400);
  if (Number(request.headers.get("content-length")) > 10000)
    return json({ error: "El presupuesto es demasiado largo." }, 413);
  let data;
  try {
    data = await request.json();
  } catch {
    return json({ error: "Datos inválidos." }, 400);
  }
  const errors = validarPresupuesto(data);
  if (Object.keys(errors).length)
    return json(
      { error: "Revisa las cuatro partidas obligatorias.", fields: errors },
      400,
    );
  try {
    const sql = database();
    const [ficha] =
      await sql`SELECT estado FROM fichas WHERE id=${id} AND sesion_id=${owner}`;
    if (!ficha) return json({ error: "No se encontró la ficha." }, 404);
    if (ficha.estado !== "Enviada")
      return json(
        { error: "Solo puedes presupuestar una ficha enviada." },
        409,
      );
    const [saved] =
      await sql`INSERT INTO presupuestos (ficha_id,mano_obra,materiales,visita,exclusiones)
      SELECT id,${centimos(data.manoObra)},${centimos(data.materiales)},${centimos(data.visita)},${data.exclusiones.trim()}
      FROM fichas WHERE id=${id} AND sesion_id=${owner} AND estado='Enviada'
      ON CONFLICT (ficha_id) DO NOTHING
      RETURNING mano_obra AS "manoObra",materiales,visita,exclusiones,total,fecha_envio AS "fechaEnvio"`;
    if (!saved)
      return json(
        {
          error:
            "Esta ficha ya tiene un presupuesto enviado. Actualiza la lista para verlo.",
        },
        409,
      );
    return json(saved, 201);
  } catch (error) {
    return serverError(error);
  }
}
