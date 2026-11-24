import { NextRequest, NextResponse } from "next/server";

import { datosDelBusParaMigue } from "@/lib/buses/migue";
import { crearLimitador } from "@/lib/buses/reglas";
import { leerContenido, ocurrenciasDeAgenda } from "@/lib/datos";
import { planificador as textos } from "@/lib/i18n/textos/planificador";
import {
  armarCatalogo, armarPrompt, hoyEnTucuman, iaDisponible, leerPedido, pedirAlModelo, planSinIA, validarRespuesta, type Plan,
} from "@/lib/planificador";

/**
 * POST /api/planifica/itinerario — arma una visita día por día (ver lib/planificador.ts).
 *
 * Público como el formulario: no guarda nada ni pide datos personales. Lee solo contenido publicado
 * (como visitante) y los cupos del bus del momento. La clave del modelo queda en el servidor. Cada
 * pedido a la IA cuesta: hay un límite por conexión.
 */
export const dynamic = "force-dynamic";

const porIp = crearLimitador(8, 10 * 60 * 1000);
const ipDe = (r: NextRequest) => r.headers.get("x-real-ip") || r.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "sin-ip";
const sinCache = { "Cache-Control": "no-store" };

export async function POST(request: NextRequest) {
  if (!porIp(ipDe(request))) return NextResponse.json({ error: "limite" }, { status: 429, headers: sinCache });

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ error: "pedido" }, { status: 400, headers: sinCache });
  }
  const idioma = (cuerpo as { idioma?: unknown })?.idioma;
  const c = await leerContenido(false, idioma === "en" || idioma === "pt" ? idioma : "es");
  const leido = leerPedido(cuerpo, c.categorias.map((k) => k.id), hoyEnTucuman());
  if ("error" in leido) return NextResponse.json({ error: leido.error }, { status: 400, headers: sinCache });
  const pedido = leido.pedido;

  const bus = await datosDelBusParaMigue();
  const catalogo = armarCatalogo({
    lugares: c.lugares, experiencias: c.experiencias, recorridos: c.recorridos, platos: c.platos, escapadas: c.escapadas,
    agenda: ocurrenciasDeAgenda(c), salidas: bus?.salidas ?? [], circuitos: new Map((bus?.circuitos ?? []).map((k) => [k.slug, k.nombre])),
  }, pedido);

  let plan: Plan | null = null;
  if (iaDisponible()) {
    const temas = new Map(c.categorias.map((k) => [k.id, k.titulo]));
    plan = validarRespuesta(await pedirAlModelo(armarPrompt(pedido, catalogo, temas)), pedido, catalogo);
  }
  if (!plan) {
    const t = textos[pedido.idioma];
    plan = { ...planSinIA(pedido, catalogo), titulo: t.tituloSinIA, resumen: t.resumenSinIA, consejos: [...t.consejosSinIA] };
  }
  return NextResponse.json({ plan }, { headers: sinCache });
}
