/**
 * Migue del panel: el asistente interno que ayuda a usar el panel de administración. Responde SOLO sobre este
 * sistema, con la guía de abajo: una parte se arma sola desde los formularios (esquemas.ts), así no queda vieja
 * cuando cambia un campo, y otra explica reglas y pantallas que no están en un formulario.
 *
 * Funciones puras (se prueban sin IA). La llamada al modelo está en lib/ia.ts y la ruta en
 * app/api/admin/asistente.
 */
import { ESQUEMAS, type Campo, type Esquema } from "./esquemas.ts";
import type { SeccionMenu } from "./menu.ts";
import { NOMBRE_MODULO, NOMBRE_ROL, type Permisos } from "../permisos.ts";

export type MensajeAsistente = { rol: "usuario" | "asistente"; texto: string };

/** Lo que no sale de un formulario: reglas, flujos y pantallas especiales. */
export const GUIA_MANUAL: { titulo: string; ruta?: string; texto: string }[] = [
  {
    titulo: "Roles y permisos",
    ruta: "/admin/usuarios",
    texto: `Hay cuatro roles. Superadministrador: todo, en todos los módulos, y es el único que entra a «Usuarios y permisos».
Administrador: en sus módulos crea, edita, publica, despublica, borra y configura. Editor: en sus módulos crea y edita, pero NO publica, no despublica ni borra (deja borradores para que un administrador los publique). Consulta: solo mira.
Los módulos son Turismo (lugares, experiencias, recorridos, Planificá, destacados, sabores, escapadas, temas, configuración), Cultura (agenda y sus categorías), Buses (salidas y reservas, Bus Educativo, books de fotos, BiciTour) y Migue (preguntas frecuentes e interacciones del bot). Una cuenta sin módulos no ve nada hasta que se los asignen.
Para dar o cambiar permisos: un superadministrador entra a Usuarios y permisos, elige la cuenta y marca rol y módulos. Para crear una cuenta, el mismo lugar: correo, nombre, contraseña inicial, rol y módulos.`,
  },
  {
    titulo: "Borradores y publicación",
    texto: `Toda ficha tiene un estado: Borrador (no se ve en el sitio) o Publicado. Solo un administrador del módulo (o el superadministrador) puede publicar, despublicar o borrar; un editor guarda borradores.
Los datos que no estén confirmados se cargan igual pero el sitio los muestra como «a confirmar» (por ejemplo, horarios). En «Fuentes y validación» se anota de dónde salió cada dato y quién lo validó.
Si una ficha deja de estar vigente, conviene despublicarla en vez de borrarla. Todo cambio queda en la Auditoría con la persona y la fecha.`,
  },
  {
    titulo: "Traducciones (inglés y portugués)",
    texto: `Los campos traducibles tienen pestañas ES / EN / PT en el formulario. Si un campo no se traduce, el sitio en inglés o portugués muestra el texto en español con un aviso. Los menús y botones del sitio ya están traducidos: solo se traduce el contenido de las fichas.`,
  },
  {
    titulo: "Fotos",
    texto: `Se suben desde el campo de imagen de cada ficha (JPG, PNG o WebP, hasta 4 MB). El sistema las achica y les quita los datos de ubicación. Cada foto pide texto alternativo (qué se ve, para lectores de pantalla), crédito y permiso de uso.`,
  },
  {
    titulo: "Agenda cultural",
    ruta: "/admin/eventos",
    texto: `Cada evento tiene una o varias fechas (hora de Tucumán). Si una fecha se cancela o se suspende, se cambia su estado; no se borra, así el sitio lo muestra tachado y avisa. Un evento con varias fechas aparece en la agenda una vez por fecha.
Las categorías de la agenda (Música, Danza, Ferias…) se administran en «Categorías de la agenda» (/admin/categorias-agenda): nombre y color de cada una.
La descripción se escribe como texto común: si incluye «Duración: …», «Punto de encuentro: …», «Presentarse 10 minutos antes», «Se suspende por lluvia» o un «Itinerario:» con viñetas, la ficha pública lo muestra solo como tarjetas y paradas numeradas. Un enlace de inscripción en el texto aparece como botón.
Los talleres anuales de los centros culturales (clases semanales) no se cargan como eventos: tienen su propia sección pública, /talleres.`,
  },
  {
    titulo: "Talleres de los centros culturales",
    texto: `La sección pública /talleres sale de la planilla «HORARIO TALLERES ANUALES» de Gestión Cultural, no del panel. Para actualizarla, quien administra el servidor corre «npm run cultura -- talleres --desde-planilla planilla.xlsx» (primero muestra qué leyó y los errores de la planilla, como horarios imposibles) y después lo mismo con --escribir. Pedíselo a la Dirección de Inteligencia Artificial con la planilla nueva.`,
  },
  {
    titulo: "Salidas y reservas del Bus Turístico",
    ruta: "/admin/buses",
    texto: `En «Salidas y reservas» se crean las salidas (circuito, fecha, hora, cupo y punto de encuentro) y se ven sus reservas, la ocupación y los datos de contacto.
El cupo se puede cambiar, pero nunca por debajo de los lugares ya reservados. Una salida con reservas confirmadas no se borra: se cancela. Las reservas no se borran nunca; se cancelan (cambia su estado y se libera el lugar).
La reserva pública es gratuita y la hace cada persona en /bus-turistico; la confirmación le llega por correo con un enlace para ver o cancelar su reserva (se puede cancelar hasta 24 horas antes de la salida).
Los circuitos (nombre, modalidad, cupo por defecto, horarios) se editan en el panel de circuitos de la misma sección; el texto en inglés se puede traducir automáticamente.`,
  },
  {
    titulo: "Bus Educativo",
    ruta: "/admin/buses/educativo",
    texto: `Las escuelas e instituciones piden turno con un formulario público. En el panel se ven las solicitudes (pendientes, aprobadas, rechazadas), el detalle de la institución, y se aprueba o rechaza cada una con notas internas. Los circuitos educativos y sus días y turnos habilitados se configuran en la misma sección.`,
  },
  {
    titulo: "Books de fotos",
    ruta: "/admin/buses/fotos",
    texto: `Después de una salida se crea un book: circuito, fecha, cantidad de personas y las fotos (hasta 15 MB cada una). El sistema arma un enlace y un QR para compartir con el grupo; funcionan hasta la fecha de vencimiento (7 días), y después el book se borra solo. Se pueden agregar fotos al mismo book.`,
  },
  {
    titulo: "BiciTour",
    ruta: "/admin/buses/bicitour",
    texto: `Cada recorrido de BiciTour tiene paradas y preguntas (opción múltiple o verdadero/falso), en borrador, publicado o archivado. La IA puede proponer preguntas a partir del texto de cada parada: quedan como propuestas hasta que alguien las revisa y aprueba. En el tablero de BiciTour se ven sesiones, participantes y puntajes.`,
  },
  {
    titulo: "Migue (el chat del sitio)",
    ruta: "/admin/migue",
    texto: `Migue, el chat público del sitio, responde con el contenido publicado del portal (fichas, agenda, talleres, cupos del bus) y con sus preguntas frecuentes. En «Preguntas frecuentes» se cargan pregunta, respuesta y categoría. En «Interacciones» se ven las consultas que recibió y qué respondió, para detectar qué falta cargar. Para que Migue sepa algo nuevo, lo mejor es publicarlo en el portal: lo toma solo en unos minutos.`,
  },
  {
    titulo: "Planificador de visitas con IA",
    texto: `En Planificá tu visita el público arma un itinerario con IA. La IA solo puede proponer lo que está PUBLICADO en el portal: lugares, experiencias, recorridos, sabores, escapadas, eventos de la agenda de esas fechas y salidas del bus con cupo. Para que recomiende algo (por ejemplo, un restaurante), tiene que estar publicado como lugar. Los museos nunca se proponen un lunes.`,
  },
  {
    titulo: "Mapa interactivo",
    texto: `El mapa público (/mapa) muestra los puntos del mapa de la Municipalidad (mapa.smt.gob.ar, de la Dirección de Innovación) y los lugares publicados del portal que tengan coordenadas. Los puntos municipales se corrigen en el mapa de la Municipalidad, no acá. Para que un lugar del portal aparezca, cargá sus coordenadas (latitud y longitud) en su ficha.`,
  },
  {
    titulo: "Destacados, temas y configuración",
    texto: `Destacados: las tarjetas grandes de la portada; si la ficha de destino no existe o está en borrador, el destacado no se muestra. Temas y etiquetas (/admin/temas): agrupan las fichas en «Qué hacer». Configuración del sitio (/admin/configuracion): datos de contacto de la oficina de turismo, redes y textos generales. Las dos son de administradores de Turismo.`,
  },
  {
    titulo: "Auditoría",
    ruta: "/admin/auditoria",
    texto: `Registra quién hizo cada cambio, qué y cuándo (también los intentos rechazados por falta de permiso). Sirve para revisar qué pasó con una ficha o una reserva.`,
  },
];

