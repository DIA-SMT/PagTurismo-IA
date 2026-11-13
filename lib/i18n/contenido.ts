/**
 * Traducciones del contenido que carga el equipo.
 *
 * Cada objeto de una ficha (la ficha misma, un grupo como `costo` o cada elemento de una lista
 * como `paradas`) guarda las traducciones de sus propios textos al lado, en `traducciones`:
 *
 *   { titulo: "Plaza Independencia", resumen: "…",
 *     traducciones: { en: { titulo: "Independence Square", resumen: "…" }, pt: { … } },
 *     paradas: [{ nombre: "Calles céntricas", traducciones: { en: { nombre: "Downtown streets" } } }] }
 *
 * Así, si alguien reordena o borra una parada, su traducción va con ella. Un texto sin traducir
 * se muestra en español. Sin dependencias: lo usan el servidor, el panel y las pruebas.
 */

import type { Idioma } from "./config";

type Objeto = Record<string, unknown>;
const esObjeto = (x: unknown): x is Objeto => typeof x === "object" && x !== null && !Array.isArray(x);

/** Los datos en un idioma: aplica las traducciones de cada nivel y las quita del resultado. */
export function localizarDatos<T>(valor: T, idioma: Idioma): T {
  if (Array.isArray(valor)) return valor.map((v) => localizarDatos(v, idioma)) as T;
  if (!esObjeto(valor)) return valor;
  const salida: Objeto = {};
  for (const [clave, v] of Object.entries(valor)) {
    if (clave !== "traducciones") salida[clave] = localizarDatos(v, idioma);
  }
  const propias = idioma === "es" ? undefined : (valor.traducciones as Objeto | undefined)?.[idioma];
  if (esObjeto(propias)) {
    for (const [clave, texto] of Object.entries(propias)) {
      if (typeof texto === "string" && texto.trim() && typeof salida[clave] === "string") salida[clave] = texto;
    }
  }
  return salida as T;
}

/** ¿La ficha tiene al menos el título traducido? Si no, el sitio avisa que se ve en español. */
export function tieneTraduccion(datos: unknown, idioma: Idioma): boolean {
  if (idioma === "es") return true;
  const propias = esObjeto(datos) && esObjeto(datos.traducciones) ? datos.traducciones[idioma] : undefined;
  return esObjeto(propias) && typeof propias.titulo === "string" && propias.titulo.trim() !== "";
}
