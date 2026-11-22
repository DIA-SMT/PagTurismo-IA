import { NextResponse } from "next/server";

import { datosDelBusParaMigue } from "@/lib/buses/migue";
import { leerContenido } from "@/lib/datos";
import { fichasDelBus, paraMigue } from "@/lib/migue";

/**
 * GET /api/migue/contenido — el contenido publicado del sitio, en texto, para Migue (el
 * asistente de la Municipalidad que atiende el chat del sitio). Ver lib/migue.ts.
 *
 * Es público como el sitio: no trae nada que no esté ya a la vista. Nunca trae borradores,
 * aunque quien pida tenga sesión en el panel. Migue lo guarda unos minutos y el servidor lo sirve
 * desde la caché otros cinco, así cada mensaje del chat no consulta la base.
 *
 * Portal unificado: suma la agenda cultural (eventos con fecha en los próximos 120 días), los
 * espacios y el Bus Turístico con sus cupos reales del momento. Si la base del bus no responde,
 * el resto sale igual y `general` lo aclara para que Migue no invente disponibilidad.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  // En español: Migue contesta en el idioma en que le escriben, y el chat traduce los botones.
  const [contenido, bus] = await Promise.all([leerContenido(false, "es"), datosDelBusParaMigue()]);
  const datos = paraMigue(contenido);
  if (bus) {
    datos.fichas.push(...fichasDelBus(bus.circuitos, bus.salidas));
  } else {
    datos.general += "\nBus Turístico: en este momento no se pueden consultar los cupos. Indicá la página /bus-turistico para ver salidas y reservar; no confirmes disponibilidad.";
  }
  return NextResponse.json(datos, {
    headers: {
      // Con cupos en el contenido, la caché es más corta: un minuto, y hasta cinco mientras se renueva.
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      "X-Robots-Tag": "noindex",
    },
  });
}
