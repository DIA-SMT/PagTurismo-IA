/**
 * Importación de la Agenda Cultural al modelo del portal (public.contenidos).
 *
 * Funciones puras, con pruebas (tests/importar-cultura.test.ts). Las usa scripts/cultura.ts, que
 * lee los orígenes (los espacios relevados, la base de Agenda o el WordPress viejo) y escribe.
 *
 * Reglas (docs/PLAN_MIGRACION.md §3):
 *  - Cada ficha importada lleva `legado` ({ origen, id, url }). Si ya existe una con ese legado,
 *    no se pisa: lo editado en el portal manda.
 *  - Un espacio que ya existe como lugar del portal (mismo slug, mismo nombre o alias conocido) se
 *    fusiona: completa lo que falta y suma su galería. Nunca cambia el estado ni pisa un texto.
 *  - Las fechas se guardan en hora local de Tucumán (`AAAA-MM-DDTHH:mm`, o `AAAA-MM-DD` todo el día).
 */

import { normalizar } from "../buscar.ts";
import { diaLocal } from "../fechas.ts";
import { slugDe } from "../admin/limpiar.ts";

type Json = Record<string, unknown>;

/** Espacio de Agenda que ya existe en el portal con otro slug. Verificado a mano contra ambos sitios. */
export const ALIAS_LUGARES: Record<string, string> = {
  "museo-de-la-industria-azucarera-mia": "museo-industria-azucarera",
  "museo-mercedes-sosa": "casa-natal-mercedes-sosa",
};

const CLASE: Record<string, string> = {
  museum: "museo", theater: "teatro", cultural_house: "centro cultural", square: "plaza", park: "parque",
  gastronomy: "gastronomía", heritage: "patrimonio", office: "oficina", other: "lugar",
};

const vacio = (v: unknown) =>
  v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)
  || (typeof v === "object" && !Array.isArray(v) && Object.values(v as Json).every(vacio));

/* ---- Lugares ---- */

/** Un espacio de datos/cultura/espacios-*.json (relevado del sitio viejo de la Agenda). */
export type EspacioAgenda = {
  slug: string;
  name: string;
  type: string;
  summary?: string | null;
  description?: string[] | string | null;
  services?: string[] | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  opening_hours?: string[] | { lineas?: string[] } | null;
  social_links?: { instagram?: string; facebook?: string; entradas?: string } | null;
  image?: string | null;
  gallery?: string[] | null;
  legacy_url?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  accessibility?: string | null;
};

const lineas = (h: EspacioAgenda["opening_hours"]) => (Array.isArray(h) ? h : h?.lineas ?? []).filter(Boolean);

/** Espacio de Agenda → datos de un lugar del portal. Las fotos quedan con la URL de origen (el script las baja). */
export function espacioALugar(e: EspacioAgenda): Json {
  const lat = e.latitude == null ? NaN : Number(e.latitude);
  const lng = e.longitude == null ? NaN : Number(e.longitude);
  const descripcion = Array.isArray(e.description) ? e.description.join("\n\n") : e.description ?? "";
  const horario = lineas(e.opening_hours).join(" · ");
  const datos: Json = {
    titulo: e.name.trim(),
    clase: CLASE[e.type] ?? "lugar",
    tipoEspacio: e.type === "park" || e.type === "square" ? "aire-libre" : "cultural",
    resumen: (e.summary ?? "").trim(),
    descripcion: descripcion.trim(),
    direccion: e.address?.trim() || undefined,
    coordenadas: Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined,
    // Lo relevado del sitio viejo no está confirmado por el responsable del lugar.
    horario: horario ? { texto: horario, confirmado: false } : undefined,
    costo: { modalidad: "consultar" },
    contacto: { telefono: e.phone || undefined, email: e.email || undefined, web: e.website || undefined },
    accesibilidad: e.accessibility || undefined,
    servicios: (e.services ?? []).filter(Boolean).join("\n") || undefined,
    redes: { instagram: e.social_links?.instagram, facebook: e.social_links?.facebook, entradas: e.social_links?.entradas },
    imagen: e.image ? { src: e.image, alt: e.name.trim(), credito: "Agenda Cultural SMT" } : undefined,
    galeria: (e.gallery ?? []).filter((src) => src && src !== e.image).map((src) => ({ foto: { src, alt: e.name.trim(), credito: "Agenda Cultural SMT" } })),
    categorias: [],
    etiquetas: [],
    fuentes: e.legacy_url
      ? [{ titulo: /agendaculturalsmt\.com/.test(e.legacy_url) ? "Agenda Cultural SMT (sitio anterior)" : "Agenda Cultural SMT", url: e.legacy_url }]
      : [],
    validacion: {},
    legado: { origen: "agenda", id: e.slug, url: e.legacy_url || undefined },
  };
  return limpiarVacios(datos);
}

