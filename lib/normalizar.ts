/**
 * Normalización del contenido: lo que llega de la base (jsonb editado desde el panel) se
 * convierte en las entidades de lib/tipos.ts. Un campo vacío o ausente queda con un valor
 * seguro, así una ficha a medio cargar no rompe el sitio. Sin dependencias del servidor.
 */

import type { Destacado, Escapada, Estado, Evento, Experiencia, Guia, Lugar, Plato, Recorrido } from "./tipos";

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

export const normalizarLugar = (c: Record<string, unknown>, slug: string): Lugar => {
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

export const normalizarExperiencia = (c: Record<string, unknown>, slug: string): Experiencia => {
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

export const normalizarEvento = (c: Record<string, unknown>, slug: string): Evento => {
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

export const normalizarRecorrido = (c: Record<string, unknown>, slug: string): Recorrido => ({
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

export const normalizarGuia = (c: Record<string, unknown>, slug: string): Guia => ({
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

export const normalizarDestacado = (c: Record<string, unknown>, slug: string): Destacado => {
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

export const normalizarPlato = (c: Record<string, unknown>, slug: string): Plato => ({
  slug, estado: estado(c.estado), titulo: texto(c.titulo), detalle: texto(c.detalle),
  imagen: imagen(c.imagen) ?? { src: "/stickers/empanadas.webp", alt: "" },
  tono: Number(c.tono) || 0, orden: Number(c.orden) || 99,
});

export const normalizarEscapada = (c: Record<string, unknown>, slug: string): Escapada => ({
  slug, estado: estado(c.estado), titulo: texto(c.titulo), detalle: texto(c.detalle),
  localidad: opcional(c.localidad), distancia: opcional(c.distancia),
  imagen: imagen(c.imagen) ?? { src: "/stickers/paisajes-tafi-cadillal.webp", alt: "" },
  tono: Number(c.tono) || 0, url: opcional(c.url), orden: Number(c.orden) || 99,
});

