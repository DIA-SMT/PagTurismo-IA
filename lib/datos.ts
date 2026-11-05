/**
 * Lectura del contenido del portal.
 *
 * Cada ficha es un JSON en `contenido/<coleccion>/<slug>.json`, editado desde
 * /admin (Decap CMS guarda los cambios como commits en el repositorio). Sólo
 * se lee en el servidor.
 *
 * Borradores: en producción se muestran únicamente las fichas publicadas. En
 * desarrollo, y en un despliegue de vista previa con MOSTRAR_BORRADORES=1,
 * también aparecen los borradores, marcados como tales, para que Turismo los
 * revise en contexto antes de publicarlos.
 */

import fs from "node:fs";
import path from "node:path";

import { destacables, dentroDeVentana, ocurrenciasVigentes } from "./fechas";
import { rutas } from "./rutas";
import type {
  Categoria, Destacado, Escapada, Estado, Etiqueta, Evento, Experiencia, Guia, ItemCatalogo,
  Lugar, Plato, Recorrido, Sitio,
} from "./tipos";

const RAIZ = path.join(process.cwd(), "contenido");

export const MOSTRAR_BORRADORES =
  process.env.NODE_ENV !== "production" || process.env.MOSTRAR_BORRADORES === "1";

/* ---- Lectura ---- */

type ConSlug = { slug: string; estado: Estado };

const cache = new Map<string, unknown>();
// En desarrollo se relee en cada pedido para ver al instante lo que se guarda
// desde /admin con el servidor local de Decap.
const usarCache = process.env.NODE_ENV === "production";

function leerJson<T>(archivo: string): T {
  return JSON.parse(fs.readFileSync(archivo, "utf8")) as T;
}

function leerCarpeta<T extends ConSlug>(carpeta: string, normalizar: (crudo: Record<string, unknown>, slug: string) => T): T[] {
  const clave = `carpeta:${carpeta}`;
  if (usarCache && cache.has(clave)) return cache.get(clave) as T[];
  const dir = path.join(RAIZ, carpeta);
  const archivos = fs.existsSync(dir) ? fs.readdirSync(dir).filter((a) => a.endsWith(".json")).sort() : [];
  const todos: T[] = [];
  for (const archivo of archivos) {
    const slug = archivo.replace(/\.json$/, "");
    try {
      todos.push(normalizar(leerJson(path.join(dir, archivo)), slug));
    } catch (error) {
      // Un archivo roto no tira abajo el sitio entero: se omite y se avisa.
      // `npm run validar` lo muestra con más detalle.
      console.error(`[contenido] No se pudo leer ${carpeta}/${archivo}:`, error);
    }
  }
  if (usarCache) cache.set(clave, todos);
  return todos;
}

function visibles<T extends ConSlug>(lista: T[]): T[] {
  return lista.filter((e) => e.estado === "publicado" || MOSTRAR_BORRADORES);
}

/* ---- Normalización: campos vacíos o ausentes quedan con un valor seguro ---- */

const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const lista = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const textos = (v: unknown) => lista<unknown>(v).map(texto).filter(Boolean);
const estado = (v: unknown): Estado => (v === "publicado" ? "publicado" : "borrador");
const opcional = (v: unknown) => texto(v) || undefined;

function imagen(v: unknown) {
  const i = v as Record<string, unknown> | undefined;
  if (!i || !texto(i.src)) return undefined;
  return { src: texto(i.src), alt: texto(i.alt), credito: opcional(i.credito), permiso: opcional(i.permiso) };
}

function comun(c: Record<string, unknown>, slug: string) {
  const v = (c.validacion ?? {}) as Record<string, unknown>;
  return {
    slug,
    estado: estado(c.estado),
    titulo: texto(c.titulo) || slug,
    resumen: texto(c.resumen),
    categorias: textos(c.categorias),
    etiquetas: textos(c.etiquetas),
    imagen: imagen(c.imagen),
    fuentes: lista<Record<string, unknown>>(c.fuentes)
      .map((f) => ({ titulo: texto(f.titulo), url: opcional(f.url) }))
      .filter((f) => f.titulo),
    validacion: { fecha: opcional(v.fecha), responsable: opcional(v.responsable), proximaRevision: opcional(v.proximaRevision) },
  };
}

