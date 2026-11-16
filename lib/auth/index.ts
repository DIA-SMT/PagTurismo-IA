import "server-only";
import { connection } from "next/server";
import { cache } from "react";

import { usaSupabase } from "@/lib/entorno";
import { contrasenaCorrecta, permitirPruebaDeContrasena } from "./limites";
import type { ResultadoAuth } from "./tipos";

export type { ErrorAuth, ResultadoAuth, Usuario } from "./tipos";

// Con Supabase, Supabase Auth; en local y en un servidor propio, el ingreso del portal (./local).
const impl = () => (usaSupabase ? import("./supabase") : import("./local"));

/** Usuario con sesión iniciada, o null. Se resuelve una vez por pedido. */
export const usuarioActual = cache(async () => {
  await connection();
  return (await impl()).usuarioActual();
});

export async function ingresarConContrasena(email: string, contrasena: string): Promise<ResultadoAuth> {
  const permiso = await permitirPruebaDeContrasena(email);
  if (permiso === "error") return { ok: false, error: "error_servicio" };
  if (permiso !== "ok") return { ok: false, error: "demasiados_intentos" };
  const r = await (await impl()).ingresarConContrasena(email, contrasena);
  if (r.ok) await contrasenaCorrecta(email);
  return r;
}

export async function cerrarSesion() {
  return (await impl()).cerrarSesion();
}