function limpiarVacios(d: Json): Json {
  return Object.fromEntries(Object.entries(d).filter(([k, v]) => !vacio(v) || ["categorias", "etiquetas", "fuentes", "validacion", "galeria"].includes(k)));
}

export type FichaExistente = { coleccion: string; slug: string; estado: string; datos: Json };

/**
 * ¿Con qué lugar del portal se corresponde este espacio? Por legado, por alias, por slug o por
 * nombre (sin tildes). Devuelve también los parecidos dudosos para revisar a mano.
 */
export function buscarLugar(e: EspacioAgenda, lugares: FichaExistente[]): { slug?: string; dudosos: string[] } {
  const porLegado = lugares.find((l) => (l.datos.legado as Json | undefined)?.origen === "agenda" && (l.datos.legado as Json).id === e.slug);
  if (porLegado) return { slug: porLegado.slug, dudosos: [] };
  const alias = ALIAS_LUGARES[e.slug];
  if (alias && lugares.some((l) => l.slug === alias)) return { slug: alias, dudosos: [] };
  if (lugares.some((l) => l.slug === e.slug)) return { slug: e.slug, dudosos: [] };
  const nombre = normalizar(e.name);
  const mismo = lugares.find((l) => normalizar(String(l.datos.titulo ?? "")) === nombre);
  if (mismo) return { slug: mismo.slug, dudosos: [] };
  // Palabras en común (sin las de relleno): solo se avisa, no se fusiona.
  const relleno = new Set(["de", "la", "el", "los", "las", "del", "museo", "casa", "centro", "cultural", "parque", "plaza", "y"]);
  const palabras = (t: string) => new Set(normalizar(t).split(/[^a-z0-9]+/).filter((p) => p.length > 2 && !relleno.has(p)));
  const mias = palabras(e.name);
  const dudosos = lugares
    .filter((l) => {
      const otras = palabras(String(l.datos.titulo ?? ""));
      const comunes = [...mias].filter((p) => otras.has(p)).length;
      return comunes > 0 && comunes / Math.max(1, Math.min(mias.size, otras.size)) >= 0.5;
    })
    .map((l) => l.slug);
  return { dudosos };
}

/**
 * Fusiona un espacio en un lugar existente: solo completa lo vacío, suma fotos que no estaban y
 * agrega el legado. Devuelve los campos que cambió (vacío si no hay nada que hacer).
 */