function costo(v: unknown) {
  const c = (v ?? {}) as Record<string, unknown>;
  const modalidad = c.modalidad === "gratis" || c.modalidad === "pago" ? c.modalidad : "consultar";
  return { modalidad, detalle: opcional(c.detalle) } as Lugar["costo"];
}

function confirmable(v: unknown) {
  const d = v as Record<string, unknown> | undefined;
  if (!d || !texto(d.texto)) return undefined;
  return { texto: texto(d.texto), confirmado: d.confirmado === true };
}

const normalizarLugar = (c: Record<string, unknown>, slug: string): Lugar => {
  const contacto = (c.contacto ?? {}) as Record<string, unknown>;
  const coord = c.coordenadas as { lat?: unknown; lng?: unknown } | undefined;
  return {
    ...comun(c, slug),
    clase: texto(c.clase) || "lugar",
    porQueIr: opcional(c.porQueIr),
    descripcion: opcional(c.descripcion),
    zona: opcional(c.zona),
    direccion: opcional(c.direccion),
    coordenadas: coord && Number.isFinite(Number(coord.lat)) && Number.isFinite(Number(coord.lng)) && coord.lat !== "" && coord.lng !== ""
      ? { lat: Number(coord.lat), lng: Number(coord.lng) } : undefined,
    horario: confirmable(c.horario),
    costo: costo(c.costo),
    duracion: opcional(c.duracion),
    contacto: { telefono: opcional(contacto.telefono), email: opcional(contacto.email), web: opcional(contacto.web) },
    accesibilidad: opcional(c.accesibilidad),
    imperdible: c.imperdible === true,
  };
};

const ACCIONES = new Set(["reservar", "inscripcion", "consultar", "sin-inscripcion", "sin-salidas"]);

const normalizarExperiencia = (c: Record<string, unknown>, slug: string): Experiencia => {
  const a = (c.accion ?? {}) as Record<string, unknown>;
  return {
    ...comun(c, slug),
    modalidad: (["a-pie", "bus", "bicicleta", "libre"].includes(c.modalidad as string) ? c.modalidad : "libre") as Experiencia["modalidad"],
    guiada: c.guiada === true,
    descripcion: opcional(c.descripcion),
    duracion: opcional(c.duracion),
    horario: confirmable(c.horario),
    puntoEncuentro: opcional(c.puntoEncuentro),
    lugares: textos(c.lugares),
    incluye: opcional(c.incluye),
    requisitos: opcional(c.requisitos),
    politicaClima: opcional(c.politicaClima),
    operador: opcional(c.operador),
    costo: costo(c.costo),
    accion: {
      tipo: (ACCIONES.has(a.tipo as string) ? a.tipo : "consultar") as Experiencia["accion"]["tipo"],
      texto: texto(a.texto) || "Consultar",
      url: opcional(a.url),
    },
    salidas: lista<Record<string, unknown>>(c.salidas).map((s) => ({
      inicio: texto(s.inicio),
      fin: opcional(s.fin),
      estado: (["programada", "agotada", "suspendida", "cancelada"].includes(s.estado as string) ? s.estado : "programada") as Experiencia["salidas"][number]["estado"],
      urlReserva: opcional(s.urlReserva),
      nota: opcional(s.nota),
    })),
  };
};

const normalizarEvento = (c: Record<string, unknown>, slug: string): Evento => {
  const r = c.recurrente as Record<string, unknown> | undefined;
  const mes = Number(r?.mes);
  const dia = Number(r?.dia);
  return {
    ...comun(c, slug),
    clase: (texto(c.clase) || "otro") as Evento["clase"],
    descripcion: opcional(c.descripcion),
    recurrente: mes >= 1 && mes <= 12 ? { mes, dia: dia >= 1 && dia <= 31 ? dia : undefined } : undefined,
    lugar: opcional(c.lugar),
    sede: opcional(c.sede),
    fueraDeLaCiudad: c.fueraDeLaCiudad === true,
    localidad: opcional(c.localidad),
    organizador: opcional(c.organizador),
    costo: costo(c.costo),
    inscripcion: opcional(c.inscripcion),
    urlOficial: opcional(c.urlOficial),
    ocurrencias: lista<Record<string, unknown>>(c.ocurrencias).map((o) => ({
      inicio: texto(o.inicio),
      fin: opcional(o.fin),
      estado: (["confirmado", "cancelado", "reprogramado", "suspendido"].includes(o.estado as string) ? o.estado : "confirmado") as Evento["ocurrencias"][number]["estado"],
      sede: opcional(o.sede),
      nota: opcional(o.nota),
    })),
  };
};

