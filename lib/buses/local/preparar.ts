// Base local del módulo de buses (PGlite) para desarrollo y pruebas. En producción el módulo usa la
// base real del Bus Turístico (BUSES_DATABASE_URL) y NADA de este archivo corre.
//
// Arma el esquema efectivo aplicando, en orden, las migraciones históricas de BotTurismo
// (lib/buses/sql/historico, con los objetos mínimos de Supabase que nombran) y después las mejoras
// aditivas del portal (lib/buses/sql/mejoras). Así se prueba contra la misma función de reserva
// (create_tourist_booking) que corre en la VPS.
// Sin "server-only": lo usan las pruebas.

import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const DIR = path.join(process.cwd(), "lib", "buses", "sql");
const leer = (...p: string[]) => fs.readFileSync(path.join(DIR, ...p), "utf8");
const archivos = (carpeta: string) =>
  fs.existsSync(path.join(DIR, carpeta)) ? fs.readdirSync(path.join(DIR, carpeta)).filter((f) => f.endsWith(".sql")).sort() : [];

export async function crearBaseBuses({ carpeta, conDatos = true }: { carpeta?: string; conDatos?: boolean } = {}) {
  if (carpeta) fs.mkdirSync(carpeta, { recursive: true });
  const db = await PGlite.create({ dataDir: carpeta, extensions: { pgcrypto } });
  const { rows } = await db.query<{ existe: boolean }>("select to_regclass('public.tourist_departures') is not null as existe");
  if (!rows[0].existe) {
    await db.exec(leer("stub-supabase.sql"));
    for (const f of archivos("historico")) await db.exec(leer("historico", f));
    await db.exec("create table if not exists public.portal_mejoras (nombre text primary key, aplicada_at timestamptz not null default now())");
    if (conDatos) await db.exec(leer("semilla-local.sql"));
  }
  // Mejoras del portal: las mismas que se aplican en la VPS con deploy/sql (aditivas e idempotentes).
  await db.exec("create table if not exists public.portal_mejoras (nombre text primary key, aplicada_at timestamptz not null default now())");
  const hechas = new Set((await db.query<{ nombre: string }>("select nombre from public.portal_mejoras")).rows.map((r) => r.nombre));
  for (const f of archivos("mejoras")) {
    if (hechas.has(f)) continue;
    await db.transaction(async (tx) => {
      await tx.exec(leer("mejoras", f));
      await tx.query("insert into public.portal_mejoras (nombre) values ($1)", [f]);
    });
  }
  return db;
}
