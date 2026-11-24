/** Mapa interactivo propio (sin salir del portal). En las pruebas no se consulta el mapa municipal ni las teselas. */
import { expect, test } from "@playwright/test";

import { sinDesbordeHorizontal } from "./ayudas";

test.describe("Mapa interactivo", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/tile.openstreetmap.org/**", (r) => r.abort());
  });

  test("se ve dentro del portal, con capas, búsqueda y aviso si el mapa municipal no responde @celular", async ({ page }) => {
    await page.goto("/mapa");
    await expect(page.getByRole("heading", { level: 1, name: "Mapa interactivo" })).toBeVisible();
    await expect(page.locator(".mapa-aviso")).toContainText("no responde");
    await expect(page.locator(".leaflet-container")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Lugares en el mapa/ })).toBeVisible();
    await page.getByLabel("Buscar en el mapa").fill("teatro");
    await expect(page).toHaveURL(/q=teatro/);
    await sinDesbordeHorizontal(page);
  });

  test("la portada y el pie llevan al mapa del portal, no a otro sitio", async ({ page, request }) => {
    await page.goto("/");
    const enlaces = page.locator('a[href="/mapa"]');
    expect(await enlaces.count()).toBeGreaterThanOrEqual(2);
    expect(await page.locator('a[href="https://mapa.smt.gob.ar/"]').count()).toBe(0);
    const r = await request.get("/api/mapa?idioma=en");
    expect(r.ok()).toBeTruthy();
    const datos = await r.json();
    expect(datos.municipal).toBe(false);
    expect(Array.isArray(datos.capas)).toBeTruthy();
    expect((await page.goto("/en/map"))?.status()).toBe(200);
  });
});
