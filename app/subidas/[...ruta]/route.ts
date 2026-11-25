import fs from "node:fs/promises";
import path from "node:path";
import { connection } from "next/server";

import { CARPETA_LOCAL } from "@/lib/almacenamiento";
import { usaSupabase } from "@/lib/entorno";
import { tipoDeSubida } from "@/lib/subidas";

// Sin Supabase (modo local o servidor propio): sirve las fotos subidas desde el panel y las que copió el
// importador de la Agenda (qué direcciones se aceptan: lib/subidas.ts).
export async function GET(_pedido: Request, { params }: RouteContext<"/subidas/[...ruta]">) {
  await connection();
  const { ruta } = await params;
  const relativa = ruta.join("/");
  const tipo = tipoDeSubida(relativa);
  const raiz = path.resolve(CARPETA_LOCAL);
  const archivo = path.resolve(raiz, relativa);
  if (usaSupabase || !tipo || !archivo.startsWith(raiz + path.sep)) {
    return new Response("No encontrado", { status: 404 });
  }
  try {
    const datos = await fs.readFile(archivo);
    return new Response(new Uint8Array(datos), {
      headers: { "Content-Type": tipo === "webp" ? "image/webp" : "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new Response("No encontrado", { status: 404 });
  }
}
