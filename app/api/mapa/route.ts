import { NextRequest, NextResponse } from "next/server";

import { leerContenido } from "@/lib/datos";
import { traerMunicipal } from "@/lib/mapa-municipal";
import { capasDelPortal, normalizarMunicipal, type DatosMapa } from "@/lib/mapa";
import { mapa as textosMapa } from "@/lib/i18n/textos/mapa";
import { esParaComer } from "@/lib/planificador";
import { rutas } from "@/lib/rutas";

/**
 * GET /api/mapa?idioma=es — los puntos del mapa interactivo: los del mapa de la Municipalidad (API pública
 * de mapa.smt.gob.ar, guardada una hora) y los lugares publicados del portal. Si el mapa municipal no
 * responde, salen solo los del portal y `municipal: false` lo avisa.
 */
export const dynamic = "force-dynamic";

const API = process.env.MAPA_SMT_API ?? "https://estadisticas.smt.gob.ar:5050/mapa";

const traer = (ruta: string) => traerMunicipal(`${API}/${ruta}`);

export async function GET(request: NextRequest) {
  const pedido = request.nextUrl.searchParams.get("idioma");
  const idioma = pedido === "en" || pedido === "pt" ? pedido : "es";
  const t = textosMapa[idioma];
  const c = await leerContenido(false, idioma);
  const fichas = c.lugares.map((l) => ({ titulo: l.titulo, url: rutas.lugar(l.slug) }));
  const portal = capasDelPortal(
    c.lugares.map((l) => ({
      slug: l.slug, titulo: l.titulo, resumen: l.resumen, coordenadas: l.coordenadas, url: rutas.lugar(l.slug),
      comida: esParaComer(l.clase) || l.categorias.includes("sabores-tucumanos"),
    })),
    { grupo: t.grupoPortal, visitar: t.capaVisitar, comer: t.capaComer },
  );

  let municipal: ReturnType<typeof normalizarMunicipal> = { capas: [], puntos: [] };
  if (API && API !== "no") {
    try {
      const [menu, ubicaciones] = await Promise.all([traer("menu"), traer("ubicaciones")]);
      municipal = normalizarMunicipal(menu, ubicaciones, fichas);
    } catch (e) {
      const causa = e instanceof Error && e.cause instanceof Error ? ` (${(e.cause as Error & { code?: string }).code ?? ""} ${e.cause.message})` : "";
      console.error(`Mapa: el mapa de la Municipalidad no respondió: ${e instanceof Error ? e.message : String(e)}${causa}`);
    }
  }
  // Nombres de las capas municipales en el idioma pedido (los datos llegan en español).
  const capas = [...portal.capas, ...municipal.capas.map((k) => ({
    ...k, grupo: t.grupos[k.grupo as keyof typeof t.grupos] ?? k.grupo, nombre: t.capas[k.nombre as keyof typeof t.capas] ?? k.nombre,
  }))];
  const datos: DatosMapa = { capas, puntos: [...portal.puntos, ...municipal.puntos], municipal: municipal.puntos.length > 0 };
  return NextResponse.json(datos, { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" } });
}
