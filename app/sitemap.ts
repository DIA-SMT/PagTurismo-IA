import type { MetadataRoute } from "next";

import { getCategorias, getEventos, getExperiencias, getGuias, getLugares, getRecorridos } from "@/lib/datos";
import { rutas } from "@/lib/rutas";

/** Sólo páginas publicadas: los borradores no se indexan. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.SITIO_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const publicado = <T extends { estado: string }>(e: T) => e.estado === "publicado";
  const fijas = ["/", "/descubri", "/que-hacer", "/recorridos", "/agenda", "/planifica", "/sabores", "/escapadas"];
  const urls = [
    ...fijas,
    ...getCategorias().map((c) => rutas.categoria(c.id)),
    ...getLugares().filter(publicado).map((e) => rutas.lugar(e.slug)),
    ...getExperiencias().filter(publicado).map((e) => rutas.experiencia(e.slug)),
    ...getRecorridos().filter(publicado).map((e) => rutas.recorrido(e.slug)),
    ...getEventos().filter(publicado).map((e) => rutas.evento(e.slug)),
    ...getGuias().filter(publicado).map((e) => rutas.guia(e.slug)),
  ];
  return urls.map((u) => ({ url: `${base}${u === "/" ? "" : u}` }));
}
