import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { neon } from "@neondatabase/serverless";
import { mkdir } from "node:fs/promises";
import { centimos, validarPresupuesto } from "../lib/presupuesto.js";

const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const sql = neon(process.env.DATABASE_URL);
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1080 },
});
const page = await context.newPage();
page.setDefaultTimeout(20000);
const screenshots = process.env.TEST_SCREENSHOTS || "../output/fixmatch-h3";
await mkdir(screenshots, { recursive: true });
const jsErrors = [];
page.on("pageerror", (e) => jsErrors.push(e.message));
const post = (path, data) => context.request.post(`${base}${path}`, { data });
const budget = {
  manoObra: "120",
  materiales: "85,50",
  visita: "30",
  exclusiones: "No incluye pintura ni retiro de escombros.",
};
let owner;
try {
  assert.equal(centimos("0.10") + centimos("0.20"), 30);
  for (const bad of ["", "-1", "1e2", "NaN", "1.234", "1000000.01", 10, null])
    assert.equal(centimos(bad), null);
  assert.equal(centimos("0"), 0);
  assert.deepEqual(
    validarPresupuesto({
      manoObra: "0",
      materiales: "0",
      visita: "0",
      exclusiones: "Ninguna",
    }),
    {},
  );
  const created = await post("/api/fichas", {
    tipoFalla: "fuga",
    ubicacion: "Cocina",
    distrito: "Miraflores",
    descripcion: "Prueba de presupuesto",
  });
  assert.equal(created.status(), 201);
  const f = await created.json();
  owner = (await context.cookies()).find(
    (c) => c.name === "fixmatch_session",
  )?.value;
  assert.equal(
    (await post(`/api/fichas/${f.id}/presupuesto`, budget)).status(),
    409,
  );
  await post(`/api/fichas/${f.id}/enviar`, { tecnicoId: "TEC-01" });
  for (const bad of [
    { ...budget, materiales: "" },
    { ...budget, exclusiones: " " },
    { ...budget, visita: "-1" },
  ])
    assert.equal(
      (await post(`/api/fichas/${f.id}/presupuesto`, bad)).status(),
      400,
    );
  const outsider = await browser.newContext();
  try {
    const foreign = await outsider.request.post(`${base}/api/fichas`, {
      data: { tipoFalla: "goteo", ubicacion: "Baño", distrito: "Lince" },
    });
    const foreignOwner = (await outsider.cookies()).find(
      (c) => c.name === "fixmatch_session",
    )?.value;
    try {
      assert.equal(foreign.status(), 201);
      assert.equal(
        (
          await outsider.request.post(
            `${base}/api/fichas/${f.id}/presupuesto`,
            { data: budget },
          )
        ).status(),
        404,
      );
      assert.deepEqual(
        await (await outsider.request.get(`${base}/api/presupuestos`)).json(),
        [],
      );
    } finally {
      if (foreignOwner)
        await sql`DELETE FROM fichas WHERE sesion_id=${foreignOwner}::uuid`;
    }
  } finally {
    await outsider.close();
  }
  await page.goto(`${base}/presupuestos`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Preparar presupuesto" }).click();
  await page.screenshot({
    path: `${screenshots}/01-formulario-vacio.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Enviar presupuesto", exact: true })
    .click();
  await page
    .getByRole("alert")
    .filter({ hasText: "revisa 4 partidas" })
    .waitFor();
  await page.screenshot({
    path: `${screenshots}/02-validacion.png`,
    fullPage: true,
  });
  await page.getByLabel("1. Mano de obra").fill("120.00");
  await page.getByLabel("2. Materiales").fill("85,50");
  await page.getByLabel("3. Visita técnica").fill("30");
  await page.getByLabel("4. Exclusiones").fill(budget.exclusiones);
  assert.equal(
    await page.getByTestId("presupuesto-total").innerText(),
    "S/ 235.50",
  );
  await page.screenshot({
    path: `${screenshots}/03-formulario-desktop.png`,
    fullPage: true,
  });
  for (const width of [320, 360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Sin desbordamiento a ${width}px`,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: `${screenshots}/04-formulario-mobile.png`,
    fullPage: true,
  });
  await page.route("**/presupuesto", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "No se pudo enviar. Intenta de nuevo." }),
    }),
  );
  await page
    .getByRole("button", { name: "Enviar presupuesto", exact: true })
    .click();
  await page
    .getByText("No se pudo enviar. Intenta de nuevo.", { exact: true })
    .waitFor();
  assert.equal(await page.getByLabel("2. Materiales").inputValue(), "85,50");
  await page.unroute("**/presupuesto");
  await page
    .getByRole("button", { name: "Enviar presupuesto", exact: true })
    .click();
  await page.getByRole("heading", { name: "Presupuesto enviado" }).waitFor();
  assert.equal(
    (await post(`/api/fichas/${f.id}/presupuesto`, budget)).status(),
    409,
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Ver presupuesto" }).click();
  assert.equal(
    await page.getByTestId("presupuesto-total").innerText(),
    "S/ 235.50",
  );
  assert.ok(await page.getByLabel("1. Mano de obra").isDisabled());
  const [saved] =
    await sql`SELECT total,materiales FROM presupuestos WHERE ficha_id=${f.id}`;
  assert.equal(saved.total, 23550);
  assert.equal(saved.materiales, 8550);
  assert.deepEqual(jsErrors, []);
  console.log(
    "H3 verificada: cuatro campos obligatorios, cero válido, coma decimal, total exacto, sesión aislada, error recuperable, guardado único, recarga y móvil a 320/360/390/430 px.",
  );
} catch (error) {
  await page.screenshot({ path: `${screenshots}/error.png`, fullPage: true });
  throw error;
} finally {
  if (owner) await sql`DELETE FROM fichas WHERE sesion_id=${owner}::uuid`;
  await browser.close();
}
