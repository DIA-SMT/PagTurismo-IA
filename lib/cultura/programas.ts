/**
 * Programas de la Dirección de Gestión Cultural (documento «Página web de Cultura»): Crear Encuentro y Cultura
 * Joven. Acá van los datos que no se traducen (logos, cifras, enlaces) y cómo reconocer sus actividades en la
 * agenda; los textos están en lib/i18n/textos/programas.ts. Funciones puras: se prueban sin base.
 */
import { normalizar } from "../buscar.ts";

export type IdPrograma = "crear-encuentro" | "cultura-joven";

export type Programa = {
  id: IdPrograma;
  logo: { src: string; ancho: number; alto: number };
  /** Frases que, en el título o el resumen de un evento, lo vinculan con el programa. */
  claves: string[];
  /** Notas de prensa de la Municipalidad sobre el programa. */
  prensa: string;
};

export const PROGRAMAS: Programa[] = [
  {
    id: "crear-encuentro",
    logo: { src: "/img/programas/red-de-promotores-culturales.jpg", ancho: 1024, alto: 1024 },
    claves: ["crear encuentro", "teatro en los barrios", "promotores culturales", "promotoras culturales"],
    prensa: "https://comunicacionsmt.gob.ar/contenido/12216/el-municipio-lanzo-su-red-de-promotores-culturales-para-seguir-acercando-las-exp",
  },
  {
    id: "cultura-joven",
    logo: { src: "/img/programas/cultura-joven.png", ancho: 431, alto: 306 },
    claves: ["cultura joven", "territorio hip hop", "esquinas hip hop", "ciclo esquinas", "freestyle", "folclore joven", "folklore joven"],
    prensa: "https://comunicacionsmt.gob.ar/contenido/15079/nace-un-nuevo-espacio-de-expresion-artistica-para-jovenes-en-san-miguel-de-tucum",
  },
];

/** Crear Encuentro en números (documento de la Dirección de Gestión Cultural). */
export const CIFRAS_CREAR_ENCUENTRO = {
  promotores: 48,
  promotoresMeta: 60,
  promotoresJovenes: 20,
  espectadores: 22003,
  acciones: 120,
  lanzamiento: "2025-11-17",
} as const;

/** Territorio Hip-Hop (Esquinas), de Cultura Joven. */
export const ESQUINAS = {
  logo: { src: "/img/programas/esquinas.png", ancho: 1000, alto: 441 },
  instagram: "https://www.instagram.com/esquinas.hiphop/",
} as const;

/** Dónde acercar propuestas o anotarse, para los dos programas: el Centro Cultural Mercedes Sosa. */
export const SEDE_PROGRAMAS = "centro-cultural-mercedes-sosa";

/** ¿Este evento es de ese programa? Busca las frases clave en el título y el resumen, sin tildes ni mayúsculas. */
export function esDelPrograma(p: Pick<Programa, "claves">, evento: { titulo: string; resumen?: string }): boolean {
  const texto = ` ${normalizar(`${evento.titulo} ${evento.resumen ?? ""}`).replace(/[^a-z0-9]+/g, " ")} `;
  return p.claves.some((c) => texto.includes(` ${normalizar(c).replace(/[^a-z0-9]+/g, " ")} `));
}
