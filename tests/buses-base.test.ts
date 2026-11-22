/**
 * Base del Bus Turístico reconstruida con sus migraciones reales (lib/buses/sql/historico) en PGlite:
 * la función de reserva create_tourist_booking, los cupos, las bicis y la mejora antiduplicado.
 * También prueba el puente por socket que usa el modo local (postgres.js → PGlite).
 */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import postgres from "postgres";

import { crearBaseBuses } from "../lib/buses/local/preparar.ts";

let db: PGlite;
before(async () => {
  db = await crearBaseBuses({ conDatos: false });
});
after(async () => db?.close());

const reservar = async (salida: number, personas: number, correo = `p${Math.random()}@ejemplo.test`, bicis = 0) =>
  (await db.query<{ r: { ok: boolean; code?: string; remaining?: number; remaining_bikes?: number; booking?: { cancel_token: string } } }>(
    "select create_tourist_booking($1, 'Prueba', $2, '3810000000', 'Tucumán', $3, 'es', $4) as r", [salida, correo, personas, bicis])).rows[0].r;

const nuevaSalida = async (cupo: number, extra: { dias?: number; bicis?: number | null; estado?: string } = {}) =>
  (await db.query<{ id: number }>(
    `insert into tourist_departures (circuit_slug, title, departure_date, departure_time, capacity, bike_stock, status)
     values ('historico-cultural', 'Prueba', current_date + $1::int, '10:00', $2, $3, $4) returning id`,
    [extra.dias ?? 2, cupo, extra.bicis ?? null, extra.estado ?? "active"])).rows[0].id;

describe("esquema real del Bus Turístico", () => {
  it("tiene las tablas que usan el sitio y el bot", async () => {
    const { rows } = await db.query<{ t: string }>("select table_name as t from information_schema.tables where table_schema = 'public'");
    const tablas = new Set(rows.map((r) => r.t));
    for (const t of ["tourist_circuits", "tourist_departures", "tourist_bookings", "educational_bus_requests", "educational_circuits",
      "photo_books", "faqs", "tourist_interactions", "bot_chat_messages", "bicitour_sessions", "admin_profiles"]) {
      assert.ok(tablas.has(t), t);
    }
  });
});

describe("reserva atómica (create_tourist_booking)", () => {
  it("descuenta cupos y rechaza cuando no alcanza", async () => {
    const s = await nuevaSalida(5);
    assert.deepEqual([(await reservar(s, 3)).ok, (await reservar(s, 2)).remaining], [true, 0]);
    const sin = await reservar(s, 1);
    assert.equal(sin.ok, false);
    assert.equal(sin.code, "NO_CAPACITY");
  });

  it("no reserva en salidas canceladas ni pasadas", async () => {
    assert.equal((await reservar(await nuevaSalida(10, { estado: "cancelled" }), 1)).code, "CANCELLED");
    assert.equal((await reservar(await nuevaSalida(10, { dias: -1 }), 1)).code, "PAST");
    assert.equal((await reservar(999999, 1)).code, "NOT_FOUND");
  });

  it("controla las bicis municipales", async () => {
    const s = await nuevaSalida(10, { bicis: 2 });
    assert.equal((await reservar(s, 2, undefined, 2)).ok, true);
    assert.equal((await reservar(s, 1, undefined, 1)).code, "NO_BIKES");
    assert.equal((await reservar(s, 1, undefined, 2)).code, "INVALID_BIKES", "más bicis que personas");
    assert.equal((await reservar(await nuevaSalida(10), 1, undefined, 1)).code, "INVALID_BIKES", "salida sin bicis");
  });

  it("una cancelación libera el cupo", async () => {
    const s = await nuevaSalida(2);
    const r = await reservar(s, 2);
    assert.equal((await reservar(s, 1)).code, "NO_CAPACITY");
    await db.query("update tourist_bookings set status = 'cancelled' where cancel_token = $1", [r.booking!.cancel_token]);
    assert.equal((await reservar(s, 1)).ok, true);
  });

  it("no acepta dos reservas confirmadas del mismo correo en la misma salida (mejora del portal)", async () => {
    const s = await nuevaSalida(20);
    assert.equal((await reservar(s, 1, "Repetido@ejemplo.test")).ok, true);
    await assert.rejects(reservar(s, 1, "repetido@ejemplo.test"), /duplicate|unique|idx_tourist_bookings_un_confirmado/i);
    // En otra salida sí puede.
    assert.equal((await reservar(await nuevaSalida(20), 1, "repetido@ejemplo.test")).ok, true);
  });
});

describe("puente por socket del modo local", () => {
  it("postgres.js habla con la base embebida y llama a la función con parámetros nombrados", async () => {
    const servidor = new PGLiteSocketServer({ db, port: 54399, host: "127.0.0.1", maxConnections: 1 });
    await servidor.start();
    const sql = postgres("postgres://postgres@127.0.0.1:54399/postgres", { max: 1, prepare: false, onnotice: () => {} });
    try {
      const s = await nuevaSalida(3);
      const [fila] = await sql`select create_tourist_booking(p_departure_id => ${s}, p_full_name => ${"Socket"}, p_email => ${"socket@ejemplo.test"},
        p_phone => ${"3810000000"}, p_origin_city => ${"Tucumán"}, p_people_count => ${2}, p_language => ${"es"}, p_municipal_bikes => ${0}) as result`;
      assert.equal((fila.result as { ok: boolean }).ok, true);
    } finally {
      await sql.end();
      await servidor.stop();
    }
  });
});
