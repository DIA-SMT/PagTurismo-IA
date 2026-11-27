/** Agenda cultural: filtros, calendario mensual y exportación .ics. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  contarPorDia, filtrarAgenda, filtrosAUrl, intensidad, leerFiltrosAgenda, opcionesConFechas, semanasDelMes, sumarMeses,
  type FiltrosAgenda, type OcurrenciaAgenda,
} from "../lib/cultura/agenda.ts";
import { icsDeEvento, plegar } from "../lib/cultura/ics.ts";
import { aInstante } from "../lib/fechas.ts";

// Miércoles 18 de noviembre de 2026, 12:00 en Tucumán.
const AHORA = aInstante("2026-11-18T12:00");

const base = (o: Partial<OcurrenciaAgenda> & { evento: string; inicio: string }): OcurrenciaAgenda => ({
  estado: "confirmado", enCurso: false, titulo: o.evento, url: `/agenda/${o.evento}`, rubros: [], gratis: false,
  destacado: false, fueraDeLaCiudad: false, ...o,
});

const LISTA: OcurrenciaAgenda[] = [
  base({ evento: "concierto", inicio: "2026-11-18T21:00", titulo: "Concierto de la Banda", rubros: ["musica"], gratis: true, lugar: "Teatro San Martín", lugarSlug: "teatro-san-martin" }),
  base({ evento: "obra", inicio: "2026-11-21T20:00", titulo: "Obra de teatro", rubros: ["teatro"], lugar: "Teatro Rosita Ávila", lugarSlug: "teatro-rosita-avila" }),
  base({ evento: "feria", inicio: "2026-11-21", fin: "2026-11-22", titulo: "Feria de artesanos", rubros: ["ferias-artesanos"], gratis: true, destacado: true }),
  base({ evento: "pasado", inicio: "2026-11-10T20:00", titulo: "Ya pasó" }),
  base({ evento: "cancelado", inicio: "2026-11-25T20:00", estado: "cancelado", titulo: "Recital cancelado", rubros: ["musica"] }),
  base({ evento: "muestra", inicio: "2026-11-01", fin: "2026-12-10", titulo: "Muestra de fotografía", rubros: ["fotografia"] }),
];

const filtros = (f: Partial<FiltrosAgenda> = {}): FiltrosAgenda => ({ cuando: "proximos", fecha: "", q: "", rubro: "", lugar: "", area: "", gratis: false, ...f });

describe("filtros de la agenda", () => {
  it("saca lo que ya terminó y deja lo cancelado rotulado", () => {
    const r = filtrarAgenda(LISTA, filtros(), AHORA).map((o) => o.evento);
    assert.ok(!r.includes("pasado"));
    assert.ok(r.includes("cancelado"));
    assert.ok(r.includes("muestra"), "una muestra en curso sigue apareciendo");
  });

  it("busca sin tildes ni mayúsculas en título y lugar", () => {
    assert.deepEqual(filtrarAgenda(LISTA, filtros({ q: "rosita avila" }), AHORA).map((o) => o.evento), ["obra"]);
    assert.deepEqual(filtrarAgenda(LISTA, filtros({ q: "FERIA" }), AHORA).map((o) => o.evento), ["feria"]);
  });

  it("filtra por categoría, lugar y gratuidad", () => {
    assert.deepEqual(filtrarAgenda(LISTA, filtros({ rubro: "musica" }), AHORA).map((o) => o.evento), ["concierto", "cancelado"]);
    assert.deepEqual(filtrarAgenda(LISTA, filtros({ lugar: "teatro-san-martin" }), AHORA).map((o) => o.evento), ["concierto"]);
    assert.deepEqual(filtrarAgenda(LISTA, filtros({ gratis: true }), AHORA).map((o) => o.evento).sort(), ["concierto", "feria"]);
  });

  it("el fin de semana trae lo del sábado y domingo, destacados primero", () => {
    const r = filtrarAgenda(LISTA, filtros({ cuando: "finde" }), AHORA).map((o) => o.evento);
    assert.equal(r[0], "feria");
    assert.ok(r.includes("obra") && r.includes("muestra"));
    assert.ok(!r.includes("concierto"));
  });

  it("los filtros van y vuelven de la URL", () => {
    const f = filtros({ cuando: "fecha", fecha: "2026-11-21", q: "feria", rubro: "ferias-artesanos", gratis: true });
    const url = filtrosAUrl(f);
    assert.deepEqual(leerFiltrosAgenda(new URLSearchParams(url)), f);
    assert.equal(filtrosAUrl(filtros()), "");
  });

  it("los selectores solo ofrecen categorías y lugares con fechas por venir", () => {
    const { rubros, lugares } = opcionesConFechas(LISTA, AHORA);
    assert.ok(rubros.has("musica") && rubros.has("teatro"));
    assert.ok(!lugares.some((l) => l.slug === "otro"));
    assert.deepEqual(lugares.map((l) => l.slug), ["teatro-rosita-avila", "teatro-san-martin"]);
  });
});

describe("calendario mensual", () => {
  it("arma semanas de lunes a domingo", () => {
    const semanas = semanasDelMes("2026-11");
    // El 1 de noviembre de 2026 es domingo: seis huecos antes.
    assert.deepEqual(semanas[0], [null, null, null, null, null, null, "2026-11-01"]);
    assert.ok(semanas.every((s) => s.length === 7));
    assert.equal(semanas.flat().filter(Boolean).length, 30);
  });

  it("cuenta eventos distintos por día, sin los cancelados", () => {
    const dias = contarPorDia(LISTA, "2026-11");
    assert.equal(dias.get("2026-11-21")?.eventos, 3); // obra, feria y la muestra
    assert.equal(dias.get("2026-11-22")?.eventos, 2); // feria y muestra
    assert.equal(dias.get("2026-11-25")?.eventos, 1); // solo la muestra: el recital está cancelado
    assert.equal(dias.get("2026-11-01")?.eventos, 1);
  });

  it("la muestra de varios meses aparece en diciembre también", () => {
    const dias = contarPorDia(LISTA, "2026-12");
    assert.equal(dias.get("2026-12-10")?.eventos, 1);
    assert.equal(dias.get("2026-12-11"), undefined);
  });

  it("navega entre meses y escala la intensidad", () => {
    assert.equal(sumarMeses("2026-12", 1), "2027-01");
    assert.equal(sumarMeses("2026-01", -1), "2025-12");
    assert.deepEqual([0, 1, 3, 6].map(intensidad), [0, 1, 2, 3]);
  });
});

describe("exportación al calendario", () => {
  const evento = {
    slug: "feria", titulo: "Feria; artesanos, y más", resumen: "Todo el fin de semana", url: "https://turismo.smt.gob.ar/agenda/feria",
    lugar: "Plaza Independencia",
    ocurrencias: [
      { inicio: "2026-11-21", fin: "2026-11-22", estado: "confirmado" as const },
      { inicio: "2026-11-28T18:00", fin: "2026-11-28T22:00", estado: "cancelado" as const },
      { inicio: "2026-10-01T18:00", estado: "confirmado" as const },
    ],
  };

  it("incluye todas las fechas vigentes, con las canceladas marcadas", () => {
    const ics = icsDeEvento(evento, AHORA);
    assert.equal(ics.match(/BEGIN:VEVENT/g)?.length, 2);
    assert.match(ics, /DTSTART;VALUE=DATE:20261121\r\nDTEND;VALUE=DATE:20261123/);
    assert.match(ics, /DTSTART:20261128T210000Z/);
    assert.match(ics, /STATUS:CANCELLED/);
    assert.match(ics, /SUMMARY:Feria\\; artesanos\\, y más/);
  });

  it("pliega las líneas largas sin pasar los 75 octetos", () => {
    const larga = `DESCRIPTION:${"ñ".repeat(100)}`;
    const lineas = plegar(larga).split("\r\n");
    assert.ok(lineas.length > 1);
    assert.ok(lineas.every((l) => Buffer.byteLength(l) <= 75));
    assert.equal(lineas.map((l, i) => (i ? l.slice(1) : l)).join(""), larga);
  });
});

describe("portada de la agenda", () => {
  // Importado acá para no tocar los de arriba.
  it("la semana cuenta los próximos 7 días, aunque cambie el mes", async () => {
    const { proximosDias } = await import("../lib/cultura/agenda.ts");
    const semana = proximosDias(LISTA, "2026-11-28");
    assert.equal(semana.length, 7);
    assert.equal(semana[0].dia, "2026-11-28");
    assert.equal(semana[6].dia, "2026-12-04");
    assert.ok(semana.every((d) => d.eventos >= 1), "la muestra cubre toda la semana");
  });

  it("las categorías populares no cuentan lo cancelado ni lo pasado", async () => {
    const { categoriasPopulares } = await import("../lib/cultura/agenda.ts");
    const populares = categoriasPopulares(LISTA, AHORA);
    assert.deepEqual(populares.find((p) => p.id === "musica"), { id: "musica", eventos: 1 });
    assert.ok(!populares.some((p) => p.eventos === 0));
  });

  it("los próximos eventos dan una fecha por evento, destacados primero, sin cancelados", async () => {
    const { proximosEventos } = await import("../lib/cultura/agenda.ts");
    const r = proximosEventos(LISTA, AHORA, 4);
    assert.equal(r[0].evento, "feria");
    assert.equal(new Set(r.map((o) => o.evento)).size, r.length);
    assert.ok(!r.some((o) => o.estado === "cancelado" || o.evento === "pasado"));
  });
});
