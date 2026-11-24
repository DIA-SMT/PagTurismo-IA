/** Importación de la Agenda Cultural a public.contenidos: espacios, eventos, fechas y no duplicar. */
import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";

import {
  aHoraLocal, buscarLugar, buscarPorLegado, categoriasNuevas, desdeEventOn, espacioALugar, eventoAContenido, fusionarLugar,
  completarVacios, slugLibre, sumarFechas, type EspacioAgenda, type EventoOrigen, type FichaExistente,
} from "../lib/cultura/importar.ts";
import { buildPlan } from "../lib/cultura/eventon.mjs";
import { leerSemilla } from "../lib/db/semilla.ts";
import { normalizarEvento, normalizarLugar } from "../lib/normalizar.ts";

const espacios: EspacioAgenda[] = ["espacios-culturales", "espacios-al-aire-libre"]
  .flatMap((f) => JSON.parse(fs.readFileSync(`datos/cultura/${f}.json`, "utf8")).espacios);
const lugaresPortal: FichaExistente[] = leerSemilla().filter((f) => f.coleccion === "lugares");

describe("espacios de la Agenda → lugares", () => {
  it("convierte cada espacio a un lugar válido para el portal", () => {
    for (const e of espacios) {
      const l = normalizarLugar(espacioALugar(e), e.slug);
      assert.ok(l.titulo && l.tipoEspacio, e.slug);
      assert.equal(l.legado?.origen, "agenda");
    }
  });

  it("parques y plazas son al aire libre; museos y teatros, culturales", () => {
    const tipo = (slug: string) => espacioALugar(espacios.find((e) => e.slug === slug)!).tipoEspacio;
    assert.equal(tipo("parque-9-de-julio"), "aire-libre");
    assert.equal(tipo("plaza-urquiza"), "aire-libre");
    assert.equal(tipo("teatro-rosita-avila"), "cultural");
  });

  it("el horario relevado entra como dato a confirmar", () => {
    const l = espacioALugar(espacios.find((e) => e.slug === "casa-historica")!);
    if (l.horario) assert.equal((l.horario as { confirmado: boolean }).confirmado, false);
  });

  it("encuentra el lugar del portal por slug, alias o nombre, sin duplicar", () => {
    const buscar = (slug: string) => buscarLugar(espacios.find((e) => e.slug === slug)!, lugaresPortal).slug;
    assert.equal(buscar("casa-historica"), "casa-historica");
    assert.equal(buscar("museo-de-la-industria-azucarera-mia"), "museo-industria-azucarera");
    assert.equal(buscar("museo-mercedes-sosa"), "casa-natal-mercedes-sosa");
    assert.equal(buscar("plaza-independencia"), "plaza-independencia");
    assert.equal(buscar("casa-belgraniana"), undefined, "un espacio nuevo se crea");
  });

  it("al fusionar solo completa lo vacío y no toca lo que cargó el equipo", () => {
    const existente = { titulo: "Teatro del portal", resumen: "Texto del equipo", direccion: "", contacto: { telefono: "111" }, galeria: [] };
    const nuevo = espacioALugar({ ...espacios[0], slug: "x" });
    const { datos, cambios } = fusionarLugar(existente, nuevo);
    assert.equal(datos.titulo, "Teatro del portal");
    assert.equal(datos.resumen, "Texto del equipo");
    assert.equal((datos.contacto as { telefono: string }).telefono, "111");
    assert.ok(cambios.includes("legado"));
    assert.ok(!cambios.includes("titulo"));
    const otra = fusionarLugar(datos, nuevo);
    assert.deepEqual(otra.cambios, [], "fusionar dos veces no cambia nada");
  });
});

