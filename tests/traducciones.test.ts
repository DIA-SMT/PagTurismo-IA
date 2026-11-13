/** Traducciones del contenido: cómo se guardan, se limpian y se muestran. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { esquemaDe } from "../lib/admin/esquemas.ts";
import { limpiarFicha } from "../lib/admin/limpiar.ts";
import { ponerTraduccion, textosTraducibles, traduccionDe } from "../lib/admin/traducibles.ts";
import { leerSemilla } from "../lib/db/semilla.ts";
import { localizarDatos, tieneTraduccion } from "../lib/i18n/contenido.ts";

const recorrido = {
  titulo: "Circuito",
  resumen: "Un paseo.",
  paradas: [
    { nombre: "Calles céntricas", traducciones: { en: { nombre: "Downtown streets" } } },
    { nombre: "Plaza Belgrano", lugar: "plaza-belgrano" },
  ],
  traducciones: { en: { titulo: "Route", resumen: "  " }, pt: { titulo: "Circuito" } },
};

describe("localizarDatos", () => {
  it("aplica cada nivel y quita las traducciones del resultado", () => {
    const en = localizarDatos(recorrido, "en");
    assert.equal(en.titulo, "Route");
    assert.equal(en.resumen, "Un paseo.", "un texto vacío se muestra en español");
    assert.equal(en.paradas[0].nombre, "Downtown streets");
    assert.equal(en.paradas[1].nombre, "Plaza Belgrano");
    assert.equal(en.paradas[1].lugar, "plaza-belgrano");
    assert.equal("traducciones" in en, false);
    assert.equal("traducciones" in en.paradas[0], false);
  });
  it("en español deja el original", () => {
    const es = localizarDatos(recorrido, "es");
    assert.equal(es.titulo, "Circuito");
    assert.equal(es.paradas[0].nombre, "Calles céntricas");
  });
  it("una traducción nunca pisa un dato que no es texto", () => {
    const d = localizarDatos({ orden: 3, traducciones: { en: { orden: "tres" } } }, "en");
    assert.equal(d.orden, 3);
  });
  it("sabe si la ficha está traducida", () => {
    assert.equal(tieneTraduccion(recorrido, "en"), true);
    assert.equal(tieneTraduccion({ titulo: "x" }, "pt"), false);
    assert.equal(tieneTraduccion({ titulo: "x" }, "es"), true);
  });
});

describe("traducciones en el panel", () => {
  const esquema = esquemaDe("recorridos")!;
  it("lista los textos traducibles con su contexto", () => {
    const textos = textosTraducibles(esquema, recorrido);
    const rutas = textos.map((t) => [...t.objeto, t.campo].join("."));
    assert.ok(rutas.includes("titulo"));
    assert.ok(rutas.includes("paradas.0.nombre"));
    assert.equal(textos.find((t) => t.campo === "nombre")?.etiqueta, "Paradas 1 · Nombre");
  });
  it("guarda y borra una traducción", () => {
    const datos = structuredClone(recorrido) as Record<string, unknown>;
    const parada = { objeto: ["paradas", 1], campo: "nombre" };
    ponerTraduccion(datos, parada, "pt", "Praça Belgrano");
    assert.equal(traduccionDe(datos, parada, "pt"), "Praça Belgrano");
    ponerTraduccion(datos, parada, "pt", "");
    assert.equal("traducciones" in (datos.paradas as Record<string, unknown>[])[1], false);
  });
  it("al guardar, conserva solo traducciones de campos traducibles", () => {
    const { datos } = limpiarFicha(esquema, {
      ...recorrido,
      tipo: "circuito", modalidad: "bus", orden: 1,
      traducciones: { en: { titulo: " Route ", orden: "1", inventado: "x" }, fr: { titulo: "Circuit" }, pt: {} },
    }, { temas: new Set(), etiquetas: new Set(), fichas: { lugares: new Set(["plaza-belgrano"]) } });
    assert.deepEqual(datos.traducciones, { en: { titulo: "Route" } });
    assert.deepEqual((datos.paradas as Record<string, unknown>[])[0].traducciones, { en: { nombre: "Downtown streets" } });
  });
});

describe("contenido inicial", () => {
  it("todas las fichas publicadas tienen título en inglés y en portugués", () => {
    const sinTraducir = leerSemilla()
      .filter((f) => f.estado === "publicado" && f.coleccion !== "configuracion")
      .filter((f) => !tieneTraduccion(f.datos, "en") || !tieneTraduccion(f.datos, "pt"))
      .map((f) => `${f.coleccion}/${f.slug}`);
    assert.deepEqual(sinTraducir, []);
  });
});
