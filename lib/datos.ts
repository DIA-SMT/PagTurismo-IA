/**
 * Contenido del portal, leído de la base (public.contenidos).
 *
 * Una sola consulta por pedido trae todas las fichas; el resto son funciones puras sobre ese
 * resultado. Lo que el equipo guarda en /admin se ve en el sitio en el siguiente pedido.
 *
 * Borradores: el sitio lee como visitante (RLS: solo fichas publicadas). Quien tiene sesión
 * en el panel, o un despliegue de vista previa con MOSTRAR_BORRADORES=1, ve también los
 * borradores, marcados como tales, para revisarlos en contexto antes de publicarlos.
 */

import "server-only";
import { cache } from "react";

import { adminActual } from "./admin/sesion";
import { consultar } from "./db";
import { destacables, dentroDeVentana, ocurrenciasVigentes } from "./fechas";
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

const porOrden = <T extends { orden: number; titulo: string }>(a: T, b: T) => a.orden - b.orden || a.titulo.localeCompare(b.titulo, "es");
const porTitulo = <T extends { titulo: string }>(a: T, b: T) => a.titulo.localeCompare(b.titulo, "es");

/** Todo el contenido visible para este pedido. Se resuelve una vez por pedido. */
export const contenido = cache(async (): Promise<Contenido> => {
  const conBorradores = await verBorradores();
  const filas = await consultar<Fila>(
    conBorradores ? { rol: "servicio" } : { rol: "anon" },
    "select coleccion, slug, estado, datos from public.contenidos",
  );
  const de = <T>(coleccion: string, normalizar: (c: Record<string, unknown>, slug: string) => T) =>
    filas
      .filter((f) => f.coleccion === coleccion && (f.estado === "publicado" || conBorradores))
      .flatMap((f) => {
        try {
          return [normalizar({ ...f.datos, estado: f.estado }, f.slug)];
        } catch (e) {
          // Una ficha rota no tira abajo el sitio: se omite y se avisa en el log.
          console.error(`[contenido] ${coleccion}/${f.slug}:`, e);
          return [];
        }
      });
  const config = (slug: string) => filas.find((f) => f.coleccion === "configuracion" && f.slug === slug)?.datos;
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

export const CLASE_EVENTO: Record<Evento["clase"], string> = {
  efemeride: "Fecha del calendario", festividad: "Festividad", espectaculo: "Espectáculo",
  feria: "Feria", deportivo: "Evento deportivo", otro: "Evento",
};

const MODALIDAD: Record<Experiencia["modalidad"], string> = { "a-pie": "A pie", bus: "En bus", bicicleta: "En bicicleta", libre: "Paseo libre" };

export function etiquetaModalidad(e: Experiencia) {
  return `${MODALIDAD[e.modalidad]}${e.guiada ? " · Guiada" : ""}`;
}

export function catalogo(c: Contenido): ItemCatalogo[] {
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
      meta: [etiquetaModalidad(e), e.duracion].filter(Boolean).join(" · "),
      imagen: e.imagen, categorias: e.categorias, etiquetas: e.etiquetas,
      gratis: e.costo.modalidad === "gratis", borrador: e.estado === "borrador", fueraDeLaCiudad: false,
    })),
    ...c.recorridos.map((r): ItemCatalogo => ({
      entidad: "recorrido", slug: r.slug, url: rutas.recorrido(r.slug), titulo: r.titulo, resumen: r.resumen,
      meta: [r.tipo === "itinerario" ? "Itinerario" : "Circuito", r.modalidad === "bus" ? "en bus" : "a pie", r.duracion].filter(Boolean).join(" · "),
      imagen: r.imagen, categorias: r.categorias, etiquetas: r.etiquetas,
      gratis: r.etiquetas.includes("gratis"), borrador: r.estado === "borrador", fueraDeLaCiudad: false,
    })),
    ...c.eventos.map((e): ItemCatalogo => ({
      entidad: "evento", slug: e.slug, url: rutas.evento(e.slug), titulo: e.titulo, resumen: e.resumen,
      meta: [CLASE_EVENTO[e.clase] ?? "Evento", e.fueraDeLaCiudad ? e.localidad || "Fuera de la ciudad" : e.sede].filter(Boolean).join(" · "),
      imagen: e.imagen, categorias: e.categorias, etiquetas: e.etiquetas,
      gratis: e.costo.modalidad === "gratis", borrador: e.estado === "borrador", fueraDeLaCiudad: !!e.fueraDeLaCiudad,
    })),
  ];
}

export const categoriaPorId = (c: Contenido, id: string) => c.categorias.find((k) => k.id === id);
