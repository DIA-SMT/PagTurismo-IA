import { leerContenido, porSlug } from "@/lib/datos";
import { icsDeEvento } from "@/lib/cultura/ics";
import { rutas } from "@/lib/rutas";
import { urlDelSitio } from "@/lib/url-sitio";

/**
 * Todas las fechas vigentes de un evento en un .ics. Solo lo publicado: lee como visitante aunque
 * quien pida tenga sesión en el panel.
 */
export async function GET(_pedido: Request, ctx: RouteContext<"/api/agenda/[slug]/ics">) {
  const { slug } = await ctx.params;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return new Response("No encontrado", { status: 404 });
  const c = await leerContenido(false, "es");
  const e = porSlug(c.eventos, slug);
  if (!e) return new Response("No encontrado", { status: 404 });
  const lugar = e.lugar ? porSlug(c.lugares, e.lugar)?.titulo : undefined;
  const ics = icsDeEvento({
    slug: e.slug, titulo: e.titulo, resumen: e.resumen, url: `${urlDelSitio()}${rutas.evento(e.slug)}`,
    lugar: lugar ?? e.sede ?? e.lugarManual?.direccion, ocurrencias: e.ocurrencias,
  });
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${e.slug}.ics"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
