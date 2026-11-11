import "server-only";
import path from "node:path";
import type { PGlite } from "@electric-sql/pglite";

import { crearBaseLocal } from "./preparar";

// Una sola instancia por proceso, también entre recargas del servidor de desarrollo.
const global = globalThis as typeof globalThis & { __turismoBaseLocal?: Promise<PGlite> };

export function baseLocal() {
  // En una vista previa de Vercel sin Supabase (sin DATABASE_URL) el disco es de solo lectura:
  // la base vive en memoria con el contenido inicial. Sirve para mirar, no guarda cambios.
  const carpeta = process.env.VERCEL ? undefined : path.join(process.cwd(), ".local", "pgdata");
  if (!carpeta) console.warn("Sin DATABASE_URL en Vercel: base en memoria, los cambios del panel no se guardan.");
  global.__turismoBaseLocal ??= crearBaseLocal({ carpeta });
  return global.__turismoBaseLocal;
}
