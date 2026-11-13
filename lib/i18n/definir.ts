import type { Idioma } from "./config";

/** Un árbol de textos: hojas de texto o listas de texto. */
export type Arbol = { [clave: string]: string | readonly string[] | Arbol };

/** La misma forma que el español, con cualquier texto. */
export type Forma<T> = {
  [K in keyof T]: T[K] extends string ? string : T[K] extends readonly string[] ? readonly string[] : Forma<T[K]>;
};

/**
 * Una sección de textos en los tres idiomas. El español manda: si al inglés o al portugués
 * les falta una clave (o les sobra), TypeScript lo marca.
 */
export function definir<T extends Arbol>(textos: { es: T } & { [I in Exclude<Idioma, "es">]: Forma<T> }) {
  return textos as Record<Idioma, Forma<T>>;
}

/** Reemplaza {nombre} por su valor: formatear("Foto {n} de {total}", { n: 1, total: 3 }). */
export function formatear(plantilla: string, valores: Record<string, string | number>): string {
  return plantilla.replace(/\{(\w+)\}/g, (_, clave: string) => (clave in valores ? String(valores[clave]) : `{${clave}}`));
}