export function fusionarLugar(existente: Json, nuevo: Json): { datos: Json; cambios: string[] } {
  const datos: Json = structuredClone(existente);
  const cambios: string[] = [];
  for (const [clave, valor] of Object.entries(nuevo)) {
    if (clave === "galeria" || clave === "fuentes" || clave === "categorias" || clave === "etiquetas") continue;
    if (vacio(datos[clave]) && !vacio(valor)) {
      datos[clave] = valor;
      cambios.push(clave);
    } else if (clave === "contacto" || clave === "redes") {
      // Grupos: campo por campo.
      const actual = (datos[clave] ?? {}) as Json;
      for (const [k, v] of Object.entries((valor ?? {}) as Json)) {
        if (vacio(actual[k]) && !vacio(v)) {
          actual[k] = v;
          cambios.push(`${clave}.${k}`);
        }
      }
      datos[clave] = actual;
    }
  }
  const fotos = new Set([
    (datos.imagen as Json | undefined)?.src,
    ...((datos.galeria as Json[] | undefined) ?? []).map((g) => ((g.foto ?? g) as Json).src),
  ]);
  const nuevas = ((nuevo.galeria as Json[] | undefined) ?? []).filter((g) => !fotos.has(((g.foto ?? g) as Json).src));
  if (nuevas.length) {
    datos.galeria = [...((datos.galeria as Json[] | undefined) ?? []), ...nuevas];
    cambios.push("galeria");
  }
  const fuentes = (datos.fuentes as Json[] | undefined) ?? [];
  for (const f of (nuevo.fuentes as Json[] | undefined) ?? []) {
    if (!fuentes.some((x) => x.url === f.url)) {
      fuentes.push(f);
      if (!cambios.includes("fuentes")) cambios.push("fuentes");
    }
  }
  datos.fuentes = fuentes;
  return { datos, cambios };
}

/* ---- Eventos ---- */

/** Un evento normalizado de cualquier origen (la base de Agenda o el WordPress viejo). */
export type EventoOrigen = {
  origen: "agenda" | "wordpress";
  id: string;
  url?: string | null;
  slug: string;
  titulo: string;
  resumen?: string | null;
  descripcion?: string | null;
  estado: "publicado" | "borrador";
  destacado?: boolean;
  /** free / paid / check, como en Agenda. */
  acceso?: string | null;
  precio?: string | null;
  /** Slug del espacio en la Agenda (se traduce al lugar del portal). */
  lugarAgenda?: string | null;
  sede?: string | null;
  direccion?: string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  organizador?: string | null;
  entradas?: string | null;
  capacidad?: number | null;
  accesibilidad?: string | null;
  requisitos?: string | null;
  contacto?: { telefono?: string; email?: string } | null;
  imagen?: string | null;
  galeria?: string[] | null;
  categorias: { slug: string; nombre: string }[];
  /** Instantes ISO (UTC) como los guarda Agenda. */
  fechas: { inicio: string; fin?: string | null; todoElDia?: boolean; estado?: string | null; nota?: string | null }[];
};

const ESTADO_FECHA: Record<string, string> = {
  scheduled: "confirmado", suspended: "suspendido", rescheduled: "reprogramado", cancelled: "cancelado",
};

/** Instante ISO → hora local de Tucumán `AAAA-MM-DDTHH:mm` (o `AAAA-MM-DD` si es todo el día). */
export function aHoraLocal(iso: string, todoElDia = false): string {
  const instante = Date.parse(iso);
  const dia = diaLocal(instante);
  if (todoElDia) return dia;
  const hora = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Argentina/Tucuman", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(instante);
  return `${dia}T${hora}`;
}

/** Clase del portal según las categorías (solo para ordenar el catálogo; se corrige en el panel). */
function claseDe(categorias: string[]): string {
  const c = categorias.join(" ");
  if (/feria/.test(c)) return "feria";
  if (/deporte|gimnasia|taekwondo|yoga/.test(c)) return "deportivo";
  if (/musica|teatro|danza|cine|comedia|folklore|canto|representacion|acrobacia/.test(c)) return "espectaculo";
  return "otro";
}

