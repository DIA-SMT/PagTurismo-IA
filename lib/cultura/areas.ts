/**
 * Las direcciones de Cultura que cargan actividades en la agenda (documento «Página web de Cultura»: «ahí se
 * tienen que cargar todas las actividades de las direcciones»). Cada evento puede decir cuál lo organiza; si no
 * lo dice, se deduce del lugar: un museo municipal es de Museos, un centro cultural de Gestión Cultural y el
 * Palacio de los Deportes, del Palacio. Función pura: se prueba sin base.
 */
import { CENTROS_CULTURALES, MUSEOS_MUNICIPALES } from "./espacios.ts";

export const AREAS = ["turismo", "museos", "gestion-cultural", "palacio-deportes"] as const;
export type Area = (typeof AREAS)[number];

export const esArea = (v: unknown): v is Area => typeof v === "string" && (AREAS as readonly string[]).includes(v);

/** Nombre de cada dirección para el panel (el sitio usa los textos traducidos). */
export const NOMBRE_AREA: Record<Area, string> = {
  turismo: "Dirección de Turismo",
  museos: "Dirección de Museos",
  "gestion-cultural": "Dirección de Gestión Cultural",
  "palacio-deportes": "Palacio de los Deportes",
};

const PALACIO = "palacio-de-los-deportes";

/** La dirección de un evento: la que se cargó o, si falta, la que corresponde a su lugar. */
export function areaDe(evento: { area?: string; lugar?: string }): Area | undefined {
  if (esArea(evento.area)) return evento.area;
  const lugar = evento.lugar ?? "";
  if ((MUSEOS_MUNICIPALES as readonly string[]).includes(lugar)) return "museos";
  if ((CENTROS_CULTURALES as readonly string[]).includes(lugar)) return "gestion-cultural";
  if (lugar === PALACIO) return "palacio-deportes";
  return undefined;
}
