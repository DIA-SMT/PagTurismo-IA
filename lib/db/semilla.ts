// Contenido inicial del portal: los JSON de supabase/semilla/<colección>/<slug>.json.
// Se cargan en la base local la primera vez que se crea y en Supabase con
// `npm run db:semilla`. Después, la fuente de verdad es la base: se edita desde /admin.
// Sin "server-only": lo usan también las pruebas y los scripts.

import fs from "node:fs";
import path from "node:path";

export type FilaContenido = { coleccion: string; slug: string; estado: "borrador" | "publicado"; datos: Record<string, unknown> };

export const DIR_SEMILLA = path.join(process.cwd(), "supabase", "semilla");

export function leerSemilla(dir = DIR_SEMILLA): FilaContenido[] {
  const filas: FilaContenido[] = [];
  for (const coleccion of fs.readdirSync(dir).sort()) {
    const carpeta = path.join(dir, coleccion);
    if (!fs.statSync(carpeta).isDirectory()) continue;
    for (const archivo of fs.readdirSync(carpeta).filter((a) => a.endsWith(".json")).sort()) {
      const { estado, ...datos } = JSON.parse(fs.readFileSync(path.join(carpeta, archivo), "utf8"));
      filas.push({
        coleccion,
        slug: archivo.slice(0, -5),
        // La configuración no tiene borrador: siempre está vigente.
        estado: coleccion === "configuracion" || estado === "publicado" ? "publicado" : "borrador",
        datos,
      });
    }
  }
  return filas;
}

export const INSERTAR_CONTENIDO =
  "insert into public.contenidos (coleccion, slug, estado, datos) values ($1, $2, $3, $4::text::jsonb) on conflict (coleccion, slug) do nothing";
