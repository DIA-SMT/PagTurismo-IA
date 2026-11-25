/**
 * Mapa interactivo del portal: los puntos del mapa de la Municipalidad (mapa.smt.gob.ar, API pública de la
 * Dirección de Innovación Tecnológica) más los lugares del portal. Funciones puras: se prueban sin red.
 *
 * Los datos municipales son de otro sistema: se valida todo (coordenadas dentro de Tucumán, colores, enlaces
 * http/https) y en el navegador se muestran como texto, nunca como HTML.
 */

export type CapaMapa = {
  id: string;
  /** Grupo del panel («Cultura», «Espacios verdes»…). */
  grupo: string;
  nombre: string;
  color: string;
  /** Encendida al abrir el mapa. */
  porDefecto: boolean;
  fuente: "portal" | "municipal";
};

export type PuntoMapa = {
  id: string;
  capa: string;
  nombre: string;
  detalle?: string;
  lat: number;
  lng: number;
  /** Ficha del portal (dirección interna), si la hay. */
  ficha?: string;
  /** Sitio externo con más información. */
  url?: string;
};

export type DatosMapa = { capas: CapaMapa[]; puntos: PuntoMapa[]; municipal: boolean };

/** Lo que llega de /mapa/menu y /mapa/ubicaciones. */
type OpcionMenu = { idSubopcion?: unknown; nombre_opcion?: unknown; nombre_subopcion?: unknown; color?: unknown; habilita?: unknown };
type Ubicacion = {
  idUbicacion?: unknown; idSubopcion?: unknown; nombre_ubicacion?: unknown; detalle?: unknown;
  lat?: unknown; lon?: unknown; url_sitio?: unknown; habilita?: unknown;
};

/** Capas municipales encendidas al abrir: lo que más le sirve a quien visita la ciudad. */
const ENCENDIDAS = new Set(["museos", "teatros & cines", "centros culturales", "patrimonio arquitectonico", "iglesias", "parques", "bus turistico", "murales"]);

/** Un rectángulo generoso alrededor del Gran San Miguel de Tucumán: lo de afuera es un error de carga. */
const DENTRO = { latMin: -27.2, latMax: -26.5, lngMin: -65.6, lngMax: -64.9 };

const sinTildes = (t: string) => t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const texto = (v: unknown, max = 300) => {
  const s = typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
};
const color = (v: unknown) => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : "#1878d6");
const enlace = (v: unknown) => (typeof v === "string" && /^https?:\/\/[^\s"<>]+$/i.test(v.trim()) ? v.trim() : undefined);
/** «ESPACIOS VERDES» → «Espacios verdes». */
const oracion = (t: string) => (t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : t);

/** Las fichas del portal con nombre parecido (para enlazar «Casa Histórica» a su ficha y no a un sitio externo). */
export function buscarFicha(nombre: string, fichas: { titulo: string; url: string }[]): string | undefined {
  const n = sinTildes(nombre).replace(/[^a-z0-9]+/g, " ").trim();
  if (n.length < 6) return undefined;
  const igual = fichas.find((f) => sinTildes(f.titulo).replace(/[^a-z0-9]+/g, " ").trim() === n);
  if (igual) return igual.url;
  return fichas.find((f) => {
    const t = sinTildes(f.titulo).replace(/[^a-z0-9]+/g, " ").trim();
    return t.length >= 10 && n.length >= 10 && (t.includes(n) || n.includes(t));
  })?.url;
}

/** El menú y las ubicaciones del mapa municipal → capas y puntos del portal. */
export function normalizarMunicipal(menu: unknown, ubicaciones: unknown, fichas: { titulo: string; url: string }[] = []): { capas: CapaMapa[]; puntos: PuntoMapa[] } {
  const opciones = (Array.isArray(menu) ? menu : []) as OpcionMenu[];
  const puntos: PuntoMapa[] = [];
  for (const u of (Array.isArray(ubicaciones) ? ubicaciones : []) as Ubicacion[]) {
    if (u.habilita === 0 || u.habilita === "0") continue;
    const lat = Number(u.lat);
    const lng = Number(u.lon);
    const nombre = texto(u.nombre_ubicacion, 120);
    if (!nombre || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat < DENTRO.latMin || lat > DENTRO.latMax || lng < DENTRO.lngMin || lng > DENTRO.lngMax) continue;
    puntos.push({
      id: `m${String(u.idUbicacion)}`,
      capa: `m${String(u.idSubopcion)}`,
      nombre,
      ...(texto(u.detalle) ? { detalle: texto(u.detalle) } : {}),
      lat, lng,
      ...(buscarFicha(nombre, fichas) ? { ficha: buscarFicha(nombre, fichas) } : {}),
      ...(enlace(u.url_sitio) ? { url: enlace(u.url_sitio) } : {}),
    });
  }
  const usadas = new Set(puntos.map((p) => p.capa));
  const capas: CapaMapa[] = [];
  for (const o of opciones) {
    const id = `m${String(o.idSubopcion)}`;
    if (o.habilita === 0 || o.habilita === "0" || !usadas.has(id) || capas.some((k) => k.id === id)) continue;
    const nombre = texto(o.nombre_subopcion, 60);
    capas.push({
      id, grupo: oracion(texto(o.nombre_opcion, 40)), nombre, color: color(o.color),
      porDefecto: ENCENDIDAS.has(sinTildes(nombre)), fuente: "municipal",
    });
  }
  return { capas, puntos: puntos.filter((p) => capas.some((k) => k.id === p.capa)) };
}

/** Los lugares del portal con coordenadas: para visitar y para comer. */
export function capasDelPortal(
  lugares: { slug: string; titulo: string; resumen?: string; coordenadas?: { lat: number; lng: number }; comida: boolean; url: string }[],
  nombres: { grupo: string; visitar: string; comer: string },
): { capas: CapaMapa[]; puntos: PuntoMapa[] } {
  const puntos = lugares
    .filter((l) => l.coordenadas && Number.isFinite(l.coordenadas.lat) && Number.isFinite(l.coordenadas.lng))
    .map((l) => ({
      id: `p-${l.slug}`, capa: l.comida ? "p-comer" : "p-visitar", nombre: l.titulo,
      ...(l.resumen ? { detalle: texto(l.resumen) } : {}), lat: l.coordenadas!.lat, lng: l.coordenadas!.lng, ficha: l.url,
    }));
  const capas: CapaMapa[] = [
    { id: "p-visitar", grupo: nombres.grupo, nombre: nombres.visitar, color: "#0066ff", porDefecto: true, fuente: "portal" },
    { id: "p-comer", grupo: nombres.grupo, nombre: nombres.comer, color: "#d9480f", porDefecto: true, fuente: "portal" },
  ].filter((k) => puntos.some((p) => p.capa === k.id)) as CapaMapa[];
  return { capas, puntos };
}

/** Puntos que coinciden con la búsqueda (sin tildes) dentro de las capas encendidas. */
export function puntosVisibles(datos: DatosMapa, encendidas: Set<string>, q: string): PuntoMapa[] {
  const b = sinTildes(q.trim());
  return datos.puntos.filter((p) => encendidas.has(p.capa) && (!b || sinTildes(`${p.nombre} ${p.detalle ?? ""}`).includes(b)));
}
