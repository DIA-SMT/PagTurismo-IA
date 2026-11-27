/**
 * Estructura fija del portal: navegación, pie y fotos del hero.
 *
 * Los contenidos (lugares, experiencias, agenda, recorridos, guías, contacto)
 * ya no están acá: viven en `contenido/` y se editan desde /admin. Ver
 * lib/datos.ts.
 *
 * Las URLs a smt.gob.ar usan los slugs del sitio actual, que cuelgan de la
 * raíz. El portal nuevo los redirige a /p/{slug} con un 308, así que siguen
 * sirviendo después de la migración.
 */

export const PORTAL = "https://smt.gob.ar";

/** Sitios propios: los enlaces van ahí y no a una sección del portal. */
export const BUS_TURISTICO = "/bus-turistico";
export const PALACIO = "https://palacio.smt.gob.ar/";
/** El mapa de la Municipalidad: el portal muestra sus datos en /mapa y lo cita como fuente. */
export const MAPA = "https://mapa.smt.gob.ar/";

import type { comun } from "./i18n/textos/comun";

type TextosComun = (typeof comun)["es"];
export type ClaveNav = keyof TextosComun["nav"];
export type ClavePie = keyof TextosComun["pie"]["enlaces"];
export type ClaveSubnav = keyof TextosComun["subnav"];
export type Subseccion = { clave: ClaveSubnav; url: string; icono: string };

/** Los textos salen de lib/i18n/textos/comun.ts según el idioma. */
export type Enlace = { clave: ClavePie; url: string; externo?: boolean };

/**
 * La navegación principal. El portal es de Cultura: primero la agenda y los talleres; Turismo es una sección
 * con su menú desplegable («sub», que también arma los ítems anidados del menú del celular).
 */
export const NAV: { clave: ClaveNav; url: string; sub?: Subseccion[] }[] = [
  { clave: "agenda", url: "/agenda" },
  { clave: "talleres", url: "/talleres" },
  { clave: "museos", url: "/museos" },
  { clave: "centros", url: "/centros-culturales" },
  { clave: "programas", url: "/programas" },
  {
    clave: "turismo",
    url: "/descubri",
    sub: [
      { clave: "busTuristico", url: "/bus-turistico", icono: "bus-linea" },
      { clave: "queHacer", url: "/que-hacer", icono: "estrella" },
      { clave: "lugares", url: "/lugares", icono: "ubicacion" },
      { clave: "recorridos", url: "/recorridos", icono: "estatua" },
      { clave: "mapa", url: "/mapa", icono: "mapa" },
      { clave: "sabores", url: "/sabores", icono: "plato" },
      { clave: "escapadas", url: "/escapadas", icono: "caminata" },
      { clave: "planifica", url: "/planifica", icono: "avion" },
    ],
  },
];

/* ---- Hero ---- */

/** Una serie por tema: de día se ven fotos de día y de noche, de noche. */
export const HERO = {
  dia: [
    { archivo: "monumento-al-bicentenario-diurno", lugar: "Monumento al Bicentenario" },
    { archivo: "casa-historica", lugar: "Casa Histórica de la Independencia" },
    { archivo: "campus-ambiental", lugar: "Campus Educativo Ambiental" },
  ],
  noche: [
    { archivo: "plaza-independencia-nocturna", lugar: "Plaza Independencia" },
    { archivo: "catedral-iluminada", lugar: "Iglesia Catedral" },
    { archivo: "monumento-al-bicentenario-nocturno", lugar: "Monumento al Bicentenario" },
  ],
} as const;

export const PIE: { columna: keyof TextosComun["pie"]["columnas"]; enlaces: Enlace[] }[] = [
  {
    columna: "queHacer",
    enlaces: [
      { clave: "catalogo", url: "/que-hacer" },
      { clave: "historia", url: "/que-hacer/historia-y-patrimonio" },
      { clave: "parques", url: "/que-hacer/parques-y-aire-libre" },
      { clave: "sabores", url: "/sabores" },
      { clave: "escapadas", url: "/escapadas" },
      { clave: "talleres", url: "/talleres" },
      { clave: "museos", url: "/museos" },
      { clave: "centros", url: "/centros-culturales" },
      { clave: "programas", url: "/programas" },
    ],
  },
  {
    columna: "recorridos",
    enlaces: [
      { clave: "todosLosRecorridos", url: "/recorridos" },
      { clave: "busTuristico", url: "/bus-turistico" },
      { clave: "circuitoAPie", url: `${PORTAL}/circuitosturisticospie`, externo: true },
      { clave: "mapa", url: "/mapa" },
    ],
  },
  {
    columna: "planifica",
    enlaces: [
      { clave: "agenda", url: "/agenda" },
      { clave: "comoLlegar", url: "/planifica/como-llegar" },
      { clave: "comoMoverse", url: "/planifica/como-moverse" },
      { clave: "accesibilidad", url: "/planifica/accesibilidad" },
    ],
  },
  {
    columna: "municipalidad",
    enlaces: [
      { clave: "portal", url: PORTAL, externo: true },
      { clave: "noticias", url: "https://comunicacionsmt.gob.ar/", externo: true },
      { clave: "contacto", url: "/#contacto" },
    ],
  },
];
