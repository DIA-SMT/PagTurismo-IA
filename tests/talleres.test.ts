/** Talleres anuales: lectura de la planilla, horarios con errores, filtros y lo que llega a Migue y a la agenda. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deflateRawSync } from "node:zlib";

import { leerXlsx, type HojaPlanilla } from "../lib/cultura/planilla.ts";
import {
  disciplinaDe, esTallerAnual, filtrarTalleres, leerHorarios, prolijo, talleresDeLaHoja, talleresDeLaPlanilla,
} from "../lib/cultura/talleres.ts";
import { fichasDeTalleres } from "../lib/migue.ts";

/** Un .xlsx mínimo (zip con deflate) para probar el lector sin archivos. */
function xlsx(archivos: Record<string, string>): Buffer {
  const locales: Buffer[] = [];
  const centrales: Buffer[] = [];
  let desplazamiento = 0;
  for (const [nombre, texto] of Object.entries(archivos)) {
    const datos = deflateRawSync(Buffer.from(texto, "utf8"));
    const n = Buffer.from(nombre, "utf8");
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(datos.length, 18);
    local.writeUInt16LE(n.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(datos.length, 20);
    central.writeUInt16LE(n.length, 28);
    central.writeUInt32LE(desplazamiento, 42);
    locales.push(local, n, datos);
    centrales.push(central, n);
    desplazamiento += 30 + n.length + datos.length;
  }
  const directorio = Buffer.concat(centrales);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0);
  fin.writeUInt16LE(Object.keys(archivos).length, 10);
  fin.writeUInt32LE(directorio.length, 12);
  fin.writeUInt32LE(desplazamiento, 16);
  return Buffer.concat([...locales, directorio, fin]);
}

const celda = (ref: string, i: number) => `<c r="${ref}" t="s"><v>${i}</v></c>`;

describe("Talleres: la planilla", () => {
  it("lee un .xlsx: hojas, textos compartidos y celdas por columna", () => {
    const textos = ["CASA DE LA CULTURA", "TALLERES", "LUNES", "MARTES", "MUNICIPALES", "YOGA", "10:00 A 11:30", "PROF. HOMERO SANCHEZ"];
    const archivo = xlsx({
      "xl/workbook.xml": '<workbook><sheets><sheet name="CASA DE LA CULTURA" sheetId="1" r:id="rId1"/></sheets></workbook>',
      "xl/_rels/workbook.xml.rels": '<Relationships><Relationship Id="rId1" Type="x" Target="worksheets/sheet1.xml"/></Relationships>',
      "xl/sharedStrings.xml": `<sst>${textos.map((t) => `<si><t>${t}</t></si>`).join("")}</sst>`,
      "xl/worksheets/sheet1.xml": `<worksheet><sheetData>
        <row r="2">${celda("B2", 0)}</row>
        <row r="3">${celda("C3", 1)}${celda("D3", 2)}${celda("E3", 3)}</row>
        <row r="4">${celda("A4", 4)}<c r="B4"><v>1</v></c>${celda("C4", 5)}${celda("E4", 6)}</row>
        <row r="5">${celda("C5", 7)}</row>
      </sheetData></worksheet>`,
    });
    const hojas = leerXlsx(archivo);
    assert.equal(hojas[0].nombre, "CASA DE LA CULTURA");
    const { talleres, problemas } = talleresDeLaPlanilla(hojas);
    assert.deepEqual(problemas, []);
    assert.deepEqual(talleres, [{
      id: "casa-de-la-cultura-yoga", titulo: "Yoga", profesor: "Homero Sanchez", centro: "casa-de-la-cultura", municipal: true,
      disciplina: "bienestar", paraChicos: false, horarios: [{ dia: 2, desde: "10:00", hasta: "11:30" }],
    }]);
  });

  const hoja: HojaPlanilla = {
    nombre: "C.BICENTENARIO",
    filas: [
      { n: 2, celdas: { A: "CASA DEL BICENTENARIO" } },
      { n: 4, celdas: { C: "TALLERES", D: "LUNES", E: "MARTES", F: "MIERCOLES", G: "JUEVES", H: "VIERNES", I: "SÁBADO" } },
      { n: 5, celdas: { A: "MUNICIPALES", B: "1", C: "GUITARRA", G: "15:00 A 17:00" } },
      { n: 6, celdas: { C: "PROF. MANUEL HERRERA" } },
      { n: 8, celdas: { A: "NO MUNICIPALES", B: "2", C: 'FOLKLORE "VIEJO VIZCACHA"', F: "19:30 A 20:30 /20:30 A 22:00" } },
      { n: 9, celdas: { C: "FOLKLORE INFANTIL / FOLKLORE ADULTOS" } },
      { n: 10, celdas: { C: "PROF. CLAUDIO ARGAÑARAZ" } },
      { n: 12, celdas: { B: "3", C: "DANZA ARABE", G: "19:00 A 2O:30" } },
      { n: 13, celdas: { C: "PROF. ERIKA DIAZ" } },
      { n: 15, celdas: { B: "4", C: "STREAMING" } },
    ],
  };

  it("arma cada taller con su detalle, profesor, municipal o no y horarios", () => {
    const { centro, talleres } = talleresDeLaHoja(hoja);
    assert.equal(centro, "casa-del-bicentenario");
    const [guitarra, folklore, danza] = talleres;
    assert.equal(guitarra.municipal, true);
    assert.deepEqual(guitarra.horarios, [{ dia: 4, desde: "15:00", hasta: "17:00" }]);
    assert.equal(folklore.titulo, "Folklore «Viejo Vizcacha»");
    assert.equal(folklore.detalle, "Folklore infantil / folklore adultos");
    assert.equal(folklore.profesor, "Claudio Argañaraz");
    assert.equal(folklore.municipal, false);
    assert.equal(folklore.paraChicos, true);
    assert.equal(folklore.horarios.length, 2);
    assert.equal(danza.titulo, "Danza árabe");
    assert.deepEqual(danza.horarios, [{ dia: 4, desde: "19:00", hasta: "20:30" }]);
  });

  it("anota los errores de la planilla para corregirlos", () => {
    const { problemas } = talleresDeLaHoja(hoja);
    assert.deepEqual(problemas.map((p) => `${p.taller}: ${p.problema}`), [
      "Danza árabe: «19:00 A 2O:30»: tiene una letra O en lugar de un cero",
      "Streaming: No tiene días ni horarios",
      "Streaming: No figura quién lo dicta",
    ]);
  });

  it("lee horarios con notas, sin fin o imposibles", () => {
    const anotados: string[] = [];
    const anotar = (p: string) => anotados.push(p);
    assert.deepEqual(leerHorarios("19:00 A 20:30 (NIÑOS) 20:30 A 22:00 (ADULTOS)", 3, anotar), [
      { dia: 3, desde: "19:00", hasta: "20:30", nota: "Niños" },
      { dia: 3, desde: "20:30", hasta: "22:00", nota: "Adultos" },
    ]);
    assert.deepEqual(leerHorarios("19:00 A 12:00", 1, anotar), [{ dia: 1, desde: "19:00" }]);
    assert.deepEqual(leerHorarios("9:30 A 12:00", 2, anotar), [{ dia: 2, desde: "09:30", hasta: "12:00" }]);
    assert.equal(anotados.length, 1);
    assert.match(anotados[0], /anterior a la de inicio/);
  });

  it("deja los nombres prolijos y clasifica por disciplina", () => {
    assert.equal(prolijo('FOLKLORE "JARDIN DE LA REPÚBLICA"'), "Folklore «Jardín de la República»");
    assert.equal(prolijo("CERAMICA -INICIAL-"), "Cerámica (inicial)");
    assert.equal(prolijo("ARTESANIAS , BIJOUTERIE"), "Artesanías, bijouterie");
    assert.equal(disciplinaDe("LABORATORIO DE TANGO"), "danza");
    assert.equal(disciplinaDe("CORTE Y CONFECCIÓN"), "oficios");
    assert.equal(disciplinaDe("RADIO Y COMUNICACION"), "letras");
  });
});

