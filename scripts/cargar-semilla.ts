/**
 * Carga el contenido inicial (supabase/semilla) en la base de Supabase.
 *
 *   npm run db:semilla
 *
 * Necesita DATABASE_URL en .env.local. No pisa nada: las fichas que ya existen en la base
 * quedan como están (insert … on conflict do nothing), así se puede correr más de una vez.
 * Antes, aplicar las migraciones de supabase/migrations (ver README).
 */

import postgres from "postgres";

import { INSERTAR_CONTENIDO, leerSemilla } from "../lib/db/semilla.ts";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL (la conexión a Supabase). Definila en .env.local.");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1, ssl: "require" });
const filas = leerSemilla();
let nuevas = 0;
try {
  await sql.begin(async (tx) => {
    for (const f of filas) {
      const r = await tx.unsafe(`${INSERTAR_CONTENIDO} returning slug`, [f.coleccion, f.slug, f.estado, JSON.stringify(f.datos)]);
      nuevas += r.length;
    }
  });
  console.log(`Listo: ${nuevas} fichas nuevas, ${filas.length - nuevas} ya estaban.`);
} catch (e) {
  console.error("No se pudo cargar el contenido:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await sql.end();
}
