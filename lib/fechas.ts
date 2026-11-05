/**
 * Fechas de la agenda, siempre en hora de Tucumán.
 *
 * El contenido guarda la hora "de pared" local (`2026-11-07T21:00` o
 * `2026-11-07` si dura todo el día) y acá se convierte a instantes reales
 * con la zona America/Argentina/Tucuman. Así "Hoy" y "Fin de semana" se
 * calculan igual en el servidor (que corre en UTC) y en el navegador de
 * alguien que mira la agenda desde otro país.
 *
 * Sin dependencias: lo usan el servidor, el navegador y las pruebas.
 */

import type { Evento, Ocurrencia } from "./tipos";

export const ZONA = "America/Argentina/Tucuman";

const DIA_MS = 86_400_000;
const FORMATO = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/;

const partesZona = new Intl.DateTimeFormat("en-US", {
  timeZone: ZONA,
  hourCycle: "h23",
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit",
});

/** Cuántos milisegundos está la zona adelante de UTC en ese instante. */
function desfase(instante: number): number {
  const p = Object.fromEntries(partesZona.formatToParts(new Date(instante)).map((x) => [x.type, x.value]));
  const comoUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return comoUtc - Math.floor(instante / 1000) * 1000;
}

export function esFechaValida(texto: string | undefined): boolean {
  return !!texto && FORMATO.test(texto);
}

export function soloDia(texto: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(texto);
}

/** Convierte una hora local de Tucumán en un instante (ms desde 1970). */
export function aInstante(local: string): number {
  const m = FORMATO.exec(local);
  if (!m) throw new Error(`Fecha con formato inválido: "${local}"`);
  const [, a, me, d, h = "0", mi = "0"] = m;
  const pared = Date.UTC(+a, +me - 1, +d, +h, +mi);
  // Dos pasadas alcanzan aunque la zona vuelva a tener horario de verano.
  let instante = pared - desfase(pared);
  instante = pared - desfase(instante);
  return instante;
}

