/**
 * Agenda cultural: filtros, calendario mensual y conteos por día.
 *
 * La lógica viene de Agenda Cultural (src/services/events.ts y src/lib/calendar.ts de ese repo),
 * reescrita sobre las fechas del portal (lib/fechas.ts: hora "de pared" de Tucumán). Todo en
 * memoria sobre las ocurrencias vigentes, igual que allá: con cientos de eventos alcanza.
 *
 * Sin dependencias: lo usan el servidor, el navegador y las pruebas.
 */

import { normalizar } from "../buscar.ts";
import {
  aInstante, diaLocal, filtrarPorCuando, finDeOcurrencia, rangoDelDia, rangoFinDeSemana, rangoHoy, seSuperpone, soloDia,
  type Cuando, type OcurrenciaDeEvento,
} from "../fechas.ts";

/** Una fecha de la agenda con lo que hace falta para filtrarla y mostrarla. Viaja al navegador. */
export type OcurrenciaAgenda = OcurrenciaDeEvento & {
  titulo: string;
  url: string;
  resumen?: string;
  /** Nombre del lugar o sede, para mostrar y buscar. */
  lugar?: string;
  /** Ficha del lugar, para filtrar por espacio. */
  lugarSlug?: string;
  rubros: string[];
  gratis: boolean;
  destacado: boolean;
  fueraDeLaCiudad: boolean;
  imagen?: { src: string; alt: string };
};

export type FiltrosAgenda = {
  cuando: Cuando;
  fecha: string;
  q: string;
  rubro: string;
  lugar: string;
  gratis: boolean;
};

export const CUANDOS: Cuando[] = ["proximos", "hoy", "finde", "fecha"];

type Parametros = { get(nombre: string): string | null };

export function leerFiltrosAgenda(p: Parametros): FiltrosAgenda {
  const cuando = p.get("cuando") as Cuando | null;
  return {
    cuando: cuando && CUANDOS.includes(cuando) ? cuando : "proximos",
    fecha: soloDia(p.get("fecha") ?? "") ? p.get("fecha")! : "",
    q: (p.get("q") ?? "").slice(0, 80),
    rubro: p.get("categoria") ?? "",
    lugar: p.get("lugar") ?? "",
    gratis: p.get("gratis") === "1",
  };
}

/** Los filtros como parámetros de la URL (solo los que no están en su valor por defecto). */
export function filtrosAUrl(f: FiltrosAgenda, extra: Record<string, string> = {}): string {
  const p = new URLSearchParams();
  if (f.cuando !== "proximos") p.set("cuando", f.cuando);
  if (f.cuando === "fecha" && f.fecha) p.set("fecha", f.fecha);
  if (f.q.trim()) p.set("q", f.q.trim());
  if (f.rubro) p.set("categoria", f.rubro);
  if (f.lugar) p.set("lugar", f.lugar);
  if (f.gratis) p.set("gratis", "1");
  for (const [k, v] of Object.entries(extra)) if (v) p.set(k, v);
  return p.toString();
}

export const hayFiltrosDeContenido = (f: FiltrosAgenda) => !!(f.q.trim() || f.rubro || f.lugar || f.gratis);

/** Búsqueda sin tildes ni mayúsculas sobre título, resumen y lugar; categoría, lugar y gratuidad. */
export function coincide(o: OcurrenciaAgenda, f: Pick<FiltrosAgenda, "q" | "rubro" | "lugar" | "gratis">): boolean {
  if (f.rubro && !o.rubros.includes(f.rubro)) return false;
  if (f.lugar && o.lugarSlug !== f.lugar) return false;
  if (f.gratis && !o.gratis) return false;
  const q = normalizar(f.q);
  if (q) {
    const texto = normalizar(`${o.titulo} ${o.resumen ?? ""} ${o.lugar ?? ""}`);
    if (!q.split(/\s+/).every((palabra) => texto.includes(palabra))) return false;
  }
  return true;
}

/**
 * Las fechas que se muestran: vigentes según el reloj, filtradas por cuándo y por contenido,
 * con los destacados primero dentro del mismo día.
 */
