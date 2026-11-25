/**
 * Lo que lee Migue, el asistente de la Municipalidad, para atender a los turistas desde el chat
 * del sitio (GET /api/migue/contenido).
 *
 * Es el mismo contenido que se ve en el sitio, pasado a texto: una entrada por ficha con su
 * dirección dentro del sitio, y un bloque general (contacto, emergencias, temas, historia).
 * Migue no conoce el esquema de la base: lee este texto, contesta con él y solo puede ofrecer
 * botones hacia las direcciones que figuran acá.
 *
 * Solo va lo publicado: la ruta lee como visitante aunque quien pida tenga sesión en el panel.
 * Así Migue no anuncia un lugar que el equipo todavía no confirmó.
 */

import type { Contenido } from "./datos";
import { aInstante, formatearOcurrencia, MESES, ocurrenciasVigentes } from "./fechas.ts";
import { rutas } from "./rutas.ts";
import type { Costo, DatoConfirmable } from "./tipos";
import type { Taller } from "./cultura/talleres.ts";

export type FichaMigue = { tipo: string; titulo: string; url: string; texto: string };

export type ContenidoMigue = {
  version: 1;
  generado: string;
  general: string;
  fichas: FichaMigue[];
};

/** Páginas generales del sitio, que Migue también puede ofrecer como botón. */
export const PAGINAS_GENERALES: FichaMigue[] = [
  { tipo: "página", titulo: "Qué hacer", url: "/que-hacer", texto: "Catálogo de todo lo que se puede hacer, con búsqueda y filtros por tema, tipo y gratuidad." },
  { tipo: "página", titulo: "Descubrí", url: "/descubri", texto: "Imperdibles, itinerarios por tiempo disponible, temas e historia de la ciudad." },
  { tipo: "página", titulo: "Agenda", url: "/agenda", texto: "Eventos y fechas, con filtro por hoy, fin de semana o una fecha." },
  { tipo: "página", titulo: "Recorridos", url: "/recorridos", texto: "Circuitos del Bus Turístico, a pie e itinerarios sugeridos." },
  { tipo: "página", titulo: "Sabores", url: "/sabores", texto: "Comidas típicas tucumanas." },
  { tipo: "página", titulo: "Escapadas", url: "/escapadas", texto: "Paseos cerca de la ciudad." },
  { tipo: "página", titulo: "Planificá tu viaje", url: "/planifica", texto: "Cómo llegar, cómo moverse, accesibilidad, datos útiles y dónde dormir." },
  { tipo: "página", titulo: "Lugares y espacios", url: "/lugares", texto: "Museos, teatros, centros culturales, plazas y parques, con su ficha, horarios y mapa." },
  { tipo: "página", titulo: "Bus Turístico", url: "/bus-turistico", texto: "Circuitos del Bus Turístico, próximas salidas con cupos y reserva gratuita en línea." },
  { tipo: "página", titulo: "Bus Educativo", url: "/bus-educativo", texto: "Turnos para que escuelas e instituciones recorran la ciudad en el Bus Educativo. Se pide con un formulario." },
  { tipo: "página", titulo: "Fotos de los recorridos", url: "/galeria", texto: "Fotos de cada salida del Bus Turístico, disponibles durante 7 días." },
];

/** Eventos de la agenda que Migue conoce: con fechas en los próximos 120 días o que se repiten cada año. */
const DIAS_AGENDA_MIGUE = 120;
const MAX_FECHAS_POR_EVENTO = 6;

const COSTO: Record<Costo["modalidad"], string> = { gratis: "Gratis", pago: "Pago", consultar: "Consultar antes de ir" };
const MODALIDAD: Record<string, string> = { "a-pie": "a pie", bus: "en bus", bicicleta: "en bicicleta", libre: "paseo libre", mixto: "mixto" };
const ESTADO_FECHA: Record<string, string> = { cancelado: "CANCELADO", suspendido: "SUSPENDIDO", reprogramado: "reprogramado" };

const limpio = (t: unknown) => String(t ?? "").replace(/\s+/g, " ").trim();
const linea = (etiqueta: string, valor: unknown) => (limpio(valor) ? `${etiqueta}: ${limpio(valor)}` : "");
const costo = (c: Costo) => [COSTO[c.modalidad] ?? "Consultar antes de ir", limpio(c.detalle)].filter(Boolean).join(" — ");
const horario = (h?: DatoConfirmable) =>
  limpio(h?.texto) ? `${limpio(h?.texto)}${h?.confirmado ? "" : " (dato a confirmar)"}` : "";