const describirCampo = (c: Campo, prefijo = ""): string[] => {
  const extra = [c.requerido ? "obligatorio" : "", "traducible" in c && c.traducible ? "traducible" : ""].filter(Boolean).join(", ");
  const linea = `${prefijo}- ${c.etiqueta}${extra ? ` (${extra})` : ""}${c.ayuda ? `: ${c.ayuda}` : ""}`;
  if (c.tipo === "grupo" || c.tipo === "lista") return [linea, ...c.campos.flatMap((x) => describirCampo(x, `${prefijo}  `))];
  return [linea];
};

/** Un formulario del panel en texto: secciones, sus avisos y cada campo con su ayuda. */
export function guiaDeEsquema(e: Esquema): string {
  return [
    `### ${e.titulo} (/admin/${e.id})`,
    e.descripcion,
    `Para crear: botón «${e.nuevo || "Nuevo"}».`,
    ...e.secciones.flatMap((s) => [`Sección «${s.titulo}»${s.descripcion ? `: ${s.descripcion}` : ""}`, ...s.campos.flatMap((c) => describirCampo(c))]),
  ].filter(Boolean).join("\n");
}

/** Toda la guía del panel (la manual y la de los formularios). */
export function guiaCompleta(): string {
  return [
    "## Cómo funciona el panel",
    ...GUIA_MANUAL.map((g) => `### ${g.titulo}${g.ruta ? ` (${g.ruta})` : ""}\n${g.texto}`),
    "## Formularios del panel",
    ...ESQUEMAS.filter((e) => e.nuevo).map(guiaDeEsquema),
  ].join("\n\n");
}

