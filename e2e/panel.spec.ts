/** Panel único: ingreso, permisos por módulo aplicados en el servidor, publicación y buses. */
import { expect, test } from "@playwright/test";

import { CUENTAS, ingresar, salidas } from "./ayudas";

test.describe.configure({ mode: "serial" });

test.describe("Panel unificado", () => {
  test("sin sesión, el panel y su API piden ingresar", async ({ page, request }) => {
    await page.goto("/admin/buses");
    await expect(page).toHaveURL(/\/admin\/ingresar$/);
    expect((await request.get("/api/admin/tourist-departures")).status()).toBe(401);
  });

  test("una contraseña equivocada no entra", async ({ page }) => {
    await page.goto("/admin/ingresar");
    await page.getByLabel("Correo").fill(CUENTAS.editor);
    await page.getByLabel("Contraseña").fill("no-es-la-clave");
    await page.getByLabel("Contraseña").press("Enter");
    await expect(page.getByText("El correo o la contraseña no son correctos.")).toBeVisible();
  });

  test("el superadmin ve todos los módulos y gestiona cuentas", async ({ page }) => {
    await ingresar(page, CUENTAS.superadmin);
    const menu = page.locator(".adm-menu").first();
    for (const grupo of ["Turismo", "Cultura", "Buses y circuitos", "Migue", "Sistema"]) {
      await expect(menu.locator(".adm-menu__grupo", { hasText: new RegExp(`^${grupo}$`) })).toBeVisible();
    }
    await page.goto("/admin/usuarios");
    await expect(page.getByRole("heading", { name: "Usuarios y permisos" })).toBeVisible();
    await page.getByLabel("Correo").fill("nueva-e2e@ejemplo.test");
    await page.getByLabel("Nombre y apellido").fill("Cuenta Nueva E2E");
    await page.getByLabel("Contraseña inicial").fill("clave-larga-e2e-123");
    await page.getByRole("radio", { name: /^Consulta/ }).last().check();
    await page.getByRole("checkbox", { name: "Cultura" }).last().check();
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page.getByText(/Cuenta creada: nueva-e2e@ejemplo.test/)).toBeVisible();
  });

  test("el editor no publica, no borra y no entra a cuentas (ni por URL)", async ({ page }) => {
    await ingresar(page, CUENTAS.editor);
    await page.goto("/admin/usuarios");
    await expect(page).toHaveURL(/sin-permiso=usuarios/);
    await expect(page.getByText(/no tiene permiso/)).toBeVisible();

    await page.goto("/admin/eventos/concierto-e2e");
    await expect(page.locator("aside select")).toBeDisabled();
    await expect(page.getByText("Sí, quiero borrar esta ficha")).toHaveCount(0);
    await expect(page.getByText(/tu rol no puede cambiarla/)).toBeVisible();
  });

  test("el admin de cultura publica un evento y aparece en el sitio", async ({ page }) => {
    await ingresar(page, CUENTAS.cultura);
    await page.goto("/admin/eventos/borrador-e2e");
    await page.locator("aside select").selectOption("publicado");
    await page.getByRole("button", { name: "Guardar y publicar" }).click();
    await expect(page.getByText("Guardado y publicado.")).toBeVisible();

    await page.goto("/agenda/borrador-e2e");
    await expect(page.getByRole("heading", { level: 1, name: "Evento en borrador E2E" })).toBeVisible();

    // Vuelve a borrador: las demás pruebas cuentan con que no se vea.
    await page.goto("/admin/eventos/borrador-e2e");
    await page.locator("aside select").selectOption("borrador");
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByText("Guardado como borrador.")).toBeVisible();
    await page.context().clearCookies();
    expect((await page.goto("/agenda/borrador-e2e"))?.status()).toBe(404);
  });

  test("el admin de cultura no entra a buses: ni pantalla ni API", async ({ page }) => {
    await ingresar(page, CUENTAS.cultura);
    await page.goto("/admin/buses");
    await expect(page).toHaveURL(/sin-permiso=buses/);
    expect((await page.request.get("/api/admin/tourist-departures")).status()).toBe(401);
  });

  test("la cuenta de consulta ve buses pero no puede cambiar una salida", async ({ page }) => {
    await ingresar(page, CUENTAS.consulta);
    const s = (await salidas(page.request))[0];
    const r = await page.request.patch(`/api/admin/tourist-departures/${s.id}`, { data: { notes: "intento" } });
    expect(r.status()).toBe(401);
  });

  test("el admin de buses gestiona salidas y el cupo no baja de lo reservado", async ({ page }) => {
    await ingresar(page, CUENTAS.buses);
    await page.goto("/admin/buses");
    await expect(page.getByRole("heading", { name: "Bus Turístico" })).toBeVisible();
    await expect(page.getByText("Histórico Cultural (PRUEBA)").first()).toBeVisible();

    const s = (await salidas(page.request)).find((x) => x.capacity - x.remaining > 0)!;
    const reservadas = s.capacity - s.remaining;
    const bajar = await page.request.patch(`/api/admin/tourist-departures/${s.id}`, { data: { capacity: reservadas - 1 || 1 } });
    if (reservadas > 1) {
      expect(bajar.status()).toBe(409);
      expect((await bajar.json()).error).toMatch(/no puede ser menor/);
    }
    const subir = await page.request.patch(`/api/admin/tourist-departures/${s.id}`, { data: { capacity: s.capacity + 5 } });
    expect(subir.status()).toBe(200);
  });

  test("las operaciones del bus quedan en la auditoría con la persona", async ({ page }) => {
    await ingresar(page, CUENTAS.superadmin);
    await page.goto("/admin/auditoria");
    await expect(page.getByText("Buses (prueba)").first()).toBeVisible();
    await expect(page.getByText(/Salida del Bus Turístico \(cambio\)/).first()).toBeVisible();
  });

  test("el tablero muestra datos reales de los módulos", async ({ page }) => {
    await ingresar(page, CUENTAS.superadmin);
    await expect(page.getByText("Salidas en 7 días")).toBeVisible();
    await expect(page.getByText("Próximas salidas del Bus Turístico")).toBeVisible();
    await expect(page.getByText("Fichas publicadas")).toBeVisible();
  });
});

test.describe("Migue", () => {
  test("el contenido para Migue trae agenda y cupos del bus, sin borradores ni datos personales", async ({ request }) => {
    const r = await request.get("/api/migue/contenido");
    expect(r.ok()).toBeTruthy();
    const datos = await r.json();
    const texto = JSON.stringify(datos);
    expect(datos.fichas.some((f: { tipo: string }) => f.tipo === "circuito del Bus Turístico")).toBeTruthy();
    expect(texto).toContain("Concierto de prueba E2E");
    expect(texto).toMatch(/lugares libres/);
    expect(texto).not.toContain("@ejemplo.test");
    expect(texto).not.toContain("3815550000");
  });
});
