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
import { formatearOcurrencia, MESES, ocurrenciasVigentes } from "./fechas.ts";
import { rutas } from "./rutas.ts";
import type { Costo, DatoConfirmable } from "./tipos";

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
];

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
    ...c.eventos.map((e) => {
      const fechas = vigentes
        .filter((o) => o.evento === e.slug)
        .map((o) => `${formatearOcurrencia(o)}${ESTADO_FECHA[o.estado] ? ` (${ESTADO_FECHA[o.estado]})` : ""}${o.sede ? ` en ${limpio(o.sede)}` : ""}${o.nota ? ` — ${limpio(o.nota)}` : ""}`);
      const anual = e.recurrente ? `todos los años, ${e.recurrente.dia ? `el ${e.recurrente.dia} de ` : "en "}${MESES[e.recurrente.mes - 1] ?? ""}` : "";
      return {
        tipo: "evento", titulo: e.titulo, url: rutas.evento(e.slug),
        texto: unir([
          limpio(e.resumen), linea("Descripción", e.descripcion),
          linea("Próximas fechas", fechas.join("; ") || (anual ? "" : "sin fechas confirmadas por ahora")),
          linea("Fecha", anual), linea("Dónde", nombreLugar(e.lugar) ?? e.sede),
          e.fueraDeLaCiudad ? linea("Fuera de la ciudad", e.localidad || "sí") : "",
          linea("Organiza", e.organizador), linea("Costo", costo(e.costo)), linea("Inscripción", e.inscripcion),
          linea("Sitio oficial", e.urlOficial), linea("Temas", nombresTemas(e.categorias)),
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