describe("eventos → contenidos", () => {
  const origen: EventoOrigen = {
    origen: "agenda", id: "8f1c", slug: "concierto", titulo: "Concierto", estado: "publicado", acceso: "free", precio: "",
    lugarAgenda: "teatro-rosita-avila", categorias: [{ slug: "musica", nombre: "Música" }],
    fechas: [
      { inicio: "2026-11-21T23:00:00.000Z", fin: "2026-11-22T01:00:00.000Z", estado: "scheduled" },
      { inicio: "2026-11-28T23:00:00.000Z", estado: "cancelled", nota: "Por lluvia" },
      { inicio: "2026-11-21T23:00:00.000Z" },
      { inicio: "2026-12-05T03:00:00.000Z", todoElDia: true },
    ],
  };
  const datos = eventoAContenido(origen, new Map([["teatro-rosita-avila", "teatro-rosita-avila"]]));
  const e = normalizarEvento(datos, "concierto");

  it("pasa las fechas a hora de Tucumán, sin repetir, con su estado", () => {
    assert.deepEqual(e.ocurrencias.map((o) => [o.inicio, o.fin, o.estado]), [
      ["2026-11-21T20:00", "2026-11-21T22:00", "confirmado"],
      ["2026-11-28T20:00", undefined, "cancelado"],
      ["2026-12-05", undefined, "confirmado"],
    ]);
    assert.equal(e.ocurrencias[1].nota, "Por lluvia");
  });

  it("enlaza el lugar del portal, marca la gratuidad y las categorías", () => {
    assert.equal(e.lugar, "teatro-rosita-avila");
    assert.equal(e.costo.modalidad, "gratis");
    assert.deepEqual(e.rubros, ["musica"]);
    assert.equal(e.clase, "espectaculo");
    assert.deepEqual(e.legado, { origen: "agenda", id: "8f1c", url: undefined });
  });

  it("sin lugar con ficha, guarda la sede y la dirección", () => {
    const d = normalizarEvento(eventoAContenido({ ...origen, lugarAgenda: null, sede: "Club X", direccion: "Calle 1", lat: -26.8, lng: -65.2 }, new Map()), "x");
    assert.equal(d.lugar, undefined);
    assert.equal(d.sede, "Club X");
    assert.deepEqual(d.lugarManual, { direccion: "Calle 1", coordenadas: { lat: -26.8, lng: -65.2 } });
  });

  it("con ficha de lugar igual guarda nombre y dirección (por si la ficha sigue en borrador)", () => {
    const d = eventoAContenido(origen, new Map([["teatro-rosita-avila", "teatro-rosita-avila"]]),
      new Map([["teatro-rosita-avila", "Teatro Rosita Ávila"]]), new Map([["teatro-rosita-avila", "Las Piedras 1550"]]));
    assert.equal(d.lugar, "teatro-rosita-avila");
    assert.equal(d.sede, "Teatro Rosita Ávila");
    assert.deepEqual(d.lugarManual, { direccion: "Las Piedras 1550" });
  });

  it("al actualizar completa el lugar vacío y no pisa lo editado", () => {
    const nuevo = { sede: "Teatro Rosita Ávila", lugarManual: { direccion: "Las Piedras 1550" } };
    const vacio = completarVacios({ titulo: "x", lugar: "teatro-rosita-avila" }, nuevo);
    assert.ok(vacio.completado);
    assert.equal(vacio.datos.sede, "Teatro Rosita Ávila");
    assert.deepEqual(vacio.datos.lugarManual, { direccion: "Las Piedras 1550" });
    const editado = completarVacios({ sede: "Sala Mayor", lugarManual: { direccion: "Otra 1" } }, nuevo);
    assert.equal(editado.completado, false);
    assert.equal(editado.datos.sede, "Sala Mayor");
  });

  it("reconoce lo ya importado por su legado y busca un slug libre", () => {
    const existentes: FichaExistente[] = [{ coleccion: "eventos", slug: "concierto", estado: "publicado", datos }];
    assert.ok(buscarPorLegado(existentes, origen));
    assert.equal(buscarPorLegado(existentes, { origen: "wordpress", id: "8f1c" }), undefined);
    assert.equal(slugLibre(origen, new Set(["concierto"])), "concierto-8f1c");
    assert.equal(slugLibre(origen, new Set()), "concierto");
  });

  it("al actualizar solo suma fechas nuevas y respeta el estado editado", () => {
    const editado = { ...datos, ocurrencias: [{ inicio: "2026-11-21T20:00", estado: "suspendido" }] };
    const { datos: d, agregadas } = sumarFechas(editado, datos);
    assert.equal(agregadas, 2);
    const ocurrencias = d.ocurrencias as { inicio: string; estado: string }[];
    assert.equal(ocurrencias.find((o) => o.inicio === "2026-11-21T20:00")?.estado, "suspendido");
  });

  it("agrega solo las categorías que faltan", () => {
    const nuevas = categoriasNuevas([{ id: "musica" }], [{ slug: "musica", nombre: "Música" }, { slug: "circo", nombre: "Circo" }, { slug: "Mal Slug", nombre: "x" }]);
    assert.deepEqual(nuevas.map((k) => k.id), ["circo"]);
  });

  it("convierte la hora de Tucumán bien en los bordes del día", () => {
    assert.equal(aHoraLocal("2026-11-22T02:30:00.000Z"), "2026-11-21T23:30");
    assert.equal(aHoraLocal("2026-11-22T03:00:00.000Z", true), "2026-11-22");
  });
});

describe("WordPress viejo (EventON) → contenidos", () => {
  const muestra = JSON.parse(fs.readFileSync("lib/cultura/__fixtures__/eventon-muestra.json", "utf8"));
  const terms = [{ id: 120, slug: "musica", name: "Música" }, { id: 129, slug: "teatro", name: "Teatro" }];
  const plan = buildPlan({ ...muestra, terms, places: espacios.map(({ slug, name }) => ({ slug, name })) });

  it("arma eventos válidos del portal con su id de WordPress", () => {
    const nombres = new Map(plan.categories.map((k) => [k.slug, k.name]));
    for (const ev of plan.events.filter((x) => x.occurrences.length)) {
      const e = normalizarEvento(eventoAContenido(desdeEventOn(ev, nombres), new Map()), ev.slug);
      assert.equal(e.legado?.origen, "wordpress");
      assert.equal(e.legado?.id, ev.legacyId);
      assert.ok(e.ocurrencias.length > 0 && e.ocurrencias.every((o) => /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(o.inicio)));
    }
  });
});
