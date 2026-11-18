import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { neon } from '@neondatabase/serverless';
import { mkdir } from 'node:fs/promises';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1080 } });
const page = await context.newPage();
page.setDefaultTimeout(15000);
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const sql = neon(process.env.DATABASE_URL);
const screenshots = process.env.TEST_SCREENSHOTS || '../output/fixmatch';
await mkdir(screenshots, { recursive: true });
try {
  await page.goto(process.env.TEST_BASE_URL || 'http://127.0.0.1:3000', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Revisar ficha', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Revisar ficha', exact: true }).click();
  await page.getByText('Completa los datos requeridos').waitFor();
  await page.getByRole('radio', { name: 'Goteo', exact: true }).check();
  await page.getByRole('radio', { name: 'Baño', exact: true }).check();
  await page.getByLabel('Distrito', { exact: false }).first().fill('Miraflores');
  await page.getByLabel('Detalle adicional').fill('El agua se filtra por la base del grifo.');
  const photo = Buffer.from(await page.evaluate(() => { const c = document.createElement('canvas'); c.width=100; c.height=100; const x=c.getContext('2d'); x.fillStyle='#2092bf'; x.fillRect(0,0,100,100); return c.toDataURL('image/png').split(',')[1]; }), 'base64');
  await page.getByLabel('Adjuntar fotos de la avería').setInputFiles({ name: 'fuga.png', mimeType: 'image/png', buffer: photo });
  await page.getByRole('button', { name: 'Quitar foto 1' }).waitFor();
  await page.screenshot({ path: `${screenshots}/01-formulario-desktop.png`, fullPage: true });
  await page.getByRole('button', { name: 'Revisar ficha', exact: true }).click();
  await page.getByRole('heading', { name: 'Revisa los datos ingresados' }).waitFor();
  await page.getByRole('button', { name: 'Editar datos' }).click();
  assert.equal(await page.getByLabel('Detalle adicional').inputValue(), 'El agua se filtra por la base del grifo.');
  await page.getByRole('button', { name: 'Revisar ficha', exact: true }).click();
  await page.screenshot({ path: `${screenshots}/02-revision.png`, fullPage: true });
  await page.getByRole('button', { name: 'Continuar a elegir técnico' }).click();
  const send = page.getByRole('button', { name: 'Selecciona un técnico', exact: true });
  await send.waitFor(); assert.equal(await send.isDisabled(), true);
  assert.equal(await page.getByRole('radio').count(), 6);
  await page.getByRole('radio').first().check();
  await page.screenshot({ path: `${screenshots}/03-tecnicos-desktop.png`, fullPage: true });
  // Un fallo de red mantiene el borrador y permite reintentar.
  await page.route('**/enviar', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'No se pudo guardar. Intenta de nuevo.' }) }));
  await page.getByRole('button', { name: 'Enviar ficha a Carlos' }).click();
  await page.getByRole('alert').filter({ hasText: 'No se pudo guardar' }).waitFor();
  await page.getByText('Borrador', { exact: true }).waitFor();
  await page.unroute('**/enviar');
  await page.getByRole('button', { name: 'Enviar ficha a Carlos' }).click();
  await page.getByRole('heading', { name: '¡Ficha enviada!' }).waitFor();
  await page.getByRole('button', { name: 'Ver mis fichas' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Ver envío' }).waitFor();
  await page.getByRole('button', { name: 'Ver envío' }).click();
  await page.getByAltText('Foto guardada de la avería 1').waitFor();
  const cookies = await context.cookies();
  const owner = cookies.find(c => c.name === 'fixmatch_session').value;
  const [stored] = await sql`SELECT estado, tecnico_id, jsonb_array_length(fotos) AS fotos FROM fichas WHERE sesion_id=${owner}::uuid`;
  assert.equal(stored.estado, 'Enviada'); assert.equal(stored.tecnico_id, 'TEC-01'); assert.equal(stored.fotos, 1);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${screenshots}/04-envio-mobile.png`, fullPage: true });
  await page.getByRole('button', { name: 'Ver mis fichas' }).click();
  await page.getByRole('button', { name: 'Nueva ficha' }).click();
  await page.screenshot({ path: `${screenshots}/05-formulario-mobile.png`, fullPage: true });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'La pantalla móvil no debe desbordarse');
  for (const width of [320, 360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Sin desbordamiento a ${width}px`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('radio', { name: 'Fuga', exact: true }).check();
  await page.getByRole('radio', { name: 'Cocina', exact: true }).check();
  await page.getByLabel('Distrito', { exact: false }).first().fill('San Miguel');
  await page.getByRole('button', { name: 'Revisar ficha', exact: true }).click();
  await page.screenshot({ path: `${screenshots}/06-revision-mobile.png`, fullPage: true });
  await page.getByRole('button', { name: 'Continuar a elegir técnico' }).click();
  await page.getByRole('radio').first().check();
  await page.screenshot({ path: `${screenshots}/07-tecnicos-mobile.png`, fullPage: true });
  for (const width of [320, 360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Técnicos sin desbordamiento a ${width}px`);
  }
  assert.deepEqual(errors, []);
  console.log('Flujo de navegador verificado: validación, fotos, revisión y edición, selección, error recuperable, envío, recarga y persistencia en Postgres. Sin errores de JavaScript ni desbordamiento móvil.');
} catch (error) {
  await page.screenshot({ path: `${screenshots}/failure.png`, fullPage: true });
  console.log(await page.locator('body').innerText());
  throw error;
} finally {
  const owner = (await context.cookies()).find(c => c.name === 'fixmatch_session')?.value;
  if (owner) await sql`DELETE FROM fichas WHERE sesion_id=${owner}::uuid`;
  await browser.close();
}
