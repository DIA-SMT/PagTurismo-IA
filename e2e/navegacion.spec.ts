/** Menú principal del portal de Cultura: Agenda y Talleres arriba, y el desplegable de Turismo (mouse, teclado y celular). */
import { expect, test } from "@playwright/test";

test.describe("Navegación", () => {
  test("Agenda y Talleres van primero; «Turismo» despliega sus secciones con el mouse y con el teclado", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const principales = page.locator(".nav > ul > li > .nav__enlace");
    await expect(principales).toHaveText(["Agenda", "Talleres", "Museos", "Centros culturales", "Turismo"]);
    await expect(page).toHaveTitle(/^Cultura \| /);
    const panel = page.locator(".nav__panel");
    await expect(panel).toBeHidden();

    await page.locator(".nav__desplegable .nav__enlace").hover();
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("link", { name: /Mapa interactivo/ })).toHaveAttribute("href", "/mapa");

    await page.mouse.move(700, 600);
    await expect(panel).toBeHidden();

    const boton = page.getByRole("button", { name: "Más opciones de Turismo" });
    await boton.focus();
    await page.keyboard.press("Enter");
    await expect(boton).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await expect(boton).toBeFocused();

    await boton.click();
    await panel.getByRole("link", { name: /Planificá tu visita/ }).click();
    await expect(page).toHaveURL(/\/planifica$/);
  });

  test("«¿Qué hacer hoy?» cambia según quien mira y recuerda la elección", async ({ page }) => {
    await page.goto("/");
    const hoy = page.locator("#hoy");
    const vecino = hoy.getByRole("button", { name: "Vivo en la ciudad" });
    const turista = hoy.getByRole("button", { name: "Estoy de visita" });
    await expect(vecino).toHaveAttribute("aria-pressed", "true");
    await expect(hoy.getByRole("link", { name: /Talleres de hoy/ })).toBeVisible();
    await expect(hoy.getByRole("link", { name: /Hoy en la agenda/ })).toHaveAttribute("href", /^\/agenda/);

    await turista.click();
    await expect(turista).toHaveAttribute("aria-pressed", "true");
    await expect(hoy.getByRole("link", { name: /Bus Turístico/ })).toHaveAttribute("href", "/bus-turistico");
    await expect(hoy.getByRole("link", { name: /Talleres de hoy/ })).toHaveCount(0);

    await page.reload();
    await expect(turista).toHaveAttribute("aria-pressed", "true");
  });

  test("en el celular las subsecciones van dentro del menú @celular", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await page.getByRole("button", { name: "Menú" }).click();
    const sub = page.locator(".panel-movil__sub");
    await expect(sub.getByRole("link", { name: "Mapa interactivo" })).toBeVisible();
    await sub.getByRole("link", { name: "Lugares y espacios" }).click();
    await expect(page).toHaveURL(/\/lugares$/);
  });
});
