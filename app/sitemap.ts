import type { MetadataRoute } from "next";

import { contenido } from "@/lib/datos";
import { IDIOMAS, LOCALE, localizarRuta } from "@/lib/i18n/config";
import { rutas } from "@/lib/rutas";
import { urlDelSitio } from "@/lib/url-sitio";

/**
 * Sólo páginas publicadas: los borradores no se indexan. Cada página aparece en los tres
 * idiomas, y cada entrada lista sus versiones (hreflang) para que el buscador muestre la que
 * corresponde a quien busca.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const c = await contenido();
  const base = urlDelSitio();
  const publicado = <T extends { estado: string }>(e: T) => e.estado === "publicado";
  const fijas = ["/", "/descubri", "/que-hacer", "/recorridos", "/agenda", "/planifica", "/sabores", "/escapadas"];
  const urls = [
    ...fijas,
    ...c.categorias.map((c) => rutas.categoria(c.id)),
    ...c.lugares.filter(publicado).map((e) => rutas.lugar(e.slug)),
    ...c.experiencias.filter(publicado).map((e) => rutas.experiencia(e.slug)),
    ...c.recorridos.filter(publicado).map((e) => rutas.recorrido(e.slug)),
    ...c.eventos.filter(publicado).map((e) => rutas.evento(e.slug)),
    ...c.guias.filter(publicado).map((e) => rutas.guia(e.slug)),
  ];
  const absoluta = (ruta: string) => `${base}${ruta === "/" ? "" : ruta}`;
  return urls.flatMap((u) => {
    const languages = Object.fromEntries(IDIOMAS.map((i) => [LOCALE[i].lang, absoluta(localizarRuta(u, i))]));
    return IDIOMAS.map((i) => ({ url: absoluta(localizarRuta(u, i)), alternates: { languages } }));
  });
}
