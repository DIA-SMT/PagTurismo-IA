/**
 * Formularios del panel: qué campos tiene cada colección, cómo se agrupan y cuáles son
 * obligatorios. El mismo esquema arma el formulario (components/admin/FormularioFicha.tsx) y
 * revisa lo que llega al servidor (lib/admin/limpiar.ts). La forma de los datos coincide con
 * lib/tipos.ts y con la normalización de lib/normalizar.ts.
 *
 * Sin dependencias del servidor: lo usan el navegador y las pruebas.
 */

type Base = { nombre: string; etiqueta: string; ayuda?: string; requerido?: boolean; ancho?: "medio" };

export type Campo =
  | (Base & { tipo: "texto" | "url" | "correo"; marcador?: string })
  | (Base & { tipo: "parrafo"; filas?: number })
  | (Base & { tipo: "numero"; min?: number; max?: number })
  | (Base & { tipo: "booleano" })
  | (Base & { tipo: "opciones"; opciones: { valor: string; texto: string }[] })
  | (Base & { tipo: "temas" | "etiquetas" })
  | (Base & { tipo: "relacion"; coleccion: string; multiple?: boolean })
  | (Base & { tipo: "imagen" })
  | (Base & { tipo: "fecha" | "fechaHora" })
  | (Base & { tipo: "grupo"; campos: Campo[] })
  | (Base & { tipo: "lista"; campos: Campo[]; resumen?: string; textoAgregar: string });

export type Seccion = { titulo: string; descripcion?: string; campos: Campo[] };

export type Esquema = {
  id: string;
  titulo: string;
  singular: string;
  /** "nuevo lugar", "nueva experiencia" */
  nuevo: string;
  descripcion: string;
  icono: string;
  /** Ruta pública de una ficha, si tiene. */
  rutaPublica?: (slug: string) => string;
  secciones: Seccion[];
};

/* ---- Piezas que se repiten ---- */

const titulo: Campo = { tipo: "texto", nombre: "titulo", etiqueta: "Título", requerido: true };
const resumen: Campo = {
  tipo: "parrafo", nombre: "resumen", etiqueta: "Resumen", requerido: true, filas: 2,
  ayuda: "Una o dos oraciones. Se usa en tarjetas, en el buscador y al compartir.",
};
const temas: Campo = { tipo: "temas", nombre: "categorias", etiqueta: "Temas" };
const etiquetas: Campo = { tipo: "etiquetas", nombre: "etiquetas", etiqueta: "Etiquetas" };
const imagen: Campo = { tipo: "imagen", nombre: "imagen", etiqueta: "Imagen principal" };

const costo: Campo = {
  tipo: "grupo", nombre: "costo", etiqueta: "Costo", campos: [
    { tipo: "opciones", nombre: "modalidad", etiqueta: "Modalidad", ancho: "medio", opciones: [
      { valor: "consultar", texto: "Consultar (sin dato confirmado)" },
      { valor: "gratis", texto: "Gratis" },
      { valor: "pago", texto: "Pago" },
    ] },
    { tipo: "texto", nombre: "detalle", etiqueta: "Detalle", ancho: "medio" },
  ],
};

const horario: Campo = {
  tipo: "grupo", nombre: "horario", etiqueta: "Horario", campos: [
    { tipo: "texto", nombre: "texto", etiqueta: "Texto", marcador: "Martes a domingo de 9 a 18. Feriados, consultar." },
    { tipo: "booleano", nombre: "confirmado", etiqueta: "Confirmado por el responsable", ayuda: "Si no está confirmado, el sitio pide consultar antes de ir." },
  ],
};

const fuentesYValidacion: Seccion = {
  titulo: "Fuentes y validación",
  descripcion: "De dónde salen los datos, quién los confirmó y cuándo hay que volver a revisarlos.",
  campos: [
    { tipo: "lista", nombre: "fuentes", etiqueta: "Fuentes", resumen: "titulo", textoAgregar: "Agregar fuente", campos: [
      { tipo: "texto", nombre: "titulo", etiqueta: "Título", requerido: true, ancho: "medio" },
      { tipo: "url", nombre: "url", etiqueta: "Dirección (URL)", ancho: "medio" },
    ] },
    { tipo: "grupo", nombre: "validacion", etiqueta: "Validación", campos: [
      { tipo: "fecha", nombre: "fecha", etiqueta: "Fecha de validación", ancho: "medio" },
      { tipo: "fecha", nombre: "proximaRevision", etiqueta: "Próxima revisión", ancho: "medio" },
      { tipo: "texto", nombre: "responsable", etiqueta: "Responsable" },
    ] },
  ],
};

