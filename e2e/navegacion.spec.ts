/** Menú desplegable de «Descubrí San Miguel»: mouse, teclado y menú del celular. */
import { expect, test } from "@playwright/test";

test.describe("Navegación", () => {
  test("«Descubrí San Miguel» despliega sus secciones con el mouse y con el teclado", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const panel = page.locator(".nav__panel");
    await expect(panel).toBeHidden();

    await page.locator(".nav__desplegable .nav__enlace").hover();
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("link", { name: /Mapa interactivo/ })).toHaveAttribute("href", "/mapa");

    await page.mouse.move(700, 600);
    await expect(panel).toBeHidden();

    const boton = page.getByRole("button", { name: "Más opciones de Descubrí San Miguel" });
    await boton.focus();
    await page.keyboard.press("Enter");
    await expect(boton).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await expect(boton).toBeFocused();

    await boton.click();
    await panel.getByRole("link", { name: /Talleres/ }).click();
    await expect(page).toHaveURL(/\/talleres$/);
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
