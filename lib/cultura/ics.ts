/**
 * Archivo .ics (RFC 5545) con TODAS las fechas vigentes de un evento. Agenda Cultural exportaba
 * solo la primera; el portal armaba una por fecha. Las canceladas van con STATUS:CANCELLED para
 * que el calendario de quien ya la había agregado se actualice. Sin dependencias.
 */

import { aInstante, esFechaValida, finDeOcurrencia, soloDia } from "../fechas.ts";
import type { Ocurrencia } from "../tipos";

const utc = (instante: number) => new Date(instante).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export const escaparIcs = (t: string) =>
  t.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Pliega líneas largas a 75 octetos (RFC 5545 §3.1), sin cortar caracteres UTF-8 al medio. */
export function plegar(linea: string): string {
  const partes: string[] = [];
  let actual = "";
  let bytes = 0;
  for (const c of linea) {
    const n = Buffer.byteLength(c);
    if (bytes + n > (partes.length ? 74 : 75)) {
      partes.push(actual);
      actual = "";
      bytes = 0;
    }
    actual += c;
    bytes += n;
  }
  partes.push(actual);
  return partes.join("\r\n ");
}

const ESTADO: Record<Ocurrencia["estado"], string> = {
  confirmado: "CONFIRMED", reprogramado: "CONFIRMED", suspendido: "TENTATIVE", cancelado: "CANCELLED",
};

export function icsDeEvento(e: {
  slug: string; titulo: string; resumen: string; url: string; lugar?: string; ocurrencias: Ocurrencia[];
}, ahora = Date.now()): string {
  const sello = utc(ahora);
  const eventos = e.ocurrencias
    .filter((o) => esFechaValida(o.inicio) && finDeOcurrencia(o) >= ahora)
    .flatMap((o) => {
      const todoElDia = soloDia(o.inicio);
      const dtstart = todoElDia ? `DTSTART;VALUE=DATE:${o.inicio.replace(/-/g, "")}` : `DTSTART:${utc(aInstante(o.inicio))}`;
      let dtend: string;
      if (todoElDia) {
        // DTEND de un día completo es exclusivo: el día siguiente al último.
        const ultimo = o.fin && soloDia(o.fin) ? o.fin : o.inicio;
        const [a, m, d] = ultimo.split("-").map(Number);
        dtend = `DTEND;VALUE=DATE:${new Date(Date.UTC(a, m - 1, d + 1)).toISOString().slice(0, 10).replace(/-/g, "")}`;
      } else {
        const fin = o.fin && esFechaValida(o.fin) ? aInstante(o.fin) : aInstante(o.inicio) + 2 * 3_600_000;
        dtend = `DTEND:${utc(fin)}`;
      }
      return [
        "BEGIN:VEVENT",
        `UID:${e.slug}-${o.inicio.replace(/[-:T]/g, "")}@turismo.smt.gob.ar`,
        `DTSTAMP:${sello}`, dtstart, dtend,
        `SUMMARY:${escaparIcs(e.titulo)}`,
        `STATUS:${ESTADO[o.estado]}`,
        ...(o.sede || e.lugar ? [`LOCATION:${escaparIcs(o.sede || e.lugar!)}`] : []),
        `DESCRIPTION:${escaparIcs([e.resumen, o.nota].filter(Boolean).join("\n\n"))}`,
        `URL:${e.url}`,
        "END:VEVENT",
      ];
    });
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Municipalidad de San Miguel de Tucuman//Agenda//ES",
    "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    ...eventos,
    "END:VCALENDAR",
  ].map(plegar).join("\r\n") + "\r\n";
}