const ICONOS_GUIA = ["avion", "bus-linea", "info", "accesibilidad", "ubicacion", "mapa", "calendario", "caminata", "reloj", "ticket"];

/* ---- Colecciones ---- */

export const ESQUEMAS: Esquema[] = [
  {
    id: "lugares", titulo: "Lugares", singular: "lugar", nuevo: "Nuevo lugar", icono: "ubicacion",
    descripcion: "Atractivos permanentes: museos, plazas, parques, templos y teatros.",
    rutaPublica: (s) => `/lugares/${s}`,
    secciones: [
      { titulo: "Lo principal", campos: [
        titulo,
        { tipo: "texto", nombre: "clase", etiqueta: "Tipo de lugar", requerido: true, ancho: "medio", marcador: "museo, plaza, parque, templo…" },
        { tipo: "booleano", nombre: "imperdible", etiqueta: "Imperdible", ancho: "medio", ayuda: "Aparece en Descubrí San Miguel." },
        resumen,
        { tipo: "parrafo", nombre: "porQueIr", etiqueta: "Por qué ir", filas: 3 },
        { tipo: "parrafo", nombre: "descripcion", etiqueta: "Descripción e historia", filas: 6, ayuda: "Separá los párrafos con una línea en blanco." },
        temas, etiquetas, imagen,
      ] },
      { titulo: "Información práctica", descripcion: "Cargá solo datos confirmados. Lo que falte se muestra como «a confirmar».", campos: [
        { tipo: "texto", nombre: "direccion", etiqueta: "Dirección", ancho: "medio" },
        { tipo: "texto", nombre: "zona", etiqueta: "Zona", ancho: "medio", marcador: "Centro, Parque 9 de Julio…" },
        { tipo: "grupo", nombre: "coordenadas", etiqueta: "Coordenadas verificadas", campos: [
          { tipo: "numero", nombre: "lat", etiqueta: "Latitud", ancho: "medio", min: -90, max: 90 },
          { tipo: "numero", nombre: "lng", etiqueta: "Longitud", ancho: "medio", min: -180, max: 180 },
        ] },
        horario, costo,
        { tipo: "texto", nombre: "duracion", etiqueta: "Duración orientativa de la visita" },
        { tipo: "grupo", nombre: "contacto", etiqueta: "Contacto", campos: [
          { tipo: "texto", nombre: "telefono", etiqueta: "Teléfono", ancho: "medio" },
          { tipo: "correo", nombre: "email", etiqueta: "Correo", ancho: "medio" },
          { tipo: "url", nombre: "web", etiqueta: "Sitio oficial" },
        ] },
        { tipo: "parrafo", nombre: "accesibilidad", etiqueta: "Accesibilidad", filas: 3, ayuda: "Solo condiciones verificadas, por sector." },
      ] },
      fuentesYValidacion,
    ],
  },
  {
    id: "experiencias", titulo: "Experiencias", singular: "experiencia", nuevo: "Nueva experiencia", icono: "brujula",
    descripcion: "Actividades: visitas guiadas, bus turístico, paseos.",
    rutaPublica: (s) => `/experiencias/${s}`,
    secciones: [
      { titulo: "Lo principal", campos: [
        titulo, resumen,
        { tipo: "parrafo", nombre: "descripcion", etiqueta: "Qué se hace", filas: 5 },
        { tipo: "opciones", nombre: "modalidad", etiqueta: "Modalidad", requerido: true, ancho: "medio", opciones: [
          { valor: "a-pie", texto: "A pie" }, { valor: "bus", texto: "En bus" },
          { valor: "bicicleta", texto: "En bicicleta" }, { valor: "libre", texto: "Paseo libre" },
        ] },
        { tipo: "booleano", nombre: "guiada", etiqueta: "Con guía", ancho: "medio" },
        temas, etiquetas, imagen,
      ] },
      { titulo: "Acción principal", descripcion: "El botón de la ficha. Nunca un «Reservar» que lleve a una página genérica.", campos: [
        { tipo: "grupo", nombre: "accion", etiqueta: "Botón", campos: [
          { tipo: "opciones", nombre: "tipo", etiqueta: "Tipo", requerido: true, ancho: "medio", opciones: [
            { valor: "reservar", texto: "Reservar" }, { valor: "inscripcion", texto: "Inscribirse" },
            { valor: "consultar", texto: "Consultar" }, { valor: "sin-inscripcion", texto: "Sin inscripción" },
            { valor: "sin-salidas", texto: "Sin salidas publicadas" },
          ] },
          { tipo: "texto", nombre: "texto", etiqueta: "Texto del botón", requerido: true, ancho: "medio", marcador: "Ver salidas y reservar en Bus Turístico" },
          { tipo: "url", nombre: "url", etiqueta: "Enlace", ayuda: "Obligatorio si el tipo es Reservar." },
        ] },
        { tipo: "lista", nombre: "salidas", etiqueta: "Próximas salidas", resumen: "inicio", textoAgregar: "Agregar salida",
          ayuda: "Solo salidas confirmadas por el sistema responsable. Hora de Tucumán.", campos: [
            { tipo: "fechaHora", nombre: "inicio", etiqueta: "Inicio", requerido: true, ancho: "medio" },
            { tipo: "fechaHora", nombre: "fin", etiqueta: "Fin", ancho: "medio" },
            { tipo: "opciones", nombre: "estado", etiqueta: "Estado", ancho: "medio", opciones: [
              { valor: "programada", texto: "Programada" }, { valor: "agotada", texto: "Agotada" },
              { valor: "suspendida", texto: "Suspendida" }, { valor: "cancelada", texto: "Cancelada" },
            ] },
            { tipo: "url", nombre: "urlReserva", etiqueta: "Enlace de reserva de esta salida", ancho: "medio" },
            { tipo: "texto", nombre: "nota", etiqueta: "Nota" },
          ] },
      ] },
      { titulo: "Información práctica", campos: [
        { tipo: "texto", nombre: "duracion", etiqueta: "Duración", ancho: "medio" },
        { tipo: "texto", nombre: "puntoEncuentro", etiqueta: "Punto de encuentro", ancho: "medio" },
        horario, costo,
        { tipo: "relacion", nombre: "lugares", etiqueta: "Lugares que visita", coleccion: "lugares", multiple: true },
        { tipo: "parrafo", nombre: "incluye", etiqueta: "Qué incluye", filas: 2 },
        { tipo: "parrafo", nombre: "requisitos", etiqueta: "Requisitos", filas: 2 },
        { tipo: "texto", nombre: "politicaClima", etiqueta: "Si llueve", ancho: "medio" },
        { tipo: "texto", nombre: "operador", etiqueta: "Operador o responsable", ancho: "medio" },
      ] },
      fuentesYValidacion,
    ],
  },
  {
    id: "eventos", titulo: "Agenda", singular: "evento", nuevo: "Nuevo evento", icono: "calendario",
    descripcion: "Un evento es el concepto (la fiesta, el ciclo); cada fecha concreta es una ocurrencia.",
    rutaPublica: (s) => `/agenda/${s}`,
    secciones: [
      { titulo: "Lo principal", campos: [
        titulo,
        { tipo: "opciones", nombre: "clase", etiqueta: "Tipo", requerido: true, ancho: "medio", opciones: [
          { valor: "efemeride", texto: "Fecha del calendario (efeméride)" }, { valor: "festividad", texto: "Festividad" },
          { valor: "espectaculo", texto: "Espectáculo" }, { valor: "feria", texto: "Feria" },
          { valor: "deportivo", texto: "Deportivo" }, { valor: "otro", texto: "Otro" },
        ] },
        { tipo: "booleano", nombre: "fueraDeLaCiudad", etiqueta: "Es fuera de San Miguel de Tucumán", ancho: "medio" },
        resumen,
        { tipo: "parrafo", nombre: "descripcion", etiqueta: "Descripción permanente", filas: 4, ayuda: "Lo que no cambia de un año a otro. Cada edición va en las fechas." },
        temas, etiquetas, imagen,
      ] },
      { titulo: "Fechas", descripcion: "Hora de Tucumán. Si una fecha se cancela, cambiá su estado: no la borres.", campos: [
        { tipo: "lista", nombre: "ocurrencias", etiqueta: "Fechas confirmadas", resumen: "inicio", textoAgregar: "Agregar fecha", campos: [
          { tipo: "fechaHora", nombre: "inicio", etiqueta: "Inicio", requerido: true, ancho: "medio" },
          { tipo: "fechaHora", nombre: "fin", etiqueta: "Fin", ancho: "medio" },
          { tipo: "opciones", nombre: "estado", etiqueta: "Estado", ancho: "medio", opciones: [
            { valor: "confirmado", texto: "Confirmado" }, { valor: "reprogramado", texto: "Reprogramado" },
            { valor: "suspendido", texto: "Suspendido" }, { valor: "cancelado", texto: "Cancelado" },
          ] },
          { tipo: "texto", nombre: "sede", etiqueta: "Sede de esta fecha", ancho: "medio" },
          { tipo: "texto", nombre: "nota", etiqueta: "Nota" },
        ] },
        { tipo: "grupo", nombre: "recurrente", etiqueta: "Fecha que se repite cada año",
          ayuda: "Para el calendario anual. No confirma que haya un evento ese día.", campos: [
            { tipo: "numero", nombre: "dia", etiqueta: "Día", ancho: "medio", min: 1, max: 31 },
            { tipo: "numero", nombre: "mes", etiqueta: "Mes (1 a 12)", ancho: "medio", min: 1, max: 12 },
          ] },
      ] },
      { titulo: "Dónde y cómo", campos: [
        { tipo: "relacion", nombre: "lugar", etiqueta: "Lugar (si tiene ficha)", coleccion: "lugares", ancho: "medio" },
        { tipo: "texto", nombre: "sede", etiqueta: "Sede (texto)", ancho: "medio" },
        { tipo: "texto", nombre: "localidad", etiqueta: "Localidad", ancho: "medio", marcador: "Famaillá, a unos 35 km" },
        { tipo: "texto", nombre: "organizador", etiqueta: "Organizador", ancho: "medio" },
        costo,
        { tipo: "texto", nombre: "inscripcion", etiqueta: "Entradas o inscripción", ancho: "medio" },
        { tipo: "url", nombre: "urlOficial", etiqueta: "Sitio oficial", ancho: "medio" },
      ] },
      fuentesYValidacion,
    ],
  },
  {
    id: "recorridos", titulo: "Recorridos", singular: "recorrido", nuevo: "Nuevo recorrido", icono: "caminata",
    descripcion: "Circuitos (bus, a pie) e itinerarios por tiempo disponible.",
    rutaPublica: (s) => `/recorridos/${s}`,
    secciones: [
      { titulo: "Lo principal", campos: [
        titulo,
        { tipo: "opciones", nombre: "tipo", etiqueta: "Tipo", requerido: true, ancho: "medio", opciones: [
          { valor: "circuito", texto: "Circuito" }, { valor: "itinerario", texto: "Itinerario por tiempo disponible" },
        ] },
        { tipo: "opciones", nombre: "modalidad", etiqueta: "Modalidad", requerido: true, ancho: "medio", opciones: [
          { valor: "a-pie", texto: "A pie" }, { valor: "bus", texto: "En bus" }, { valor: "mixto", texto: "Mixto" },
        ] },
        { tipo: "booleano", nombre: "guiado", etiqueta: "Guiado", ancho: "medio" },
        { tipo: "numero", nombre: "orden", etiqueta: "Orden en los listados", ancho: "medio", min: 1, ayuda: "1 aparece primero." },
        resumen,
        { tipo: "parrafo", nombre: "descripcion", etiqueta: "Descripción", filas: 4 },
        temas, etiquetas, imagen,
      ] },
      { titulo: "Paradas", descripcion: "En orden. Elegí la ficha del lugar cuando exista: la parada enlaza a ella.", campos: [
        { tipo: "lista", nombre: "paradas", etiqueta: "Paradas", resumen: "nombre", textoAgregar: "Agregar parada", requerido: true, campos: [
          { tipo: "texto", nombre: "nombre", etiqueta: "Nombre", requerido: true, ancho: "medio" },
          { tipo: "relacion", nombre: "lugar", etiqueta: "Ficha del lugar", coleccion: "lugares", ancho: "medio" },
          { tipo: "texto", nombre: "nota", etiqueta: "Nota", ancho: "medio" },
          { tipo: "numero", nombre: "dia", etiqueta: "Día (itinerarios de varios días)", ancho: "medio", min: 1 },
        ] },
      ] },
      { titulo: "Información práctica", campos: [
        { tipo: "texto", nombre: "duracion", etiqueta: "Duración", ancho: "medio" },
        { tipo: "texto", nombre: "distancia", etiqueta: "Distancia (solo si fue medida)", ancho: "medio" },
        { tipo: "texto", nombre: "inicio", etiqueta: "Empieza en", ancho: "medio" },
        { tipo: "texto", nombre: "fin", etiqueta: "Termina en", ancho: "medio" },
        { tipo: "texto", nombre: "esfuerzo", etiqueta: "Esfuerzo", ancho: "medio" },
        { tipo: "relacion", nombre: "experiencia", etiqueta: "Experiencia que lo opera", coleccion: "experiencias", ancho: "medio",
          ayuda: "Para los guiados: de ahí salen las salidas y el botón de reserva." },
        { tipo: "parrafo", nombre: "condiciones", etiqueta: "Condiciones", filas: 2 },
        { tipo: "parrafo", nombre: "aviso", etiqueta: "Aviso destacado", filas: 2 },
      ] },
      fuentesYValidacion,
    ],
  },
  {
    id: "planifica", titulo: "Planificá tu visita", singular: "guía", nuevo: "Nueva guía", icono: "info",
    descripcion: "Guías prácticas: cómo llegar, cómo moverse, accesibilidad.",
    rutaPublica: (s) => `/planifica/${s}`,
    secciones: [
      { titulo: "Lo principal", campos: [
        titulo, resumen,
        { tipo: "opciones", nombre: "icono", etiqueta: "Ícono", ancho: "medio", opciones: ICONOS_GUIA.map((i) => ({ valor: i, texto: i })) },
        { tipo: "numero", nombre: "orden", etiqueta: "Orden", ancho: "medio", min: 1 },
      ] },
      { titulo: "Contenido", campos: [
        { tipo: "lista", nombre: "secciones", etiqueta: "Secciones", resumen: "titulo", textoAgregar: "Agregar sección", campos: [
          { tipo: "texto", nombre: "titulo", etiqueta: "Título" },
          { tipo: "parrafo", nombre: "texto", etiqueta: "Texto", requerido: true, filas: 4 },
        ] },
        { tipo: "lista", nombre: "enlaces", etiqueta: "Enlaces útiles", resumen: "texto", textoAgregar: "Agregar enlace", campos: [
          { tipo: "texto", nombre: "texto", etiqueta: "Texto", requerido: true, ancho: "medio" },
          { tipo: "url", nombre: "url", etiqueta: "Dirección", requerido: true, ancho: "medio" },
        ] },
      ] },
      fuentesYValidacion,
    ],
  },
  {
    id: "destacados", titulo: "Destacados", singular: "destacado", nuevo: "Nuevo destacado", icono: "estrella",
    descripcion: "Las tarjetas grandes de la portada, con ventana de publicación.",
    secciones: [
      { titulo: "Tarjeta", campos: [
        titulo,
        { tipo: "texto", nombre: "etiqueta", etiqueta: "Etiqueta", requerido: true, ancho: "medio", marcador: "Recorridos, Esta semana…" },
        { tipo: "numero", nombre: "orden", etiqueta: "Orden", ancho: "medio", min: 1 },
        { tipo: "parrafo", nombre: "detalle", etiqueta: "Texto", requerido: true, filas: 3 },
        { ...imagen, requerido: true },
      ] },
      { titulo: "Destino y vigencia", descripcion: "Si la ficha de destino no existe o está en borrador, el destacado no se muestra.", campos: [
        { tipo: "grupo", nombre: "destino", etiqueta: "Adónde lleva", campos: [
          { tipo: "opciones", nombre: "coleccion", etiqueta: "Tipo de destino", requerido: true, ancho: "medio", opciones: [
            { valor: "experiencias", texto: "Experiencia" }, { valor: "lugares", texto: "Lugar" }, { valor: "eventos", texto: "Evento" },
            { valor: "recorridos", texto: "Recorrido" }, { valor: "planifica", texto: "Guía práctica" }, { valor: "externo", texto: "Sitio externo" },
          ] },
          { tipo: "texto", nombre: "slug", etiqueta: "Ficha (dirección)", ancho: "medio", marcador: "city-tour-bus-turistico",
            ayuda: "El final de la dirección de la ficha." },
          { tipo: "url", nombre: "url", etiqueta: "URL (solo si es externo)" },
        ] },
        { tipo: "fecha", nombre: "desde", etiqueta: "Mostrar desde", ancho: "medio" },
        { tipo: "fecha", nombre: "hasta", etiqueta: "Mostrar hasta", ancho: "medio" },
      ] },
    ],
  },
  {
    id: "sabores", titulo: "Sabores", singular: "plato", nuevo: "Nuevo plato", icono: "plato",
    descripcion: "Platos típicos de la portada y de /sabores.",
    secciones: [
      { titulo: "Plato", campos: [
        titulo,
        { tipo: "parrafo", nombre: "detalle", etiqueta: "Texto", requerido: true, filas: 3 },
        { ...imagen, requerido: true },
        { tipo: "numero", nombre: "tono", etiqueta: "Tono de fondo (0 a 5)", ancho: "medio", min: 0, max: 5 },
        { tipo: "numero", nombre: "orden", etiqueta: "Orden", ancho: "medio", min: 1 },
      ] },
    ],
  },
  {
    id: "escapadas", titulo: "Escapadas", singular: "escapada", nuevo: "Nueva escapada", icono: "mapa",
    descripcion: "Destinos fuera de San Miguel de Tucumán.",
    secciones: [
      { titulo: "Escapada", campos: [
        titulo,
        { tipo: "parrafo", nombre: "detalle", etiqueta: "Texto", requerido: true, filas: 3 },
        { tipo: "texto", nombre: "localidad", etiqueta: "Localidad", ancho: "medio" },
        { tipo: "texto", nombre: "distancia", etiqueta: "Distancia aproximada", ancho: "medio", marcador: "25 km" },
        { ...imagen, requerido: true },
        { tipo: "url", nombre: "url", etiqueta: "Más información (URL)" },
        { tipo: "numero", nombre: "tono", etiqueta: "Tono de fondo (0 a 5)", ancho: "medio", min: 0, max: 5 },
        { tipo: "numero", nombre: "orden", etiqueta: "Orden", ancho: "medio", min: 1 },
      ] },
    ],
  },
];

