/**
 * Alojamientos habilitados de San Miguel de Tucumán, del registro oficial del Ente Tucumán Turismo
 * (scripts/alojamientos.ts los baja a datos/turismo/alojamientos.json). Funciones puras: se prueban sin red.
 */

export const TIPOS_ALOJAMIENTO = ["hotel", "hostel", "departamentos", "residencial", "otro"] as const;
export type TipoAlojamiento = (typeof TIPOS_ALOJAMIENTO)[number];

export type Alojamiento = {
  id: string;
  nombre: string;
  tipo: TipoAlojamiento;
  /** 1 a 5 en los hoteles; 0 si no tiene categoría por estrellas. */
  estrellas: number;
  direccion?: string;
  /** Tal como figuran en el registro (a veces dos números en el mismo texto). */
  telefono?: string;
  web?: string;
  email?: string;
  instagram?: string;
  facebook?: string;
  servicios: string[];
  coordenadas?: { lat: number; lng: number };
  /** Última modificación en el registro del Ente. */
  actualizado?: string;
};

export type ArchivoAlojamientos = { fuente: string; url: string; relevado: string; alojamientos: Alojamiento[] };

const vacio = (v: unknown) => v === undefined || v === null || (typeof v === "string" && (!v.trim() || v.trim() === "null"));
const texto = (v: unknown) => (vacio(v) ? undefined : String(v).replace(/­/g, "").replace(/\s+/g, " ").trim());

const MINUSCULAS = new Set(["de", "del", "la", "las", "los", "y", "el"]);

/** «SHERATON TUCUMAN » → «Sheraton Tucuman»; deja en mayúsculas las siglas cortas («TP», «LG») y los «&». */
export function nombreProlijo(nombre: string): string {
  return nombre.replace(/­/g, "").trim().split(/\s+/).map((p, i) => {
    const minuscula = p.toLocaleLowerCase("es");
    if (i > 0 && MINUSCULAS.has(minuscula)) return minuscula;
    if (/^[A-ZÁÉÍÓÚÑ]{2,3}$/.test(p) && !/[AEIOUÁÉÍÓÚ]/.test(p)) return p;
    return minuscula.charAt(0).toLocaleUpperCase("es") + minuscula.slice(1);
  }).join(" ");
}

export function tipoDe(categoria: string): TipoAlojamiento {
  const c = categoria.toLowerCase();
  if (c.startsWith("hotel")) return "hotel";
  if (c.startsWith("hostel")) return "hostel";
  if (c.includes("departamento") || c.includes("casas")) return "departamentos";
  if (c.startsWith("residencial")) return "residencial";
  return "otro";
}

