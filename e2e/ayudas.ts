import { expect, type APIRequestContext, type Page } from "@playwright/test";

/** Contraseña de las cuentas de prueba locales (supabase/local/seed-local.sql). Solo existe en .local-e2e. */
export const CLAVE_PRUEBA = "turismo-local-2026";

export const CUENTAS = {
  superadmin: "admin@ejemplo.test",
  cultura: "cultura@ejemplo.test",
  buses: "buses@ejemplo.test",
  editor: "editor@ejemplo.test",
  consulta: "consulta@ejemplo.test",
} as const;

export async function ingresar(page: Page, correo: string) {
  await page.context().clearCookies();
  await page.goto("/admin/ingresar");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill(CLAVE_PRUEBA);
  await page.getByLabel("Contraseña").press("Enter");
  await expect(page).toHaveURL(/\/admin$/);
}

/** Ninguna página puede generar desplazamiento horizontal. */
export async function sinDesbordeHorizontal(page: Page) {
  const { ancho, vista } = await page.evaluate(() => ({ ancho: document.documentElement.scrollWidth, vista: document.documentElement.clientWidth }));
  expect(ancho, "desborde horizontal").toBeLessThanOrEqual(vista + 1);
}

type Reserva = { departureId: number; email: string; peopleCount?: number; ip?: string };

/** Reserva por la API pública, como lo hace el formulario (cada prueba con su propia IP simulada). */
export async function reservarPorApi(request: APIRequestContext, r: Reserva) {
  const respuesta = await request.post("/api/tourist-bus/bookings", {
    headers: { "x-real-ip": r.ip ?? `10.0.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` },
    data: {
      departureId: String(r.departureId), fullName: "Persona de Prueba E2E", email: r.email, phone: "3815550000",
      originCity: "San Miguel de Tucumán, Tucumán, Argentina", peopleCount: String(r.peopleCount ?? 1), municipalBikes: "0", language: "es",
    },
  });
  return { status: respuesta.status(), cuerpo: await respuesta.json() };
}

/** Salidas públicas con su cupo. */
export async function salidas(request: APIRequestContext) {
  const r = await request.get("/api/tourist-bus/departures");
  expect(r.ok()).toBeTruthy();
  return (await r.json()).data as { id: number; circuit_slug: string; title: string; remaining: number; capacity: number; departure_date: string }[];
}
