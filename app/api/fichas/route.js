import { randomUUID } from "node:crypto";
import { database, fichaSelect } from "../../../lib/db";
import { json, session, serverError, validOrigin } from "../../../lib/http";
import { validPhotos } from "../../../lib/validation";

export async function GET(request) {
  const owner = session(request);
  if (!owner) return json([]);
  try {
    return json(
      await database().query(
        `SELECT ${fichaSelect} FROM fichas f LEFT JOIN tecnicos t ON t.id=f.tecnico_id WHERE f.sesion_id=$1 ORDER BY f.fecha_creacion DESC LIMIT 100`,
        [owner],
      ),
    );
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request) {
  if (!validOrigin(request))
    return json({ error: "Origen no permitido." }, 403);
  if (Number(request.headers.get("content-length")) > 1300000)
    return json({ error: "Las fotos son demasiado grandes." }, 413);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Datos inválidos." }, 400);
  }
  if (
    !body ||
    !["fuga", "goteo", "baja_presion", "atoro"].includes(body.tipoFalla) ||
    !["Cocina", "Baño", "Lavandería"].includes(body.ubicacion) ||
    typeof body.distrito !== "string" ||
    body.distrito.trim().length < 2 ||
    body.distrito.trim().length > 80 ||
    (body.descripcion !== undefined &&
      (typeof body.descripcion !== "string" ||
        body.descripcion.length > 500)) ||
    !validPhotos(body.fotos ?? [])
  ) {
    return json(
      {
        error:
          "Completa el tipo de falla, la ubicación y el distrito. La descripción admite hasta 500 caracteres.",
      },
      400,
    );
  }
  const owner = session(request) || randomUUID();
  try {
    const sql = database();
    const [{ total }] =
      await sql`SELECT count(*)::int AS total FROM fichas WHERE sesion_id=${owner}`;
    if (total >= 100)
      return json(
        { error: "Esta sesión ya alcanzó las 100 fichas de prueba." },
        429,
      );
    const [ficha] =
      await sql`INSERT INTO fichas (sesion_id,tipo_falla,ubicacion,distrito,descripcion,fotos)
      VALUES (${owner},${body.tipoFalla},${body.ubicacion},${body.distrito.trim()},${body.descripcion?.trim() || ""},${JSON.stringify(body.fotos ?? [])}::jsonb)
      RETURNING id, numero::text, tipo_falla AS "tipoFalla", ubicacion, distrito, descripcion, estado,
      tecnico_id AS "tecnicoId", fecha_envio AS "fechaEnvio", fecha_creacion AS "fechaCreacion"`;
    const response = json({ ...ficha, fotos: body.fotos ?? [] }, 201);
    response.cookies.set("fixmatch_session", owner, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (error) {
    return serverError(error);
  }
}