const normalizarRecorrido = (c: Record<string, unknown>, slug: string): Recorrido => ({
  ...comun(c, slug),
  tipo: c.tipo === "itinerario" ? "itinerario" : "circuito",
  orden: Number(c.orden) || 99,
  modalidad: (["bus", "a-pie", "mixto"].includes(c.modalidad as string) ? c.modalidad : "a-pie") as Recorrido["modalidad"],
  guiado: c.guiado === true,
  descripcion: opcional(c.descripcion),
  duracion: opcional(c.duracion),
  distancia: opcional(c.distancia),
  esfuerzo: opcional(c.esfuerzo),
  inicio: opcional(c.inicio),
  fin: opcional(c.fin),
  paradas: lista<Record<string, unknown>>(c.paradas)
    .map((p) => ({ nombre: texto(p.nombre), lugar: opcional(p.lugar), nota: opcional(p.nota), dia: Number(p.dia) > 0 ? Number(p.dia) : undefined }))
    .filter((p) => p.nombre),
  experiencia: opcional(c.experiencia),
  condiciones: opcional(c.condiciones),
  aviso: opcional(c.aviso),
});

const normalizarGuia = (c: Record<string, unknown>, slug: string): Guia => ({
  slug,
  estado: estado(c.estado),
  titulo: texto(c.titulo) || slug,
  resumen: texto(c.resumen),
  icono: texto(c.icono) || "info",
  orden: Number(c.orden) || 99,
  secciones: lista<Record<string, unknown>>(c.secciones).map((s) => ({ titulo: texto(s.titulo), texto: texto(s.texto) })).filter((s) => s.texto),
  enlaces: lista<Record<string, unknown>>(c.enlaces).map((e) => ({ texto: texto(e.texto), url: texto(e.url) })).filter((e) => e.texto && e.url),
  fuentes: comun(c, slug).fuentes,
  validacion: comun(c, slug).validacion,
});

const normalizarDestacado = (c: Record<string, unknown>, slug: string): Destacado => {
  const d = (c.destino ?? {}) as Record<string, unknown>;
  return {
    slug,
    estado: estado(c.estado),
    titulo: texto(c.titulo),
    etiqueta: texto(c.etiqueta),
    detalle: texto(c.detalle),
    imagen: imagen(c.imagen) ?? { src: "/fotos/san-miguel-de-tucuman.webp", alt: "" },
    destino: { coleccion: (texto(d.coleccion) || "externo") as Destacado["destino"]["coleccion"], slug: opcional(d.slug), url: opcional(d.url) },
    desde: opcional(c.desde),
    hasta: opcional(c.hasta),
    orden: Number(c.orden) || 99,
  };
};

const normalizarPlato = (c: Record<string, unknown>, slug: string): Plato => ({
  slug, estado: estado(c.estado), titulo: texto(c.titulo), detalle: texto(c.detalle),
  imagen: imagen(c.imagen) ?? { src: "/stickers/empanadas.webp", alt: "" },
  tono: Number(c.tono) || 0, orden: Number(c.orden) || 99,
});

const normalizarEscapada = (c: Record<string, unknown>, slug: string): Escapada => ({
  slug, estado: estado(c.estado), titulo: texto(c.titulo), detalle: texto(c.detalle),
  localidad: opcional(c.localidad), distancia: opcional(c.distancia),
  imagen: imagen(c.imagen) ?? { src: "/stickers/paisajes-tafi-cadillal.webp", alt: "" },
  tono: Number(c.tono) || 0, url: opcional(c.url), orden: Number(c.orden) || 99,
});

/* ---- Colecciones ---- */

const porOrden = <T extends { orden: number; titulo: string }>(a: T, b: T) => a.orden - b.orden || a.titulo.localeCompare(b.titulo, "es");
const porTitulo = <T extends { titulo: string }>(a: T, b: T) => a.titulo.localeCompare(b.titulo, "es");

