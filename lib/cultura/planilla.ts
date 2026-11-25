/**
 * Lector mínimo de planillas .xlsx (solo servidor y scripts): un .xlsx es un zip con XML. Se lee el
 * directorio central del zip y se descomprime con zlib, sin dependencias. Devuelve cada hoja como filas
 * con sus celdas por columna ("C" → "YOGA"), con el texto ya resuelto.
 */
import { inflateRawSync } from "node:zlib";

export type FilaPlanilla = { n: number; celdas: Record<string, string> };
export type HojaPlanilla = { nombre: string; filas: FilaPlanilla[] };

/** Las entradas del zip: nombre → contenido. */
export function leerZip(zip: Buffer): Map<string, Buffer> {
  // Fin del directorio central: firma 0x06054b50, buscada desde el final (puede haber un comentario).
  let fin = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65_557); i--) {
    if (zip.readUInt32LE(i) === 0x06054b50) { fin = i; break; }
  }
  if (fin < 0) throw new Error("No es un archivo .xlsx válido (no se encontró el índice del zip).");
  const cantidad = zip.readUInt16LE(fin + 10);
  let p = zip.readUInt32LE(fin + 16);
  const archivos = new Map<string, Buffer>();
  for (let i = 0; i < cantidad; i++) {
    if (zip.readUInt32LE(p) !== 0x02014b50) throw new Error("Índice del zip dañado.");
    const metodo = zip.readUInt16LE(p + 10);
    const comprimido = zip.readUInt32LE(p + 20);
    const largoNombre = zip.readUInt16LE(p + 28);
    const largoExtra = zip.readUInt16LE(p + 30);
    const largoComentario = zip.readUInt16LE(p + 32);
    const local = zip.readUInt32LE(p + 42);
    const nombre = zip.toString("utf8", p + 46, p + 46 + largoNombre);
    const inicio = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
    const datos = zip.subarray(inicio, inicio + comprimido);
    if (metodo === 0) archivos.set(nombre, Buffer.from(datos));
    else if (metodo === 8) archivos.set(nombre, inflateRawSync(datos));
    p += 46 + largoNombre + largoExtra + largoComentario;
  }
  return archivos;
}

const entidades = (t: string) =>
  t.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n))).replace(/&amp;/g, "&");

/** Todas las hojas de la planilla, en orden, con sus celdas como texto. */
export function leerXlsx(contenido: Buffer): HojaPlanilla[] {
  const zip = leerZip(contenido);
  const texto = (nombre: string) => zip.get(nombre)?.toString("utf8") ?? "";
  const compartidas = [...texto("xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)]
    .map((m) => entidades([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join("")));
  const rels = texto("xl/_rels/workbook.xml.rels");
  const destino = (id: string) =>
    [...rels.matchAll(/<Relationship\b[^>]*>/g)].map((m) => m[0]).find((r) => r.includes(`Id="${id}"`))?.match(/Target="([^"]+)"/)?.[1];

  return [...texto("xl/workbook.xml").matchAll(/<sheet\b[^>]*>/g)].map(([etiqueta]) => {
    const nombre = entidades(etiqueta.match(/name="([^"]+)"/)?.[1] ?? "");
    const id = etiqueta.match(/r:id="([^"]+)"/)?.[1] ?? "";
    const ruta = (destino(id) ?? "").replace(/^\/?(xl\/)?/, "xl/");
    const filas: FilaPlanilla[] = [];
    for (const fila of texto(ruta).matchAll(/<row\b[^>]*\br="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
      const celdas: Record<string, string> = {};
      for (const c of fila[2].matchAll(/<c\b[^>]*\br="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const tipo = c[2].match(/\bt="(\w+)"/)?.[1];
        const v = c[3]?.match(/<v>([\s\S]*?)<\/v>/)?.[1];
        const enLinea = c[3]?.match(/<is>([\s\S]*?)<\/is>/)?.[1];
        const valor = tipo === "s" && v != null ? compartidas[Number(v)] : enLinea != null ? entidades(enLinea.replace(/<[^>]+>/g, "")) : v != null ? entidades(v) : "";
        const limpio = (valor ?? "").replace(/\s+/g, " ").trim();
        if (limpio) celdas[c[1]] = limpio;
      }
      if (Object.keys(celdas).length) filas.push({ n: Number(fila[1]), celdas });
    }
    return { nombre, filas };
  });
}
