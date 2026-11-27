/** Programas de Gestión Cultural: menú, los dos programas con sus datos, cómo ser parte y los otros idiomas. */
import { expect, test } from "@playwright/test";

import { sinDesbordeHorizontal } from "./ayudas";

test.describe("Programas", () => {
  test("Programas está en el menú y muestra Crear Encuentro y Cultura Joven @celular", async ({ page }) => {
    await page.goto("/");
    if ((page.viewportSize()?.width ?? 1280) < 1152) {
      await page.getByRole("button", { name: "Menú" }).click();
      await page.locator(".panel-movil").getByRole("link", { name: "Programas", exact: true }).click();
    } else {
      await page.locator(".nav").getByRole("link", { name: "Programas" }).click();
    }
    await expect(page).toHaveURL(/\/programas$/);
    await expect(page.getByRole("heading", { level: 2, name: "Crear Encuentro" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Cultura Joven" })).toBeVisible();
    await expect(page.locator(".programa__cifras")).toContainText("22.003");
    await expect(page.getByText("Las juventudes crean cultura, construyen comunidad y transforman la ciudad.")).toBeVisible();
    await expect(page.getByRole("link", { name: /Seguilos en Instagram/ })).toHaveAttribute("href", "https://www.instagram.com/esquinas.hiphop/");
    await expect(page.getByRole("heading", { name: "Cómo ser parte" })).toBeVisible();
    await expect(page.getByText("9 de Julio 720")).toBeVisible();
    await sinDesbordeHorizontal(page);
  });

  test("el índice lleva a cada programa", async ({ page }) => {
    await page.goto("/programas");
    await page.locator(".programas__indice").getByRole("link", { name: /Cultura Joven/ }).click();
    await expect(page).toHaveURL(/#cultura-joven$/);
    await expect(page.getByRole("heading", { level: 2, name: "Cultura Joven" })).toBeInViewport();
  });

  test("Centros culturales enlaza a los programas y existe en inglés y portugués", async ({ page }) => {
    await page.goto("/centros-culturales");
    await page.getByRole("link", { name: "Ver los programas" }).click();
    await expect(page).toHaveURL(/\/programas$/);
    await page.goto("/en/programs");
    await expect(page.getByRole("heading", { level: 1, name: "Programs" })).toBeVisible();
    await page.goto("/pt/programas");
    await expect(page.getByRole("heading", { level: 2, name: "Cultura Joven" })).toBeVisible();
  });
});
