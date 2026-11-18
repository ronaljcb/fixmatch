import { NextResponse } from 'next/server';

export const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function session(request) {
  const value = request.cookies.get('fixmatch_session')?.value;
  return value && uuid.test(value) ? value : null;
}
export function json(data, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}
export function validOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    const url = new URL(origin);
    return ['http:', 'https:'].includes(url.protocol) && url.host === request.headers.get('host');
  } catch { return false; }
}
export function serverError(error) {
  console.error('Operación de fichas fallida', { code: error.code || 'database_error' });
  return json({ error: 'No se pudo guardar o cargar la información. Intenta de nuevo.' }, 503);
}