export function filtrarAgenda(ocurrencias: OcurrenciaAgenda[], f: FiltrosAgenda, ahora: number): OcurrenciaAgenda[] {
  const vigentes = ocurrencias
    .filter((o) => finDeOcurrencia(o) >= ahora)
    .map((o) => ({ ...o, enCurso: aInstante(o.inicio) <= ahora }))
    .filter((o) => coincide(o, f));
  const porCuando = filtrarPorCuando(vigentes, f.cuando, ahora, f.fecha) as OcurrenciaAgenda[];
  // Se ordena por el primer momento que cae dentro del período elegido: una muestra que empezó
  // hace un mes no tapa lo que pasa este fin de semana. Dentro del mismo día, destacados primero.
  const desde = f.cuando === "hoy" ? rangoHoy(ahora)[0]
    : f.cuando === "finde" ? rangoFinDeSemana(ahora)[0]
      : f.cuando === "fecha" && soloDia(f.fecha) ? rangoDelDia(f.fecha)[0]
        : rangoHoy(ahora)[0];
  const clave = (o: OcurrenciaAgenda) => Math.max(aInstante(o.inicio), desde);
  return porCuando.sort((a, b) => {
    const da = diaLocal(clave(a)), db = diaLocal(clave(b));
    if (da !== db) return clave(a) - clave(b);
    if (a.destacado !== b.destacado) return a.destacado ? -1 : 1;
    return clave(a) - clave(b) || a.titulo.localeCompare(b.titulo, "es");
  });
}

/** Opciones de los selectores: solo categorías y lugares que tienen fechas por venir. */
export function opcionesConFechas(ocurrencias: OcurrenciaAgenda[], ahora: number) {
  const rubros = new Set<string>();
  const lugares = new Map<string, string>();
  for (const o of ocurrencias) {
    if (finDeOcurrencia(o) < ahora || o.estado === "cancelado") continue;
    o.rubros.forEach((r) => rubros.add(r));
    if (o.lugarSlug && o.lugar) lugares.set(o.lugarSlug, o.lugar);
  }
  return {
    rubros,
    lugares: [...lugares].map(([slug, titulo]) => ({ slug, titulo })).sort((a, b) => a.titulo.localeCompare(b.titulo, "es")),
  };
}

/* ---- Calendario mensual ---- */

const MES = /^(\d{4})-(\d{2})$/;

export const esMes = (m: string | null | undefined): m is string => !!m && MES.test(m) && +m.slice(5) >= 1 && +m.slice(5) <= 12;

export const mesDe = (dia: string) => dia.slice(0, 7);

export function sumarMeses(mes: string, n: number): string {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function sumarDias(dia: string, n: number): string {
  const [a, m, d] = dia.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d) + n * 86_400_000).toISOString().slice(0, 10);
}

/** Semanas del mes de lunes a domingo; `null` en los huecos antes del 1 y después del último día. */
export function semanasDelMes(mes: string): (string | null)[][] {
  const [a, m] = mes.split("-").map(Number);
  const primero = new Date(Date.UTC(a, m - 1, 1));
  const dias = new Date(Date.UTC(a, m, 0)).getUTCDate();
  const hueco = (primero.getUTCDay() + 6) % 7; // lunes = 0
  const celdas: (string | null)[] = [...Array(hueco).fill(null)];
  for (let d = 1; d <= dias; d++) celdas.push(`${mes}-${String(d).padStart(2, "0")}`);
  while (celdas.length % 7) celdas.push(null);
  const semanas: (string | null)[][] = [];
  for (let i = 0; i < celdas.length; i += 7) semanas.push(celdas.slice(i, i + 7));
  return semanas;
}

export type DiaCalendario = { eventos: number; rubros: string[] };

/**
 * Cuántos eventos distintos hay cada día del mes (una muestra de varios días cuenta en cada día)
 * y sus categorías más frecuentes. Las fechas canceladas no cuentan.
 */