const conProtocolo = (url?: string) => (url ? (/^https?:\/\//i.test(url) ? url : `https://${url}`) : undefined);

/** El sitio del alojamiento; el registro a veces pone el del propio Ente, que no es del alojamiento. */
export function webPropia(valor?: string): string | undefined {
  const url = conProtocolo(valor);
  // Con «@» la URL toma lo de antes como usuario («www.@cuenta.com»): es una dirección rota.
  if (!url || url.includes("@")) return undefined;
  try {
    return new URL(url).hostname.endsWith("tucumanturismo.gob.ar") ? undefined : url;
  } catch {
    return undefined;
  }
}

/**
 * La cuenta de una red a partir de lo que haya en el registro: «@usuario», «usuario», la dirección completa o
 * variantes rotas («instagram.com/@usuario», «instagram.com/instagram/usuario»). Si no es de esa red, nada.
 */
export function cuentaDeRed(valor: unknown, dominio: "instagram.com" | "facebook.com"): string | undefined {
  const v = texto(valor);
  if (!v) return undefined;
  let ruta = v;
  if (/^https?:\/\//i.test(v) || v.includes(".")) {
    const m = v.match(new RegExp(`^(?:https?://)?(?:www\\.)?${dominio.replace(".", "\\.")}/(.+)$`, "i"));
    if (!m) return /^@?[\w.]+$/.test(v) && !v.includes(".com") ? `https://www.${dominio}/${v.replace(/^@/, "")}/` : undefined;
    ruta = m[1];
  }
  const partes = ruta.split(/[?#]/)[0].split("/").map((p) => p.replace(/^@/, "")).filter((p) => p && p !== dominio.split(".")[0]);
  const cuenta = partes[0];
  return cuenta && /^[\w.-]+$/.test(cuenta) ? `https://www.${dominio}/${cuenta}/` : undefined;
}

/** «SANTIAGO DEL ESTERO 419» → «Santiago del Estero 419»; «AV.BRIGIDO TERAN» → «Av. Brigido Teran». Lo que ya viene en minúsculas, queda. */
export function direccionProlija(direccion?: string): string | undefined {
  if (!direccion) return undefined;
  const limpia = direccion.replace(/^AV\.\s*/i, "Av. ").replace(/\bN[º°]\s*(\d)/g, "Nº $1");
  const letras = limpia.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, "");
  const mayusculas = letras.replace(/[^A-ZÁÉÍÓÚÑ]/g, "").length;
  return letras.length && mayusculas / letras.length > 0.6 ? nombreProlijo(limpia) : limpia;
}

/** Una fila de la API del Ente → alojamiento del portal. */
export function alojamientoDesdeEnte(h: Record<string, unknown>): Alojamiento {
  const lat = Number(h.latitud);
  const lng = Number(h.longitud);
  const estrellas = Number(h.estrellas) || 0;
  const tipo = tipoDe(String(h.categoria ?? ""));
  return {
    id: String(h.id),
    nombre: nombreProlijo(String(h.nombre ?? "")),
    tipo,
    estrellas: tipo === "hotel" ? Math.min(5, Math.max(0, estrellas)) : 0,
    direccion: direccionProlija(texto(h.domicilio)),
    telefono: texto(h.telefono_final),
    web: webPropia(texto(h.web)),
    email: texto(h.email),
    instagram: cuentaDeRed(h.instagram, "instagram.com"),
    facebook: cuentaDeRed(h.facebook, "facebook.com"),
    servicios: (texto(h.servicios) ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    coordenadas: Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0 ? { lat, lng } : undefined,
    actualizado: texto(h.fechamodificacion),
  };
}

/** Grupos para la página: los hoteles por estrellas (de 5 a 1, y sin categoría al final) y después los demás tipos. */
export function agrupar(alojamientos: Alojamiento[]): { clave: string; tipo: TipoAlojamiento; estrellas?: number; lista: Alojamiento[] }[] {
  const grupos: { clave: string; tipo: TipoAlojamiento; estrellas?: number; lista: Alojamiento[] }[] = [];
  for (const e of [5, 4, 3, 2, 1, 0]) {
    const lista = alojamientos.filter((a) => a.tipo === "hotel" && a.estrellas === e);
    if (lista.length) grupos.push({ clave: `hotel-${e}`, tipo: "hotel", estrellas: e, lista });
  }
  for (const tipo of TIPOS_ALOJAMIENTO.filter((t) => t !== "hotel")) {
    const lista = alojamientos.filter((a) => a.tipo === tipo);
    if (lista.length) grupos.push({ clave: tipo, tipo, lista });
  }
  return grupos;
}

/** El primer número de teléfono del texto, para el enlace tel: (código de área de Tucumán si falta). */
export function telefonoParaLlamar(telefono?: string): string | undefined {
  const primero = telefono?.split(/\s*(?:\/|\by\b|,|-\s(?=\d))\s*/)[0] ?? "";
  let n = primero.replace(/[^\d+]/g, "");
  if (!n) return undefined;
  if (n.startsWith("+")) return n;
  n = n.replace(/^0/, "");
  if (n.startsWith("54")) return `+${n}`;
  if (n.length === 7) return `+54381${n}`;
  return `+54${n}`;
}
