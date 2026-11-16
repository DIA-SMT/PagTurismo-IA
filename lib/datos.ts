/**
 * Contenido del portal, leído de la base (public.contenidos).
 *
 * Una sola consulta por pedido trae todas las fichas; el resto son funciones puras sobre ese
 * resultado. Lo que el equipo guarda en /admin se ve en el sitio en el siguiente pedido.
 *
 * Borradores: el sitio lee como visitante (RLS: solo fichas publicadas). Quien tiene sesión
 * en el panel, o un despliegue de vista previa con MOSTRAR_BORRADORES=1, ve también los
 * borradores, marcados como tales, para revisarlos en contexto antes de publicarlos.
 *
 * Idiomas: el contenido llega ya en el idioma del pedido (lib/i18n/contenido.ts). Lo que no
 * está traducido se muestra en español, y `sinTraducir` dice qué fichas son.
 */

import "server-only";
import { cache } from "react";

import { adminActual } from "./admin/sesion";
import { consultar } from "./db";
import { destacables, dentroDeVentana, ocurrenciasVigentes } from "./fechas";
import type { Idioma } from "./i18n/config";
import { localizarDatos, tieneTraduccion } from "./i18n/contenido";
import { idiomaActual } from "./i18n/servidor";
import { textos } from "./i18n/textos";
import {
  normalizarDestacado, normalizarEscapada, normalizarEvento, normalizarExperiencia, normalizarGuia,
  normalizarLugar, normalizarPlato, normalizarRecorrido,
} from "./normalizar";
import { rutas } from "./rutas";
import type {
  Categoria, Destacado, Escapada, Etiqueta, Evento, Experiencia, Guia, ItemCatalogo, Lugar, Plato, Recorrido, Sitio,
} from "./tipos";

export type Contenido = {
  lugares: Lugar[];
  experiencias: Experiencia[];
  eventos: Evento[];
  recorridos: Recorrido[];
  guias: Guia[];
  platos: Plato[];
  escapadas: Escapada[];
  destacados: Destacado[];
  categorias: Categoria[];
  etiquetas: Etiqueta[];
  sitio: Sitio;
  /** Si este pedido ve borradores. */
  conBorradores: boolean;
  /** Idioma en el que llega el contenido. */
  idioma: Idioma;
  /** Fichas sin traducción a este idioma, como "lugares/plaza-x": se muestran en español. */
  sinTraducir: Set<string>;
};

type Fila = { coleccion: string; slug: string; estado: string; datos: Record<string, unknown> };

/** ¿Este pedido puede ver borradores? */
export const verBorradores = cache(async () => {
  if (process.env.MOSTRAR_BORRADORES === "1") return true;
  try {
    return !!(await adminActual());
  } catch {
    return false;
  }
});

const SITIO_VACIO: Sitio = {
  hero: { kicker: "", titulo: "", tituloAcento: "", bajada: "" },
  turismo: { area: "Dirección de Turismo", domicilio: "", email: "" },
  municipalidad: { direccion: "", telefono: "", telefonoLink: "" },
  redes: [], emergencias: [], historia: [],
};

const porOrden = <T extends { orden: number; titulo: string }>(a: T, b: T) => a.orden - b.orden || a.titulo.localeCompare(b.titulo);
const porTitulo = <T extends { titulo: string }>(a: T, b: T) => a.titulo.localeCompare(b.titulo);

