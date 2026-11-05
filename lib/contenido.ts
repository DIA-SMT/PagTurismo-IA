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
export const BUS_TURISTICO = "https://busturistico.smt.gob.ar/";
export const PALACIO = "https://palacio.smt.gob.ar/";
export const MAPA = "https://mapa.smt.gob.ar/";

export type Enlace = { texto: string; url: string; externo?: boolean };

export const NAV: Enlace[] = [
  { texto: "Descubrí San Miguel", url: "/descubri" },
  { texto: "Qué hacer", url: "/que-hacer" },
  { texto: "Recorridos", url: "/recorridos" },
  { texto: "Agenda", url: "/agenda" },
  { texto: "Planificá tu visita", url: "/planifica" },
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

export const PIE: { titulo: string; enlaces: Enlace[] }[] = [
  {
    titulo: "Qué hacer",
    enlaces: [
      { texto: "Catálogo de lugares y experiencias", url: "/que-hacer" },
      { texto: "Historia y patrimonio", url: "/que-hacer/historia-y-patrimonio" },
      { texto: "Parques y aire libre", url: "/que-hacer/parques-y-aire-libre" },
      { texto: "Sabores tucumanos", url: "/sabores" },
      { texto: "Escapadas", url: "/escapadas" },
    ],
  },
  {
    titulo: "Recorridos",
    enlaces: [
      { texto: "Todos los recorridos", url: "/recorridos" },
      { texto: "Bus Turístico", url: BUS_TURISTICO, externo: true },
      { texto: "Circuito a pie", url: `${PORTAL}/circuitosturisticospie`, externo: true },
      { texto: "Mapa interactivo", url: MAPA, externo: true },
    ],
  },
  {
    titulo: "Planificá tu visita",
    enlaces: [
      { texto: "Agenda", url: "/agenda" },
      { texto: "Cómo llegar", url: "/planifica/como-llegar" },
      { texto: "Cómo moverse", url: "/planifica/como-moverse" },
      { texto: "Accesibilidad", url: "/planifica/accesibilidad" },
    ],
  },
  {
    titulo: "La Municipalidad",
    enlaces: [
      { texto: "Portal oficial", url: PORTAL, externo: true },
      { texto: "Noticias", url: "https://comunicacionsmt.gob.ar/", externo: true },
      { texto: "Contacto", url: "/#contacto" },
    ],
  },
];
