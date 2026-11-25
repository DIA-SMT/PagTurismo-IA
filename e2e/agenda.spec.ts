/** Agenda cultural pública: filtros, calendario, ficha, exportación y redirecciones. */
import { expect, test } from "@playwright/test";

import { sinDesbordeHorizontal } from "./ayudas";

test.describe("Agenda cultural", () => {
  test("lista los eventos publicados y nunca los borradores @celular", async ({ page }) => {
    await page.goto("/agenda");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Concierto de prueba E2E").first()).toBeVisible();
    await expect(page.getByText("Feria de artesanos E2E").first()).toBeVisible();
    await expect(page.getByText("Evento en borrador E2E")).toHaveCount(0);
    await sinDesbordeHorizontal(page);
  });


  test("la portada da protagonismo a la agenda: tarjetas, semana y categorías @celular", async ({ page }) => {
    await page.goto("/");
    const seccion = page.locator("#agenda");
    await expect(seccion.getByRole("heading", { name: "Próximos eventos" })).toBeVisible();
    const tarjeta = seccion.locator(".tarjeta-evento").first();
    await expect(tarjeta).toBeVisible();
    await expect(tarjeta.locator(".tarjeta-evento__acceso")).toHaveText(/^(Gratis|Consultar|Pago|\$.+)$/);
    await expect(tarjeta.getByText("Ver evento")).toBeVisible();
    await expect(seccion.locator(".semana-agenda__dia")).toHaveCount(7);
    const franja = page.locator(".franja-categorias");
    await expect(franja.getByRole("heading", { name: "Explorá por categoría" })).toBeVisible();
    await expect(franja.locator(".categoria-agenda", { hasText: "Música" }).locator(".categoria-agenda__sticker")).toHaveText("🎵");
    await sinDesbordeHorizontal(page);
    await seccion.locator(".semana-agenda__dia").nth(1).click();
    await expect(page).toHaveURL(/\/agenda\?cuando=fecha&fecha=\d{4}-\d{2}-\d{2}/);
  });

  test("en /agenda: destacados, atajos de categoría, vista de tarjetas y día siguiente", async ({ page }) => {
    await page.goto("/agenda");
    await expect(page.getByRole("heading", { name: "Para no perderse" })).toBeVisible();
    await page.getByRole("button", { name: /^Ferias de artesanos · \d+/ }).click();
    await expect(page).toHaveURL(/categoria=ferias-artesanos/);
    await expect(page.getByText("Concierto de prueba E2E")).toHaveCount(1); // solo en los destacados
    await page.getByRole("button", { name: /^Ferias de artesanos · \d+/ }).click();
    // Tarjetas es la vista por defecto; la lista ya no existe.
    await expect(page.getByRole("radio", { name: "Tarjetas" })).toBeChecked();
    await expect(page.getByRole("radio", { name: "Lista" })).toHaveCount(0);
    await expect(page.locator(".agenda-filtrable .tarjeta-evento").first()).toBeVisible();
    await page.getByRole("radio", { name: "Elegir fecha" }).check({ force: true });
    const fecha = page.locator('.agenda-filtrable__fecha input[type="date"]');
    const antes = await fecha.inputValue();
    await page.getByRole("button", { name: "Día siguiente" }).click();
    await expect(fecha).not.toHaveValue(antes);
  });

  test("busca sin tildes y filtra por categoría y gratuidad", async ({ page }) => {
    await page.goto("/agenda");
    const lista = page.locator(".agenda-filtrable");
    await page.getByLabel("Buscar en la agenda").first().fill("concierto");
    await expect(lista.getByText("Feria de artesanos E2E")).toHaveCount(0);
    await expect(lista.getByText("Concierto de prueba E2E").first()).toBeVisible();
    await expect(page).toHaveURL(/q=concierto/);

    await page.getByLabel("Buscar en la agenda").first().fill("");
    await page.getByLabel("Categoría", { exact: true }).first().selectOption("ferias-artesanos");
    await expect(lista.getByText("Concierto de prueba E2E")).toHaveCount(0);
    await expect(lista.getByText("Feria de artesanos E2E").first()).toBeVisible();

    await page.getByLabel("Categoría", { exact: true }).first().selectOption("");
    await page.getByLabel("Solo gratis").first().check();
    await expect(lista.getByText("Feria de artesanos E2E")).toHaveCount(0);
    await expect(lista.getByText("Concierto de prueba E2E").first()).toBeVisible();
  });

  test("el calendario mensual cuenta las actividades del día y filtra al elegirlo", async ({ page }) => {
    await page.goto("/agenda?vista=calendario");
    const dia = page.locator(".calendario-mes__dia:not([disabled])").first();
    await expect(dia).toBeVisible();
    const etiqueta = (await dia.getAttribute("aria-label")) ?? "";
    expect(etiqueta).toMatch(/\d+ actividad/);
    await dia.click();
    await expect(page).toHaveURL(/cuando=fecha&fecha=\d{4}-\d{2}-\d{2}/);
    await expect(dia).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".agenda-filtrable .tarjeta-evento").first()).toBeVisible();
  });

  test("la ficha del evento ofrece compartir y todas las fechas en .ics", async ({ page, request }) => {
    await page.goto("/agenda/concierto-e2e");
    await expect(page.getByRole("heading", { level: 1, name: "Concierto de prueba E2E" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Copiar enlace" })).toBeVisible();
    const ics = page.getByRole("link", { name: "Todas las fechas (.ics)" });
    await expect(ics).toHaveAttribute("href", "/api/agenda/concierto-e2e/ics");

    const r = await request.get("/api/agenda/concierto-e2e/ics");
    expect(r.headers()["content-type"]).toContain("text/calendar");
    const texto = await r.text();
    expect(texto.match(/BEGIN:VEVENT/g)?.length).toBe(2);
    expect(texto).toContain("SUMMARY:Concierto de prueba E2E");
  });

  test("un borrador no tiene ficha pública", async ({ page }) => {
    const r = await page.goto("/agenda/borrador-e2e");
    expect(r?.status()).toBe(404);
  });

  test("las rutas viejas de la Agenda redirigen a las del portal", async ({ page }) => {
    await page.goto("/eventos/concierto-e2e");
    await expect(page).toHaveURL(/\/agenda\/concierto-e2e$/);
    await page.goto("/espacios-culturales");
    await expect(page).toHaveURL(/\/lugares\?tipo=cultural$/);
  });

  test("en inglés y portugués la agenda existe con su dirección traducida", async ({ page }) => {
    await page.goto("/en/events");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByText("Concierto de prueba E2E").first()).toBeVisible();
    const r = await page.goto("/pt/agenda");
    expect(r?.status()).toBe(200);
  });
});