const unir = (lineas: string[]) => lineas.filter(Boolean).join("\n");

/** El contenido visible del sitio, en texto para Migue. Función pura: se prueba sin base. */
export function paraMigue(c: Contenido, ahora = Date.now()): ContenidoMigue {
  const temas = new Map(c.categorias.map((k) => [k.id, k.titulo]));
  const etiquetas = new Map(c.etiquetas.map((e) => [e.id, e.titulo]));
  const lugares = new Map(c.lugares.map((l) => [l.slug, l]));
  const nombresTemas = (ids: string[]) => ids.map((id) => temas.get(id)).filter(Boolean).join(", ");
  const nombresEtiquetas = (ids: string[]) => ids.map((id) => etiquetas.get(id) ?? id).join(", ");
  const nombreLugar = (slug?: string) => (slug ? lugares.get(slug)?.titulo : undefined);
  const vigentes = ocurrenciasVigentes(c.eventos, ahora);

  const fichas: FichaMigue[] = [
    ...c.lugares.map((l) => ({
      tipo: "lugar", titulo: l.titulo, url: rutas.lugar(l.slug),
      texto: unir([
        limpio(l.resumen), linea("Por qué ir", l.porQueIr), linea("Descripción", l.descripcion),
        linea("Tipo", l.clase), linea("Zona", l.zona), linea("Dirección", l.direccion),
        linea("Horario", horario(l.horario)), linea("Costo", costo(l.costo)), linea("Tiempo de visita", l.duracion),
        linea("Teléfono", l.contacto?.telefono), linea("Correo", l.contacto?.email), linea("Web", l.contacto?.web),
        linea("Accesibilidad", l.accesibilidad), l.imperdible ? "Es uno de los imperdibles de la ciudad." : "",
        l.tipoEspacio ? linea("Espacio", l.tipoEspacio === "cultural" ? "espacio cultural de la agenda" : "espacio al aire libre") : "",
        linea("Servicios", l.servicios.join(", ")), linea("Venta de entradas", l.redes.entradas),
        linea("Temas", nombresTemas(l.categorias)), linea("Etiquetas", nombresEtiquetas(l.etiquetas)),
      ]),
    })),
    ...c.experiencias.map((e) => {
      const salidas = e.salidas
        .filter((s) => s.estado !== "cancelada")
        .map((s) => `${formatearOcurrencia(s)}${s.estado !== "programada" ? ` (${s.estado})` : ""}${s.nota ? ` — ${limpio(s.nota)}` : ""}`);
      return {
        tipo: "experiencia", titulo: e.titulo, url: rutas.experiencia(e.slug),
        texto: unir([
          limpio(e.resumen), linea("Descripción", e.descripcion),
          linea("Modalidad", `${MODALIDAD[e.modalidad] ?? e.modalidad}${e.guiada ? ", guiada" : ""}`),
          linea("Duración", e.duracion), linea("Horario", horario(e.horario)), linea("Punto de encuentro", e.puntoEncuentro),
          linea("Lugares que visita", e.lugares.map(nombreLugar).filter(Boolean).join(", ")),
          linea("Incluye", e.incluye), linea("Requisitos", e.requisitos), linea("Si llueve", e.politicaClima),
          linea("Lo organiza", e.operador), linea("Costo", costo(e.costo)),
          e.accion.url ? `${limpio(e.accion.texto)}: ${e.accion.url}` : linea("Cómo participar", e.accion.texto),
          linea("Próximas salidas confirmadas", salidas.join("; ")),
          linea("Temas", nombresTemas(e.categorias)), linea("Etiquetas", nombresEtiquetas(e.etiquetas)),
        ]),
      };
    }),
    ...c.recorridos.map((r) => ({
      tipo: r.tipo === "itinerario" ? "itinerario sugerido" : "circuito", titulo: r.titulo, url: rutas.recorrido(r.slug),
      texto: unir([
        limpio(r.resumen), linea("Descripción", r.descripcion),
        linea("Modalidad", `${MODALIDAD[r.modalidad] ?? r.modalidad}${r.guiado ? ", guiado" : ""}`),
        linea("Duración", r.duracion), linea("Distancia", r.distancia), linea("Esfuerzo", r.esfuerzo),
        linea("Empieza en", r.inicio), linea("Termina en", r.fin),
        linea("Paradas", r.paradas.map((p) => `${p.dia ? `día ${p.dia}: ` : ""}${nombreLugar(p.lugar) ?? p.nombre}${p.nota ? ` (${limpio(p.nota)})` : ""}`).join("; ")),
        linea("Condiciones", r.condiciones), linea("Aviso", r.aviso),
        linea("Temas", nombresTemas(r.categorias)),
      ]),
    })),
    ...c.eventos.filter((e) => e.recurrente || vigentes.some((o) => o.evento === e.slug && aInstante(o.inicio) <= ahora + DIAS_AGENDA_MIGUE * 86_400_000)).map((e) => {
      const fechas = vigentes
        .filter((o) => o.evento === e.slug && aInstante(o.inicio) <= ahora + DIAS_AGENDA_MIGUE * 86_400_000)
        .slice(0, MAX_FECHAS_POR_EVENTO)
        .map((o) => `${formatearOcurrencia(o)}${ESTADO_FECHA[o.estado] ? ` (${ESTADO_FECHA[o.estado]})` : ""}${o.sede ? ` en ${limpio(o.sede)}` : ""}${o.nota ? ` — ${limpio(o.nota)}` : ""}`);
      const anual = e.recurrente ? `todos los años, ${e.recurrente.dia ? `el ${e.recurrente.dia} de ` : "en "}${MESES[e.recurrente.mes - 1] ?? ""}` : "";
      return {
        tipo: "evento", titulo: e.titulo, url: rutas.evento(e.slug),
        texto: unir([
          limpio(e.resumen), linea("Descripción", limpio(e.descripcion).slice(0, 700)),
          linea("Categorías", e.rubros.map((r) => c.categoriasAgenda.find((k) => k.id === r)?.titulo).filter(Boolean).join(", ")),
          linea("Próximas fechas", fechas.join("; ") || (anual ? "" : "sin fechas confirmadas por ahora")),
          linea("Fecha", anual), linea("Dónde", nombreLugar(e.lugar) ?? e.sede),
          e.fueraDeLaCiudad ? linea("Fuera de la ciudad", e.localidad || "sí") : "",
          linea("Organiza", e.organizador), linea("Costo", costo(e.costo)), linea("Inscripción", e.inscripcion),
          linea("Sitio oficial", e.urlOficial), linea("Entradas", e.entradas), linea("Accesibilidad", e.accesibilidad),
          linea("Temas", nombresTemas(e.categorias)),
        ]),
      };
    }),
    ...c.guias.map((g) => ({
      tipo: "guía para planificar", titulo: g.titulo, url: rutas.guia(g.slug),
      texto: unir([
        limpio(g.resumen),
        ...g.secciones.map((s) => linea(limpio(s.titulo) || "Detalle", s.texto)),
        linea("Enlaces", g.enlaces.map((e) => `${limpio(e.texto)}: ${e.url}`).join("; ")),
      ]),
    })),
    ...c.platos.map((p) => ({ tipo: "sabor típico", titulo: p.titulo, url: "/sabores", texto: limpio(p.detalle) })),
    ...c.escapadas.map((e) => ({
      tipo: "escapada", titulo: e.titulo, url: "/escapadas",
      texto: unir([limpio(e.detalle), linea("Dónde", e.localidad), linea("Distancia", e.distancia), linea("Más información", e.url)]),
    })),
    ...PAGINAS_GENERALES,
  ];

  const s = c.sitio;
  const general = unir([
    `Oficina de turismo: ${unir([s.turismo.area, linea("Domicilio", s.turismo.domicilio), linea("Correo", s.turismo.email), linea("Atención", s.turismo.atencion)]).replace(/\n/g, " · ")}`,
    linea("Municipalidad", [s.municipalidad.direccion, s.municipalidad.telefono].filter(Boolean).join(" · ")),
    linea("Teléfonos de emergencia", s.emergencias.map((e) => `${e.nombre} ${e.numero}`).join(", ")),
    linea("Redes de la Municipalidad", s.redes.map((r) => `${r.titulo} ${r.url}`).join(", ")),
    linea("Historia de la ciudad", s.historia.map((h) => `${h.anio}, ${limpio(h.titulo)}: ${limpio(h.detalle)}`).join(" | ")),
  ]);

  // Los temas también son páginas a las que Migue puede llevar.
  for (const k of c.categorias) {
    fichas.push({ tipo: "tema", titulo: k.titulo, url: rutas.categoria(k.id), texto: limpio(k.detalle) });
  }

  return { version: 1, generado: new Date(ahora).toISOString(), general, fichas };
}

