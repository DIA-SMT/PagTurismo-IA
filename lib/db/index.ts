import "server-only";
import { connection } from "next/server";
import type { Options, Sql } from "postgres";

import { modoLocal } from "@/lib/entorno";

/**
 * Acceso a la base. Igual que en la subasta del Cementerio del Oeste: en local, PGlite con las
 * mismas migraciones; en producción, Supabase por postgres.js.
 *
 * Contexto con el que corre cada consulta. Replica lo que hace la API de Supabase: fija el rol
 * y los claims dentro de la transacción, así las políticas RLS y auth.uid() se aplican igual.
 *  - anon: visitante del sitio.
 *  - authenticated: integrante del equipo con sesión iniciada.
 *  - servicio: tareas internas del servidor. Sin RLS.
 *
 * Parámetros jsonb: escribir `$1::text::jsonb` y pasar `JSON.stringify(valor)`.
 */
export type Contexto = { rol: "anon" } | { rol: "authenticated"; uid: string } | { rol: "servicio" };

export type Consulta = <T = Record<string, unknown>>(texto: string, params?: unknown[]) => Promise<T[]>;

export type Motor = <R>(ctx: Contexto, fn: (q: Consulta) => Promise<R>) => Promise<R>;

let motor: Promise<Motor> | undefined;

function claims(ctx: Contexto) {
  return JSON.stringify(ctx.rol === "authenticated" ? { sub: ctx.uid, role: ctx.rol } : { role: ctx.rol });
}

const FIJAR_ROL = "select set_config('request.jwt.claims', $1, true), set_config('role', $2, true)";

async function crearMotorLocal(): Promise<Motor> {
  const { baseLocal } = await import("./local/instancia");
  const db = await baseLocal();
  return (ctx, fn) =>
    db.transaction(async (tx) => {
      if (ctx.rol !== "servicio") await tx.query(FIJAR_ROL, [claims(ctx), ctx.rol]);
      return fn(async (texto, params) => (await tx.query(texto, params ?? [])).rows as never);
    });
}

/** Siempre TLS con Supabase. Con SUPABASE_CA_CERT además verifica el certificado. */
export function opcionesTls(certificado = process.env.SUPABASE_CA_CERT): Options<never>["ssl"] {
  const ca = certificado?.replace(/\\n/g, "\n").trim();
  return ca ? { ca, rejectUnauthorized: true } : "require";
}

async function crearMotorSupabase(): Promise<Motor> {
  const { default: postgres } = await import("postgres");
  // Pooler de Supabase en modo transacción (puerto 6543): sin prepared statements.
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 5, idle_timeout: 20, ssl: opcionesTls() });
  return motorPostgres(sql);
}

export function motorPostgres(sql: Sql): Motor {
  return (ctx, fn) =>
    sql.begin(async (tx) => {
      if (ctx.rol !== "servicio") await tx.unsafe(FIJAR_ROL, [claims(ctx), ctx.rol]);
      return fn(async (texto, params) => (await tx.unsafe(texto, (params ?? []) as never[])) as never);
    }) as never;
}

/** Ejecuta `fn` dentro de una transacción con el rol indicado. */
export async function conBase<R>(ctx: Contexto, fn: (q: Consulta) => Promise<R>): Promise<R> {
  // El contenido se lee en el momento del pedido: lo que se guarda en el panel se ve al instante.
  await connection();
  motor ??= modoLocal ? crearMotorLocal() : crearMotorSupabase();
  return (await motor)(ctx, fn);
}

export function consultar<T = Record<string, unknown>>(ctx: Contexto, texto: string, params?: unknown[]) {
  return conBase(ctx, (q) => q<T>(texto, params));
}
