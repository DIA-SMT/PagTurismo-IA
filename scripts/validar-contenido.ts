/**
 * Revisa el contenido inicial (supabase/semilla) antes de cargarlo en una base nueva.
 *
 *   npm run validar
 *
 * El contenido vivo está en la base y se revisa en el tablero del panel (/admin), con las
 * mismas reglas (lib/validar.ts). Errores cortan con código 1; los avisos no.
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { validarFilas, type FilaValidable, type Resultado } from "../lib/validar.ts";

export function validarSemilla(raizRepo: string, ahora = Date.now()): Resultado {
  const dir = path.join(raizRepo, "supabase", "semilla");
  const filas: FilaValidable[] = [];
  const roto: string[] = [];
  for (const coleccion of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    const carpeta = path.join(dir, coleccion);
    if (!fs.statSync(carpeta).isDirectory()) continue;
    for (const archivo of fs.readdirSync(carpeta).filter((a) => a.endsWith(".json"))) {
      const slug = archivo.slice(0, -5);
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) roto.push(`${coleccion}/${archivo}: el nombre del archivo debe ser minúsculas, números y guiones.`);
      try {
        const { estado, ...datos } = JSON.parse(fs.readFileSync(path.join(carpeta, archivo), "utf8"));
        filas.push({ coleccion, slug, estado: coleccion === "configuracion" ? "publicado" : estado, datos });
      } catch (e) {
        roto.push(`${coleccion}/${archivo}: no es un JSON válido (${(e as Error).message}).`);
      }
    }
  }
  const existeImagen = (src: string) => /^https?:\/\//.test(src) || fs.existsSync(path.join(raizRepo, "public", src));
  const r = validarFilas(filas, { existeImagen, ahora });
  return { ...r, errores: [...roto, ...r.errores] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
  const { errores, avisos, resumen } = validarSemilla(raiz);
  console.log("Contenido inicial (supabase/semilla):");
  for (const [c, r] of Object.entries(resumen)) console.log(`  ${c.padEnd(13)} ${r.publicadas} publicadas · ${r.borradores} borradores`);
  if (avisos.length) {
    console.log(`\nAvisos (${avisos.length}):`);
    for (const a of avisos) console.log(`  · ${a}`);
  }
  if (errores.length) {
    console.error(`\nErrores (${errores.length}):`);
    for (const e of errores) console.error(`  ✗ ${e}`);
    process.exit(1);
  }
  console.log("\nSin errores.");
}