/** Evento de origen → datos de un evento del portal. `lugares` traduce el espacio de Agenda al lugar del portal. */
export function eventoAContenido(
  e: EventoOrigen,
  lugares: Map<string, string>,
  nombresDeEspacios?: Map<string, string>,
  direccionesDeEspacios?: Map<string, string>,
): Json {
  const lugar = e.lugarAgenda ? lugares.get(e.lugarAgenda) : undefined;
  // Con ficha de lugar igual se guarda el nombre como sede: si esa ficha está en borrador, el
  // evento publicado sigue diciendo dónde es. Lo mismo con la dirección, que la tarjeta muestra debajo.
  const sede = (lugar && e.lugarAgenda ? nombresDeEspacios?.get(e.lugarAgenda) : undefined) ?? e.sede?.trim();
  const lat = e.lat == null ? NaN : Number(e.lat);
  const lng = e.lng == null ? NaN : Number(e.lng);
  const rubros = e.categorias.map((k) => k.slug);
  const datos: Json = {
    titulo: e.titulo.trim(),
    clase: claseDe(rubros),
    resumen: (e.resumen ?? "").trim() || (e.descripcion ?? "").split(/\n\s*\n/)[0]?.slice(0, 220).trim() || e.titulo.trim(),
    descripcion: (e.descripcion ?? "").trim() || undefined,
    destacado: !!e.destacado,
    rubros,
    categorias: [],
    etiquetas: [],
    lugar,
    sede: sede || undefined,
    lugarManual: lugar
      ? limpiarVacios({ direccion: (e.lugarAgenda ? direccionesDeEspacios?.get(e.lugarAgenda)?.trim() : undefined) || undefined })
      : limpiarVacios({ direccion: e.direccion?.trim() || undefined, lat: Number.isFinite(lat) ? lat : undefined, lng: Number.isFinite(lng) ? lng : undefined }),
    organizador: e.organizador?.trim() || undefined,
    costo: {
      modalidad: e.acceso === "free" ? "gratis" : e.acceso === "paid" ? "pago" : "consultar",
      detalle: e.precio?.trim() || undefined,
    },
    entradas: e.entradas || undefined,
    capacidad: e.capacidad && e.capacidad > 0 ? e.capacidad : undefined,
    accesibilidad: e.accesibilidad?.trim() || undefined,
    requisitos: e.requisitos?.trim() || undefined,
    contacto: e.contacto && (e.contacto.telefono || e.contacto.email) ? e.contacto : undefined,
    imagen: e.imagen ? { src: e.imagen, alt: e.titulo.trim(), credito: "Agenda Cultural SMT" } : undefined,
    galeria: (e.galeria ?? []).filter((src) => src && src !== e.imagen).map((src) => ({ foto: { src, alt: e.titulo.trim() } })),
    ocurrencias: fechasUnicas(e.fechas),
    fuentes: e.url ? [{ titulo: "Agenda Cultural SMT", url: e.url }] : [],
    validacion: {},
    legado: limpiarVacios({ origen: e.origen, id: e.id, url: e.url || undefined }),
  };
  return limpiarVacios(datos);
}

function fechasUnicas(fechas: EventoOrigen["fechas"]): Json[] {
  const vistas = new Set<string>();
  return [...fechas]
    .sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio))
    .flatMap((f) => {
      const inicio = aHoraLocal(f.inicio, f.todoElDia);
      if (vistas.has(inicio)) return [];
      vistas.add(inicio);
      const fin = f.fin && Date.parse(f.fin) > Date.parse(f.inicio) ? aHoraLocal(f.fin, f.todoElDia) : undefined;
      return [limpiarVacios({ inicio, fin, estado: ESTADO_FECHA[f.estado ?? "scheduled"] ?? "confirmado", nota: f.nota?.trim() || undefined })];
    });
}

/** Ficha existente con el mismo legado (mismo origen e id). */
export function buscarPorLegado(eventos: FichaExistente[], e: Pick<EventoOrigen, "origen" | "id">) {
  return eventos.find((f) => {
    const l = f.datos.legado as Json | undefined;
    return l?.origen === e.origen && String(l.id) === e.id;
  });
}

/** Slug libre: el de origen o, si está tomado por otra ficha, con el id al final. */
export function slugLibre(e: Pick<EventoOrigen, "slug" | "titulo" | "id">, ocupados: Set<string>): string {
  const base = (/^[a-z0-9]+(-[a-z0-9]+)*$/.test(e.slug) ? e.slug : slugDe(e.titulo)) || "evento";
  if (!ocupados.has(base)) return base;
  const sufijo = e.id.replace(/[^a-z0-9]/gi, "").slice(0, 8).toLowerCase() || "importado";
  return `${base.slice(0, 80)}-${sufijo}`;
}

