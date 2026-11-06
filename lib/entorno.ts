import "server-only";

/**
 * Sin DATABASE_URL el portal corre en modo local: base PGlite en .local/ con el contenido
 * inicial y un usuario de prueba para el panel. Con DATABASE_URL usa Supabase.
 */
export const modoLocal = !process.env.DATABASE_URL;

export const supabase = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  claveAnonima: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
};

if (!modoLocal && (!supabase.url || !supabase.claveAnonima)) {
  throw new Error("Con DATABASE_URL también hay que definir NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.");
}
