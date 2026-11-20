import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";

import { usuarioActual } from "@/lib/auth";
import { consultar, type Contexto } from "@/lib/db";
import { esModulo, esRol, puede, puedeContenido, type Accion, type Modulo, type Permisos } from "@/lib/permisos";

export type Admin = Permisos & { id: string; email: string; nombre: string };

/** Integrante activo del equipo con sesión iniciada, o null. Se resuelve una vez por pedido. */
export const adminActual = cache(async (): Promise<Admin | null> => {
  const usuario = await usuarioActual();
  if (!usuario) return null;
  const [fila] = await consultar<{ nombre: string; rol: string; modulos: string[] }>(
    { rol: "authenticated", uid: usuario.id },
    "select nombre, rol, modulos from public.admins where user_id = $1 and activo",
    [usuario.id],
  );
  if (!fila) return null;
  return {
    ...usuario,
    nombre: fila.nombre,
    rol: esRol(fila.rol) ? fila.rol : "consulta",
    modulos: (fila.modulos ?? []).filter(esModulo),
  };
});

/**
 * Exige una sesión del equipo. Llamarla en CADA página, Server Action y Route Handler del
 * panel: el layout no protege las acciones.
 */
export async function requerirAdmin(): Promise<Admin> {
  const admin = await adminActual();
  if (!admin) redirect("/admin/ingresar");
  return admin;
}

export class SinPermiso extends Error {
  constructor(public modulo: string, public accion: string) {
    super("Tu usuario no tiene permiso para hacer esto.");
  }
}

/**
 * Exige sesión y permiso para `accion` en `modulo`. En páginas, sin permiso redirige al tablero
 * con un aviso; en acciones y rutas de API conviene `tienePermiso` para devolver el error.
 */
export async function requerirPermiso(modulo: Modulo, accion: Accion = "ver"): Promise<Admin> {
  const admin = await requerirAdmin();
  if (!puede(admin, modulo, accion)) redirect(`/admin?sin-permiso=${modulo}`);
  return admin;
}

/** Igual que requerirPermiso pero sobre una ficha (sus módulos salen de la colección). */
export async function requerirPermisoContenido(coleccion: string, slug: string, accion: Accion = "ver"): Promise<Admin> {
  const admin = await requerirAdmin();
  if (!puedeContenido(admin, coleccion, slug, accion)) redirect(`/admin?sin-permiso=${coleccion}`);
  return admin;
}

/** Para Route Handlers: el admin con permiso, o null (sin sesión o sin permiso). */
export async function adminConPermiso(modulo: Modulo, accion: Accion = "ver"): Promise<Admin | null> {
  const admin = await adminActual();
  return admin && puede(admin, modulo, accion) ? admin : null;
}

/** Contexto de base de datos del integrante del equipo (las políticas RLS aplican sus permisos). */
export function comoAdmin(admin: Admin): Contexto {
  return { rol: "authenticated", uid: admin.id };
}

/** Corta la página si el admin no tiene `accion` sobre la ficha. Para usar después de leer los parámetros. */
export function exigirContenido(admin: Admin, coleccion: string, slug: string, accion: Accion = "ver") {
  if (!puedeContenido(admin, coleccion, slug, accion)) redirect(`/admin?sin-permiso=${coleccion}`);
}