const MAX_MENSAJES = 10;
const MAX_LARGO = 1500;

/** Valida el historial que manda el navegador: roles conocidos, textos cortos, los últimos mensajes. */
export function leerHistorial(cuerpo: unknown): MensajeAsistente[] | null {
  const lista = (cuerpo as { mensajes?: unknown })?.mensajes;
  if (!Array.isArray(lista) || !lista.length) return null;
  const mensajes = lista
    .filter((m): m is MensajeAsistente => !!m && (m.rol === "usuario" || m.rol === "asistente") && typeof m.texto === "string" && !!m.texto.trim())
    .map((m) => ({ rol: m.rol, texto: m.texto.trim().slice(0, MAX_LARGO) }))
    .slice(-MAX_MENSAJES);
  return mensajes.length && mensajes.at(-1)!.rol === "usuario" ? mensajes : null;
}

/** Las instrucciones del asistente, con quién pregunta y qué puede ver. */
export function instrucciones(nombre: string, p: Permisos, secciones: SeccionMenu[]): string {
  const rol = NOMBRE_ROL[p.rol];
  const modulos = p.rol === "superadmin" ? "todos" : p.modulos.map((m) => NOMBRE_MODULO[m]).join(", ") || "ninguno";
  return [
    "Sos «Migue del panel», el asistente del panel de administración del portal de Turismo y Cultura de la Municipalidad de San Miguel de Tucumán.",
    "Tu trabajo es ayudar a las personas del equipo a usar ESTE panel: dónde está cada cosa, cómo se carga, qué significa cada campo, qué permisos hacen falta y por qué algo no se ve en el sitio.",
    "Reglas:",
    "- Respondé solo con lo que dice la GUÍA. Si algo no está en la guía, decí que no lo sabés y sugerí consultarlo con la Dirección de Inteligencia Artificial. Nunca inventes botones, pantallas, campos ni pasos.",
    "- Si la pregunta no es sobre el panel o el portal, decí amablemente que solo ayudás con el panel.",
    "- Hablá en español rioplatense (voseo), claro y breve. Para procedimientos, pasos numerados cortos.",
    "- Cuando nombres una sección, enlazala con el formato [texto](/admin/...) usando SOLO las rutas que aparecen en la guía o en el menú de esta persona.",
    "- Tené en cuenta el rol de quien pregunta: si algo requiere un permiso que no tiene, decíselo y explicale quién puede hacerlo (un administrador del módulo o el superadministrador).",
    "- Nunca pidas, muestres ni ayudes a conseguir contraseñas, claves o datos personales de otras personas. Tampoco ejecutás acciones: solo explicás.",
    "",
    `QUIÉN PREGUNTA: ${nombre}. Rol: ${rol}. Módulos: ${modulos}.`,
    `SU MENÚ (lo que puede ver): ${secciones.map((s) => `${s.texto} (${s.href})`).join("; ")}.`,
    "",
    "GUÍA:",
    guiaCompleta(),
  ].join("\n");
}

/** Las preguntas de ejemplo del chat, según lo que la persona puede hacer (como mucho cuatro). */
export function sugerenciasPara(p: Permisos): string[] {
  const todo = p.rol === "superadmin";
  const tiene = (m: Permisos["modulos"][number]) => todo || p.modulos.includes(m);
  const lista = [
    tiene("turismo") && "¿Cómo cargo un lugar nuevo con fotos?",
    tiene("cultura") && "¿Cómo cargo un evento con varias fechas?",
    tiene("buses") && "¿Cómo creo una salida del Bus Turístico?",
    tiene("migue") && "¿Cómo agrego una pregunta frecuente a Migue?",
    todo && "¿Cómo le doy permisos a alguien?",
    p.rol === "editor" && "¿Por qué no puedo publicar?",
    "¿Por qué algo no se ve en el sitio?",
  ].filter((x): x is string => !!x);
  return lista.slice(0, 4);
}
