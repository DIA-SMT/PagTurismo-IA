/** Talleres anuales de los centros culturales: listado con filtros y aparte de la agenda. */
import { expect, test } from "@playwright/test";

import { sinDesbordeHorizontal } from "./ayudas";

test.describe("Talleres en los centros culturales", () => {
  test("lista los talleres con filtros por día, disciplina y búsqueda @celular", async ({ page }) => {
    await page.goto("/talleres");
    await expect(page.getByRole("heading", { level: 1, name: "Talleres en los centros culturales" })).toBeVisible();
    const talleres = page.locator(".taller");
    const total = await talleres.count();
    expect(total).toBeGreaterThan(50);
    await expect(page.getByRole("heading", { name: "Dónde inscribirse" })).toBeVisible();
    await sinDesbordeHorizontal(page);

    await page.getByRole("button", { name: "Sábado", exact: true }).click();
    await expect(page).toHaveURL(/dia=6/);
    const sabado = await talleres.count();
    expect(sabado).toBeLessThan(total);
    await expect(page.locator(".taller__horarios strong").first()).toHaveText("Sáb");

    await page.getByLabel("Disciplina").selectOption("danza");
    await expect(talleres.first()).toBeVisible();
    expect(await talleres.count()).toBeLessThanOrEqual(sabado);

    await page.getByRole("button", { name: "Limpiar filtros" }).click();
    await page.getByLabel("Buscar un taller").fill("guitarra");
    await expect(talleres.first().getByRole("heading")).toHaveText("Guitarra");
  });

  test("la portada tiene su sección de talleres: disciplinas y lo de hoy @celular", async ({ page }) => {
    await page.goto("/");
    const seccion = page.locator("#talleres");
    await expect(seccion.getByRole("heading", { name: "Aprendé algo nuevo en los centros culturales" })).toBeVisible();
    await expect(seccion.locator(".disciplina-taller")).toHaveCount(7);
    await expect(seccion.locator(".talleres-portada__hoy li").first()).toBeVisible();
    await seccion.getByRole("link", { name: /Música/ }).click();
    await expect(page).toHaveURL(/\/talleres\?disciplina=musica/);
    await expect(page.locator(".taller").first()).toBeVisible();
  });

  test("la agenda y la portada llevan a los talleres", async ({ page }) => {
    await page.goto("/agenda");
    await page.locator(".agenda-talleres").getByRole("link", { name: "Ver los talleres en los centros culturales" }).click();
    await expect(page).toHaveURL(/\/talleres$/);
    const r = await page.goto("/en/workshops");
    expect(r?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "Workshops at the cultural centers" })).toBeVisible();
  });
});