/* ---- Configuración (sin estado ni slug) ---- */

export const ESQUEMA_SITIO: Esquema = {
  id: "configuracion", titulo: "Configuración", singular: "configuración", nuevo: "", icono: "ajustes",
  descripcion: "Textos de la portada, contacto, redes, teléfonos de emergencia e historia.",
  secciones: [
    { titulo: "Portada", campos: [{ tipo: "grupo", nombre: "hero", etiqueta: "Encabezado", campos: [
      { tipo: "texto", nombre: "kicker", etiqueta: "Antetítulo" },
      { tipo: "texto", nombre: "titulo", etiqueta: "Título", requerido: true, ancho: "medio" },
      { tipo: "texto", nombre: "tituloAcento", etiqueta: "Título (parte resaltada)", ancho: "medio" },
      { tipo: "parrafo", nombre: "bajada", etiqueta: "Bajada", filas: 2 },
    ] }] },
    { titulo: "Contacto", campos: [
      { tipo: "grupo", nombre: "turismo", etiqueta: "Dirección de Turismo", campos: [
        { tipo: "texto", nombre: "area", etiqueta: "Área", requerido: true, ancho: "medio" },
        { tipo: "correo", nombre: "email", etiqueta: "Correo", requerido: true, ancho: "medio" },
        { tipo: "texto", nombre: "domicilio", etiqueta: "Domicilio" },
        { tipo: "texto", nombre: "atencion", etiqueta: "Horario de atención (solo si está confirmado)" },
      ] },
      { tipo: "grupo", nombre: "municipalidad", etiqueta: "Municipalidad", campos: [
        { tipo: "texto", nombre: "direccion", etiqueta: "Dirección" },
        { tipo: "texto", nombre: "telefono", etiqueta: "Teléfono", ancho: "medio" },
        { tipo: "texto", nombre: "telefonoLink", etiqueta: "Teléfono para marcar (+54…)", ancho: "medio" },
      ] },
      { tipo: "lista", nombre: "redes", etiqueta: "Redes", resumen: "titulo", textoAgregar: "Agregar red", campos: [
        { tipo: "texto", nombre: "titulo", etiqueta: "Nombre", requerido: true, ancho: "medio" },
        { tipo: "opciones", nombre: "icono", etiqueta: "Ícono", ancho: "medio", opciones: ["facebook", "instagram", "x", "youtube"].map((v) => ({ valor: v, texto: v })) },
        { tipo: "url", nombre: "url", etiqueta: "Dirección", requerido: true },
      ] },
    ] },
    { titulo: "Emergencias", campos: [
      { tipo: "lista", nombre: "emergencias", etiqueta: "Teléfonos de emergencia", resumen: "nombre", textoAgregar: "Agregar teléfono", campos: [
        { tipo: "texto", nombre: "nombre", etiqueta: "Nombre", requerido: true, ancho: "medio" },
        { tipo: "texto", nombre: "numero", etiqueta: "Número", requerido: true, ancho: "medio" },
        { tipo: "opciones", nombre: "icono", etiqueta: "Ícono", opciones: ["emergencia-cruz", "emergencia-escudo", "emergencia-fuego"].map((v) => ({ valor: v, texto: v })) },
      ] },
    ] },
    { titulo: "Historia", campos: [
      { tipo: "lista", nombre: "historia", etiqueta: "Línea de tiempo", resumen: "anio", textoAgregar: "Agregar fecha", campos: [
        { tipo: "texto", nombre: "anio", etiqueta: "Año", requerido: true, ancho: "medio" },
        { tipo: "texto", nombre: "titulo", etiqueta: "Título", requerido: true, ancho: "medio" },
        { tipo: "parrafo", nombre: "detalle", etiqueta: "Texto", filas: 2 },
      ] },
    ] },
  ],
};

