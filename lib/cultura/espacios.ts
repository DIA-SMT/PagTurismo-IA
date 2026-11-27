/**
 * Museos y centros culturales: qué lugares son cada cosa y lo que se muestra de ellos (actividades próximas,
 * talleres). Funciones puras: se prueban sin base.
 *
 * Según el documento «Página web de Cultura», Cultura reúne a la Dirección de Museos (los cuatro museos
 * municipales) y a la Dirección de Gestión Cultural (los cuatro centros culturales, donde se dictan los
 * talleres). Esas dos listas son fijas; los demás museos de la ciudad se reconocen por su clase.
 */
import type { OcurrenciaAgenda } from "./agenda.ts";
import type { Taller } from "./talleres.ts";

/** Dirección de Museos: los museos de la Municipalidad, en el orden del documento. */
export const MUSEOS_MUNICIPALES = [
  "casa-museo-de-la-ciudad",
  "casa-natal-mercedes-sosa",
  "museo-industria-azucarera",
  "casa-belgraniana",
] as const;

/** Dirección de Gestión Cultural: los centros culturales (los mismos de la planilla de talleres). */
export const CENTROS_CULTURALES = [
  "casa-de-la-cultura",
  "centro-cultural-mercedes-sosa",
  "centro-cultural-don-bosco",
  "casa-del-bicentenario",
] as const;

type LugarMinimo = { slug: string; clase: string };

const enLista = (lista: readonly string[], slug: string) => lista.includes(slug);
/** «museo», «museum», «museu», «museo al aire libre»…: la clase viene traducida. */
const CLASE_MUSEO = /muse/i;

export const esMuseoMunicipal = (l: LugarMinimo) => enLista(MUSEOS_MUNICIPALES, l.slug);
export const esMuseo = (l: LugarMinimo) => esMuseoMunicipal(l) || CLASE_MUSEO.test(l.clase);
export const esCentroCultural = (l: LugarMinimo) => enLista(CENTROS_CULTURALES, l.slug);

/** Los lugares en el orden de la lista (los que falten o no estén publicados, se saltean). */
export function enOrden<T extends { slug: string }>(lugares: T[], orden: readonly string[]): T[] {
  const porSlug = new Map(lugares.map((l) => [l.slug, l]));
  return orden.map((s) => porSlug.get(s)).filter((l): l is T => !!l);
}

/** Museos para la página: primero los municipales (en su orden) y después los demás, por nombre. */
export function museosDe<T extends LugarMinimo & { titulo: string }>(lugares: T[]): { municipales: T[]; otros: T[] } {
  return {
    municipales: enOrden(lugares, MUSEOS_MUNICIPALES),
    otros: lugares.filter((l) => esMuseo(l) && !esMuseoMunicipal(l)).sort((a, b) => a.titulo.localeCompare(b.titulo, "es")),
  };
}

/** Las próximas fechas de la agenda en esos lugares (ya vienen vigentes y ordenadas). */
export function actividadesEn(ocurrencias: OcurrenciaAgenda[], slugs: Iterable<string>): OcurrenciaAgenda[] {
  const lugares = new Set(slugs);
  return ocurrencias.filter((o) => o.lugarSlug && lugares.has(o.lugarSlug));
}

/** Cuántas próximas fechas tiene cada lugar. */
export function actividadesPorLugar(ocurrencias: OcurrenciaAgenda[]): Map<string, number> {
  const cuenta = new Map<string, number>();
  for (const o of ocurrencias) if (o.lugarSlug) cuenta.set(o.lugarSlug, (cuenta.get(o.lugarSlug) ?? 0) + 1);
  return cuenta;
}

/** Los talleres de un centro con sus días, ordenados por el primer día de la semana en que se dictan. */
export function talleresDelCentro(talleres: Taller[], centro: string): { taller: Taller; dias: number[] }[] {
  return talleres
    .filter((t) => t.centro === centro)
    .map((taller) => ({ taller, dias: [...new Set(taller.horarios.map((h) => h.dia as number))].sort((a, b) => a - b) }))
    .sort((a, b) => (a.dias[0] ?? 9) - (b.dias[0] ?? 9) || a.taller.titulo.localeCompare(b.taller.titulo, "es"));
}

/** Los lunes, por disposición nacional, los museos cierran. `dia` es 0 = domingo … 6 = sábado. */
export const museosCerrados = (dia: number) => dia === 1;
