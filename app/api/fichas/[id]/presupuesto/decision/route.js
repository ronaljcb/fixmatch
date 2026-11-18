import { database } from "@/lib/db";
import { json, session, uuid, validOrigin, serverError } from "@/lib/http";
import { estadosDecision } from "@/lib/presupuesto";

export async function POST(request, { params }) {
  if (!validOrigin(request))
    return json({ error: "Origen no permitido." }, 403);
  const owner = session(request);
  if (!owner)
    return json({ error: "No se encontró tu sesión de prueba." }, 401);
  const { id } = await params;
  if (!uuid.test(id)) return json({ error: "Ficha inválida." }, 400);
  if (Number(request.headers.get("content-length")) > 1000)
    return json({ error: "Los datos de la decisión son demasiado largos." }, 413);

  let data;
  try {
    data = await request.json();
  } catch {
    return json({ error: "Datos inválidos." }, 400);
  }
  const decision = data?.decision;
  if (typeof decision !== "string" || !Object.hasOwn(estadosDecision, decision))
    return json({ error: "Elige si aceptas o rechazas el presupuesto." }, 400);

  try {
    const sql = database();
    const [saved] = await sql`
      UPDATE presupuestos p
      SET decision=${decision}, fecha_decision=now()
      FROM fichas f
      WHERE p.ficha_id=f.id AND f.id=${id} AND f.sesion_id=${owner}
        AND p.decision IS NULL
      RETURNING p.decision, p.fecha_decision AS "fechaDecision"`;
    if (saved) return json(saved);

    const [existing] = await sql`
      SELECT p.decision, p.fecha_decision AS "fechaDecision"
      FROM presupuestos p JOIN fichas f ON f.id=p.ficha_id
      WHERE f.id=${id} AND f.sesion_id=${owner}`;
    if (!existing) return json({ error: "No se encontró el presupuesto." }, 404);
    if (existing.decision === decision) return json(existing);
    return json(
      { error: "Este presupuesto ya tiene una decisión registrada." },
      409,
    );
  } catch (error) {
    return serverError(error);
  }
}