export function contarPorDia(ocurrencias: OcurrenciaAgenda[], mes: string): Map<string, DiaCalendario> {
  const porDia = new Map<string, { eventos: Set<string>; rubros: Map<string, number> }>();
  const inicioMes = `${mes}-01`;
  const finMes = sumarDias(`${sumarMeses(mes, 1)}-01`, -1);
  for (const o of ocurrencias) {
    if (o.estado === "cancelado") continue;
    let dia = o.inicio.slice(0, 10) < inicioMes ? inicioMes : o.inicio.slice(0, 10);
    const ultimo = diaLocal(finDeOcurrencia(o));
    // Tope de seguridad: una exposición de varios meses no recorre más de 62 días por mes.
    for (let i = 0; dia <= ultimo && dia <= finMes && i < 62; i++, dia = sumarDias(dia, 1)) {
      if (!seSuperpone(o, rangoDelDia(dia))) continue;
      const d = porDia.get(dia) ?? { eventos: new Set(), rubros: new Map() };
      d.eventos.add(o.evento);
      o.rubros.forEach((r) => d.rubros.set(r, (d.rubros.get(r) ?? 0) + 1));
      porDia.set(dia, d);
    }
  }
  return new Map([...porDia].map(([dia, d]) => [dia, {
    eventos: d.eventos.size,
    rubros: [...d.rubros].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([r]) => r),
  }]));
}

/** Intensidad del día para el calendario: 0 sin eventos, 1 a 3 según la cantidad. */
export function intensidad(eventos: number): 0 | 1 | 2 | 3 {
  return eventos <= 0 ? 0 : eventos <= 2 ? 1 : eventos <= 5 ? 2 : 3;
}

/* ---- Portada y cabecera de la agenda (de Agenda Cultural: semana, categorías populares, destacados) ---- */

export type DiaSemana = { dia: string; eventos: number; rubros: string[] };

/** Los próximos `n` días desde `hoy` con cuántas actividades distintas tiene cada uno. */
export function proximosDias(ocurrencias: OcurrenciaAgenda[], hoy: string, n = 7): DiaSemana[] {
  const dias = Array.from({ length: n }, (_, i) => sumarDias(hoy, i));
  const conteos = new Map<string, DiaCalendario>();
  for (const mes of new Set(dias.map(mesDe))) for (const [d, v] of contarPorDia(ocurrencias, mes)) conteos.set(d, v);
  return dias.map((dia) => ({ dia, eventos: conteos.get(dia)?.eventos ?? 0, rubros: conteos.get(dia)?.rubros ?? [] }));
}

/**
 * Las categorías con más eventos por venir (eventos distintos, sin contar fechas canceladas). Así
 * ningún acceso de la portada lleva a una agenda vacía.
 */
export function categoriasPopulares(ocurrencias: OcurrenciaAgenda[], ahora: number, max = 6): { id: string; eventos: number }[] {
  const porRubro = new Map<string, Set<string>>();
  for (const o of ocurrencias) {
    if (o.estado === "cancelado" || finDeOcurrencia(o) < ahora) continue;
    for (const r of o.rubros) (porRubro.get(r) ?? porRubro.set(r, new Set()).get(r)!).add(o.evento);
  }
  return [...porRubro].map(([id, eventos]) => ({ id, eventos: eventos.size }))
    .sort((a, b) => b.eventos - a.eventos || a.id.localeCompare(b.id)).slice(0, max);
}

/** Una fecha por evento, la próxima confirmada; los destacados primero y después por cercanía. */
export function proximosEventos(ocurrencias: OcurrenciaAgenda[], ahora: number, max = 3): OcurrenciaAgenda[] {
  const vistos = new Set<string>();
  return ocurrencias
    .filter((o) => (o.estado === "confirmado" || o.estado === "reprogramado") && finDeOcurrencia(o) >= ahora)
    .sort((a, b) => Number(b.destacado) - Number(a.destacado) || aInstante(a.inicio) - aInstante(b.inicio))
    .filter((o) => !vistos.has(o.evento) && !!vistos.add(o.evento))
    .slice(0, max);
}