export const getLugares = () => visibles(leerCarpeta("lugares", normalizarLugar)).sort(porTitulo);
export const getExperiencias = () => visibles(leerCarpeta("experiencias", normalizarExperiencia)).sort(porTitulo);
export const getEventos = () => visibles(leerCarpeta("eventos", normalizarEvento));
export const getRecorridos = () => visibles(leerCarpeta("recorridos", normalizarRecorrido)).sort(porOrden);
export const getGuias = () => visibles(leerCarpeta("planifica", normalizarGuia)).sort(porOrden);
export const getPlatos = () => visibles(leerCarpeta("sabores", normalizarPlato)).sort(porOrden);
export const getEscapadas = () => visibles(leerCarpeta("escapadas", normalizarEscapada)).sort(porOrden);

export const getLugar = (slug: string) => getLugares().find((e) => e.slug === slug);
export const getExperiencia = (slug: string) => getExperiencias().find((e) => e.slug === slug);
export const getEvento = (slug: string) => getEventos().find((e) => e.slug === slug);
export const getRecorrido = (slug: string) => getRecorridos().find((e) => e.slug === slug);
export const getGuia = (slug: string) => getGuias().find((e) => e.slug === slug);

/** Todas las fichas, publicadas o no. Para la página de revisión y el validador. */
export function getTodo() {
  return {
    lugares: leerCarpeta("lugares", normalizarLugar),
    experiencias: leerCarpeta("experiencias", normalizarExperiencia),
    eventos: leerCarpeta("eventos", normalizarEvento),
    recorridos: leerCarpeta("recorridos", normalizarRecorrido),
    planifica: leerCarpeta("planifica", normalizarGuia),
    destacados: leerCarpeta("destacados", normalizarDestacado),
    sabores: leerCarpeta("sabores", normalizarPlato),
    escapadas: leerCarpeta("escapadas", normalizarEscapada),
  };
}

export function getTaxonomia(): { categorias: Categoria[]; etiquetas: Etiqueta[] } {
  const t = leerJson<{ categorias?: Categoria[]; etiquetas?: Etiqueta[] }>(path.join(RAIZ, "configuracion", "categorias.json"));
  return { categorias: t.categorias ?? [], etiquetas: t.etiquetas ?? [] };
}

export const getCategorias = () => getTaxonomia().categorias;
export const getCategoria = (id: string) => getCategorias().find((c) => c.id === id);

export function nombresDeCategorias(): Record<string, string> {
  return Object.fromEntries(getCategorias().map((c) => [c.id, c.titulo]));
}

export function nombresDeEtiquetas(): Record<string, string> {
  return Object.fromEntries(getTaxonomia().etiquetas.map((e) => [e.id, e.titulo]));
}

export function getSitio(): Sitio {
  return leerJson<Sitio>(path.join(RAIZ, "configuracion", "sitio.json"));
}

/* ---- Relaciones ---- */

/** Lo que conecta con un lugar: experiencias que lo visitan, recorridos que paran ahí y eventos que ocurren ahí. */
export function relacionadosConLugar(slug: string) {
  return {
    experiencias: getExperiencias().filter((e) => e.lugares.includes(slug)),
    recorridos: getRecorridos().filter((r) => r.paradas.some((p) => p.lugar === slug)),
    eventos: getEventos().filter((e) => e.lugar === slug),
  };
}

/** Busca un lugar visible por slug; si la relación apunta a un borrador oculto, no hay enlace. */
export function lugaresPorSlug(): Map<string, Lugar> {
  return new Map(getLugares().map((l) => [l.slug, l]));
}

/** Destacados vigentes hoy y con un destino que existe. */
export function getDestacados(ahora = Date.now()): (Destacado & { url: string })[] {
  const existentes: Record<string, Set<string>> = {
    lugares: new Set(getLugares().map((e) => e.slug)),
    experiencias: new Set(getExperiencias().map((e) => e.slug)),
    eventos: new Set(getEventos().map((e) => e.slug)),
    recorridos: new Set(getRecorridos().map((e) => e.slug)),
    planifica: new Set(getGuias().map((e) => e.slug)),
  };
  const urlDe = (d: Destacado): string | undefined => {
    const { coleccion, slug, url } = d.destino;
    if (coleccion === "externo") return url;
    if (!slug || !existentes[coleccion]?.has(slug)) return undefined;
    return { lugares: rutas.lugar, experiencias: rutas.experiencia, eventos: rutas.evento, recorridos: rutas.recorrido, planifica: rutas.guia }[coleccion](slug);
  };
  return visibles(leerCarpeta("destacados", normalizarDestacado))
    .filter((d) => dentroDeVentana(d.desde, d.hasta, ahora))
    .flatMap((d) => {
      const url = urlDe(d);
      return url ? [{ ...d, url }] : [];
    })
    .sort(porOrden);
}