/**
 * Con --actualizar: suma las fechas nuevas a una ficha ya importada. Nunca cambia el estado de una
 * fecha existente (lo puede haber editado el equipo) ni toca los demás campos.
 */
export function sumarFechas(existente: Json, nuevo: Json): { datos: Json; agregadas: number } {
  const actuales = (existente.ocurrencias as Json[] | undefined) ?? [];
  const tiene = new Set(actuales.map((o) => String(o.inicio)));
  const agregar = ((nuevo.ocurrencias as Json[] | undefined) ?? []).filter((o) => !tiene.has(String(o.inicio)));
  if (!agregar.length) return { datos: existente, agregadas: 0 };
  const ocurrencias = [...actuales, ...agregar].sort((a, b) => String(a.inicio).localeCompare(String(b.inicio)));
  return { datos: { ...existente, ocurrencias }, agregadas: agregar.length };
}

/**
 * Completa un evento ya importado con lo que le falta: el nombre del lugar (sede), la dirección y la
 * foto, solo si están vacíos. Sirve para eventos importados antes de guardar esos datos o sin fotos;
 * lo cargado en el panel no se pisa.
 */
export function completarVacios(existente: Json, nuevo: Json): { datos: Json; completado: boolean } {
  let datos = existente;
  if (!existente.sede && nuevo.sede) datos = { ...datos, sede: nuevo.sede };
  const manual = (existente.lugarManual as Json | undefined) ?? {};
  const direccion = (nuevo.lugarManual as Json | undefined)?.direccion;
  if (!manual.direccion && direccion) datos = { ...datos, lugarManual: { ...manual, direccion } };
  if (!existente.imagen && nuevo.imagen) datos = { ...datos, imagen: nuevo.imagen };
  return { datos, completado: datos !== existente };
}

/** Categorías nuevas para configuracion/categorias-agenda (las que ya están no se tocan). */
export function categoriasNuevas(actuales: { id: string }[], usadas: { slug: string; nombre: string }[]) {
  const hay = new Set(actuales.map((k) => k.id));
  const nuevas = new Map<string, { id: string; titulo: string; tono: number }>();
  for (const k of usadas) {
    if (hay.has(k.slug) || nuevas.has(k.slug) || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(k.slug)) continue;
    nuevas.set(k.slug, { id: k.slug, titulo: k.nombre, tono: (actuales.length + nuevas.size) % 4 });
  }
  return [...nuevas.values()];
}

/** Un evento del plan de EventON (lib/cultura/eventon.mjs, mapeo de Agenda Cultural) → origen común. */
export function desdeEventOn(
  ev: {
    legacyId: string; legacyUrl: string; slug: string; title: string; summary: string | null; description: string | null;
    accessType: string; placeSlug: string | null; customPlaceName: string | null; customAddress: string | null;
    image: string | null; categorySlugs: string[]; occurrences: { startsAt: string; endsAt: string | null }[];
  },
  nombres: Map<string, string>,
): EventoOrigen {
  return {
    origen: "wordpress", id: ev.legacyId, url: ev.legacyUrl, slug: ev.slug, titulo: ev.title,
    resumen: ev.summary, descripcion: ev.description,
    // El WordPress viejo es público: lo que está ahí se considera publicado.
    estado: "publicado",
    acceso: ev.accessType, lugarAgenda: ev.placeSlug, sede: ev.customPlaceName, direccion: ev.customAddress,
    imagen: ev.image, categorias: ev.categorySlugs.map((slug) => ({ slug, nombre: nombres.get(slug) ?? slug })),
    fechas: ev.occurrences.map((o) => ({ inicio: o.startsAt, fin: o.endsAt })),
  };
}
