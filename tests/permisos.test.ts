/**
 * Roles y permisos por módulo: la regla de la base (public.puede, RLS y el disparador de
 * publicación) y la del servidor (lib/permisos.ts) tienen que coincidir.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, before, describe, it } from "node:test";
import type { PGlite } from "@electric-sql/pglite";

import { crearBaseLocal } from "../lib/db/local/preparar.ts";
import { esHashScrypt, verificarScrypt } from "../lib/auth/scrypt.ts";
import { MODULOS, ROLES, modulosDe, puede, puedeContenido, type Accion } from "../lib/permisos.ts";

// Cuentas de supabase/local/seed-local.sql
const SUPER = "00000000-0000-4000-d000-000000000001";
const CULTURA = "00000000-0000-4000-d000-000000000002";
const EDITOR = "00000000-0000-4000-d000-000000000004";
const CONSULTA = "00000000-0000-4000-d000-000000000005";
const PRUEBA = "00000000-0000-4000-d000-000000000077";

const ACCIONES: Accion[] = ["ver", "editar", "publicar", "borrar", "exportar", "configurar"];

let db: PGlite;
before(async () => {
  db = await crearBaseLocal();
  await db.query("insert into auth.users (id, email) values ($1, 'prueba@ejemplo.test')", [PRUEBA]);
  await db.query("insert into public.admins (user_id, nombre) values ($1, 'Prueba')", [PRUEBA]);
});
after(async () => db?.close());

type Tx = Parameters<Parameters<PGlite["transaction"]>[0]>[0];
function como<T>(uid: string, fn: (tx: Tx) => Promise<T>) {
  return db.transaction(async (tx) => {
    await tx.query("select set_config('request.jwt.claims', $1, true), set_config('role', 'authenticated', true)", [
      JSON.stringify({ sub: uid, role: "authenticated" }),
    ]);
    return fn(tx);
  });
}

describe("regla de permisos", () => {
  it("public.puede() y lib/permisos dan lo mismo para cada rol, módulo y acción", async () => {
    for (const rol of ROLES) {
      for (const modulos of [[], ["cultura"], ["turismo", "buses"]] as const) {
        await db.query("update public.admins set rol = $2, modulos = $3 where user_id = $1", [PRUEBA, rol, modulos]);
        for (const modulo of MODULOS) {
          for (const accion of ACCIONES) {
            const enBase = await como(PRUEBA, async (tx) =>
              (await tx.query<{ r: boolean }>("select public.puede($1, $2) as r", [modulo, accion])).rows[0].r);
            const enServidor = puede({ rol, modulos: [...modulos] }, modulo, accion);
            assert.equal(enBase, enServidor, `${rol} [${modulos}] ${accion} en ${modulo}`);
          }
        }
      }
    }
  });

  it("public.modulos_de() y modulosDe() coinciden", async () => {
    for (const [coleccion, slug] of [["eventos", "x"], ["lugares", "x"], ["experiencias", "x"], ["configuracion", "sitio"], ["configuracion", "categorias-agenda"]]) {
      const { rows } = await db.query<{ m: string[] }>("select public.modulos_de($1, $2) as m", [coleccion, slug]);
      assert.deepEqual(rows[0].m, modulosDe(coleccion, slug));
    }
  });

  it("una cuenta inactiva no puede nada", async () => {
    await db.query("update public.admins set rol = 'superadmin', activo = false where user_id = $1", [PRUEBA]);
    const r = await como(PRUEBA, async (tx) => (await tx.query<{ r: boolean }>("select public.puede('turismo', 'ver') as r")).rows[0].r);
    assert.equal(r, false);
    await db.query("update public.admins set activo = true, rol = 'editor', modulos = '{}' where user_id = $1", [PRUEBA]);
  });

  it("las cuentas nuevas arrancan como editor sin módulos", async () => {
    const { rows } = await db.query<{ rol: string; modulos: string[] }>(
      "select column_default as rol from information_schema.columns where table_name = 'admins' and column_name = 'rol'");
    assert.match(rows[0].rol, /editor/);
  });
});

describe("contenidos según el rol (RLS y disparador)", () => {
  it("el admin de cultura publica eventos pero no toca experiencias", async () => {
    const eventos = await como(CULTURA, async (tx) =>
      (await tx.query("update public.contenidos set estado = 'publicado' where coleccion = 'eventos' returning 1")).rows.length);
    assert.ok(eventos > 0);
    const experiencias = await como(CULTURA, async (tx) =>
      (await tx.query("update public.contenidos set datos = datos where coleccion = 'experiencias' returning 1")).rows.length);
    assert.equal(experiencias, 0);
  });

  it("el admin de cultura edita lugares (espacios culturales)", async () => {
    const n = await como(CULTURA, async (tx) =>
      (await tx.query("update public.contenidos set datos = datos where coleccion = 'lugares' and slug = 'teatro-san-martin' returning 1")).rows.length);
    assert.equal(n, 1);
  });

  it("el editor guarda borradores pero no publica ni cambia lo publicado", async () => {
    await como(EDITOR, (tx) => tx.query(
      "insert into public.contenidos (coleccion, slug, estado, datos) values ('lugares', 'prueba-editor', 'borrador', '{\"titulo\":\"x\"}')"));
    await assert.rejects(
      como(EDITOR, (tx) => tx.query("update public.contenidos set estado = 'publicado' where coleccion = 'lugares' and slug = 'prueba-editor'")),
      /permiso para publicar/,
    );
    await assert.rejects(
      como(EDITOR, (tx) => tx.query(
        "update public.contenidos set datos = datos || '{\"resumen\":\"x\"}' where coleccion = 'lugares' and estado = 'publicado'")),
      /permiso para publicar/,
    );
  });

  it("el editor no borra", async () => {
    const n = await como(EDITOR, async (tx) =>
      (await tx.query("delete from public.contenidos where coleccion = 'lugares' and slug = 'prueba-editor' returning 1")).rows.length);
    assert.equal(n, 0);
  });

  it("la cuenta de consulta ve borradores pero no escribe", async () => {
    const vistos = await como(CONSULTA, async (tx) =>
      (await tx.query("select 1 from public.contenidos where estado = 'borrador'")).rows.length);
    assert.ok(vistos > 0);
    await assert.rejects(como(CONSULTA, (tx) => tx.query(
      "insert into public.contenidos (coleccion, slug, estado) values ('lugares', 'prueba-consulta', 'borrador')")));
    const n = await como(CONSULTA, async (tx) =>
      (await tx.query("update public.contenidos set datos = datos where coleccion = 'lugares' returning 1")).rows.length);
    assert.equal(n, 0);
  });

  it("la regla del servidor dice lo mismo para estos casos", () => {
    assert.equal(puedeContenido({ rol: "admin", modulos: ["cultura"] }, "eventos", "x", "publicar"), true);
    assert.equal(puedeContenido({ rol: "admin", modulos: ["cultura"] }, "experiencias", "x", "editar"), false);
    assert.equal(puedeContenido({ rol: "admin", modulos: ["cultura"] }, "lugares", "x", "editar"), true);
    assert.equal(puedeContenido({ rol: "editor", modulos: ["turismo"] }, "lugares", "x", "publicar"), false);
    assert.equal(puedeContenido({ rol: "consulta", modulos: ["turismo"] }, "lugares", "x", "editar"), false);
  });
});

describe("cuentas", () => {
  it("solo un superadmin cambia permisos", async () => {
    const porEditor = await como(EDITOR, async (tx) =>
      (await tx.query("update public.admins set rol = 'superadmin' where user_id = $1 returning 1", [EDITOR])).rows.length);
    assert.equal(porEditor, 0);
    const porSuper = await como(SUPER, async (tx) =>
      (await tx.query("update public.admins set modulos = '{turismo,cultura}' where user_id = $1 returning 1", [EDITOR])).rows.length);
    assert.equal(porSuper, 1);
  });

  it("un superadmin no puede quitarse el rol a sí mismo", async () => {
    await assert.rejects(
      como(SUPER, (tx) => tx.query("update public.admins set rol = 'admin' where user_id = $1", [SUPER])),
      /superadministrador/,
    );
  });

  it("los cambios de cuentas quedan en la auditoría", async () => {
    const { rows } = await db.query("select 1 from public.auditoria where tabla = 'admins' and registro_id = $1", [EDITOR]);
    assert.ok(rows.length > 0);
  });
});

describe("contraseñas importadas de Agenda Cultural (scrypt)", () => {
  // El mismo formato que src/lib/auth/password.mjs de Agenda Cultural.
  function hashAgenda(clave: string) {
    const sal = crypto.randomBytes(16);
    const h = crypto.scryptSync(clave.normalize("NFKC"), sal, 64, { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
    return `scrypt$${2 ** 15}$8$1$${sal.toString("base64")}$${h.toString("base64")}`;
  }

  it("valida la contraseña correcta y rechaza otra", () => {
    const hash = hashAgenda("clave-de-agenda");
    assert.ok(esHashScrypt(hash));
    assert.equal(verificarScrypt("clave-de-agenda", hash), true);
    assert.equal(verificarScrypt("otra-clave", hash), false);
  });

  it("rechaza hashes mal formados sin romper", () => {
    assert.equal(verificarScrypt("x", "scrypt$abc"), false);
    assert.equal(verificarScrypt("x", "scrypt$0$8$1$AA==$AA=="), false);
    assert.equal(esHashScrypt("$2a$10$abc"), false);
  });

  it("una cuenta con hash scrypt no rompe la comparación bcrypt de las demás", async () => {
    await db.query("insert into auth.users (email, encrypted_password) values ('agenda@ejemplo.test', $1)", [hashAgenda("x")]);
    const { rows } = await db.query(
      `select id from auth.users where lower(email) = lower($1) and encrypted_password is not null
       and case when encrypted_password like 'scrypt$%' then false else encrypted_password = extensions.crypt($2, encrypted_password) end`,
      ["agenda@ejemplo.test", "x"]);
    assert.equal(rows.length, 0);
  });
});
