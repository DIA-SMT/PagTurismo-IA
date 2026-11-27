/** Programas de Gestión Cultural: qué evento de la agenda pertenece a cada programa, y los datos fijos. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CIFRAS_CREAR_ENCUENTRO, ESQUINAS, PROGRAMAS, esDelPrograma } from "../lib/cultura/programas.ts";

const programa = (id: string) => PROGRAMAS.find((p) => p.id === id)!;

describe("Programas", () => {
  it("reconoce los eventos de cada programa sin importar tildes ni mayúsculas", () => {
    assert.ok(esDelPrograma(programa("crear-encuentro"), { titulo: "TEATRO EN LOS BARRIOS: «La pulpera»" }));
    assert.ok(esDelPrograma(programa("crear-encuentro"), { titulo: "Feria", resumen: "Organizan los promotores culturales del barrio." }));
    assert.ok(esDelPrograma(programa("cultura-joven"), { titulo: "Ciclo Esquinas: batalla de freestyle" }));
    assert.ok(esDelPrograma(programa("cultura-joven"), { titulo: "Festival", resumen: "Una propuesta de Cultura Joven" }));
  });

  it("no confunde palabras sueltas ni pedazos de palabras", () => {
    assert.ok(!esDelPrograma(programa("cultura-joven"), { titulo: "Muestra de pintura en las esquinas del centro" }));
    assert.ok(!esDelPrograma(programa("crear-encuentro"), { titulo: "Encuentro de coros" }));
    assert.ok(!esDelPrograma(programa("cultura-joven"), { titulo: "Freestyles de danza", resumen: "" }));
  });

  it("los logos y enlaces apuntan a archivos del portal y a sitios oficiales", () => {
    for (const p of PROGRAMAS) {
      assert.match(p.logo.src, /^\/img\/programas\//);
      assert.match(p.prensa, /^https:\/\/comunicacionsmt\.gob\.ar\//);
    }
    assert.match(ESQUINAS.instagram, /^https:\/\/www\.instagram\.com\//);
    assert.ok(CIFRAS_CREAR_ENCUENTRO.promotores < CIFRAS_CREAR_ENCUENTRO.promotoresMeta);
  });
});
