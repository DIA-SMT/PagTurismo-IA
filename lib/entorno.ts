import "server-only";

/**
 * Dónde corre el portal. Se decide por las variables de entorno:
 *
 *  - "local":    sin DATABASE_URL. Base PGlite en .local/ con el contenido inicial y un usuario de
 *                prueba para el panel. Para desarrollar.
 *  - "supabase": DATABASE_URL + NEXT_PUBLIC_SUPABASE_URL. Base, ingreso del equipo (Supabase Auth)
 *                y fotos (Supabase Storage) en Supabase.
 *  - "propio":   DATABASE_URL sin Supabase. Un PostgreSQL propio (la VPS municipal): el ingreso lo
 *                resuelve el portal (contraseña bcrypt en auth.users, sesión firmada con
 *                SESION_SECRETO) y las fotos se guardan en CARPETA_SUBIDAS. Ver deploy/README.md.
 */
export type Modo = "local" | "supabase" | "propio";

export const modo: Modo = !process.env.DATABASE_URL ? "local" : process.env.NEXT_PUBLIC_SUPABASE_URL ? "supabase" : "propio";

/** Base PGlite de desarrollo. */
export const modoLocal = modo === "local";
/** Ingreso y fotos en Supabase. */
export const usaSupabase = modo === "supabase";

export const supabase = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  claveAnonima: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
};

if (usaSupabase && !supabase.claveAnonima) {
  throw new Error("Con NEXT_PUBLIC_SUPABASE_URL también hay que definir NEXT_PUBLIC_SUPABASE_ANON_KEY.");
}
// En el servidor propio las sesiones se firman con un secreto fijo: si cambiara en cada
// arranque, cada despliegue cerraría la sesión de todo el equipo.
if (modo === "propio" && process.env.NEXT_PHASE !== "phase-production-build" && !process.env.SESION_SECRETO) {
  throw new Error("En un servidor propio hay que definir SESION_SECRETO (openssl rand -base64 48).");
}
