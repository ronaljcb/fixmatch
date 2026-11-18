import { neon } from '@neondatabase/serverless';
import { readFile } from 'node:fs/promises';

if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL');
const sql = neon(process.env.DATABASE_URL);
const migration = await readFile(new URL('../db/001-inicial.sql', import.meta.url), 'utf8');
// Esta migración inicial no contiene funciones ni literales con punto y coma.
await sql.transaction(migration.split(';').filter(s => s.trim()).map(s => sql.query(s)));
const photos = await readFile(new URL('../db/002-fotos.sql', import.meta.url), 'utf8');
await sql.transaction(photos.split(';').filter(s => s.trim()).map(s => sql.query(s)));
const tecnicos = JSON.parse(await readFile(new URL('../datos/tecnicos.json', import.meta.url), 'utf8'));
await sql.transaction(tecnicos.map(t => sql`
  INSERT INTO tecnicos (id, nombre, distrito, especialidad, tipos_falla)
  VALUES (${t.id}, ${t.nombre}, ${t.distrito}, ${t.especialidad}, ${JSON.stringify(t.tiposFalla)}::jsonb)
  ON CONFLICT (id) DO UPDATE SET nombre=EXCLUDED.nombre, distrito=EXCLUDED.distrito,
    especialidad=EXCLUDED.especialidad, tipos_falla=EXCLUDED.tipos_falla
`));
const [{ cantidad }] = await sql`SELECT count(*)::int AS cantidad FROM tecnicos`;
console.log(`Base preparada: ${cantidad} técnicos. Las fichas existentes se conservan.`);