describe("Talleres: filtros, agenda y Migue", () => {
  const { talleres } = talleresDeLaHoja({
    nombre: "CCMS",
    filas: [
      { n: 2, celdas: { A: "CENTRO CULTURAL MERCEDES SOSA" } },
      { n: 4, celdas: { C: "TALLERES", D: "LUNES", I: "SÁBADO" } },
      { n: 5, celdas: { B: "1", C: "TANGO", I: "11:00 A 13:00" } },
      { n: 6, celdas: { C: "PROF. RAMIRO RIVAS" } },
      { n: 8, celdas: { B: "2", C: "BAILE URBANO -NIÑOS-", D: "18:30 A 20:00" } },
      { n: 9, celdas: { C: "PROF. MILAGRO COSTELLO" } },
    ],
  });

  it("filtra por día, disciplina, chicos y texto sin tildes", () => {
    const base = { q: "", centro: "", dia: 0, disciplina: "", chicos: false };
    assert.deepEqual(filtrarTalleres(talleres, { ...base, dia: 6 }).map((t) => t.titulo), ["Tango"]);
    assert.deepEqual(filtrarTalleres(talleres, { ...base, chicos: true }).map((t) => t.titulo), ["Baile urbano (niños)"]);
    assert.deepEqual(filtrarTalleres(talleres, { ...base, q: "ninos" }).map((t) => t.titulo), ["Baile urbano (niños)"]);
    assert.equal(filtrarTalleres(talleres, { ...base, q: "mercedes" }, () => "Centro Cultural Mercedes Sosa").length, 2);
  });

  it("los talleres anuales salen de la agenda, pero no un taller de un día", () => {
    assert.ok(esTallerAnual({ titulo: "Tejido", resumen: "Talleres Culturales Anuales" }));
    assert.ok(esTallerAnual({ titulo: "Taller de guitarra", resumen: "" }, 12));
    assert.ok(!esTallerAnual({ titulo: "Taller de máscaras en el museo", resumen: "" }, 1));
    assert.ok(!esTallerAnual({ titulo: "Concierto de la Orquesta", resumen: "" }, 20));
  });

  it("Migue recibe una ficha por centro con días, horarios e inscripción", () => {
    const [ficha] = fichasDeTalleres(talleres, [{ slug: "centro-cultural-mercedes-sosa", nombre: "Centro Cultural Mercedes Sosa", direccion: "9 de julio 720", telefono: "2551862" }]);
    assert.equal(ficha.url, "/talleres?centro=centro-cultural-mercedes-sosa");
    assert.match(ficha.texto, /Tango: sábado 11:00 a 13:00/);
    assert.match(ficha.texto, /Inscripción: personal, en el centro cultural/);
    assert.doesNotMatch(ficha.texto, /Rivas|Costello/, "sin nombres de personas");
  });
});
