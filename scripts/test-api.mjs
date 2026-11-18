import assert from 'node:assert/strict';
import { neon } from '@neondatabase/serverless';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const sql = neon(process.env.DATABASE_URL);
let cookie = '';
let owner;
async function request(path, body, ownCookie = cookie) {
  return fetch(`${base}${path}`, { headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(ownCookie ? { Cookie: ownCookie } : {}) }, ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}) });
}
try {
  const tecnicos = await (await request('/api/tecnicos')).json();
  assert.equal(tecnicos.length, 6);
  assert.ok(tecnicos.every(t => t.nombre && t.distrito && t.especialidad));
  const payload = { tipoFalla: 'goteo', ubicacion: 'Baño', distrito: 'Miraflores', descripcion: 'Prueba automática de integración', fotos: [] };
  assert.equal((await request('/api/fichas', { ...payload, distrito: '' })).status, 400);
  assert.equal((await request('/api/fichas', { ...payload, fotos: ['data:image/svg+xml;base64,PHN2Zz4='] })).status, 400);
  const created = await request('/api/fichas', payload);
  assert.equal(created.status, 201);
  cookie = created.headers.get('set-cookie').split(';')[0];
  owner = cookie.split('=')[1];
  const ficha = await created.json();
  assert.equal(ficha.estado, 'Borrador');
  assert.equal((await request(`/api/fichas/${ficha.id}`,'', '')).status, 404);
  assert.deepEqual(await (await request('/api/fichas','', '')).json(), []);
  assert.equal((await request(`/api/fichas/${ficha.id}/enviar`, { tecnicoId: 'inexistente' })).status, 400);
  const doubleSend = await Promise.all(['TEC-01','TEC-02'].map(tecnicoId => request(`/api/fichas/${ficha.id}/enviar`, { tecnicoId })));
  assert.deepEqual(doubleSend.map(r => r.status).sort(), [200,409]);
  const saved = (await (await request('/api/fichas')).json()).find(f => f.id === ficha.id);
  assert.equal(saved.estado, 'Enviada');
  assert.ok(saved.tecnicoId && saved.fechaEnvio && saved.tecnicoNombre);
  const [stored] = await sql`SELECT estado, tecnico_id, fecha_envio FROM fichas WHERE id=${ficha.id}`;
  assert.equal(stored.tecnico_id, saved.tecnicoId);
  assert.equal(stored.estado, 'Enviada');
  assert.ok(stored.fecha_envio);
  console.log('API y base verificadas: validación, seis técnicos, sesión aislada, envío concurrente único y persistencia.');
} finally {
  if (owner) await sql`DELETE FROM fichas WHERE sesion_id=${owner}::uuid`;
}