/** Próximas ocurrencias de eventos visibles, con su evento. */
export function getAgenda(ahora = Date.now()) {
  const eventos = getEventos();
  const porSlug = new Map(eventos.map((e) => [e.slug, e]));
  return ocurrenciasVigentes(eventos, ahora).map((o) => ({ ...o, datos: porSlug.get(o.evento)! }));
}

export function getAgendaDestacada(ahora = Date.now(), cuantas = 3) {
  const vigentes = getAgenda(ahora);
  const ok = new Set(destacables(vigentes));
  return vigentes.filter((o) => ok.has(o)).slice(0, cuantas);
}

/* ---- Catálogo ---- */

const CLASE_EVENTO: Record<Evento["clase"], string> = {
  efemeride: "Fecha del calendario", festividad: "Festividad", espectaculo: "Espectáculo",
  feria: "Feria", deportivo: "Evento deportivo", otro: "Evento",
};

const MODALIDAD: Record<Experiencia["modalidad"], string> = { "a-pie": "A pie", bus: "En bus", bicicleta: "En bicicleta", libre: "Paseo libre" };

export function etiquetaModalidad(e: Experiencia) {
  return `${MODALIDAD[e.modalidad]}${e.guiada ? " · Guiada" : ""}`;
}

export function getCatalogo(): ItemCatalogo[] {
  const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return [
    ...getLugares().map((l): ItemCatalogo => ({
      entidad: "lugar", slug: l.slug, url: rutas.lugar(l.slug), titulo: l.titulo, resumen: l.resumen,
      meta: [capitalizar(l.clase), l.zona].filter(Boolean).join(" · "),
      imagen: l.imagen, categorias: l.categorias, etiquetas: l.etiquetas,
      gratis: l.costo.modalidad === "gratis", borrador: l.estado === "borrador", fueraDeLaCiudad: false,
    })),
    ...getExperiencias().map((e): ItemCatalogo => ({
      entidad: "experiencia", slug: e.slug, url: rutas.experiencia(e.slug), titulo: e.titulo, resumen: e.resumen,
      meta: [etiquetaModalidad(e), e.duracion].filter(Boolean).join(" · "),
      imagen: e.imagen, categorias: e.categorias, etiquetas: e.etiquetas,
      gratis: e.costo.modalidad === "gratis", borrador: e.estado === "borrador", fueraDeLaCiudad: false,
    })),
    ...getRecorridos().map((r): ItemCatalogo => ({
      entidad: "recorrido", slug: r.slug, url: rutas.recorrido(r.slug), titulo: r.titulo, resumen: r.resumen,
      meta: [r.tipo === "itinerario" ? "Itinerario" : "Circuito", r.modalidad === "bus" ? "en bus" : "a pie", r.duracion].filter(Boolean).join(" · "),
      imagen: r.imagen, categorias: r.categorias, etiquetas: r.etiquetas,
      gratis: r.etiquetas.includes("gratis"), borrador: r.estado === "borrador", fueraDeLaCiudad: false,
    })),
    ...getEventos().map((e): ItemCatalogo => ({
      entidad: "evento", slug: e.slug, url: rutas.evento(e.slug), titulo: e.titulo, resumen: e.resumen,
      meta: [CLASE_EVENTO[e.clase] ?? "Evento", e.fueraDeLaCiudad ? e.localidad || "Fuera de la ciudad" : e.sede].filter(Boolean).join(" · "),
      imagen: e.imagen, categorias: e.categorias, etiquetas: e.etiquetas,
      gratis: e.costo.modalidad === "gratis", borrador: e.estado === "borrador", fueraDeLaCiudad: !!e.fueraDeLaCiudad,
    })),
  ];
}

export { CLASE_EVENTO };
