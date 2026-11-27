/** Alojamientos del Ente y la dirección de cada evento de la agenda. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { areaDe } from "../lib/cultura/areas.ts";
import { coincide, type OcurrenciaAgenda } from "../lib/cultura/agenda.ts";
import {
  agrupar, alojamientoDesdeEnte, cuentaDeRed, direccionProlija, nombreProlijo, telefonoParaLlamar, webPropia,
  type Alojamiento, type ArchivoAlojamientos,
} from "../lib/turismo/alojamientos.ts";

describe("Alojamientos del registro del Ente", () => {
  it("ordena los nombres y las direcciones escritos en mayúsculas", () => {
    assert.equal(nombreProlijo("SHERATON TUCUMAN "), "Sheraton Tucuman");
    assert.equal(nombreProlijo("TP APART HOTEL"), "TP Apart Hotel");
    assert.equal(nombreProlijo("GARDEN PARK SUITES & EVENTOS"), "Garden Park Suites & Eventos");
    assert.equal(nombreProlijo("DEL JARDÍN"), "Del Jardín");
    assert.equal(direccionProlija("SANTIAGO DEL ESTERO 419"), "Santiago del Estero 419");
    assert.equal(direccionProlija("AV.BRIGIDO TERAN 227"), "Av. Brigido Teran 227");
    assert.equal(direccionProlija("Crisóstomo Álvarez 627"), "Crisóstomo Álvarez 627");
  });

  it("arma las cuentas de Instagram aunque el registro las tenga rotas, y descarta lo que no es de la red", () => {
    const ig = (v: string) => cuentaDeRed(v, "instagram.com");
    assert.equal(ig("https://www.instagram.com/@alagurdahostel.tuc"), "https://www.instagram.com/alagurdahostel.tuc/");
    assert.equal(ig("https://www.instagram.com/instagram/hoteltucumancenter"), "https://www.instagram.com/hoteltucumancenter/");
    assert.equal(ig("https://www.instagram.com/hotelmetropol.tuc/?hl=es"), "https://www.instagram.com/hotelmetropol.tuc/");
    assert.equal(ig("@hotelsolarnorte"), "https://www.instagram.com/hotelsolarnorte/");
    assert.equal(ig("https://www.@sheratontucuman.com"), undefined);
    assert.equal(ig("null"), undefined);
  });

  it("no toma como sitio propio el del Ente ni direcciones rotas", () => {
    assert.equal(webPropia("https://www.tucumanturismo.gob.ar"), undefined);
    assert.equal(webPropia("www.hotelfrancia.com.ar/"), "https://www.hotelfrancia.com.ar/");
    assert.equal(webPropia("https://www.@sheratontucuman.com"), undefined);
  });

  it("saca un número para llamar del texto del teléfono", () => {
    assert.equal(telefonoParaLlamar("+543814937828"), "+543814937828");
    assert.equal(telefonoParaLlamar("0381-2441320 y 381-4159705"), "+543812441320");
    assert.equal(telefonoParaLlamar("4222738 / 0381 455-8875"), "+543814222738");
    assert.equal(telefonoParaLlamar("(0381) 4311136 / (0381) 5624299"), "+543814311136");
    assert.equal(telefonoParaLlamar(undefined), undefined);
  });

  it("convierte una fila de la API y agrupa los hoteles por estrellas", () => {
    const a = alojamientoDesdeEnte({ id: "1", nombre: "COLONIAL", categoria: "Hoteles", estrellas: "3", domicilio: "San Martí­n 35", web: "null", instagram: null, servicios: "Wi-Fi,Cochera", latitud: "-26.83", longitud: "-65.19" });
    assert.deepEqual([a.nombre, a.tipo, a.estrellas, a.direccion, a.web, a.servicios], ["Colonial", "hotel", 3, "San Martín 35", undefined, ["Wi-Fi", "Cochera"]]);
    assert.deepEqual(a.coordenadas, { lat: -26.83, lng: -65.19 });
    const h = (id: string, tipo: Alojamiento["tipo"], estrellas: number) => ({ id, nombre: id, tipo, estrellas, servicios: [] }) as Alojamiento;
    assert.deepEqual(agrupar([h("a", "hostel", 0), h("b", "hotel", 3), h("c", "hotel", 5), h("d", "hotel", 3)]).map((g) => [g.clave, g.lista.length]),
      [["hotel-5", 1], ["hotel-3", 2], ["hostel", 1]]);
  });

  it("el archivo del portal tiene los alojamientos de la capital, con su fuente", () => {
    const datos = JSON.parse(readFileSync("datos/turismo/alojamientos.json", "utf8")) as ArchivoAlojamientos;
    assert.match(datos.fuente, /Ente Tucumán Turismo/);
    assert.ok(datos.alojamientos.length >= 20);
    assert.equal(new Set(datos.alojamientos.map((a) => a.id)).size, datos.alojamientos.length);
    for (const a of datos.alojamientos) {
      assert.ok(a.nombre && a.nombre !== a.nombre.toUpperCase(), a.nombre);
      if (a.instagram) assert.match(a.instagram, /^https:\/\/www\.instagram\.com\/[\w.-]+\/$/);
    }
  });
});

describe("Dirección de cada evento", () => {
  it("usa la cargada y, si falta, la deduce del lugar", () => {
    assert.equal(areaDe({ area: "turismo", lugar: "casa-belgraniana" }), "turismo");
    assert.equal(areaDe({ lugar: "casa-belgraniana" }), "museos");
    assert.equal(areaDe({ lugar: "casa-del-bicentenario" }), "gestion-cultural");
    assert.equal(areaDe({ lugar: "palacio-de-los-deportes" }), "palacio-deportes");
    assert.equal(areaDe({ lugar: "plaza-independencia" }), undefined);
    assert.equal(areaDe({ area: "otra-cosa" }), undefined);
  });

  it("el filtro de la agenda por dirección", () => {
    const o = { titulo: "Muestra", rubros: [], gratis: true, area: "museos" } as unknown as OcurrenciaAgenda;
    const f = { q: "", rubro: "", lugar: "", gratis: false };
    assert.ok(coincide(o, { ...f, area: "museos" }));
    assert.ok(!coincide(o, { ...f, area: "gestion-cultural" }));
    assert.ok(coincide(o, { ...f, area: "" }));
  });
});
