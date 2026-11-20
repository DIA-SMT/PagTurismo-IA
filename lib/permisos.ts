/**
 * Roles y permisos del panel unificado. Las mismas reglas que public.puede() y
 * public.modulos_de() en supabase/migrations/20261120120000_roles_permisos.sql: el servidor las
 * usa para cortar antes y para armar el menú; la base las vuelve a aplicar (RLS y disparadores).
 * tests/permisos.test.ts compara las dos implementaciones.
 *
 * Sin dependencias: lo usan el servidor, el navegador y las pruebas.
 */

export const MODULOS = ["turismo", "cultura", "buses", "migue"] as const;
export type Modulo = (typeof MODULOS)[number];

export const ROLES = ["superadmin", "admin", "editor", "consulta"] as const;
export type Rol = (typeof ROLES)[number];

export type Accion = "ver" | "editar" | "publicar" | "borrar" | "exportar" | "configurar";

export type Permisos = { rol: Rol; modulos: Modulo[] };

export const NOMBRE_ROL: Record<Rol, string> = {
  superadmin: "Superadministrador",
  admin: "Administrador",
  editor: "Editor",
  consulta: "Consulta",
};

export const NOMBRE_MODULO: Record<Modulo, string> = {
  turismo: "Turismo",
  cultura: "Cultura",
  buses: "Buses y circuitos",
  migue: "Migue",
};

export const DESCRIPCION_ROL: Record<Rol, string> = {
  superadmin: "Todo, en todos los módulos, más cuentas y permisos.",
  admin: "En sus módulos: ver, editar, publicar, borrar, exportar y configurar.",
  editor: "En sus módulos: ver y editar borradores. No publica ni cambia lo publicado.",
  consulta: "En sus módulos: solo ver.",
};

export const esRol = (x: unknown): x is Rol => typeof x === "string" && (ROLES as readonly string[]).includes(x);
export const esModulo = (x: unknown): x is Modulo => typeof x === "string" && (MODULOS as readonly string[]).includes(x);

/** ¿Puede hacer `accion` en `modulo`? */
export function puede(p: Permisos, modulo: Modulo, accion: Accion): boolean {
  if (p.rol === "superadmin") return true;
  if (!p.modulos.includes(modulo)) return false;
  if (accion === "ver") return true;
  if (accion === "editar") return p.rol === "admin" || p.rol === "editor";
  return p.rol === "admin";
}

/** Módulos de una ficha de public.contenidos. */
export function modulosDe(coleccion: string, slug = ""): Modulo[] {
  if (coleccion === "eventos") return ["cultura"];
  if (coleccion === "lugares") return ["turismo", "cultura"];
  if (coleccion === "configuracion" && slug === "categorias-agenda") return ["cultura"];
  return ["turismo"];
}

/** Permiso sobre una ficha: alcanza con tenerlo en alguno de sus módulos. */
export function puedeContenido(p: Permisos, coleccion: string, slug: string, accion: Accion): boolean {
  return modulosDe(coleccion, slug).some((m) => puede(p, m, accion));
}

/** ¿Ve algo de este módulo? Para el menú y el tablero. */
export const ve = (p: Permisos, modulo: Modulo) => puede(p, modulo, "ver");

export const esSuperadmin = (p: Permisos) => p.rol === "superadmin";