/** Todo el contenido visible para este pedido. Se resuelve una vez por pedido. */
export const contenido = cache(async (): Promise<Contenido> => {
  const [conBorradores, idioma] = await Promise.all([verBorradores(), idiomaActual()]);
  const sinTraducir = new Set<string>();
  const filas = await consultar<Fila>(
    conBorradores ? { rol: "servicio" } : { rol: "anon" },
    "select coleccion, slug, estado, datos from public.contenidos",
  );
  const de = <T>(coleccion: string, normalizar: (c: Record<string, unknown>, slug: string) => T) =>
    filas
      .filter((f) => f.coleccion === coleccion && (f.estado === "publicado" || conBorradores))
      .flatMap((f) => {
        try {
          if (!tieneTraduccion(f.datos, idioma)) sinTraducir.add(`${coleccion}/${f.slug}`);
          return [normalizar({ ...localizarDatos(f.datos, idioma), estado: f.estado }, f.slug)];
        } catch (e) {
          // Una ficha rota no tira abajo el sitio: se omite y se avisa en el log.
          console.error(`[contenido] ${coleccion}/${f.slug}:`, e);
          return [];
        }
      });
  const config = (slug: string) => {
    const datos = filas.find((f) => f.coleccion === "configuracion" && f.slug === slug)?.datos;
    return datos && localizarDatos(datos, idioma);
  };
  const taxonomia = (config("categorias") ?? {}) as { categorias?: Categoria[]; etiquetas?: Etiqueta[] };

  return {
    lugares: de("lugares", normalizarLugar).sort(porTitulo),
    experiencias: de("experiencias", normalizarExperiencia).sort(porTitulo),
    eventos: de("eventos", normalizarEvento),
    recorridos: de("recorridos", normalizarRecorrido).sort(porOrden),
    guias: de("planifica", normalizarGuia).sort(porOrden),
    platos: de("sabores", normalizarPlato).sort(porOrden),
    escapadas: de("escapadas", normalizarEscapada).sort(porOrden),
    destacados: de("destacados", normalizarDestacado).sort(porOrden),
    categorias: (taxonomia.categorias ?? []).filter((c) => c?.id),
    etiquetas: (taxonomia.etiquetas ?? []).filter((e) => e?.id),
    sitio: { ...SITIO_VACIO, ...((config("sitio") ?? {}) as Partial<Sitio>) },
    conBorradores,
    idioma,
    sinTraducir,
  };
});

/* ---- Búsquedas sobre el contenido ---- */

export const porSlug = <T extends { slug: string }>(lista: T[], slug: string) => lista.find((e) => e.slug === slug);

export const categoriaDe = (c: Contenido, ids: string[]) =>
  ids.map((id) => c.categorias.find((k) => k.id === id)).find(Boolean);

export const nombresDeCategorias = (c: Contenido): Record<string, string> =>
  Object.fromEntries(c.categorias.map((k) => [k.id, k.titulo]));

export const nombresDeEtiquetas = (c: Contenido): Record<string, string> =>
  Object.fromEntries(c.etiquetas.map((e) => [e.id, e.titulo]));

/** Lo que conecta con un lugar: experiencias que lo visitan, recorridos que paran ahí y eventos que ocurren ahí. */
export function relacionadosConLugar(c: Contenido, slug: string) {
  return {
    experiencias: c.experiencias.filter((e) => e.lugares.includes(slug)),
    recorridos: c.recorridos.filter((r) => r.paradas.some((p) => p.lugar === slug)),
    eventos: c.eventos.filter((e) => e.lugar === slug),
  };
}

/** Lugares visibles por slug; si una relación apunta a un borrador oculto, no hay enlace. */
export const lugaresPorSlug = (c: Contenido) => new Map(c.lugares.map((l) => [l.slug, l]));

/** Dirección pública de una ficha, o undefined si no existe o no es visible. */
export function urlDeFicha(c: Contenido, coleccion: string, slug?: string): string | undefined {
  if (!slug) return undefined;
  const listas: Record<string, { slug: string }[]> = {
    lugares: c.lugares, experiencias: c.experiencias, eventos: c.eventos, recorridos: c.recorridos, planifica: c.guias,
  };
  const armar: Record<string, (s: string) => string> = {
    lugares: rutas.lugar, experiencias: rutas.experiencia, eventos: rutas.evento, recorridos: rutas.recorrido, planifica: rutas.guia,
  };
  return listas[coleccion]?.some((e) => e.slug === slug) ? armar[coleccion](slug) : undefined;
}

/** Destacados vigentes hoy y con un destino que existe. */
export function destacadosVigentes(c: Contenido, ahora = Date.now()): (Destacado & { url: string })[] {
  return c.destacados
    .filter((d) => dentroDeVentana(d.desde, d.hasta, ahora))
    .flatMap((d) => {
      const url = d.destino.coleccion === "externo" ? d.destino.url : urlDeFicha(c, d.destino.coleccion, d.destino.slug);
      return url ? [{ ...d, url }] : [];
    });
}

