/**
 * Idiomas del sitio público y sus direcciones.
 *
 * El español vive en la raíz (/que-hacer); inglés y portugués llevan prefijo y la primera
 * sección traducida (/en/things-to-do, /pt/o-que-fazer). Por dentro todas las páginas usan las
 * rutas en español bajo /[idioma]: el proxy traduce la dirección pública a la interna.
 *
 * Sin dependencias: lo usan el proxy, el servidor, el navegador y las pruebas.
 */

export const IDIOMAS = ["es", "en", "pt"] as const;
export type Idioma = (typeof IDIOMAS)[number];
export const IDIOMA_BASE: Idioma = "es";

export const esIdioma = (x: unknown): x is Idioma => typeof x === "string" && (IDIOMAS as readonly string[]).includes(x);

/** Para el atributo lang, Open Graph y los formatos de fecha. */
export const LOCALE: Record<Idioma, { lang: string; og: string; intl: string; nombre: string; corto: string }> = {
  es: { lang: "es-AR", og: "es_AR", intl: "es-AR", nombre: "Español", corto: "ES" },
  en: { lang: "en", og: "en_US", intl: "en-US", nombre: "English", corto: "EN" },
  pt: { lang: "pt-BR", og: "pt_BR", intl: "pt-BR", nombre: "Português", corto: "PT" },
};

/** Primera sección de la dirección: interna (español) → pública en cada idioma. */
const SECCIONES: Record<string, Record<Exclude<Idioma, "es">, string>> = {
  "que-hacer": { en: "things-to-do", pt: "o-que-fazer" },
  lugares: { en: "places", pt: "lugares" },
  experiencias: { en: "experiences", pt: "experiencias" },
  recorridos: { en: "tours", pt: "roteiros" },
  agenda: { en: "events", pt: "agenda" },
  planifica: { en: "plan-your-visit", pt: "planeje-sua-visita" },
  descubri: { en: "discover", pt: "descubra" },
  sabores: { en: "food-and-drink", pt: "sabores" },
  escapadas: { en: "day-trips", pt: "passeios" },
};

/** Direcciones que no son páginas del sitio y no pasan por los idiomas. */
const FUERA_DEL_SITIO = /^\/(admin|api|subidas|_next|fotos|stickers|img|migue|fonts)(\/|$)|^\/(sitemap\.xml|robots\.txt|icon\.png|apple-icon\.png|favicon\.ico)$/;

export const esRutaDelSitio = (pathname: string) => !FUERA_DEL_SITIO.test(pathname);

function partir(href: string): [string, string] {
  const i = href.search(/[?#]/);
  return i === -1 ? [href, ""] : [href.slice(0, i), href.slice(i)];
}

/** Dirección interna en español ("/lugares/x?y") → dirección pública en el idioma. */
export function localizarRuta(href: string, idioma: Idioma): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const [ruta, resto] = partir(href);
  if (idioma === "es" || !esRutaDelSitio(ruta)) return href;
  const [, primera = "", ...demas] = ruta.split("/");
  const seccion = SECCIONES[primera]?.[idioma] ?? primera;
  const publica = ["", idioma, seccion, ...demas].filter((p, i) => i === 0 || p !== "").join("/");
  return `${publica}${resto}`;
}

export type Interpretacion =
  /** Mostrar la página interna `interna` en `idioma`. */
  | { tipo: "pagina"; idioma: Idioma; interna: string }
  /** Mandar a la dirección canónica. */
  | { tipo: "redirigir"; destino: string }
  /** No es una página del sitio (admin, archivos…). */
  | { tipo: "fuera" };

/** Dirección pública → qué página mostrar, o adónde redirigir si no es la canónica. */
export function interpretarRuta(pathname: string): Interpretacion {
  if (!esRutaDelSitio(pathname)) return { tipo: "fuera" };
  const [, primera = "", segunda = "", ...demas] = pathname.split("/");

  // /es/... no existe: el español va sin prefijo.
  if (primera === "es") {
    const sin = "/" + [segunda, ...demas].filter((p, i) => i === 0 || p !== "").join("/");
    return { tipo: "redirigir", destino: sin === "/" ? "/" : sin.replace(/\/$/, "") };
  }

  if (primera === "en" || primera === "pt") {
    const idioma = primera;
    if (!segunda) return { tipo: "pagina", idioma, interna: `/${idioma}` };
    const interna = Object.keys(SECCIONES).find((k) => SECCIONES[k][idioma] === segunda);
    if (interna) return { tipo: "pagina", idioma, interna: ["", idioma, interna, ...demas].join("/") };
    // Sección en español dentro de otro idioma (/en/lugares/x): a la dirección traducida.
    if (SECCIONES[segunda] && SECCIONES[segunda][idioma] !== segunda) {
      return { tipo: "redirigir", destino: localizarRuta("/" + [segunda, ...demas].join("/"), idioma) };
    }
    return { tipo: "pagina", idioma, interna: pathname };
  }

  return { tipo: "pagina", idioma: IDIOMA_BASE, interna: pathname === "/" ? "/es" : `/es${pathname}` };
}

/** La misma página en otro idioma, a partir de la dirección pública actual. */
export function rutaEnOtroIdioma(pathnamePublico: string, destino: Idioma): string {
  let i = interpretarRuta(pathnamePublico);
  // Por las dudas llegue una dirección no canónica (/es/…, /en/lugares/…).
  if (i.tipo === "redirigir") i = interpretarRuta(i.destino);
  if (i.tipo !== "pagina") return localizarRuta("/", destino);
  const sinIdioma = i.interna.replace(/^\/(es|en|pt)(?=\/|$)/, "") || "/";
  return localizarRuta(sinIdioma, destino);
}
