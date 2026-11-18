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
  const photo = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 16;
    canvas.height = 16;
    return canvas.toDataURL("image/png");
  });
  const created = await post("/api/fichas", {
    tipoFalla: "fuga",
    ubicacion: "Cocina",
    distrito: "Miraflores",
    descripcion: "Prueba de presupuesto",
    fotos: [photo],
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
      assert.equal(
        (await outsider.request.get(`${base}/api/fichas/${f.id}`)).status(),
        404,
      );
      assert.equal(
        (await outsider.request.post(`${base}/api/fichas/${f.id}/presupuesto/decision`, {
          data: { decision: "aceptado" },
        })).status(),
        404,
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
  await page.getByRole("heading", { name: "Detalle de la ficha" }).waitFor();
  await page.getByText("Prueba de presupuesto", { exact: true }).waitFor();
  const savedPhoto = page.getByRole("img", { name: "Foto de la avería 1" });
  await savedPhoto.waitFor();
  assert.equal(await savedPhoto.getAttribute("src"), photo);
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
  await page.getByRole("link", { name: "Mis fichas" }).click();
  await page.getByText("Presupuesto recibido", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Ver presupuesto" }).click();
  await page.getByRole("heading", { name: "Presupuesto recibido" }).waitFor();
  const receipt = page.getByRole("region", { name: "Detalle del presupuesto" });
  for (const value of ["S/ 120.00", "S/ 85.50", "S/ 30.00", "S/ 235.50", budget.exclusiones])
    await receipt.getByText(value, { exact: true }).waitFor();
  for (const width of [320, 360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `Sin desbordamiento en el presupuesto recibido a ${width}px`,
    );
  }
  const decisionPath = `/api/fichas/${f.id}/presupuesto/decision`;
  assert.equal((await post(decisionPath, { decision: "constructor" })).status(), 400);
  const outsiderDecision = await browser.newContext();
  try {
    const response = await outsiderDecision.request.post(`${base}${decisionPath}`, {
      data: { decision: "rechazado" },
    });
    assert.equal(response.status(), 401);
  } finally {
    await outsiderDecision.close();
  }
  await page.getByRole("button", { name: "Aceptar presupuesto" }).click();
  await page.getByRole("heading", { name: "Presupuesto aceptado" }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Rechazar presupuesto" }).count(), 0);
  const retry = await post(decisionPath, { decision: "aceptado" });
  assert.equal(retry.status(), 200);
  const accepted = await retry.json();
  assert.equal(accepted.decision, "aceptado");
  assert.ok(accepted.fechaDecision);
  assert.equal((await post(decisionPath, { decision: "rechazado" })).status(), 409);
  assert.equal((await post(`/api/fichas/${f.id}/presupuesto`, budget)).status(), 409);

  async function createQuote(description) {
    const response = await post("/api/fichas", {
      tipoFalla: "atoro",
      ubicacion: "Lavandería",
      distrito: "Lince",
      descripcion: description,
    });
    assert.equal(response.status(), 201);
    const ficha = await response.json();
    assert.equal((await post(`/api/fichas/${ficha.id}/enviar`, { tecnicoId: "TEC-01" })).status(), 200);
    assert.equal((await post(`/api/fichas/${ficha.id}/presupuesto`, budget)).status(), 201);
    return ficha;
  }

  const second = await createQuote("Presupuesto para rechazar");
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByText("Presupuesto aceptado", { exact: true }).waitFor();
  const secondNumber = `FM-${String(second.numero).padStart(4, "0")}`;
  await page
    .getByRole("article")
    .filter({ hasText: secondNumber })
    .getByRole("button", { name: "Ver presupuesto" })
    .click();
  await page.getByRole("button", { name: "Rechazar presupuesto" }).click();
  await page.getByRole("heading", { name: "Presupuesto rechazado" }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Aceptar presupuesto" }).count(), 0);

  const concurrent = await createQuote("Presupuesto con decisiones simultáneas");
  const concurrentPath = `/api/fichas/${concurrent.id}/presupuesto/decision`;
  const outcomes = await Promise.all([
    post(concurrentPath, { decision: "aceptado" }),
    post(concurrentPath, { decision: "rechazado" }),
  ]);
  assert.deepEqual(outcomes.map((response) => response.status()).sort(), [200, 409]);
  const winner = await outcomes.find((response) => response.ok()).json();
  const detail = await context.request.get(`${base}/api/fichas/${concurrent.id}`);
  assert.equal((await detail.json()).presupuesto.decision, winner.decision);

  assert.deepEqual(jsErrors, []);
  console.log(
    "Presupuesto verificado: formulario, detalle con fotos, vista del arrendatario, aceptación y rechazo, aislamiento, concurrencia y móvil a 320/360/390/430 px.",
  );
} catch (error) {
  await page.screenshot({ path: `${screenshots}/error.png`, fullPage: true });
  throw error;
} finally {
  if (owner) await sql`DELETE FROM fichas WHERE sesion_id=${owner}::uuid`;
  await browser.close();
}
