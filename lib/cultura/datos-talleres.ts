/**
 * Los talleres anuales publicados en el portal (datos/cultura/talleres.json, que arma
 * `npm run cultura -- talleres --desde-planilla …`) y los datos de cada centro para inscribirse
 * (datos/cultura/espacios-culturales.json, relevados de la Agenda Cultural).
 */
import espacios from "@/datos/cultura/espacios-culturales.json";
import archivo from "@/datos/cultura/talleres.json";

import type { ArchivoTalleres } from "./talleres";

export const TALLERES = archivo as ArchivoTalleres;

export type CentroTalleres = { slug: string; nombre: string; direccion?: string; horario?: string; telefono?: string };

type Espacio = { slug: string; name: string; address?: string | null; phone?: string | null; opening_hours?: string[] | { lineas?: string[] } | null };

export const CENTROS_TALLERES: CentroTalleres[] = [...new Set(TALLERES.talleres.map((t) => t.centro))].map((slug) => {
  const e = (espacios.espacios as Espacio[]).find((x) => x.slug === slug);
  const horario = Array.isArray(e?.opening_hours) ? e.opening_hours.join(" · ") : e?.opening_hours?.lineas?.join(" · ");
  return { slug, nombre: e?.name ?? slug, direccion: e?.address ?? undefined, horario: horario || undefined, telefono: e?.phone ?? undefined };
});
