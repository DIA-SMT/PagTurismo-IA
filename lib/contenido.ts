/**
 * Contenido de la landing de turismo.
 *
 * Todo lo que se lee en la página sale de acá, para que la Dirección de
 * Turismo pueda corregirlo sin tocar componentes. Los textos de recorridos,
 * horarios, domicilio y correo se tomaron de las notas publicadas en
 * smt.gob.ar (busturistico, circuitosturisticospie, museoescultorio,
 * parques_smt, historia y el área 89 de la estructura de gobierno).
 *
 * Las URLs a smt.gob.ar usan los slugs del sitio actual, que cuelgan de la
 * raíz. El portal nuevo los redirige a /p/{slug} con un 308, así que siguen
 * sirviendo después de la migración.
 */

export const PORTAL = "https://smt.gob.ar";

/** Sitios propios: los enlaces van ahí y no a una sección de la landing. */
export const BUS_TURISTICO = "https://busturistico.smt.gob.ar/";
export const PALACIO = "https://palacio.smt.gob.ar/";

export type Enlace = { texto: string; url: string; externo?: boolean };

export const NAV: Enlace[] = [
  { texto: "Qué hacer", url: "#que-hacer" },
  { texto: "Recorridos", url: "#recorridos" },
  { texto: "Agenda", url: "#agenda" },
  { texto: "Sabores", url: "#sabores" },
  { texto: "Antes de llegar", url: "#antes-de-llegar" },
  { texto: "Contacto", url: "#contacto" },
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

export const ACCESOS = [
  { titulo: "Qué hacer", detalle: "Lugares y experiencias", url: "#que-hacer", icono: "brujula" },
  { titulo: "Bus turístico", detalle: "Gratis, con guía", url: BUS_TURISTICO, icono: "bus-linea" },
  { titulo: "Agenda", detalle: "Fechas para agendar", url: "#agenda", icono: "calendario" },
  { titulo: "Cómo llegar", detalle: "Datos para tu viaje", url: "#antes-de-llegar", icono: "avion" },
];

/* ---- Destacados ---- */

export const DESTACADOS = [
  {
    etiqueta: "Recorridos",
    titulo: "City Tour en Bus Turístico",
    detalle: "Un recorrido guiado y gratuito de unas dos horas por la historia, la cultura y el patrimonio arquitectónico de la ciudad.",
    imagen: "/fotos/san-miguel-de-tucuman.webp",
    url: BUS_TURISTICO,
  },
  {
    etiqueta: "A pie",
    titulo: "Circuito guiado por el casco histórico",
    detalle: "Sale a las 09:30 desde el Museo Casa Histórica y termina en el Jockey Club, con un refresco antes de volver a la plaza.",
    imagen: "/fotos/museo-nacional-de-la-independencia.webp",
    url: `${PORTAL}/circuitosturisticospie`,
  },
  {
    etiqueta: "Paseos",
    titulo: "La ciudad de noche",
    detalle: "Fuentes, plazas y fachadas iluminadas: el centro también se recorre después del atardecer.",
    imagen: "/fotos/la-fuente-de-los-leones.webp",
    url: "#que-hacer",
  },
];

/* ---- Qué hacer ---- */

export type Categoria = {
  titulo: string;
  detalle: string;
  url: string;
  /** Foto a sangre. */
  foto?: string;
  /** Ilustración recortada sobre un fondo de color. */
  sticker?: string;
  tono?: number;
};

export const CATEGORIAS: Categoria[] = [
  {
    titulo: "Historia y patrimonio",
    detalle: "La Casa Histórica, la Casa de Gobierno y un casco urbano declarado Ciudad Histórica.",
    foto: "/fotos/panoramas/casa-historica.webp",
    url: `${PORTAL}/historia`,
  },
  {
    titulo: "Gastronomía",
    detalle: "Empanadas, sánguche de milanesa, locro y humitas: la mesa tucumana.",
    sticker: "/stickers/empanadas.webp",
    tono: 4,
    url: "#sabores",
  },
  {
    titulo: "Turismo religioso",
    detalle: "La Catedral, San Francisco y los templos del centro histórico.",
    foto: "/fotos/iglesia-catedral.webp",
    url: `${PORTAL}/lugares-de-interes`,
  },
  {
    titulo: "Parques y ambiente",
    detalle: "Parque 9 de Julio, Avellaneda, Guillermina y el Campus Educativo Ambiental.",
    foto: "/fotos/campus-educativo-ambiental.webp",
    url: `${PORTAL}/parques_smt`,
  },
  {
    titulo: "Folclore y cultura",
    detalle: "Museos, teatros y la Casa Natal de Mercedes Sosa.",
    sticker: "/stickers/mate-bombo.webp",
    tono: 2,
    url: "#recorridos",
  },
  {
    titulo: "Palacio de los Deportes",
    detalle: "Deporte, música y cultura bajo un mismo techo: mirá la cartelera.",
    foto: "/fotos/palacio-de-los-deportes.webp",
    url: PALACIO,
  },
  {
    titulo: "Plazas y noches",
    detalle: "La Plaza Independencia y la Libertad de Lola Mora, iluminadas.",
    foto: "/fotos/panoramas/plaza-independencia-nocturna.webp",
    url: "#recorridos",
  },
  {
    titulo: "Escapadas",
    detalle: "Cerro San Javier, El Cadillal, Tafí del Valle y Quilmes.",
    sticker: "/stickers/paisajes-tafi-cadillal.webp",
    tono: 0,
    url: "#escapadas",
  },
];

/* ---- La ciudad en cuatro fechas ---- */

export const FECHAS = [
  { anio: "1565", titulo: "Primera fundación", detalle: "Diego de Villarroel funda San Miguel de Tucumán en Ibatín, el 31 de mayo." },
  { anio: "1685", titulo: "Al pie del cerro", detalle: "La ciudad se traslada a su emplazamiento actual, frente al San Javier." },
  { anio: "1812", titulo: "Batalla de Tucumán", detalle: "El 24 de septiembre, el ejército de Belgrano vence a las fuerzas realistas." },
  { anio: "1816", titulo: "Independencia", detalle: "El 9 de julio, el Congreso declara la independencia en la Casa Histórica." },
];

/* ---- Recorridos ---- */

export const BUS = {
  titulo: "City Tour en Bus Turístico",
  detalle: "Recorrido guiado y gratuito de aproximadamente dos horas. Cada circuito propone una mirada distinta sobre la identidad tucumana, con guías especializados y paradas en sitios emblemáticos.",
  url: BUS_TURISTICO,
  circuitos: [
    {
      nombre: "Histórico Cultural",
      bajada: "Un viaje por los principales hitos de la historia tucumana.",
      paradas: [
        "Plaza Independencia", "Centro Cultural Rougés", "Federación Económica", "Ex Hotel Plaza",
        "Jockey Club", "Iglesia San Francisco", "Casa de Gobierno", "Museo Casa Padilla",
        "Casa Museo de la Ciudad", "Museo Casa Natal de Mercedes Sosa", "Parque 9 de Julio",
        "Solar de Belgrano", "Museo de la Industria Azucarera",
      ],
    },
    {
      nombre: "Lugares Notables",
      bajada: "Arquitectura, parques y barrios tradicionales.",
      paradas: [
        "Calles céntricas", "Av. Sarmiento", "Plaza Urquiza", "Teatro San Martín", "Colegio Nacional",
        "Parque 9 de Julio", "Museo de la Industria Azucarera", "Reloj de Flores", "Palacio de los Deportes",
        "Tribunales", "Plaza San Martín", "Plaza Belgrano", "Barrio La Ciudadela", "Ex Mercado de Abasto",
        "Teatro Rosita Ávila", "Av. Mate de Luna", "Parque Avellaneda", "Monumento del Bicentenario",
        "Cementerio del Oeste",
      ],
    },
    {
      nombre: "La Ciudadela",
      bajada: "Un paseo con fuerte identidad histórica y popular.",
      paradas: [
        "Plaza Independencia", "Plaza Belgrano", "Mercado de Abasto", "Teatro Municipal Rosita Ávila",
        "Facultad de Ciencias Naturales (legado Miguel Lillo)", "Cancha de San Martín",
      ],
    },
  ],
};

export const EXPERIENCIAS = [
  {
    titulo: "Circuito a pie",
    detalle: "Visita guiada por museos, iglesias y la “city tucumana”. Sale 09:30 desde el Museo Casa Histórica.",
    icono: "caminata",
    url: `${PORTAL}/circuitosturisticospie`,
  },
  {
    titulo: "Museo Escultórico a Cielo Abierto",
    detalle: "Catorce esculturas neoclásicas emplazadas en 1928 sobre calle Ramón Paz Posse, en el Parque 9 de Julio.",
    icono: "estatua",
    url: `${PORTAL}/museoescultorio`,
  },
  {
    titulo: "Parques de la ciudad",
    detalle: "Parque 9 de Julio, Avellaneda y Guillermina: para caminar, hacer deporte y compartir en familia.",
    icono: "hoja-linea",
    url: `${PORTAL}/parques_smt`,
  },
];

/* ---- Agenda ---- */

/** Fechas fijas del calendario tucumano. Se repiten todos los años. */
export const AGENDA = [
  {
    dia: "31", mes: "MAY",
    titulo: "Aniversario de la ciudad",
    lugar: "San Miguel de Tucumán",
    detalle: "Se recuerda la primera fundación, en 1565, en el paraje de Ibatín.",
  },
  {
    dia: "9", mes: "JUL",
    titulo: "Día de la Independencia",
    lugar: "Casa Histórica y Plaza Independencia",
    detalle: "La ciudad donde se declaró la independencia celebra su fecha más importante.",
  },
  {
    dia: "24", mes: "SEP",
    titulo: "Batalla de Tucumán y Virgen de la Merced",
    lugar: "Centro histórico",
    detalle: "Feriado provincial: la victoria de Belgrano en 1812 y la fiesta de la patrona de Tucumán.",
  },
  {
    dia: "", mes: "SEP",
    titulo: "Fiesta Nacional de la Empanada",
    lugar: "Famaillá, a 35 km",
    detalle: "El concurso de la mejor empanada del país, a media hora de la ciudad.",
  },
];

/* ---- Sabores ---- */

export const SABORES = [
  {
    titulo: "Empanada tucumana",
    detalle: "Carne cortada a cuchillo, repulgue bien marcado y un chorrito de limón. Al horno de barro, mejor.",
    sticker: "/stickers/empanadas.webp",
    tono: 4,
  },
  {
    titulo: "Sánguche de milanesa",
    detalle: "El clásico de los carritos: pan, milanesa, lechuga, tomate, cebolla y picante a gusto.",
    sticker: "/stickers/sanguche-milanesa.webp",
    tono: 2,
  },
  {
    titulo: "Locro",
    detalle: "Maíz, zapallo y porotos a fuego lento. El plato de las fiestas patrias.",
    sticker: "/stickers/locro.webp",
    tono: 0,
  },
  {
    titulo: "Tamales y humitas",
    detalle: "Maíz molido envuelto en chala: salados, con carne, o a la olla con albahaca.",
    sticker: "/stickers/tamal-humita.webp",
    tono: 3,
  },
];

/* ---- Escapadas ---- */

export const ESCAPADAS = [
  {
    titulo: "Cerro San Javier",
    detalle: "Miradores sobre la ciudad, senderismo y el Cristo Bendicente.",
    distancia: "25 km",
    sticker: "/stickers/cristo-bendicente.webp",
    tono: 1,
  },
  {
    titulo: "Tafí del Valle",
    detalle: "Valle de altura con el dique La Angostura, quesos artesanales y la ruta entre yungas.",
    distancia: "107 km",
    sticker: "/stickers/paisajes-tafi-cadillal.webp",
    tono: 0,
  },
  {
    titulo: "Ruinas de Quilmes",
    detalle: "La ciudad sagrada del pueblo quilmes, en los Valles Calchaquíes.",
    distancia: "180 km",
    sticker: "/stickers/ruinas-quilmes.webp",
    tono: 4,
  },
];

/* ---- Antes de llegar ---- */

export const ANTES_DE_LLEGAR = [
  {
    titulo: "¿Cómo llegar?",
    detalle: "Por avión al Aeropuerto Internacional Benjamín Matienzo, a unos 10 km del centro, o en micro a la Terminal de Ómnibus.",
    icono: "avion",
  },
  {
    titulo: "¿Cómo moverse?",
    detalle: "Colectivos urbanos con tarjeta SUBE y taxis. El casco histórico se recorre cómodo a pie.",
    icono: "bus-linea",
  },
  {
    titulo: "Datos útiles",
    detalle: "Emergencias de salud 107, policía 911 y bomberos 100. Moneda: peso argentino.",
    icono: "info",
  },
  {
    titulo: "Accesibilidad",
    detalle: "Si necesitás asistencia durante tu visita, escribinos antes de llegar y te ayudamos a planificarla.",
    icono: "accesibilidad",
  },
];

/* ---- Contacto ---- */

export const TURISMO = {
  area: "Dirección de Turismo",
  // El área publica "Congreso y Crisóstomo Álvarez"; la nota del bus dice
  // "Congreso 101" y la ficha "Congreso 171". Se usa la del área hasta que
  // Turismo confirme cuál es la oficial.
  domicilio: "Congreso y Crisóstomo Álvarez, San Miguel de Tucumán",
  email: "turismo@smt.gob.ar",
};

export const MUNICIPALIDAD = {
  direccion: "9 de Julio 570, T4000 San Miguel de Tucumán",
  telefono: "(0381) 451-6500",
  telefonoLink: "+543814516500",
};

export const REDES = [
  { titulo: "Facebook", url: "https://www.facebook.com/MuniSMTucuman", icono: "facebook" },
  { titulo: "Instagram", url: "https://instagram.com/munismtucuman", icono: "instagram" },
  { titulo: "X (Twitter)", url: "https://twitter.com/MuniSMT", icono: "x" },
  { titulo: "YouTube", url: "https://www.youtube.com/user/MuniSMTucuman", icono: "youtube" },
];

export const EMERGENCIAS = [
  { nombre: "Emergencia Salud", numero: "107", icono: "emergencia-cruz" },
  { nombre: "Emergencia Policial", numero: "911", icono: "emergencia-escudo" },
  { nombre: "Bomberos", numero: "100", icono: "emergencia-fuego" },
  { nombre: "Defensa Civil", numero: "103", icono: "emergencia-escudo" },
];

export const PIE: { titulo: string; enlaces: Enlace[] }[] = [
  {
    titulo: "Qué hacer",
    enlaces: [
      { texto: "Historia y patrimonio", url: `${PORTAL}/historia`, externo: true },
      { texto: "Lugares de interés", url: `${PORTAL}/lugares-de-interes`, externo: true },
      { texto: "Parques", url: `${PORTAL}/parques_smt`, externo: true },
      { texto: "Museo Escultórico", url: `${PORTAL}/museoescultorio`, externo: true },
      { texto: "Palacio de los Deportes", url: PALACIO, externo: true },
    ],
  },
  {
    titulo: "Recorridos",
    enlaces: [
      { texto: "Bus Turístico", url: BUS_TURISTICO, externo: true },
      { texto: "Circuito a pie", url: `${PORTAL}/circuitosturisticospie`, externo: true },
      { texto: "Circuitos turísticos", url: `${PORTAL}/circuitos-turisticos`, externo: true },
      { texto: "Mapa interactivo", url: "https://mapa.smt.gob.ar/", externo: true },
    ],
  },
  {
    titulo: "Antes de llegar",
    enlaces: [
      { texto: "Cómo llegar y moverse", url: "#antes-de-llegar" },
      { texto: "Recorridos de colectivos", url: `${PORTAL}/colectivos`, externo: true },
      { texto: "Tarjeta SUBE", url: `${PORTAL}/Sube`, externo: true },
      { texto: "Agenda", url: "#agenda" },
    ],
  },
  {
    titulo: "La Municipalidad",
    enlaces: [
      { texto: "Portal oficial", url: PORTAL, externo: true },
      { texto: "Noticias", url: "https://comunicacionsmt.gob.ar/", externo: true },
      { texto: "Contacto", url: "#contacto" },
    ],
  },
];
