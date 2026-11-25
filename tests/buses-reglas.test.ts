/** Reglas del portal sobre las reservas del Bus Turístico (lib/buses/reglas.ts). */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { crearLimitador, validarCambioSalida, yaPartio } from "../lib/buses/reglas.ts";
import { aInstante } from "../lib/fechas.ts";

const AHORA = aInstante("2026-11-20T11:00");

describe("salida que ya partió", () => {
  it("compara fecha y hora de Tucumán, no solo la fecha", () => {
    assert.equal(yaPartio("2026-11-20", "10:00:00", AHORA), true);
    assert.equal(yaPartio("2026-11-20", "11:30", AHORA), false);
    assert.equal(yaPartio("2026-11-19", "23:00", AHORA), true);
    assert.equal(yaPartio("2026-11-21", "08:00", AHORA), false);
  });
});

describe("límite de pedidos", () => {
  it("corta al pasar el máximo y se libera al vencer la ventana", () => {
    const permitir = crearLimitador(2, 1000);
    assert.deepEqual([permitir("a", 0), permitir("a", 10), permitir("a", 20)], [true, true, false]);
    assert.equal(permitir("b", 20), true, "otra clave no se ve afectada");
    assert.equal(permitir("a", 1500), true);
  });
});

describe("cambios en una salida desde el panel", () => {
  const ocupacion = { reservadas: 12, bicisReservadas: 3, fechaActual: "2026-11-25", horaActual: "10:00:00" };

  it("no deja bajar el cupo por debajo de lo reservado", () => {
    assert.match(validarCambioSalida({ capacity: 10 }, ocupacion, AHORA)!, /12 personas/);
    assert.equal(validarCambioSalida({ capacity: 12 }, ocupacion, AHORA), null);
  });

  it("no deja bajar ni quitar las bicis prestadas", () => {
    assert.match(validarCambioSalida({ bike_stock: 2 }, ocupacion, AHORA)!, /3 ya prestadas/);
    assert.match(validarCambioSalida({ bike_stock: null }, ocupacion, AHORA)!, /no se puede quitar/);
    assert.equal(validarCambioSalida({ bike_stock: null }, { ...ocupacion, bicisReservadas: 0 }, AHORA), null);
  });

  it("no deja mover la salida al pasado, pero sí editar otra cosa de una salida vieja", () => {
    assert.match(validarCambioSalida({ departure_date: "2026-11-19" }, ocupacion, AHORA)!, /ya pasaron/);
    assert.match(validarCambioSalida({ departure_time: "09:00" }, { ...ocupacion, fechaActual: "2026-11-20" }, AHORA)!, /ya pasaron/);
    assert.equal(validarCambioSalida({ capacity: 20 }, { ...ocupacion, fechaActual: "2026-11-01" }, AHORA), null);
  });
});
