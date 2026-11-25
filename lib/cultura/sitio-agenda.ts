/**
 * Lectura del sitio público de la Agenda Cultural (la app Next.js de DIA-SMT/Agenda-Cultural).
 *
 * El WordPress viejo (agendaculturalsmt.com) dejó de responder y agendacultural.smt.gob.ar todavía redirige
 * ahí: las fotos de los espacios y de los eventos solo se consiguen en el sitio nuevo, que las sirve en
 * /media/… . Estas funciones son puras (reciben el HTML) y tienen pruebas en tests/sitio-agenda.test.ts;
 * scripts/cultura.ts hace los pedidos.
 */

import type { EspacioAgenda } from "./importar.ts";

/** Sitio nuevo de la Agenda. Se puede cambiar con AGENDA_SITIO_URL cuando tenga el dominio definitivo. */
export const AGENDA_SITIO_POR_DEFECTO = "https://agenda.195-35-42-168.sslip.io";

const decodificar = (s: string) =>
  s.replace(/<!-- -->/g, "").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
const texto = (html: string) => decodificar(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

/** `/_next/image?url=%2Fmedia%2F…&w=…` → `https://sitio/media/…` (la foto original, sin recortes de Next). */
export function fotoOriginal(src: string, base: string): string {
  const limpio = decodificar(src);
  const m = limpio.match(/[?&]url=([^&]+)/);
  const ruta = m ? decodeURIComponent(m[1]) : limpio;
  return /^https?:\/\//.test(ruta) ? ruta : new URL(ruta, base).href;
}

/** Las direcciones de un tipo («lugares», «eventos») que lista el sitemap.xml del sitio. */
export function slugsDelSitemap(xml: string, tipo: string): string[] {
  const re = new RegExp(`<loc>[^<]*/${tipo}/([^<]+)</loc>`, "g");
  return [...new Set([...xml.matchAll(re)].map((m) => decodeURIComponent(m[1])))];
}

/** El contenido real de la página: Next lo transmite al final, en <div hidden id="S:…">. */
function cuerpo(html: string): string {
  const i = html.indexOf('<div class="page-surface">');
  return i >= 0 ? html.slice(i) : html;
}

function jsonLd(html: string): Record<string, unknown> {
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!m) return {};
  try { return JSON.parse(m[1]); } catch { return {}; }
}

/** Los datos del costado de la ficha: { «Dirección»: html, «Horarios»: html, … }. */
function datosLaterales(b: string): Record<string, string> {
  const aside = b.match(/<aside class="event-facts"[^>]*>([\s\S]*?)<\/aside>/)?.[1] ?? "";
  const datos: Record<string, string> = {};
  for (const parte of aside.split("<small>").slice(1)) {
    const fin = parte.indexOf("</small>");
    datos[texto(parte.slice(0, fin))] = parte.slice(fin + "</small>".length).split("</span>")[0];
  }
  return datos;
}

/** Lo que muestra la ficha como «Museo», «Centro cultural»… → los tipos de datos/cultura/*.json. */
const TIPOS: Record<string, string> = {
  "museo": "museum", "centro cultural": "cultural_house", "teatro": "theater", "parque": "park", "plaza": "square", "espacio": "other",
};

/** La página /lugares/<slug> de la Agenda → un espacio con la forma de datos/cultura/*.json. */
export function lugarDesdeHtml(html: string, slug: string, base: string): EspacioAgenda {
  const b = cuerpo(html);
  const ld = jsonLd(html) as { name?: string; description?: string; telephone?: string; address?: { streetAddress?: string } };
  const seccion = (titulos: string) => b.match(new RegExp(`<h2>(?:${titulos})</h2>([\\s\\S]*?)</section>`))?.[1];
  const tipo = texto(b.match(/<p class="section-kicker">([\s\S]*?)<\/p>/)?.[1] ?? "").toLowerCase();
  const lateral = datosLaterales(b);
  const redes: Record<string, string> = {};
  for (const m of (lateral["Redes"] ?? "").matchAll(/href="([^"]+)"[^>]*>([^<]+)</g)) redes[texto(m[2]).toLowerCase()] = decodificar(m[1]);
  const coordenadas = b.match(/maps\?q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/) ?? b.match(/query=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  const portada = b.match(/class="place-detail-hero"><img[^>]*?src="([^"]+)"/)?.[1];
  const servicios = seccion("Qué vas a encontrar|Datos del espacio|Servicios");
  const direccion = ld.address?.streetAddress
    ?? (lateral["Dirección"] ? texto(lateral["Dirección"].replace(/<em>[\s\S]*?<\/em>/, "")) : "");
  return {
    slug,
    name: texto(b.match(/<h1>([\s\S]*?)<\/h1>/)?.[1] ?? ld.name ?? slug),
    type: TIPOS[tipo] ?? "other",
    summary: ld.description ?? null,
    description: [...(seccion("Sobre el espacio") ?? "").matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) => texto(m[1])).filter(Boolean),
    services: servicios ? [...servicios.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => texto(m[1])).filter(Boolean) : [],
    address: direccion || null,
    phone: ld.telephone ?? null,
    opening_hours: [...(lateral["Horarios"] ?? "").matchAll(/<em class="place-hours">([\s\S]*?)<\/em>/g)].map((m) => texto(m[1])),
    social_links: { instagram: redes.instagram, facebook: redes.facebook, entradas: redes.entradas },
    image: portada ? fotoOriginal(portada, base) : null,
    gallery: [...(seccion("Galería") ?? "").matchAll(/<img[^>]*?src="([^"]+)"/g)].map((m) => fotoOriginal(m[1], base)),
    latitude: coordenadas ? Number(coordenadas[1]) : null,
    longitude: coordenadas ? Number(coordenadas[2]) : null,
    legacy_url: new URL(`/lugares/${slug}`, base).href,
  };
}

/** Las fotos de la página /eventos/<slug>: la principal (og:image) y la galería, si tiene. */
export function fotosDeEventoDesdeHtml(html: string, base: string): { titulo: string; imagen: string | null; galeria: string[] } {
  const b = cuerpo(html);
  const og = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
  const imagen = og && /\/media\//.test(og) ? fotoOriginal(og, base) : null;
  const galeria = [...(b.match(/<h2>Galería<\/h2>([\s\S]*?)<\/section>/)?.[1] ?? "").matchAll(/<img[^>]*?src="([^"]+)"/g)]
    .map((m) => fotoOriginal(m[1], base))
    .filter((src, i, todas) => src !== imagen && todas.indexOf(src) === i);
  return { titulo: texto(b.match(/<h1>([\s\S]*?)<\/h1>/)?.[1] ?? ""), imagen, galeria };
}
