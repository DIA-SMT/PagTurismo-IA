/**
 * Aplica las migraciones de supabase/migrations/ que falten, en orden de nombre, en Supabase o en
 * un PostgreSQL propio (la VPS). En una base propia nueva aplica antes supabase/local/shim.sql
 * (roles, esquema auth y storage mínimos), porque las migraciones cuentan con eso.
 * Igual que el de la subasta: alternativa a `supabase db push` cuando la CLI no está. Registra lo
 * aplicado en supabase_migrations.schema_migrations, la misma tabla que usa la CLI.
 *
 *   npm run db:migrar            aplica lo que falta
 *   npm run db:migrar -- --ver   solo lista lo pendiente y las tablas que ya hay
 *
 * Usa DIRECT_URL (o DATABASE_URL) del .env. En Supabase, los cambios de esquema van por el pooler
 * en modo sesión (5432); el modo transacción (6543), el que usa el sitio, no sirve. Contra
 * 127.0.0.1 (la VPS) no usa TLS.
 */

import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

const soloVer = process.argv.includes("--ver");
const cadena = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!cadena) {
  console.error("Falta DIRECT_URL o DATABASE_URL en .env.local.");
  process.exit(1);
}
const url = new URL(cadena);
const esLocal = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
if (!esLocal && url.port === "6543") url.port = "5432";

const dir = path.join(process.cwd(), "supabase", "migrations");
const archivos = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const sql = postgres(url.toString(), { ssl: esLocal ? false : "require", prepare: false, max: 1, onnotice: () => {} });

try {
  // Base propia nueva: sin el esquema auth de Supabase, primero el reemplazo mínimo.
  const [{ hayAuth }] = await sql`select exists (select 1 from pg_namespace where nspname = 'auth') as "hayAuth"`;
  if (!hayAuth) {
    if (soloVer) console.log("Base sin esquema auth: al migrar se aplica antes supabase/local/shim.sql.");
    else {
      await sql.begin((tx) => tx.unsafe(fs.readFileSync(path.join(process.cwd(), "supabase", "local", "shim.sql"), "utf8")));
      console.log("Base propia: aplicado supabase/local/shim.sql (roles, auth y storage mínimos).");
    }
  }

  await sql.unsafe(`
    create schema if not exists supabase_migrations;
    create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);`);
  const aplicadas = new Set((await sql`select version from supabase_migrations.schema_migrations`).map((f) => f.version));
  const pendientes = archivos
    .map((archivo) => {
      const [, version, nombre] = /^(\d+)_(.+)\.sql$/.exec(archivo) ?? [];
      return { archivo, version, nombre };
    })
    .filter((m) => m.version && !aplicadas.has(m.version));

  if (soloVer) {
    const tablas = await sql`select table_name from information_schema.tables where table_schema = 'public' order by 1`;
    console.log(`Tablas en public: ${tablas.length ? tablas.map((t) => t.table_name).join(", ") : "ninguna"}`);
    console.log(pendientes.length ? `Pendientes (${pendientes.length}):\n${pendientes.map((m) => `  ${m.archivo}`).join("\n")}` : "No hay migraciones pendientes.");
  } else if (!pendientes.length) {
    console.log("La base está al día: no hay migraciones pendientes.");
  } else {
    for (const m of pendientes) {
      const contenido = fs.readFileSync(path.join(dir, m.archivo), "utf8");
      // Cada migración entra entera o no entra.
      await sql.begin(async (tx) => {
        await tx.unsafe(contenido);
        await tx`insert into supabase_migrations.schema_migrations (version, name, statements) values (${m.version}, ${m.nombre}, ${[contenido]})`;
      });
      console.log(`Aplicada: ${m.archivo}`);
    }
    console.log(`Listo: ${pendientes.length} migraciones aplicadas.`);
  }
} catch (e) {
  console.error(`No se pudo migrar: ${e instanceof Error ? e.message : e}`);
  process.exitCode = 1;
} finally {
  await sql.end();
}
