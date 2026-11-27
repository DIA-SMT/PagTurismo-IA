/** Alojamientos (registro del Ente) y la dirección que organiza cada evento de la agenda. */
import { expect, test } from "@playwright/test";

import { CUENTAS, ingresar, sinDesbordeHorizontal } from "./ayudas";

test.describe("Alojamientos", () => {
  test("lista los hoteles por estrellas y los demás tipos, con la fuente @celular", async ({ page }) => {
    await page.goto("/alojamientos");
    await expect(page.getByRole("heading", { level: 1, name: "Alojamientos" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: /Hoteles de 5 estrellas/ })).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "Sheraton Tucuman" })).toBeVisible();
    await expect(page.getByText(/Registro de alojamientos del Ente Tucumán Turismo/)).toBeVisible();
    await sinDesbordeHorizontal(page);
  });

  test("filtra por tipo y está en el desplegable de Turismo", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.locator(".nav__desplegable .nav__enlace").hover();
    await page.locator(".nav__panel").getByRole("link", { name: /Alojamientos/ }).click();
    await expect(page).toHaveURL(/\/alojamientos$/);
    await page.getByRole("navigation", { name: "Tipo de alojamiento" }).getByRole("link", { name: "Hostels" }).click();
    await expect(page).toHaveURL(/tipo=hostel/);
    await expect(page.getByRole("heading", { level: 2, name: /Hoteles/ })).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 2, name: /Hostels/ })).toBeVisible();
  });

  test("existe en inglés y portugués", async ({ page }) => {
    await page.goto("/en/accommodation");
    await expect(page.getByRole("heading", { level: 1, name: "Accommodation" })).toBeVisible();
    await page.goto("/pt/hospedagem");
    await expect(page.getByRole("heading", { level: 1, name: "Hospedagem" })).toBeVisible();
  });
});

test.describe("Dirección que organiza", () => {
  test("la agenda filtra por dirección desde la URL", async ({ page }) => {
    await page.goto("/agenda?area=museos");
    await expect(page.getByLabel("Dirección", { exact: true }).first()).toHaveValue("museos");
  });

  test("el formulario de eventos del panel tiene el campo", async ({ page }) => {
    await ingresar(page, CUENTAS.cultura);
    await page.goto("/admin/eventos/nueva");
    await expect(page.getByLabel("Dirección que organiza")).toBeVisible();
  });
});
