/** Direcciones en español, inglés y portugués. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { interpretarRuta, localizarRuta, rutaEnOtroIdioma } from "../lib/i18n/config.ts";

describe("localizarRuta", () => {
  it("deja el español como está", () => {
    assert.equal(localizarRuta("/que-hacer?q=museo", "es"), "/que-hacer?q=museo");
  });
  it("traduce la primera sección y conserva el resto", () => {
    assert.equal(localizarRuta("/lugares/museo-escultorico", "en"), "/en/places/museo-escultorico");
    assert.equal(localizarRuta("/que-hacer?categoria=x#buscar", "pt"), "/pt/o-que-fazer?categoria=x#buscar");
    assert.equal(localizarRuta("/", "en"), "/en");
    assert.equal(localizarRuta("/#antes-de-llegar", "pt"), "/pt#antes-de-llegar");
  });
  it("no toca direcciones externas, del panel ni archivos", () => {
    assert.equal(localizarRuta("https://smt.gob.ar", "en"), "https://smt.gob.ar");
    assert.equal(localizarRuta("/admin", "en"), "/admin");
    assert.equal(localizarRuta("/fotos/a.webp", "pt"), "/fotos/a.webp");
  });
});

describe("interpretarRuta", () => {
  it("el español va a /es por dentro", () => {
    assert.deepEqual(interpretarRuta("/"), { tipo: "pagina", idioma: "es", interna: "/es" });
    assert.deepEqual(interpretarRuta("/agenda/x"), { tipo: "pagina", idioma: "es", interna: "/es/agenda/x" });
  });
  it("traduce la sección pública a la interna", () => {
    assert.deepEqual(interpretarRuta("/en/things-to-do"), { tipo: "pagina", idioma: "en", interna: "/en/que-hacer" });
    assert.deepEqual(interpretarRuta("/pt/roteiros/bus-x"), { tipo: "pagina", idioma: "pt", interna: "/pt/recorridos/bus-x" });
    assert.deepEqual(interpretarRuta("/pt/lugares/x"), { tipo: "pagina", idioma: "pt", interna: "/pt/lugares/x" });
    assert.deepEqual(interpretarRuta("/en"), { tipo: "pagina", idioma: "en", interna: "/en" });
  });
  it("redirige /es y las secciones en español dentro de otro idioma", () => {
    assert.deepEqual(interpretarRuta("/es/agenda"), { tipo: "redirigir", destino: "/agenda" });
    assert.deepEqual(interpretarRuta("/es"), { tipo: "redirigir", destino: "/" });
    assert.deepEqual(interpretarRuta("/en/lugares/x"), { tipo: "redirigir", destino: "/en/places/x" });
  });
  it("deja afuera el panel y los archivos", () => {
    assert.deepEqual(interpretarRuta("/admin/lugares"), { tipo: "fuera" });
    assert.deepEqual(interpretarRuta("/sitemap.xml"), { tipo: "fuera" });
  });
});

describe("rutaEnOtroIdioma", () => {
  it("lleva a la misma página en el otro idioma", () => {
    assert.equal(rutaEnOtroIdioma("/lugares/x", "en"), "/en/places/x");
    assert.equal(rutaEnOtroIdioma("/en/places/x", "pt"), "/pt/lugares/x");
    assert.equal(rutaEnOtroIdioma("/pt/o-que-fazer", "es"), "/que-hacer");
    assert.equal(rutaEnOtroIdioma("/en", "es"), "/");
  });
});
