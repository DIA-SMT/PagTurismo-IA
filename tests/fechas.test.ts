/**
 * Agenda en hora de Tucumán (informe, apartado 13: "Consultar Hoy cerca de
 * medianoche", "Evento terminado o cancelado").
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  aInstante, dentroDeVentana, destacables, diaLocal, filtrarPorCuando, finDeOcurrencia,
  formatearOcurrencia, ocurrenciasVigentes, rangoFinDeSemana,
} from "../lib/fechas.ts";

// Tucumán está en UTC-3 todo el año.
const utc = (iso: string) => Date.parse(iso);

describe("conversión de hora local", () => {
  it("interpreta la hora de pared como hora de Tucumán", () => {
    assert.equal(aInstante("2026-11-07T21:00"), utc("2026-11-08T00:00:00Z"));
    assert.equal(aInstante("2026-11-07"), utc("2026-11-07T03:00:00Z"));
  });

  it("el día local no es el día UTC después de las 21", () => {
    // 23:30 en Tucumán ya es el día siguiente en UTC.
    assert.equal(diaLocal(utc("2026-11-06T02:30:00Z")), "2026-11-05");
  });

  it("rechaza formatos inválidos", () => {
    assert.throws(() => aInstante("07/11/2026"));
  });
});

describe("Hoy, cerca de medianoche", () => {
  const eventos = [
    { slug: "sin-fin", ocurrencias: [{ inicio: "2026-11-05T22:00", estado: "confirmado" as const }] },
    { slug: "cruza-medianoche", ocurrencias: [{ inicio: "2026-11-05T23:00", fin: "2026-11-06T02:00", estado: "confirmado" as const }] },
    { slug: "manana", ocurrencias: [{ inicio: "2026-11-06T10:00", estado: "confirmado" as const }] },
    { slug: "ayer", ocurrencias: [{ inicio: "2026-11-04T20:00", estado: "confirmado" as const }] },
  ];

  it("a las 23:50 incluye lo que está en curso y no lo de mañana", () => {
    const ahora = aInstante("2026-11-05T23:50");
    const hoy = filtrarPorCuando(ocurrenciasVigentes(eventos, ahora), "hoy", ahora).map((o) => o.evento);
    assert.deepEqual(hoy.sort(), ["cruza-medianoche", "sin-fin"]);
  });

  it("a las 00:30 sigue mostrando lo que cruza la medianoche", () => {
    const ahora = aInstante("2026-11-06T00:30");
    const hoy = filtrarPorCuando(ocurrenciasVigentes(eventos, ahora), "hoy", ahora).map((o) => o.evento);
    assert.deepEqual(hoy.sort(), ["cruza-medianoche", "manana"]);
  });

  it("marca en curso lo que ya empezó", () => {
    const ahora = aInstante("2026-11-05T23:50");
    const vigentes = ocurrenciasVigentes(eventos, ahora);
    assert.equal(vigentes.find((o) => o.evento === "sin-fin")?.enCurso, true);
    assert.equal(vigentes.find((o) => o.evento === "manana")?.enCurso, false);
  });

  it("una ocurrencia sin fin vale hasta el final de su día", () => {
    assert.equal(finDeOcurrencia({ inicio: "2026-11-05T22:00" }), aInstante("2026-11-06") - 1);
  });
});

describe("eventos terminados y cancelados", () => {
  const ahora = aInstante("2026-11-05T12:00");
  const eventos = [
    { slug: "terminado", ocurrencias: [{ inicio: "2026-11-01T20:00", fin: "2026-11-01T22:00", estado: "confirmado" as const }] },
    { slug: "cancelado", ocurrencias: [{ inicio: "2026-11-08T20:00", estado: "cancelado" as const }] },
    { slug: "ok", ocurrencias: [{ inicio: "2026-11-08T18:00", estado: "confirmado" as const }] },
    { slug: "fecha-rota", ocurrencias: [{ inicio: "8 de noviembre", estado: "confirmado" as const }] },
  ];

  it("excluye los terminados y los que tienen la fecha mal cargada", () => {
    assert.deepEqual(ocurrenciasVigentes(eventos, ahora).map((o) => o.evento), ["ok", "cancelado"]);
  });

  it("los cancelados quedan en la agenda pero no se destacan", () => {
    assert.deepEqual(destacables(ocurrenciasVigentes(eventos, ahora)).map((o) => o.evento), ["ok"]);
  });
});

describe("fin de semana", () => {
  it("de lunes a viernes es el sábado y domingo que vienen", () => {
    const [desde, hasta] = rangoFinDeSemana(aInstante("2026-11-05T10:00")); // jueves
    assert.equal(desde, aInstante("2026-11-07"));
    assert.equal(hasta, aInstante("2026-11-09") - 1);
  });

  it("el domingo es el fin de semana en curso", () => {
    const [desde] = rangoFinDeSemana(aInstante("2026-11-08T23:00"));
    assert.equal(desde, aInstante("2026-11-07"));
  });
});

describe("ventana de los destacados", () => {
  const ahora = aInstante("2026-11-05T12:00");
  it("respeta desde y hasta, incluidos", () => {
    assert.equal(dentroDeVentana("2026-11-05", "2026-11-05", ahora), true);
    assert.equal(dentroDeVentana("2026-11-06", undefined, ahora), false);
    assert.equal(dentroDeVentana(undefined, "2026-11-04", ahora), false);
    assert.equal(dentroDeVentana(undefined, undefined, ahora), true);
  });
});

describe("formato", () => {
  it("incluye día completo, año y hora", () => {
    const texto = formatearOcurrencia({ inicio: "2026-11-07T21:00", fin: "2026-11-07T23:00" });
    assert.match(texto, /7 de noviembre de 2026/);
    assert.match(texto, /21:00 h a 23:00 h/);
  });
});