/** Fecha local `AAAA-MM-DD` del instante, en Tucumán. */
export function diaLocal(instante: number): string {
  const p = Object.fromEntries(partesZona.formatToParts(new Date(instante)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

/** 0 = domingo … 6 = sábado, en Tucumán. */
export function diaDeSemana(instante: number): number {
  const [a, m, d] = diaLocal(instante).split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
}

function sumarDias(dia: string, n: number): string {
  const [a, m, d] = dia.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d) + n * DIA_MS).toISOString().slice(0, 10);
}

/** Rango [inicio, fin] de un día local completo. */
export function rangoDelDia(dia: string): [number, number] {
  return [aInstante(dia), aInstante(sumarDias(dia, 1)) - 1];
}

export function rangoHoy(ahora: number): [number, number] {
  return rangoDelDia(diaLocal(ahora));
}

/**
 * Sábado y domingo. De lunes a viernes, el que viene; el sábado y el domingo,
 * el que está en curso.
 */
export function rangoFinDeSemana(ahora: number): [number, number] {
  const hoy = diaLocal(ahora);
  const dds = diaDeSemana(ahora);
  const sabado = dds === 6 ? hoy : dds === 0 ? sumarDias(hoy, -1) : sumarDias(hoy, 6 - dds);
  return [rangoDelDia(sabado)[0], rangoDelDia(sumarDias(sabado, 1))[1]];
}

/**
 * Cuándo termina una ocurrencia. Si no tiene fin, se la da por vigente hasta
 * el final de su día: un espectáculo de las 22 sin hora de cierre sigue
 * apareciendo en "Hoy" hasta la medianoche, no desaparece a las 22:01.
 */
export function finDeOcurrencia(o: Pick<Ocurrencia, "inicio" | "fin">): number {
  if (o.fin && esFechaValida(o.fin)) {
    return soloDia(o.fin) ? rangoDelDia(o.fin)[1] : aInstante(o.fin);
  }
  return rangoDelDia(o.inicio.slice(0, 10))[1];
}

export function seSuperpone(o: Pick<Ocurrencia, "inicio" | "fin">, [desde, hasta]: [number, number]): boolean {
  return aInstante(o.inicio) <= hasta && finDeOcurrencia(o) >= desde;
}

export type OcurrenciaDeEvento = {
  evento: string;
  inicio: string;
  fin?: string;
  estado: Ocurrencia["estado"];
  sede?: string;
  nota?: string;
  /** Ya empezó y todavía no terminó. */
  enCurso: boolean;
};

/**
 * Las ocurrencias que todavía no terminaron, ordenadas por inicio. Las
 * canceladas o suspendidas siguen en la lista (con su estado) para que quien
 * las buscaba se entere; las que tienen fecha mal cargada se descartan.
 */
export function ocurrenciasVigentes(eventos: Pick<Evento, "slug" | "ocurrencias">[], ahora: number): OcurrenciaDeEvento[] {
  const lista: OcurrenciaDeEvento[] = [];
  for (const e of eventos) {
    for (const o of e.ocurrencias) {
      if (!esFechaValida(o.inicio)) continue;
      const fin = finDeOcurrencia(o);
      if (fin < ahora) continue;
      lista.push({ ...o, evento: e.slug, enCurso: aInstante(o.inicio) <= ahora });
    }
  }
  return lista.sort((a, b) => aInstante(a.inicio) - aInstante(b.inicio));
}

/** Las que se pueden destacar: confirmadas o reprogramadas, nunca canceladas. */
export function destacables(lista: OcurrenciaDeEvento[]): OcurrenciaDeEvento[] {
  return lista.filter((o) => o.estado === "confirmado" || o.estado === "reprogramado");
}

export type Cuando = "proximos" | "hoy" | "finde" | "fecha";

export function filtrarPorCuando(lista: OcurrenciaDeEvento[], cuando: Cuando, ahora: number, fecha?: string): OcurrenciaDeEvento[] {
  if (cuando === "hoy") return lista.filter((o) => seSuperpone(o, rangoHoy(ahora)));
  if (cuando === "finde") return lista.filter((o) => seSuperpone(o, rangoFinDeSemana(ahora)));
  if (cuando === "fecha" && fecha && soloDia(fecha)) return lista.filter((o) => seSuperpone(o, rangoDelDia(fecha)));
  return lista;
}

/** ¿Está publicado hoy? Para la ventana de los destacados (`desde`/`hasta`, días locales). */
export function dentroDeVentana(desde: string | undefined, hasta: string | undefined, ahora: number): boolean {
  const hoy = diaLocal(ahora);
  if (desde && soloDia(desde) && hoy < desde) return false;
  if (hasta && soloDia(hasta) && hoy > hasta) return false;
  return true;
}

/* ---- Formato ---- */

const fmtDia = new Intl.DateTimeFormat("es-AR", { timeZone: ZONA, weekday: "long", day: "numeric", month: "long", year: "numeric" });
const fmtHora = new Intl.DateTimeFormat("es-AR", { timeZone: ZONA, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const fmtMesCorto = new Intl.DateTimeFormat("es-AR", { timeZone: ZONA, month: "short" });
const fmtDiaNumero = new Intl.DateTimeFormat("es-AR", { timeZone: ZONA, day: "numeric" });

/** "sábado, 7 de noviembre de 2026 · 21:00 h" */
export function formatearOcurrencia(o: Pick<Ocurrencia, "inicio" | "fin">): string {
  const inicio = aInstante(o.inicio);
  let texto = fmtDia.format(inicio);
  if (!soloDia(o.inicio)) texto += ` · ${fmtHora.format(inicio)} h`;
  if (o.fin && esFechaValida(o.fin)) {
    const fin = aInstante(o.fin);
    const mismoDia = diaLocal(fin) === diaLocal(inicio);
    if (mismoDia && !soloDia(o.fin)) texto += ` a ${fmtHora.format(fin)} h`;
    else if (!mismoDia) texto += ` al ${fmtDia.format(fin)}${soloDia(o.fin) ? "" : ` · ${fmtHora.format(fin)} h`}`;
  }
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function partesDeFecha(local: string): { dia: string; mes: string } {
  const i = aInstante(local);
  return { dia: fmtDiaNumero.format(i), mes: fmtMesCorto.format(i).replace(".", "").toUpperCase() };
}

export const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
