/** Museos y centros culturales: el menú, el aviso de los lunes, los borradores ocultos al público y las fichas. */
import { expect, test } from "@playwright/test";

import { CUENTAS, ingresar, sinDesbordeHorizontal } from "./ayudas";

test.describe("Museos y centros culturales", () => {
  test("Museos está en el menú, avisa que los lunes cierran y no muestra borradores al público @celular", async ({ page }) => {
    await page.goto("/");
    if ((page.viewportSize()?.width ?? 1280) < 1152) {
      // En el celular el menú está detrás del botón.
      await page.getByRole("button", { name: "Menú" }).click();
      await page.locator(".panel-movil").getByRole("link", { name: "Museos" }).click();
    } else {
      await page.locator(".nav").getByRole("link", { name: "Museos" }).click();
    }
    await expect(page).toHaveURL(/\/museos$/);
    await expect(page.getByRole("heading", { level: 1, name: "Museos" })).toBeVisible();
    await expect(page.getByRole("note")).toContainText("lunes");
    // El Museo Escultórico está publicado; la Casa Museo de la Ciudad es un borrador.
    await expect(page.getByRole("heading", { name: "Museo Escultórico a Cielo Abierto" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Casa Museo de la Ciudad" })).toHaveCount(0);
    await sinDesbordeHorizontal(page);
  });

  test("la ficha de un museo vuelve a Museos y repite el aviso de los lunes", async ({ page }) => {
    await page.goto("/museos");
    await page.getByRole("heading", { name: "Museo Escultórico a Cielo Abierto" }).getByRole("link").click();
    await expect(page).toHaveURL(/\/lugares\/museo-escultorico$/);
    await expect(page.getByRole("navigation", { name: "Estás en" }).getByRole("link", { name: "Museos" })).toHaveAttribute("href", "/museos");
    await expect(page.locator(".panel-practico").getByRole("note")).toContainText("lunes");
  });

  test("el equipo ve los museos municipales en borrador, marcados", async ({ page }) => {
    await ingresar(page, CUENTAS.superadmin);
    await page.goto("/museos");
    const municipales = page.locator("section", { has: page.getByRole("heading", { name: "Museos municipales" }) });
    await expect(municipales.getByRole("heading", { name: "Casa Museo de la Ciudad" })).toBeVisible();
    await expect(municipales.locator(".marca--borrador").first()).toBeVisible();
  });

  test("Centros culturales explica cómo anotarse y lleva a los talleres", async ({ page }) => {
    await page.goto("/centros-culturales");
    await expect(page.getByRole("heading", { level: 1, name: "Centros culturales" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "¿Cómo me anoto a un taller?" })).toBeVisible();
    await page.getByRole("link", { name: "Ver todos los talleres" }).click();
    await expect(page).toHaveURL(/\/talleres$/);
  });

  test("existen en inglés y portugués", async ({ page }) => {
    await page.goto("/en/museums");
    await expect(page.getByRole("heading", { level: 1, name: "Museums" })).toBeVisible();
    await page.goto("/pt/centros-culturais");
    await expect(page.getByRole("heading", { level: 1, name: "Centros culturais" })).toBeVisible();
  });
});
