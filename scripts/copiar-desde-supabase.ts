/**
 * Copia el contenido del portal de Supabase a un PostgreSQL propio (la VPS municipal).
 *
 *   ORIGEN_DATABASE_URL=… npm run db:copiar-desde-supabase              copia a una base vacía
 *   ORIGEN_DATABASE_URL=… npm run db:copiar-desde-supabase -- --ver     solo cuenta lo que hay
 *   ORIGEN_DATABASE_URL=… npm run db:copiar-desde-supabase -- --reemplazar
 *
 * ORIGEN_DATABASE_URL es la conexión directa a Supabase (DIRECT_URL); el destino es DATABASE_URL
 * del .env. Antes, `npm run db:migrar` en el destino (crea el esquema).
 *
 * Copia, tal cual y en una sola transacción:
 *  - las cuentas del equipo (auth.users de quienes están en public.admins), con su contraseña
 *    bcrypt: siguen entrando con la misma;
 *  - public.admins, public.contenidos (con sus fechas y autores) y public.auditoria (con sus ids).
 * Los triggers de las tablas se pausan durante la copia: sin eso, cada ficha copiada se marcaría
 * como cambiada hoy y la auditoría sumaría un "alta" por cada una. Las fotos subidas a Supabase
 * Storage no se copian (al migrar no había ninguna); el script avisa si alguna ficha las usa.
 */

import postgres from "postgres";

import { opcionesScript } from "../lib/db/conexion.ts";

const soloVer = process.argv.includes("--ver");
const reemplazar = process.argv.includes("--reemplazar");
const origenUrl = process.env.ORIGEN_DATABASE_URL;
const destinoUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!origenUrl || !destinoUrl) {
  console.error("Faltan ORIGEN_DATABASE_URL (Supabase) y DATABASE_URL (destino).");
  process.exit(1);
}

const origen = postgres(origenUrl, opcionesScript(origenUrl));
const destino = postgres(destinoUrl, opcionesScript(destinoUrl));

const json = async (consulta: string) => (await origen.unsafe(`select coalesce(json_agg(t), '[]')::text as j from (${consulta}) t`))[0].j as string;
const cuantos = (j: string) => (JSON.parse(j) as unknown[]).length;

try {
  const cuentas = await json(
    "select id, email, email_confirmed_at, encrypted_password, created_at from auth.users where id in (select user_id from public.admins)",
  );
  const admins = await json("select * from public.admins");
  const contenidos = await json("select * from public.contenidos");
  const auditoria = await json("select * from public.auditoria order by id");
  const [{ conFotos }] = await origen.unsafe(
    "select count(*)::int as \"conFotos\" from public.contenidos where datos::text like '%/storage/v1/object/%'",
  );

  console.log(`Origen: ${cuantos(cuentas)} cuentas del equipo, ${cuantos(admins)} admins, ${cuantos(contenidos)} fichas, ${cuantos(auditoria)} registros de auditoría.`);
  if (conFotos) console.log(`ATENCIÓN: ${conFotos} fichas usan fotos de Supabase Storage; hay que bajarlas aparte.`);

  const [{ hay }] = await destino`select count(*)::int as hay from public.contenidos`;
  if (soloVer) {
    console.log(`Destino: ${hay} fichas.`);
  } else if (hay && !reemplazar) {
    console.error(`El destino ya tiene ${hay} fichas. Para pisarlas: --reemplazar.`);
    process.exitCode = 1;
  } else {
    await destino.begin(async (tx) => {
      const tablas = ["public.contenidos", "public.admins", "public.auditoria"];
      for (const t of tablas) await tx.unsafe(`alter table ${t} disable trigger user`);
      if (reemplazar) {
        await tx.unsafe("delete from public.auditoria; delete from public.contenidos; delete from public.admins");
      }
      await tx.unsafe(
        `insert into auth.users (id, email, email_confirmed_at, encrypted_password, created_at)
         select id, email, email_confirmed_at, encrypted_password, created_at
         from json_populate_recordset(null::auth.users, $1::text::json)
         on conflict (id) do update set email = excluded.email, encrypted_password = excluded.encrypted_password`,
        [cuentas],
      );
      await tx.unsafe("insert into public.admins select * from json_populate_recordset(null::public.admins, $1::text::json)", [admins]);
      await tx.unsafe("insert into public.contenidos select * from json_populate_recordset(null::public.contenidos, $1::text::json)", [contenidos]);
      await tx.unsafe(
        "insert into public.auditoria overriding system value select * from json_populate_recordset(null::public.auditoria, $1::text::json)",
        [auditoria],
      );
      // La próxima entrada de auditoría sigue después de la última copiada.
      await tx.unsafe("select setval(pg_get_serial_sequence('public.auditoria', 'id'), greatest((select max(id) from public.auditoria), 1))");
      for (const t of tablas) await tx.unsafe(`alter table ${t} enable trigger user`);
    });
    const [r] = await destino.unsafe(
      "select (select count(*) from public.contenidos)::int as fichas, (select count(*) from public.admins)::int as admins, (select count(*) from public.auditoria)::int as auditoria",
    );
    console.log(`Listo. Destino: ${r.fichas} fichas, ${r.admins} admins, ${r.auditoria} registros de auditoría.`);
  }
} catch (e) {
  console.error(`No se pudo copiar: ${e instanceof Error ? e.message : e}`);
  process.exitCode = 1;
} finally {
  await origen.end();
  await destino.end();
}
