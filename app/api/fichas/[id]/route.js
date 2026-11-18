import { database, fichaSelect, presupuestoSelect } from "../../../../lib/db";
import { json, session, uuid, serverError } from "../../../../lib/http";

export async function GET(request, { params }) {
  const owner = session(request);
  const { id } = await params;
  if (!owner || !uuid.test(id))
    return json({ error: "No se encontró la ficha." }, 404);
  try {
    const [ficha] = await database().query(
      `SELECT ${fichaSelect}, f.fotos, ${presupuestoSelect}
      FROM fichas f LEFT JOIN tecnicos t ON t.id=f.tecnico_id
      LEFT JOIN presupuestos p ON p.ficha_id=f.id
      WHERE f.id=$1 AND f.sesion_id=$2`,
      [id, owner],
    );
    return ficha
      ? json(ficha)
      : json({ error: "No se encontró la ficha." }, 404);
  } catch (error) {
    return serverError(error);
  }
}
