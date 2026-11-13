/**
 * Traducciones del contenido inicial (supabase/semilla) y su carga en la base.
 *
 *   npm run traducciones -- extraer <carpeta>   Escribe, por colección, los textos a traducir:
 *                                               { "lugares/slug": { "resumen": "texto…" } }
 *   npm run traducciones -- aplicar <archivo>   Lee { "lugares/slug": { "resumen": { "en": "…", "pt": "…" } } }
 *                                               y guarda las traducciones en los JSON de la semilla.
 *   npm run traducciones -- base                Copia las traducciones de la semilla a la base
 *                                               (DATABASE_URL). Solo toca `traducciones`, y solo
 *                                               donde el texto en español de la base sigue igual
 *                                               al de la semilla: lo que el equipo cambió en el
 *                                               panel no se pisa (se informa).
 */

import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

import { ESQUEMA_SITIO, ESQUEMA_TEMAS, esquemaDe, type Esquema } from "../lib/admin/esquemas.ts";
import { IDIOMAS_TRADUCCION } from "../lib/admin/limpiar.ts";
import { ponerTraduccion, rutaDeTexto, textosTraducibles, traduccionDe } from "../lib/admin/traducibles.ts";
import { DIR_SEMILLA, leerSemilla } from "../lib/db/semilla.ts";

type Json = Record<string, unknown>;

function esquemaDeFila(coleccion: string, slug: string): Esquema | undefined {
  if (coleccion === "configuracion") return slug === "sitio" ? ESQUEMA_SITIO : slug === "categorias" ? ESQUEMA_TEMAS : undefined;
  return esquemaDe(coleccion);
}

const archivoDe = (coleccion: string, slug: string) => path.join(DIR_SEMILLA, coleccion, `${slug}.json`);

function extraer(carpeta: string) {
  fs.mkdirSync(carpeta, { recursive: true });
  const porColeccion: Record<string, Record<string, Record<string, string>>> = {};
  let total = 0;
  for (const f of leerSemilla()) {
    const esquema = esquemaDeFila(f.coleccion, f.slug);
    if (!esquema) continue;
    const textos = textosTraducibles(esquema, f.datos);
    if (!textos.length) continue;
    (porColeccion[f.coleccion] ??= {})[`${f.coleccion}/${f.slug}`] = Object.fromEntries(textos.map((t) => [rutaDeTexto(t), t.original]));
    total += textos.length;
  }
  for (const [coleccion, fichas] of Object.entries(porColeccion)) {
    fs.writeFileSync(path.join(carpeta, `${coleccion}.json`), JSON.stringify(fichas, null, 2) + "\n");
  }
  console.log(`${total} textos en ${Object.keys(porColeccion).length} archivos, en ${carpeta}`);
}

function aplicar(archivo: string) {
  const traducidas = JSON.parse(fs.readFileSync(archivo, "utf8")) as Record<string, Record<string, Record<string, string>>>;
  let puestas = 0;
  const faltan: string[] = [];
  for (const [clave, rutas] of Object.entries(traducidas)) {
    const [coleccion, slug] = clave.split("/");
    const esquema = esquemaDeFila(coleccion, slug);
    const ruta = archivoDe(coleccion, slug);
    if (!esquema || !fs.existsSync(ruta)) { faltan.push(clave); continue; }
    const datos = JSON.parse(fs.readFileSync(ruta, "utf8")) as Json;
    const textos = new Map(textosTraducibles(esquema, datos).map((t) => [rutaDeTexto(t), t]));
    for (const [r, idiomas] of Object.entries(rutas)) {
      const t = textos.get(r);
      if (!t) { faltan.push(`${clave} → ${r}`); continue; }
      for (const idioma of IDIOMAS_TRADUCCION) {
        if (typeof idiomas[idioma] === "string" && idiomas[idioma].trim()) { ponerTraduccion(datos, t, idioma, idiomas[idioma]); puestas++; }
      }
    }
    fs.writeFileSync(ruta, JSON.stringify(datos, null, 2) + "\n");
  }
  console.log(`${puestas} traducciones guardadas en la semilla.`);
  if (faltan.length) console.log(`No encontradas (${faltan.length}):\n  ${faltan.join("\n  ")}`);
}

async function base() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("Falta DATABASE_URL en .env.local."); process.exit(1); }
  const sql = postgres(url, { prepare: false, max: 1, ssl: "require" });
  let filasCambiadas = 0, puestas = 0;
  const salteadas: string[] = [];
  try {
    await sql.begin(async (tx) => {
      for (const f of leerSemilla()) {
        const esquema = esquemaDeFila(f.coleccion, f.slug);
        if (!esquema) continue;
        const [fila] = await tx.unsafe("select datos from public.contenidos where coleccion = $1 and slug = $2", [f.coleccion, f.slug]);
        if (!fila) continue;
        const enBase = (typeof fila.datos === "string" ? JSON.parse(fila.datos) : fila.datos) as Json;
        const textosBase = new Map(textosTraducibles(esquema, enBase).map((t) => [rutaDeTexto(t), t]));
        let cambio = false;
        for (const t of textosTraducibles(esquema, f.datos)) {
          const destino = textosBase.get(rutaDeTexto(t));
          if (!destino || destino.original !== t.original) { salteadas.push(`${f.coleccion}/${f.slug} → ${rutaDeTexto(t)}`); continue; }
          for (const idioma of IDIOMAS_TRADUCCION) {
            const texto = traduccionDe(f.datos, t, idioma);
            if (texto && traduccionDe(enBase, destino, idioma) !== texto) { ponerTraduccion(enBase, destino, idioma, texto); cambio = true; puestas++; }
          }
        }
        if (cambio) {
          await tx.unsafe("update public.contenidos set datos = $3::text::jsonb where coleccion = $1 and slug = $2", [f.coleccion, f.slug, JSON.stringify(enBase)]);
          filasCambiadas++;
        }
      }
    });
    console.log(`Listo: ${puestas} traducciones en ${filasCambiadas} fichas.`);
    if (salteadas.length) console.log(`Salteadas porque el español cambió en la base (${salteadas.length}):\n  ${salteadas.join("\n  ")}`);
  } finally {
    await sql.end();
  }
}

const [accion, arg] = process.argv.slice(2);
if (accion === "extraer" && arg) extraer(arg);
else if (accion === "aplicar" && arg) aplicar(arg);
else if (accion === "base") await base();
else {
  console.error("Uso: npm run traducciones -- extraer <carpeta> | aplicar <archivo.json> | base");
  process.exit(1);
}