/** Próximas ocurrencias de eventos visibles, con su evento. */
export function agenda(c: Contenido, ahora = Date.now()) {
  const porEvento = new Map(c.eventos.map((e) => [e.slug, e]));
  return ocurrenciasVigentes(c.eventos, ahora).map((o) => ({ ...o, datos: porEvento.get(o.evento)! }));
}

export function agendaDestacada(c: Contenido, ahora = Date.now(), cuantas = 3) {
  const vigentes = agenda(c, ahora);
  const ok = new Set(destacables(vigentes));
  return vigentes.filter((o) => ok.has(o)).slice(0, cuantas);
}

/* ---- Catálogo ---- */

/** "Festividad", "Festival", "Festa"… */
export function claseEvento(clase: Evento["clase"], idioma: Idioma) {
  const t = textos(idioma).comun.tipos;
  return t.claseEvento[clase] ?? t.evento;
}

/** "A pie · Guiada", "On foot · Guided"… */
export function etiquetaModalidad(e: Experiencia, idioma: Idioma) {
  const t = textos(idioma).comun.tipos;
  return `${t.modalidadExperiencia[e.modalidad]}${e.guiada ? ` · ${t.guiada}` : ""}`;
}

export function catalogo(c: Contenido): ItemCatalogo[] {
  const t = textos(c.idioma).comun;
  const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return [
    ...c.lugares.map((l): ItemCatalogo => ({
      entidad: "lugar", slug: l.slug, url: rutas.lugar(l.slug), titulo: l.titulo, resumen: l.resumen,
      meta: [capitalizar(l.clase), l.zona].filter(Boolean).join(" · "),
      imagen: l.imagen, categorias: l.categorias, etiquetas: l.etiquetas,
      gratis: l.costo.modalidad === "gratis", borrador: l.estado === "borrador", fueraDeLaCiudad: false,
    })),
    ...c.experiencias.map((e): ItemCatalogo => ({
      entidad: "experiencia", slug: e.slug, url: rutas.experiencia(e.slug), titulo: e.titulo, resumen: e.resumen,
      meta: [etiquetaModalidad(e, c.idioma), e.duracion].filter(Boolean).join(" · "),
      imagen: e.imagen, categorias: e.categorias, etiquetas: e.etiquetas,
      gratis: e.costo.modalidad === "gratis", borrador: e.estado === "borrador", fueraDeLaCiudad: false,
    })),
    ...c.recorridos.map((r): ItemCatalogo => ({
      entidad: "recorrido", slug: r.slug, url: rutas.recorrido(r.slug), titulo: r.titulo, resumen: r.resumen,
      meta: [r.tipo === "itinerario" ? t.tipos.itinerario : t.tipos.circuito, r.modalidad === "bus" ? t.tipos.enBus : t.tipos.aPie, r.duracion].filter(Boolean).join(" · "),
      imagen: r.imagen, categorias: r.categorias, etiquetas: r.etiquetas,
      gratis: r.etiquetas.includes("gratis"), borrador: r.estado === "borrador", fueraDeLaCiudad: false,
    })),
    ...c.eventos.map((e): ItemCatalogo => ({
      entidad: "evento", slug: e.slug, url: rutas.evento(e.slug), titulo: e.titulo, resumen: e.resumen,
      meta: [claseEvento(e.clase, c.idioma), e.fueraDeLaCiudad ? e.localidad || t.ui.fueraDeLaCiudad : e.sede].filter(Boolean).join(" · "),
      imagen: e.imagen, categorias: e.categorias, etiquetas: e.etiquetas,
      gratis: e.costo.modalidad === "gratis", borrador: e.estado === "borrador", fueraDeLaCiudad: !!e.fueraDeLaCiudad,
    })),
  ];
}

export const categoriaPorId = (c: Contenido, id: string) => c.categorias.find((k) => k.id === id);
