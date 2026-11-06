/** Revisión de lo que manda un formulario del panel (lib/admin/limpiar.ts). */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ESQUEMAS, ESQUEMA_TEMAS, esquemaDe } from "../lib/admin/esquemas.ts";
import { limpiarFicha, slugDe, type Contexto } from "../lib/admin/limpiar.ts";
import { leerSemilla } from "../lib/db/semilla.ts";
import { normalizarExperiencia, normalizarLugar } from "../lib/normalizar.ts";

const ctx: Contexto = {
  temas: new Set(["historia-y-patrimonio", "parques-y-aire-libre"]),
  etiquetas: new Set(["gratis", "a-pie"]),
  fichas: { lugares: new Set(["plaza-independencia", "casa-historica"]), experiencias: new Set(["city-tour-bus-turistico"]) },
};

describe("campos obligatorios y tipos", () => {
  it("marca los obligatorios que faltan, con la ruta del campo", () => {
    const { errores } = limpiarFicha(esquemaDe("recorridos")!, { paradas: [{ nota: "x" }] }, ctx);
    assert.ok(errores.titulo);
    assert.ok(errores.resumen);
    assert.ok(errores["paradas.0.nombre"]);
  });

  it("convierte números y casillas, recorta textos y descarta campos desconocidos", () => {
    const { datos, errores } = limpiarFicha(esquemaDe("lugares")!, {
      titulo: "  Plaza  ", clase: "plaza", resumen: "R", imperdible: "on", inventado: "x",
      coordenadas: { lat: "-26.83", lng: "" }, costo: { modalidad: "gratis" },
    }, ctx);
    assert.deepEqual(errores, {});
    assert.equal(datos.titulo, "Plaza");
    assert.equal(datos.imperdible, true);
    assert.equal("inventado" in datos, false);
    assert.deepEqual(datos.coordenadas, { lat: -26.83 });
  });

  it("rechaza opciones, fechas y direcciones inválidas", () => {
    const { errores } = limpiarFicha(esquemaDe("eventos")!, {
      titulo: "E", resumen: "R", clase: "concierto",
      ocurrencias: [{ inicio: "mañana" }], urlOficial: "www.sin-protocolo.com",
    }, ctx);
    assert.ok(errores.clase);
    assert.ok(errores["ocurrencias.0.inicio"]);
    assert.ok(errores.urlOficial);
  });

  it("solo acepta temas, etiquetas y fichas que existen", () => {
    const { datos, errores } = limpiarFicha(esquemaDe("experiencias")!, {
      titulo: "X", resumen: "R", modalidad: "a-pie", accion: { tipo: "consultar", texto: "Consultar" },
      categorias: ["historia-y-patrimonio", "inventado"], etiquetas: ["gratis", "otra"],
      lugares: ["plaza-independencia", "no-existe"],
    }, ctx);
    assert.deepEqual(datos.categorias, ["historia-y-patrimonio"]);
    assert.deepEqual(datos.etiquetas, ["gratis"]);
    assert.ok(errores.lugares?.includes("no-existe"));
  });
});

describe("reglas entre campos", () => {
  it("Reservar exige el enlace al sistema de reservas", () => {
    const { errores } = limpiarFicha(esquemaDe("experiencias")!, {
      titulo: "X", resumen: "R", modalidad: "bus", accion: { tipo: "reservar", texto: "Reservar" },
    }, ctx);
    assert.ok(errores["accion.url"]);
  });

  it("una fecha no puede terminar antes de empezar", () => {
    const { errores } = limpiarFicha(esquemaDe("eventos")!, {
      titulo: "E", resumen: "R", clase: "espectaculo",
      ocurrencias: [{ inicio: "2026-11-20T21:00", fin: "2026-11-20T19:00", estado: "confirmado" }],
    }, ctx);
    assert.ok(errores["ocurrencias.0.fin"]);
  });

  it("los identificadores de temas no se repiten", () => {
    const { errores } = limpiarFicha(ESQUEMA_TEMAS, {
      categorias: [{ id: "a", titulo: "A", imagen: "/x" }, { id: "a", titulo: "B", imagen: "/y" }], etiquetas: [],
    }, ctx);
    assert.ok(errores["categorias.1.id"]);
  });
});

describe("el contenido inicial pasa por los formularios sin perder nada", () => {
  // Si una ficha de la semilla se abre y se guarda sin tocar, el sitio la tiene que mostrar igual.
  const semilla = leerSemilla();
  const fichas = Object.fromEntries(
    Object.entries(Object.groupBy(semilla, (f) => f.coleccion)).map(([c, l]) => [c, new Set((l ?? []).map((f) => f.slug))]),
  );
  const taxonomia = semilla.find((f) => f.slug === "categorias")!.datos as { categorias: { id: string }[]; etiquetas: { id: string }[] };
  const ctxReal: Contexto = {
    temas: new Set(taxonomia.categorias.map((c) => c.id)),
    etiquetas: new Set(taxonomia.etiquetas.map((e) => e.id)),
    fichas,
  };

  for (const esquema of ESQUEMAS) {
    it(`${esquema.titulo}: sin errores`, () => {
      for (const f of semilla.filter((x) => x.coleccion === esquema.id)) {
        const { errores } = limpiarFicha(esquema, f.datos, ctxReal);
        assert.deepEqual(errores, {}, `${esquema.id}/${f.slug}`);
      }
    });
  }

  it("lugares y experiencias se normalizan igual antes y después", () => {
    for (const f of semilla.filter((x) => x.coleccion === "lugares" || x.coleccion === "experiencias")) {
      const normalizar = f.coleccion === "lugares" ? normalizarLugar : normalizarExperiencia;
      const { datos } = limpiarFicha(esquemaDe(f.coleccion)!, f.datos, ctxReal);
      assert.deepEqual(normalizar(datos, f.slug), normalizar(f.datos, f.slug), `${f.coleccion}/${f.slug}`);
    }
  });
});

describe("dirección (slug)", () => {
  it("se arma con el título sin tildes ni signos", () => {
    assert.equal(slugDe("Fiesta de la Empanada ¡2026!"), "fiesta-de-la-empanada-2026");
    assert.equal(slugDe("  Ñandú & Cía.  "), "nandu-cia");
  });
});
