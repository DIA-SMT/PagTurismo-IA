/** Museos y centros culturales: qué lugar es qué, el orden, las actividades por lugar, los talleres y los lunes. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { OcurrenciaAgenda } from "../lib/cultura/agenda.ts";
import {
  CENTROS_CULTURALES, MUSEOS_MUNICIPALES, actividadesEn, actividadesPorLugar, enOrden, esCentroCultural, esMuseo,
  museosCerrados, museosDe, talleresDelCentro,
} from "../lib/cultura/espacios.ts";
import type { Taller } from "../lib/cultura/talleres.ts";

const lugar = (slug: string, clase: string, titulo = slug) => ({ slug, clase, titulo });

describe("Museos y centros culturales", () => {
  it("reconoce los museos por la lista municipal o por la clase, en cualquier idioma", () => {
    assert.ok(esMuseo(lugar("casa-belgraniana", "casa histórica")));
    for (const clase of ["museo", "Museum", "museu a céu aberto", "museo al aire libre"]) assert.ok(esMuseo(lugar("x", clase)), clase);
    assert.ok(!esMuseo(lugar("plaza-belgrano", "plaza")));
    assert.ok(esCentroCultural(lugar("casa-del-bicentenario", "centro cultural")));
    assert.ok(!esCentroCultural(lugar("centro-cultural-rouges", "espacio cultural")));
  });

  it("ordena los municipales como el documento y saltea los que no están publicados", () => {
    const lugares = [lugar("museo-escultorico", "museo al aire libre", "Museo Escultórico"), lugar("casa-belgraniana", "museo"),
      lugar("casa-museo-de-la-ciudad", "museo"), lugar("casa-historica", "museo", "Casa Histórica"), lugar("plaza", "plaza")];
    const { municipales, otros } = museosDe(lugares);
    assert.deepEqual(municipales.map((l) => l.slug), ["casa-museo-de-la-ciudad", "casa-belgraniana"]);
    assert.deepEqual(otros.map((l) => l.slug), ["casa-historica", "museo-escultorico"]);
    assert.deepEqual(enOrden([lugar("casa-de-la-cultura", "x")], CENTROS_CULTURALES).map((l) => l.slug), ["casa-de-la-cultura"]);
    assert.equal(MUSEOS_MUNICIPALES.length, 4);
    assert.equal(CENTROS_CULTURALES.length, 4);
  });

  it("cuenta las próximas actividades de cada lugar", () => {
    const o = (lugarSlug?: string) => ({ lugarSlug } as OcurrenciaAgenda);
    const ocurrencias = [o("casa-de-la-cultura"), o("casa-de-la-cultura"), o("casa-belgraniana"), o(undefined), o("plaza")];
    const en = actividadesEn(ocurrencias, ["casa-de-la-cultura", "casa-belgraniana"]);
    assert.equal(en.length, 3);
    assert.deepEqual([...actividadesPorLugar(en)], [["casa-de-la-cultura", 2], ["casa-belgraniana", 1]]);
  });

  it("lista los talleres de un centro por día de la semana", () => {
    const taller = (id: string, centro: string, dias: number[]) =>
      ({ id, titulo: id, centro, horarios: dias.map((dia) => ({ dia, desde: "10:00" })) } as unknown as Taller);
    const lista = talleresDelCentro([taller("yoga", "a", [3, 1, 3]), taller("tango", "a", [1]), taller("otro", "b", [2])], "a");
    assert.deepEqual(lista.map((x) => [x.taller.id, x.dias]), [["tango", [1]], ["yoga", [1, 3]]]);
  });

  it("los lunes los museos cierran", () => {
    assert.ok(museosCerrados(1));
    for (const dia of [0, 2, 3, 4, 5, 6]) assert.ok(!museosCerrados(dia));
  });
});
