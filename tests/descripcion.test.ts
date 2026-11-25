/** La descripción de un evento en piezas: datos clave, itinerario, enlaces y lo que queda como texto. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { estructurarDescripcion } from "../lib/cultura/descripcion.ts";

const RESUMEN = "Un recorrido que continúa explorando nuestra historia y cultura.";

describe("Descripción de un evento", () => {
  it("separa datos, avisos, itinerario y el enlace de inscripción (todo en una línea)", () => {
    const d = estructurarDescripcion(
      `${RESUMEN}\n\nPresentarse 10 minutos antes. Duración: 1 hora y 30 minutos Punto de Encuentro: Oficina de Turismo (Congreso y Crisóstomo Álvarez)\n\nLa actividad se suspende por lluvia.\n\nItinerario: • Museo de la Casa Histórica. • Paseo Calle Congreso: Museo Provincial y Museo de Arte Sacro. • Cierre: Refrigerio en Jockey Club.\n\nLos interesados pueden inscribirse a través del siguiente enlace: https://busturistico.smt.gob.ar/turistico`,
      RESUMEN,
    );
    assert.deepEqual(d.datos, [
      { clave: "duracion", valor: "1 hora y 30 minutos" },
      { clave: "encuentro", valor: "Oficina de Turismo (Congreso y Crisóstomo Álvarez)" },
    ]);
    assert.equal(d.anticipacion, 10);
    assert.equal(d.suspendePorLluvia, true);
    assert.deepEqual(d.itinerario, [
      { titulo: "Museo de la Casa Histórica" },
      { titulo: "Paseo Calle Congreso", detalle: "Museo Provincial y Museo de Arte Sacro" },
      { titulo: "Cierre", detalle: "Refrigerio en Jockey Club" },
    ]);
    assert.deepEqual(d.enlaces, [{ url: "https://busturistico.smt.gob.ar/turistico", tipo: "inscripcion" }]);
    assert.deepEqual(d.parrafos, [], "el resumen repetido y la frase del enlace no quedan como texto");
  });

  it("también lee el itinerario con una parada por línea", () => {
    const d = estructurarDescripcion("Itinerario:\n• Plaza Independencia: historia fundacional.\n• Catedral\nTraer agua.");
    assert.deepEqual(d.itinerario.map((p) => p.titulo), ["Plaza Independencia", "Catedral"]);
    assert.deepEqual(d.parrafos, ["Traer agua."]);
  });

  it("si no reconoce nada, deja el texto como está", () => {
    const texto = "Una noche de música en vivo con artistas locales.\nEntrada libre y gratuita.";
    const d = estructurarDescripcion(texto);
    assert.deepEqual(d.parrafos, ["Una noche de música en vivo con artistas locales.", "Entrada libre y gratuita."]);
    assert.deepEqual([d.datos, d.itinerario, d.enlaces], [[], [], []]);
    assert.deepEqual(estructurarDescripcion(undefined).parrafos, []);
  });

  it("un enlace que no es de inscripción es «más información»", () => {
    assert.deepEqual(estructurarDescripcion("Programa completo en https://smt.gob.ar/cultura.").enlaces, [{ url: "https://smt.gob.ar/cultura", tipo: "info" }]);
  });
});
