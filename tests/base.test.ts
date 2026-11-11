/**
 * Base de datos sobre PGlite con las migraciones reales: contenido inicial, permisos (RLS),
 * auditoría y límites de ingreso. Lo mismo que corre en Supabase.
 */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { PGlite } from "@electric-sql/pglite";

import { crearBaseLocal } from "../lib/db/local/preparar.ts";
import { leerSemilla } from "../lib/db/semilla.ts";

const ADMIN = "00000000-0000-4000-d000-000000000001";
const OTRO = "00000000-0000-4000-d000-000000000099";

let db: PGlite;

before(async () => {
  db = await crearBaseLocal();
  await db.query("insert into auth.users (id, email) values ($1, 'otro@ejemplo.test')", [OTRO]);
});
after(async () => db?.close());

type Rol = "anon" | "authenticated";
async function como<T>(rol: Rol, uid: string | null, fn: (tx: Parameters<Parameters<PGlite["transaction"]>[0]>[0]) => Promise<T>) {
  return db.transaction(async (tx) => {
    await tx.query("select set_config('request.jwt.claims', $1, true), set_config('role', $2, true)", [
      JSON.stringify(uid ? { sub: uid, role: rol } : { role: rol }),
      rol,
    ]);
    return fn(tx);
  });
}

describe("contenido inicial", () => {
  it("carga todas las fichas de la semilla", async () => {
    const { rows } = await db.query<{ n: number }>("select count(*)::int as n from public.contenidos");
    assert.equal(rows[0].n, leerSemilla().length);
  });

  it("la configuración queda publicada", async () => {
    const { rows } = await db.query<{ estado: string }>("select estado from public.contenidos where coleccion = 'configuracion'");
    assert.ok(rows.length === 2 && rows.every((r) => r.estado === "publicado"));
  });
});

describe("permisos", () => {
  it("el visitante solo ve fichas publicadas y la configuración", async () => {
    const borradores = await como("anon", null, async (tx) =>
      (await tx.query<{ n: number }>("select count(*)::int as n from public.contenidos where estado = 'borrador'")).rows[0].n);
    assert.equal(borradores, 0);
    const conf = await como("anon", null, async (tx) =>
      (await tx.query("select 1 from public.contenidos where coleccion = 'configuracion'")).rows.length);
    assert.equal(conf, 2);
  });

  it("el visitante no puede escribir", async () => {
    await assert.rejects(como("anon", null, (tx) =>
      tx.query("update public.contenidos set estado = 'publicado' where slug = 'catedral'")));
  });

  it("una cuenta que no es del equipo no ve borradores ni cambia nada", async () => {
    const vistos = await como("authenticated", OTRO, async (tx) =>
      (await tx.query("select 1 from public.contenidos where estado = 'borrador'")).rows.length);
    assert.equal(vistos, 0);
    const cambiados = await como("authenticated", OTRO, async (tx) =>
      (await tx.query("update public.contenidos set estado = 'publicado' where coleccion = 'lugares' and slug = 'museo-escultorico' returning 1")).rows.length);
    assert.equal(cambiados, 0);
  });

  it("el equipo ve los borradores y puede publicar", async () => {
    const r = await como("authenticated", ADMIN, async (tx) =>
      (await tx.query("update public.contenidos set estado = 'publicado' where coleccion = 'lugares' and slug = 'catedral' returning actualizado_por")).rows);
    assert.equal((r[0] as { actualizado_por: string }).actualizado_por, ADMIN);
  });

  it("rechaza slugs y estados inválidos", async () => {
    await assert.rejects(db.query("insert into public.contenidos (coleccion, slug, estado) values ('lugares', 'Con Mayúsculas', 'borrador')"));
    await assert.rejects(db.query("insert into public.contenidos (coleccion, slug, estado) values ('lugares', 'x', 'archivado')"));
    await assert.rejects(db.query("insert into public.contenidos (coleccion, slug) values ('hoteles', 'x')"));
  });
});

describe("auditoría", () => {
  it("registra quién cambió qué, con el antes y el después", async () => {
    await como("authenticated", ADMIN, (tx) =>
      tx.query("update public.contenidos set datos = datos || '{\"duracion\":\"1 hora\"}' where coleccion = 'lugares' and slug = 'jockey-club'"));
    const { rows } = await db.query<{ actor_id: string; actor_tipo: string; accion: string; antes: { datos: { duracion: string } }; despues: { datos: { duracion: string } } }>(
      "select actor_id, actor_tipo, accion, antes, despues from public.auditoria where registro_id = 'lugares/jockey-club' order by id desc limit 1");
    assert.equal(rows[0].actor_id, ADMIN);
    assert.equal(rows[0].actor_tipo, "admin");
    assert.equal(rows[0].accion, "update");
    assert.equal(rows[0].antes.datos.duracion, "");
    assert.equal(rows[0].despues.datos.duracion, "1 hora");
  });

  it("no se puede borrar ni modificar", async () => {
    await assert.rejects(db.query("delete from public.auditoria"));
    await assert.rejects(db.query("update public.auditoria set accion = 'x'"));
  });

  it("solo el equipo la lee", async () => {
    const otro = await como("authenticated", OTRO, async (tx) => (await tx.query("select 1 from public.auditoria")).rows.length);
    assert.equal(otro, 0);
  });
});

describe("límite de intentos de ingreso", () => {
  it("corta al sexto intento del mismo correo y se libera con la contraseña correcta", async () => {
    const probar = async () =>
      (await db.query<{ r: string }>("select public.ingreso_probar_contrasena('alguien@ejemplo.test', '10.0.0.1') as r")).rows[0].r;
    for (let i = 0; i < 5; i++) assert.equal(await probar(), "ok");
    assert.equal(await probar(), "limite_correo");
    await db.query("select public.ingreso_contrasena_correcta('alguien@ejemplo.test', '10.0.0.1')");
    assert.equal(await probar(), "ok");
  });

  it("el visitante no puede llamar a las funciones de ingreso", async () => {
    await assert.rejects(como("anon", null, (tx) => tx.query("select public.ingreso_probar_contrasena('a@b.c', null)")));
  });
});
