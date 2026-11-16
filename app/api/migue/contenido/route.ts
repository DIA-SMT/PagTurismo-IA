import { NextResponse } from "next/server";

import { leerContenido } from "@/lib/datos";
import { paraMigue } from "@/lib/migue";

/**
 * GET /api/migue/contenido — el contenido publicado del sitio, en texto, para Migue (el
 * asistente de la Municipalidad que atiende el chat del sitio). Ver lib/migue.ts.
 *
 * Es público como el sitio: no trae nada que no esté ya a la vista. Nunca trae borradores,
 * aunque quien pida tenga sesión en el panel. Migue lo guarda unos minutos y Vercel lo sirve
 * desde la caché otros cinco, así cada mensaje del chat no consulta la base.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  // En español: Migue contesta en el idioma en que le escriben, y el chat traduce los botones.
  const datos = paraMigue(await leerContenido(false, "es"));
  return NextResponse.json(datos, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      "X-Robots-Tag": "noindex",
    },
  });
}
