import { database } from '../../../lib/db';
import { json, serverError } from '../../../lib/http';

export async function GET() {
  try {
    const data = await database()`SELECT id, nombre, distrito, especialidad, tipos_falla AS "tiposFalla" FROM tecnicos ORDER BY id`;
    return json(data);
  } catch (error) { return serverError(error); }
}