/* ---- Bus Turístico ---- */

export type CircuitoMigue = { slug: string; nombre: string; modalidad: string; horario?: string | null; duracion?: string | null; resumen?: string | null };
export type SalidaMigue = { circuito: string | null; titulo: string; fecha: string; hora: string; cupo: number; reservadas: number; punto?: string | null; bicis?: number | null; bicisReservadas?: number };

const MODALIDAD_BUS: Record<string, string> = { bus: "en bus", walking: "a pie, guiado", bike: "en bicicleta" };

/**
 * Circuitos y próximas salidas del Bus Turístico, con los cupos que tiene la base EN ESTE MOMENTO.
 * Solo cantidades: nunca nombres, correos ni teléfonos de quienes reservaron. Migue no reserva:
 * ofrece la página /bus-turistico, que es la única que escribe reservas.
 */
export function fichasDelBus(circuitos: CircuitoMigue[], salidas: SalidaMigue[], ahora = Date.now()): FichaMigue[] {
  const sello = new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Tucuman", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(ahora);
  const fecha = (s: SalidaMigue) =>
    `${new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${s.fecha}T12:00:00Z`))} a las ${s.hora.slice(0, 5)} h`;
  const cupo = (s: SalidaMigue) => {
    const libres = Math.max(0, s.cupo - s.reservadas);
    const bicis = s.bicis != null ? `, ${Math.max(0, s.bicis - (s.bicisReservadas ?? 0))} bicis municipales libres` : "";
    return libres ? `${libres} lugares libres${bicis}` : "SIN LUGAR";
  };
  return circuitos.map((k) => {
    const propias = salidas.filter((s) => s.circuito === k.slug).slice(0, 8);
    return {
      tipo: "circuito del Bus Turístico", titulo: k.nombre, url: "/bus-turistico",
      texto: unir([
        limpio(k.resumen), linea("Modalidad", MODALIDAD_BUS[k.modalidad] ?? k.modalidad), linea("Horario habitual", k.horario), linea("Duración", k.duracion),
        "Es gratuito con reserva previa en el portal (/bus-turistico). Migue no puede reservar: indicá la página.",
        propias.length
          ? linea(`Próximas salidas (cupos al ${sello})`, propias.map((s) => `${fecha(s)}: ${cupo(s)}${s.punto ? `, sale de ${limpio(s.punto)}` : ""}`).join("; "))
          : "No hay salidas publicadas en los próximos días para este circuito.",
      ]),
    };
  });
}

const DIA_TALLER = ["", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/**
 * Los talleres anuales de cada centro cultural, en una ficha por centro: qué talleres hay, qué días y a qué
 * hora, y cómo inscribirse. Así Migue contesta «¿hay tango los sábados?» sin inventar horarios.
 */
export function fichasDeTalleres(
  talleres: Pick<Taller, "titulo" | "detalle" | "centro" | "horarios" | "paraChicos">[],
  centros: { slug: string; nombre: string; direccion?: string; horario?: string; telefono?: string }[],
): FichaMigue[] {
  return centros.map((k) => {
    const propios = talleres.filter((t) => t.centro === k.slug);
    const lineas = propios.map((t) => {
      const horarios = t.horarios.map((h) => `${DIA_TALLER[h.dia]} ${h.desde}${h.hasta ? ` a ${h.hasta}` : ""}${h.nota ? ` (${h.nota.toLowerCase()})` : ""}`).join(", ");
      return `${t.titulo}${t.detalle ? ` (${t.detalle})` : ""}: ${horarios}`;
    });
    return {
      tipo: "talleres de un centro cultural",
      titulo: `Talleres en ${k.nombre}`,
      url: `/talleres?centro=${k.slug}`,
      texto: unir([
        `Talleres anuales 2026 (clases semanales todo el año) en ${k.nombre}.`,
        linea("Dirección", k.direccion), linea("Atención", k.horario), linea("Teléfono", k.telefono ? `(0381) ${k.telefono}` : ""),
        "Inscripción: personal, en el centro cultural. Cupos, requisitos y costo: consultar en el centro.",
        ...lineas,
      ]),
    };
  });
}