export const ESQUEMA_TEMAS: Esquema = {
  id: "temas", titulo: "Temas y etiquetas", singular: "tema", nuevo: "", icono: "etiqueta",
  descripcion: "Los temas del catálogo y las etiquetas secundarias.",
  secciones: [
    { titulo: "Temas", descripcion: "No cambies el identificador de un tema existente: las fichas lo usan para relacionarse.", campos: [
      { tipo: "lista", nombre: "categorias", etiqueta: "Temas", resumen: "titulo", textoAgregar: "Agregar tema", campos: [
        { tipo: "texto", nombre: "id", etiqueta: "Identificador", requerido: true, ancho: "medio", marcador: "historia-y-patrimonio" },
        { tipo: "texto", nombre: "titulo", etiqueta: "Nombre", requerido: true, ancho: "medio" },
        { tipo: "parrafo", nombre: "detalle", etiqueta: "Texto", filas: 2 },
        { tipo: "texto", nombre: "imagen", etiqueta: "Imagen (ruta)", requerido: true, ancho: "medio", marcador: "/fotos/…" },
        { tipo: "numero", nombre: "tono", etiqueta: "Tono si es ilustración (0 a 5)", ancho: "medio", min: 0, max: 5 },
      ] },
    ] },
    { titulo: "Etiquetas", campos: [
      { tipo: "lista", nombre: "etiquetas", etiqueta: "Etiquetas", resumen: "titulo", textoAgregar: "Agregar etiqueta", campos: [
        { tipo: "texto", nombre: "id", etiqueta: "Identificador", requerido: true, ancho: "medio" },
        { tipo: "texto", nombre: "titulo", etiqueta: "Nombre", requerido: true, ancho: "medio" },
      ] },
    ] },
  ],
};

export const esquemaDe = (id: string) => ESQUEMAS.find((e) => e.id === id);
