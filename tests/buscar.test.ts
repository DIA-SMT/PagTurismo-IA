/** Catálogo (informe, apartado 13: buscar y filtrar, sin coincidencias, volver con filtros). */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { aParametros, filtrarCatalogo, hayFiltros, leerFiltros, normalizar } from "../lib/buscar.ts";
import type { ItemCatalogo } from "../lib/tipos.ts";

const item = (p: Partial<ItemCatalogo> & Pick<ItemCatalogo, "entidad" | "slug" | "titulo">): ItemCatalogo => ({
  url: `/${p.slug}`, resumen: "", meta: "", categorias: [], etiquetas: [], gratis: false, borrador: false, fueraDeLaCiudad: false, ...p,
});

const items = [
  item({ entidad: "lugar", slug: "casa-historica", titulo: "Museo Casa Histórica de la Independencia", categorias: ["historia"] }),
  item({ entidad: "lugar", slug: "museo-escultorico", titulo: "Museo Escultórico a Cielo Abierto", gratis: true, categorias: ["parques"] }),
  item({ entidad: "recorrido", slug: "primera-vez", titulo: "Primera vez en el centro", resumen: "Pasa por la Casa Histórica", categorias: ["historia"] }),
  item({ entidad: "experiencia", slug: "bus", titulo: "City Tour en Bus Turístico", gratis: true, categorias: ["historia"] }),
];

const params = (q: string) => new URLSearchParams(q);

describe("normalización", () => {
  it("ignora tildes y mayúsculas", () => {
    assert.equal(normalizar("Casa HISTÓRICA"), "casa historica");
  });
});

describe("búsqueda", () => {
  it("prioriza la ficha cuyo título coincide antes que lo que la menciona", () => {
    const r = filtrarCatalogo(items, leerFiltros(params("q=casa historica")));
    assert.deepEqual(r.map((i) => i.slug), ["casa-historica", "primera-vez"]);
  });

  it("un museo gratis", () => {
    const r = filtrarCatalogo(items, leerFiltros(params("q=museo&gratis=1")));
    assert.deepEqual(r.map((i) => i.slug), ["museo-escultorico"]);
  });

  it("sin coincidencias devuelve vacío", () => {
    assert.equal(filtrarCatalogo(items, leerFiltros(params("q=zoologico"))).length, 0);
  });

  it("filtra por tema y tipo", () => {
    const r = filtrarCatalogo(items, leerFiltros(params("categoria=historia&tipo=lugar")));
    assert.deepEqual(r.map((i) => i.slug), ["casa-historica"]);
  });

  it("busca también por el nombre del tema", () => {
    const r = filtrarCatalogo(items, leerFiltros(params("q=parques y aire")), { parques: "Parques y aire libre" });
    assert.deepEqual(r.map((i) => i.slug), ["museo-escultorico"]);
  });
});

describe("filtros en la URL", () => {
  it("ida y vuelta: lo que se escribe en la URL se recupera igual", () => {
    const f = { q: "museo", categoria: "historia", tipo: "lugar" as const, gratis: true };
    assert.deepEqual(leerFiltros(params(aParametros(f).slice(1))), f);
  });

  it("ignora tipos desconocidos y no deja parámetros vacíos", () => {
    assert.equal(leerFiltros(params("tipo=hotel")).tipo, "");
    assert.equal(aParametros({ q: "  ", categoria: "", tipo: "", gratis: false }), "");
    assert.equal(hayFiltros(leerFiltros(params(""))), false);
  });
});
