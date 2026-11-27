/**
 * Baja el registro oficial de alojamientos del Ente Tucumán Turismo (API pública de lectura de
 * www.tucumanturismo.gob.ar) y deja en datos/turismo/alojamientos.json los de San Miguel de Tucumán que están
 * habilitados y visibles. Lo usa la página /alojamientos. Se corre a mano para actualizar la lista:
 *
 *   npm run alojamientos              muestra qué cambiaría
 *   npm run alojamientos -- --escribir
 *
 * Solo datos de los establecimientos (nombre, categoría, dirección, teléfono, sitio, servicios, ubicación):
 * ninguno de personas.
 */
import { writeFileSync, readFileSync, existsSync } from "node:fs";

import { alojamientoDesdeEnte, type ArchivoAlojamientos } from "../lib/turismo/alojamientos.ts";

const API = "https://www.tucumanturismo.gob.ar/api/v1/api/hoteles?limit=500";
const ARCHIVO = "datos/turismo/alojamientos.json";
const LOCALIDAD = "San Miguel de Tucumán";
const escribir = process.argv.includes("--escribir");

const r = await fetch(API, { headers: { "User-Agent": "Portal de Cultura SMT (actualización de alojamientos)" } });
if (!r.ok) {
  console.error(`El Ente respondió ${r.status}.`);
  process.exit(1);
}
const crudo = (await r.json()) as unknown;
const lista = (Array.isArray(crudo) ? crudo : Object.values(crudo as object).find(Array.isArray) ?? []) as Record<string, unknown>[];
const total = Number(lista[0]?.total ?? lista.length);
if (lista.length < total) {
  console.error(`La API devolvió ${lista.length} de ${total}: subí el límite de la consulta.`);
  process.exit(1);
}

const alojamientos = lista
  .filter((h) => h.localidad === LOCALIDAD && h.visible === "1" && h.activo === "1")
  .map(alojamientoDesdeEnte)
  .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

const archivo: ArchivoAlojamientos = {
  fuente: "Registro de alojamientos del Ente Tucumán Turismo",
  url: "https://www.tucumanturismo.gob.ar",
  relevado: new Date().toISOString().slice(0, 10),
  alojamientos,
};

const previo = existsSync(ARCHIVO) ? (JSON.parse(readFileSync(ARCHIVO, "utf8")) as ArchivoAlojamientos) : undefined;
const antes = new Set(previo?.alojamientos.map((a) => a.id) ?? []);
const ahora = new Set(alojamientos.map((a) => a.id));
console.log(`${alojamientos.length} alojamientos en ${LOCALIDAD} (de ${lista.length} en la provincia).`);
for (const a of alojamientos.filter((x) => !antes.has(x.id))) console.log(`  nuevo:   ${a.nombre}`);
for (const a of previo?.alojamientos.filter((x) => !ahora.has(x.id)) ?? []) console.log(`  dado de baja: ${a.nombre}`);

if (escribir) {
  writeFileSync(ARCHIVO, `${JSON.stringify(archivo, null, 2)}\n`);
  console.log(`Escrito ${ARCHIVO}.`);
} else {
  console.log("Prueba en seco: agregá --escribir para guardar.");
}
