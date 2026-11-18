import { database, fichaSelect } from "../../../../../lib/db";
import {
  json,
  session,
  uuid,
  serverError,
  validOrigin,
} from "../../../../../lib/http";

export async function POST(request, { params }) {
  if (!validOrigin(request))
    return json({ error: "Origen no permitido." }, 403);
  const owner = session(request);
  if (!owner)
    return json(
      { error: "No se encontró tu sesión. Vuelve a crear una ficha." },
      401,
    );
  const { id } = await params;
  if (!uuid.test(id)) return json({ error: "Ficha inválida." }, 400);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Datos inválidos." }, 400);
  }
  if (
    !body ||
    typeof body.tecnicoId !== "string" ||
    !/^TEC-0[1-6]$/.test(body.tecnicoId)
  )
    return json({ error: "Elige un técnico válido." }, 400);
  try {
    const sql = database();
    // Una sola operación condicional: dos solicitudes simultáneas no pueden reenviar la ficha.
    const rows =
      await sql`UPDATE fichas SET estado='Enviada', tecnico_id=${body.tecnicoId}, fecha_envio=now()
      WHERE id=${id} AND sesion_id=${owner} AND estado='Borrador'
      AND EXISTS (SELECT 1 FROM tecnicos WHERE id=${body.tecnicoId}) RETURNING id`;
    if (!rows.length) {
      const [existing] =
        await sql`SELECT estado FROM fichas WHERE id=${id} AND sesion_id=${owner}`;
      return json(
        {
          error: existing
            ? "Esta ficha ya fue enviada. Puedes verla en Mis fichas."
            : "No se encontró la ficha.",
        },
        existing ? 409 : 404,
      );
    }
    const [ficha] = await sql.query(
      `SELECT ${fichaSelect} FROM fichas f JOIN tecnicos t ON t.id=f.tecnico_id WHERE f.id=$1 AND f.sesion_id=$2`,
      [id, owner],
    );
    return json(ficha);
  } catch (error) {
    return serverError(error);
  }
}
