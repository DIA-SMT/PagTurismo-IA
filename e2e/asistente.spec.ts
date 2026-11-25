/** Migue del panel: el botón flotante, las sugerencias según el rol y la API cerrada sin sesión. */
import { expect, test } from "@playwright/test";

import { CUENTAS, ingresar, sinDesbordeHorizontal } from "./ayudas";

test.describe("Migue del panel", () => {
  test("sin sesión, la API no responde", async ({ request }) => {
    const r = await request.post("/api/admin/asistente", { data: { mensajes: [{ rol: "usuario", texto: "hola" }] } });
    expect(r.status()).toBe(401);
  });

  test("se abre, sugiere según los permisos y avisa si el servidor no tiene IA", async ({ page }) => {
    await ingresar(page, CUENTAS.editor);
    const abrir = page.getByRole("button", { name: "¿Te ayudo?" });
    await abrir.click();
    const charla = page.getByRole("dialog", { name: /Migue del panel/ });
    await expect(charla).toBeVisible();
    await expect(charla.getByRole("button", { name: "¿Por qué no puedo publicar?" })).toBeVisible();
    await expect(charla.getByRole("button", { name: /usuarios|permisos a alguien/i })).toHaveCount(0);

    // El servidor de pruebas corre sin clave de IA: el pedido llega validado y responde «sin-ia».
    await charla.getByLabel("Tu pregunta").fill("¿Cómo cargo un evento?");
    await charla.getByLabel("Tu pregunta").press("Enter");
    await expect(charla.getByText("¿Cómo cargo un evento?")).toBeVisible();
    await expect(charla.getByRole("alert")).toContainText("no está disponible");

    await page.keyboard.press("Escape");
    await expect(charla).toBeHidden();
  });

  test("en el celular la charla entra en la pantalla", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 760 });
    await ingresar(page, CUENTAS.superadmin);
    await page.locator(".adm-asistente__abrir").click();
    await expect(page.getByRole("dialog", { name: /Migue del panel/ })).toBeVisible();
    await sinDesbordeHorizontal(page);
  });
});
