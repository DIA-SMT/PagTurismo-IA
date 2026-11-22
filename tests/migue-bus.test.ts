/** Lo que Migue sabe del Bus Turístico: cupos reales, sin datos personales, sin prometer reservas. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { fichasDelBus } from "../lib/migue.ts";
import { aInstante } from "../lib/fechas.ts";

const AHORA = aInstante("2026-11-20T09:00");

describe("Migue y el Bus Turístico", () => {
  const fichas = fichasDelBus(
    [
      { slug: "historico-cultural", nombre: "Histórico Cultural", modalidad: "bus", horario: "Sábados 16 h", duracion: "2 horas", resumen: "Museos municipales." },
      { slug: "pedaleando-parque", nombre: "Pedaleando el Parque", modalidad: "bike" },
    ],
    [
      { circuito: "historico-cultural", titulo: "Histórico", fecha: "2026-11-21", hora: "16:00:00", cupo: 40, reservadas: 38, punto: "Plaza Independencia" },
      { circuito: "historico-cultural", titulo: "Histórico", fecha: "2026-11-22", hora: "16:00:00", cupo: 40, reservadas: 40 },
      { circuito: "pedaleando-parque", titulo: "Pedaleando", fecha: "2026-11-21", hora: "09:00:00", cupo: 15, reservadas: 3, bicis: 6, bicisReservadas: 6 },
    ],
    AHORA,
  );

  it("da los cupos del momento por salida y marca las completas", () => {
    const historico = fichas.find((f) => f.titulo === "Histórico Cultural")!.texto;
    assert.match(historico, /2 lugares libres, sale de Plaza Independencia/);
    assert.match(historico, /SIN LUGAR/);
    assert.match(historico, /cupos al 20 de noviembre/);
  });

  it("informa las bicis municipales disponibles", () => {
    assert.match(fichas.find((f) => f.titulo === "Pedaleando el Parque")!.texto, /12 lugares libres, 0 bicis municipales libres/);
  });

  it("lleva siempre a la página de reservas y aclara que Migue no reserva", () => {
    for (const f of fichas) {
      assert.equal(f.url, "/bus-turistico");
      assert.match(f.texto, /Migue no puede reservar/);
    }
  });

  it("sin salidas lo dice en vez de inventar", () => {
    const [f] = fichasDelBus([{ slug: "x", nombre: "X", modalidad: "walking" }], [], AHORA);
    assert.match(f.texto, /No hay salidas publicadas/);
  });
});
