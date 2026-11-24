/** Mapa interactivo: datos del mapa municipal validados, capas del portal y búsqueda. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buscarFicha, capasDelPortal, normalizarMunicipal, puntosVisibles } from "../lib/mapa.ts";

const menu = [
  { idSubopcion: 16, nombre_opcion: "CULTURA", nombre_subopcion: "Museos", color: "#7b1fa2", habilita: 1 },
  { idSubopcion: 8, nombre_opcion: "ESPACIOS VERDES", nombre_subopcion: "Plazas", color: "javascript:alert(1)", habilita: 1 },
  { idSubopcion: 34, nombre_opcion: "CORTES TRANSITO", nombre_subopcion: "Eventos Públicos", color: "#000000", habilita: 1 },
  { idSubopcion: 99, nombre_opcion: "OCULTA", nombre_subopcion: "Deshabilitada", color: "#000000", habilita: 0 },
];
const ubicaciones = [
  { idUbicacion: 1, idSubopcion: 16, nombre_ubicacion: "Museo Casa Histórica de la Independencia", detalle: "  Donde se declaró\n la independencia. ", lat: "-26.8327", lon: "-65.2037", url_sitio: "https://casahistorica.org.ar", habilita: 1 },
  { idUbicacion: 2, idSubopcion: 8, nombre_ubicacion: "Plaza Urquiza", lat: "-26.8240", lon: "-65.1950", url_sitio: "javascript:alert(1)", habilita: 1 },
  { idUbicacion: 3, idSubopcion: 8, nombre_ubicacion: "Punto en el océano", lat: "0", lon: "0", habilita: 1 },
  { idUbicacion: 4, idSubopcion: 8, nombre_ubicacion: "Sin coordenadas", lat: "", lon: "x", habilita: 1 },
  { idUbicacion: 5, idSubopcion: 8, nombre_ubicacion: "Plaza dada de baja", lat: "-26.82", lon: "-65.20", habilita: 0 },
  { idUbicacion: 6, idSubopcion: 99, nombre_ubicacion: "De una capa deshabilitada", lat: "-26.82", lon: "-65.20", habilita: 1 },
];
const fichas = [{ titulo: "Casa Histórica de la Independencia", url: "/lugares/casa-historica" }];

describe("Mapa: datos de la Municipalidad", () => {
  const { capas, puntos } = normalizarMunicipal(menu, ubicaciones, fichas);

  it("deja solo puntos válidos, dentro de Tucumán y de capas habilitadas", () => {
    assert.deepEqual(puntos.map((p) => p.nombre), ["Museo Casa Histórica de la Independencia", "Plaza Urquiza"]);
    assert.equal(puntos[0].detalle, "Donde se declaró la independencia.");
    assert.equal(puntos[0].lat, -26.8327);
  });

  it("valida enlaces y colores: nada que no sea http(s) o un color #rrggbb", () => {
    assert.equal(puntos[1].url, undefined);
    assert.equal(capas.find((k) => k.nombre === "Plazas")?.color, "#1878d6");
  });

  it("enlaza a la ficha del portal cuando el nombre coincide", () => {
    assert.equal(puntos[0].ficha, "/lugares/casa-historica");
    assert.equal(buscarFicha("Plaza", fichas), undefined, "nombres cortos no se emparejan");
  });

  it("arma las capas con su grupo, saca las vacías y enciende las turísticas", () => {
    assert.deepEqual(capas.map((k) => [k.grupo, k.nombre, k.porDefecto]), [["Cultura", "Museos", true], ["Espacios verdes", "Plazas", false]]);
  });

  it("si la API devuelve cualquier cosa, no se rompe", () => {
    assert.deepEqual(normalizarMunicipal(null, { error: "x" }), { capas: [], puntos: [] });
  });
});

describe("Mapa: el portal y la búsqueda", () => {
  const portal = capasDelPortal([
    { slug: "casa-historica", titulo: "Casa Histórica", resumen: "Museo", coordenadas: { lat: -26.8327, lng: -65.2037 }, comida: false, url: "/lugares/casa-historica" },
    { slug: "el-portal", titulo: "El Portal", coordenadas: { lat: -26.83, lng: -65.20 }, comida: true, url: "/lugares/el-portal" },
    { slug: "sin-coordenadas", titulo: "Sin coordenadas", comida: false, url: "/lugares/sin" },
  ], { grupo: "Portal de Turismo", visitar: "Para visitar", comer: "Para comer" });

  it("los lugares del portal con coordenadas, para visitar o para comer", () => {
    assert.deepEqual(portal.puntos.map((p) => [p.nombre, p.capa]), [["Casa Histórica", "p-visitar"], ["El Portal", "p-comer"]]);
    assert.deepEqual(portal.capas.map((k) => k.nombre), ["Para visitar", "Para comer"]);
  });

  it("busca sin tildes dentro de las capas encendidas", () => {
    const datos = { capas: portal.capas, puntos: portal.puntos, municipal: false };
    assert.deepEqual(puntosVisibles(datos, new Set(["p-visitar", "p-comer"]), "historica").map((p) => p.nombre), ["Casa Histórica"]);
    assert.deepEqual(puntosVisibles(datos, new Set(["p-comer"]), ""), [portal.puntos[1]]);
  });
});
