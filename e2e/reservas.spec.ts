/**
 * Bus Turístico: la reserva completa por la interfaz y las reglas que protegen los cupos.
 * Corre contra la base local de pruebas, que usa la función real create_tourist_booking.
 */
import { expect, test } from "@playwright/test";

import { CUENTAS, ingresar, reservarPorApi, salidas, sinDesbordeHorizontal } from "./ayudas";

test.describe.configure({ mode: "serial" });

test.describe("Bus Turístico", () => {
  test("la página muestra circuitos y salidas reales @celular", async ({ page }) => {
    await page.goto("/bus-turistico");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: "Confirmar reserva" })).toBeVisible();
    await sinDesbordeHorizontal(page);
  });

  test("no ofrece la salida de hoy que ya partió ni las canceladas", async ({ request }) => {
    const titulos = (await salidas(request)).map((s) => s.title);
    expect(titulos.some((t) => t.includes("ya salió"))).toBeFalsy();
    expect(titulos.some((t) => t.startsWith("Nocturno"))).toBeFalsy();
  });

  test("reserva completa por el formulario", async ({ page }) => {
    // El autocompletado de procedencia consulta un servicio externo: en la prueba se simula.
    await page.route("**/api/tourist-bus/places**", (ruta) =>
      ruta.fulfill({ json: { data: ["Yerba Buena / Tucumán / Argentina"] } }));
    const antes = (await salidas(page.request)).find((s) => s.circuit_slug === "historico-cultural")!;

    await page.goto("/bus-turistico#reserva");
    const selects = page.locator("#reserva select");
    await selects.nth(0).selectOption("historico-cultural");
    await selects.nth(1).selectOption(String(antes.id));
    await page.getByPlaceholder("Ej: Ana Pérez").fill("Persona de Prueba E2E");
    await page.locator('#reserva input[type="number"]').first().fill("2");
    await page.getByPlaceholder("nombre@email.com").fill("formulario-e2e@ejemplo.test");
    await page.getByPlaceholder("+54 381 000 0000").fill("3815550000");
    await page.getByPlaceholder("Ej: Yerba Buena…").fill("Yerba");
    await page.getByRole("button", { name: "Yerba Buena / Tucumán / Argentina" }).dispatchEvent("mousedown");
    await page.getByRole("button", { name: "Confirmar reserva" }).click();

    await expect(page.getByText("¡Reserva confirmada!")).toBeVisible();
    const despues = (await salidas(page.request)).find((s) => s.id === antes.id)!;
    expect(despues.remaining).toBe(antes.remaining - 2);
  });

  test("valida los campos obligatorios antes de enviar", async ({ page }) => {
    await page.goto("/bus-turistico#reserva");
    await page.getByRole("button", { name: "Confirmar reserva" }).click();
    await expect(page.getByText("¡Reserva confirmada!")).toHaveCount(0);
    await expect(page.locator('[aria-invalid="true"]').first()).toBeVisible();
  });

  test("no vende más lugares que el cupo", async ({ request }) => {
    const chica = (await salidas(request)).find((s) => s.circuit_slug === "lugares-notables")!;
    expect(chica.remaining).toBeGreaterThan(0);
    const ok = await reservarPorApi(request, { departureId: chica.id, email: "ultimo-lugar@ejemplo.test", peopleCount: chica.remaining });
    expect(ok.status).toBe(201);
    const sinLugar = await reservarPorApi(request, { departureId: chica.id, email: "sin-lugar@ejemplo.test" });
    expect(sinLugar.status).toBe(409);
    expect(sinLugar.cuerpo.code).toBe("NO_CAPACITY");
  });

  test("la misma persona no reserva dos veces la misma salida", async ({ request }) => {
    const s = (await salidas(request)).find((x) => x.remaining > 3)!;
    expect((await reservarPorApi(request, { departureId: s.id, email: "Repetida-E2E@ejemplo.test" })).status).toBe(201);
    const otra = await reservarPorApi(request, { departureId: s.id, email: "repetida-e2e@ejemplo.test" });
    expect(otra.status).toBe(409);
    expect(otra.cuerpo.code).toBe("DUPLICATE");
  });

  test("corta los pedidos en ráfaga desde una misma conexión", async ({ request }) => {
    const s = (await salidas(request)).find((x) => x.remaining > 15)!;
    const codigos: number[] = [];
    for (let i = 0; i < 11; i++) {
      codigos.push((await reservarPorApi(request, { departureId: s.id, email: `rafaga-${i}@ejemplo.test`, ip: "10.250.250.250" })).status);
    }
    expect(codigos.at(-1)).toBe(429);
  });

  // Las bajas se aceptan hasta 24 horas antes de la salida (regla original del bus).
  const enDosDiasOMas = (fecha: string) => fecha >= new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);

  test("«Mi reserva» no deja cancelar a menos de 24 horas de la salida", async ({ page }) => {
    // Una salida a menos de 24 horas: mañana, una hora antes que ahora (en hora de Tucumán).
    const partes = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Tucuman", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date(Date.now() + 23 * 3_600_000)).map((p) => [p.type, p.value]));
    await ingresar(page, CUENTAS.buses);
    const alta = await page.request.post("/api/admin/tourist-departures", {
      data: { circuitSlug: "historico-cultural", departureDate: `${partes.year}-${partes.month}-${partes.day}`, departureTime: `${partes.hour}:00`, capacity: 10 },
    });
    expect(alta.status(), await alta.text()).toBeLessThan(300);
    const salida = (await alta.json()).data;
    await page.context().clearCookies();

    const { cuerpo } = await reservarPorApi(page.request, { departureId: salida.id, email: "tarde-e2e@ejemplo.test" });
    await page.goto(`/reserva/${cuerpo.data.booking.cancel_token}`);
    await expect(page.getByText("Persona de Prueba E2E")).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancelar mi reserva" })).toHaveCount(0);
    const baja = await page.request.post(`/api/tourist-bus/bookings/${cuerpo.data.booking.cancel_token}`);
    expect(baja.ok()).toBeFalsy();
  });

  test("«Mi reserva» muestra la reserva y la cancela liberando el lugar", async ({ page }) => {
    const s = (await salidas(page.request)).find((x) => enDosDiasOMas(x.departure_date) && x.remaining > 2)!;
    const { status, cuerpo } = await reservarPorApi(page.request, { departureId: s.id, email: "cancelar-e2e@ejemplo.test", peopleCount: 2 });
    expect(status).toBe(201);
    const token = cuerpo.data.booking.cancel_token as string;
    const libresAntes = (await salidas(page.request)).find((x) => x.id === s.id)!.remaining;

    await page.goto(`/reserva/${token}`);
    await expect(page.getByText("Persona de Prueba E2E")).toBeVisible();
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Cancelar mi reserva" }).click();
    await expect(page.getByText(/Tu reserva quedó cancelada/)).toBeVisible();

    const libresDespues = (await salidas(page.request)).find((x) => x.id === s.id)!.remaining;
    expect(libresDespues).toBe(libresAntes + 2);
  });

  test("los enlaces viejos del sitio del bus siguen funcionando", async ({ page }) => {
    await page.goto("/turistico");
    await expect(page).toHaveURL(/\/bus-turistico$/);
    await page.goto(`/fotos/${"a".repeat(48)}`);
    await expect(page).toHaveURL(new RegExp(`/galeria/${"a".repeat(48)}$`));
  });

  test("el Bus Turístico y el Educativo existen en inglés y portugués", async ({ page }) => {
    for (const ruta of ["/en/tourist-bus", "/pt/onibus-turistico", "/bus-educativo", "/en/school-bus"]) {
      const r = await page.goto(ruta);
      expect(r?.status(), ruta).toBe(200);
    }
    await page.goto("/en/tourist-bus");
    await expect(page.getByRole("button", { name: "Confirm booking" })).toBeVisible();
  });
});
