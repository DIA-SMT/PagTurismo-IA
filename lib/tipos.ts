/**
 * Modelo de contenidos del portal.
 *
 * Cada entidad vive en un archivo JSON propio dentro de `contenido/` y se
 * edita desde /admin. Las relaciones se guardan por slug (el nombre del
 * archivo sin `.json`): un horario o una descripción se escriben una sola vez
 * y la portada, el catálogo y las fichas los leen del mismo lugar.
 *
 * Este archivo no importa nada con valor en tiempo de ejecución para que lo
 * puedan usar tanto el servidor como los componentes de cliente y las pruebas.
 */

export type Estado = "borrador" | "publicado";

export type Imagen = {
  src: string;
  /** Texto alternativo. Vacío sólo si la foto es decorativa. */
  alt: string;
  credito?: string;
  /** Procedencia y permiso de uso. */
  permiso?: string;
};

export type Fuente = { titulo: string; url?: string };

/** Quién confirmó los datos operativos y cuándo hay que volver a mirarlos. */
export type Validacion = {
  fecha?: string;
  responsable?: string;
  proximaRevision?: string;
};

export type Costo = {
  modalidad: "gratis" | "pago" | "consultar";
  detalle?: string;
};

/** Un dato operativo que sólo se muestra como firme si alguien lo confirmó. */
export type DatoConfirmable = { texto: string; confirmado: boolean };

export type Enlace = { texto: string; url: string };

type Comun = {
  slug: string;
  estado: Estado;
  titulo: string;
  resumen: string;
  categorias: string[];
  etiquetas: string[];
  imagen?: Imagen;
  fuentes: Fuente[];
  validacion: Validacion;
};

export type Lugar = Comun & {
  /** museo, plaza, parque, templo, teatro, edificio, monumento… */
  clase: string;
  porQueIr?: string;
  descripcion?: string;
  zona?: string;
  direccion?: string;
  coordenadas?: { lat: number; lng: number };
  horario?: DatoConfirmable;
  costo: Costo;
  duracion?: string;
  contacto?: { telefono?: string; email?: string; web?: string };
  accesibilidad?: string;
  imperdible?: boolean;
};

export type TipoAccion = "reservar" | "inscripcion" | "consultar" | "sin-inscripcion" | "sin-salidas";

export type Accion = { tipo: TipoAccion; texto: string; url?: string };

export type EstadoSalida = "programada" | "agotada" | "suspendida" | "cancelada";

export type Salida = {
  /** Hora local de Tucumán, `AAAA-MM-DDTHH:mm`. */
  inicio: string;
  fin?: string;
  estado: EstadoSalida;
  urlReserva?: string;
  nota?: string;
};

export type Experiencia = Comun & {
  modalidad: "a-pie" | "bus" | "bicicleta" | "libre";
  guiada: boolean;
  descripcion?: string;
  duracion?: string;
  horario?: DatoConfirmable;
  puntoEncuentro?: string;
  lugares: string[];
  incluye?: string;
  requisitos?: string;
  politicaClima?: string;
  operador?: string;
  costo: Costo;
  accion: Accion;
  /** Sólo salidas que confirmó el sistema responsable. */
  salidas: Salida[];
};

export type EstadoOcurrencia = "confirmado" | "cancelado" | "reprogramado" | "suspendido";

export type Ocurrencia = {
  /** Hora local de Tucumán: `AAAA-MM-DDTHH:mm`, o `AAAA-MM-DD` si es todo el día. */
  inicio: string;
  fin?: string;
  estado: EstadoOcurrencia;
  sede?: string;
  nota?: string;
};

export type Evento = Comun & {
  clase: "efemeride" | "festividad" | "espectaculo" | "feria" | "deportivo" | "otro";
  descripcion?: string;
  /** Fecha que se repite cada año. Sirve para el calendario, no para la agenda. */
  recurrente?: { dia?: number; mes: number };
  lugar?: string;
  sede?: string;
  fueraDeLaCiudad?: boolean;
  localidad?: string;
  organizador?: string;
  costo: Costo;
  inscripcion?: string;
  urlOficial?: string;
  ocurrencias: Ocurrencia[];
};

export type Parada = { nombre: string; lugar?: string; nota?: string; dia?: number };

export type Recorrido = Comun & {
  tipo: "circuito" | "itinerario";
  orden: number;
  modalidad: "bus" | "a-pie" | "mixto";
  guiado: boolean;
  descripcion?: string;
  duracion?: string;
  distancia?: string;
  esfuerzo?: string;
  inicio?: string;
  fin?: string;
  paradas: Parada[];
  /** Experiencia que opera el recorrido (salidas y reservas). */
  experiencia?: string;
  condiciones?: string;
  aviso?: string;
};

export type Guia = {
  slug: string;
  estado: Estado;
  titulo: string;
  resumen: string;
  icono: string;
  orden: number;
  secciones: { titulo: string; texto: string }[];
  enlaces: Enlace[];
  fuentes: Fuente[];
  validacion: Validacion;
};

export type ColeccionDestino = "lugares" | "experiencias" | "eventos" | "recorridos" | "planifica" | "externo";

export type Destacado = {
  slug: string;
  estado: Estado;
  titulo: string;
  etiqueta: string;
  detalle: string;
  imagen: Imagen;
  destino: { coleccion: ColeccionDestino; slug?: string; url?: string };
  /** Ventana de publicación, fechas locales `AAAA-MM-DD`. */
  desde?: string;
  hasta?: string;
  orden: number;
};

export type Plato = {
  slug: string;
  estado: Estado;
  titulo: string;
  detalle: string;
  imagen: Imagen;
  tono: number;
  orden: number;
};

export type Escapada = {
  slug: string;
  estado: Estado;
  titulo: string;
  detalle: string;
  localidad?: string;
  distancia?: string;
  imagen: Imagen;
  tono: number;
  url?: string;
  orden: number;
};

export type Categoria = {
  id: string;
  titulo: string;
  detalle: string;
  imagen: string;
  /** Si la imagen es una ilustración recortada, el tono de fondo. */
  tono?: number;
};

export type Etiqueta = { id: string; titulo: string };

export type Sitio = {
  hero: { kicker: string; titulo: string; tituloAcento: string; bajada: string };
  turismo: { area: string; domicilio: string; email: string; atencion?: string };
  municipalidad: { direccion: string; telefono: string; telefonoLink: string };
  redes: { titulo: string; url: string; icono: string }[];
  emergencias: { nombre: string; numero: string; icono: string }[];
  historia: { anio: string; titulo: string; detalle: string }[];
};

/** Lo que el catálogo necesita de cada ficha; viaja al navegador. */
export type ItemCatalogo = {
  entidad: "lugar" | "experiencia" | "recorrido" | "evento";
  slug: string;
  url: string;
  titulo: string;
  resumen: string;
  meta: string;
  imagen?: Imagen;
  categorias: string[];
  etiquetas: string[];
  gratis: boolean;
  borrador: boolean;
  fueraDeLaCiudad: boolean;
};
