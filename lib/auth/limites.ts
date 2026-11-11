import "server-only";
import { headers } from "next/headers";

import { consultar } from "@/lib/db";

// Límites propios de intentos de ingreso al panel (supabase/migrations, sección 5). Se
// controlan antes de llamar a Supabase Auth, que solo limita por IP y ve la del servidor.

const servicio = { rol: "servicio" } as const;

export type Permiso = "ok" | "limite_correo" | "limite_ip" | "error";

/** IP de quien hace el pedido. En Vercel, x-real-ip y x-forwarded-for los pone la plataforma. */
async function ipDelPedido() {
  const h = await headers();
  const ip = h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0];
  return ip?.trim() || null;
}

/** 5 intentos en 15 minutos por correo o por IP. */
export async function permitirPruebaDeContrasena(correo: string): Promise<Permiso> {
  try {
    const [f] = await consultar<{ r: Permiso }>(servicio, "select public.ingreso_probar_contrasena($1, $2) as r", [correo, await ipDelPedido()]);
    return f.r;
  } catch (e) {
    console.error("Límites de ingreso:", e instanceof Error ? e.message : e);
    return "error";
  }
}

/** Con la contraseña correcta, los intentos anteriores dejan de contar. */
export async function contrasenaCorrecta(correo: string) {
  try {
    await consultar(servicio, "select public.ingreso_contrasena_correcta($1, $2)", [correo, await ipDelPedido()]);
  } catch (e) {
    console.error("Límites de ingreso:", e instanceof Error ? e.message : e);
  }
}
