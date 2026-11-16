/**
 * Qué textos de una ficha se traducen y dónde va cada traducción, según el esquema del panel.
 *
 * Lo usan el script de traducción del contenido inicial, el panel (para contar lo pendiente) y
 * las pruebas. La forma de guardado está en lib/i18n/contenido.ts: cada objeto guarda las
 * traducciones de sus propios textos en `traducciones.{en,pt}`.
 *
 * Sin dependencias del servidor.
 */

import type { Campo, Esquema } from "./esquemas.ts";

type Json = Record<string, unknown>;
const esObjeto = (x: unknown): x is Json => typeof x === "object" && x !== null && !Array.isArray(x);

/** Un texto traducible: la ruta al objeto que lo contiene, el nombre del campo y el original. */
export type TextoTraducible = {
  objeto: (string | number)[];
  campo: string;
  /** Con contexto: "Paradas 3 · Nombre". */
  etiqueta: string;
  tipo: "texto" | "parrafo";
  original: string;
};

export const rutaDeTexto = (t: Pick<TextoTraducible, "objeto" | "campo">) => [...t.objeto, t.campo].join(".");

/** Todos los textos traducibles con valor en español, en el orden del formulario. */
export function textosTraducibles(esquema: Esquema, datos: unknown): TextoTraducible[] {
  const salida: TextoTraducible[] = [];
  const recorrer = (campos: Campo[], objeto: unknown, ruta: (string | number)[], contexto: string) => {
    if (!esObjeto(objeto)) return;
    for (const c of campos) {
      const valor = objeto[c.nombre];
      if ((c.tipo === "texto" || c.tipo === "parrafo") && c.traducible && typeof valor === "string" && valor.trim()) {
        salida.push({ objeto: ruta, campo: c.nombre, etiqueta: contexto + c.etiqueta, tipo: c.tipo, original: valor });
      } else if (c.tipo === "imagen" && esObjeto(valor) && typeof valor.alt === "string" && valor.alt.trim()) {
        salida.push({ objeto: [...ruta, c.nombre], campo: "alt", etiqueta: `${contexto}${c.etiqueta} · texto alternativo`, tipo: "texto", original: valor.alt });
      } else if (c.tipo === "grupo") {
        recorrer(c.campos, valor, [...ruta, c.nombre], `${contexto}${c.etiqueta} · `);
      } else if (c.tipo === "lista" && Array.isArray(valor)) {
        valor.forEach((fila, i) => recorrer(c.campos, fila, [...ruta, c.nombre, i], `${contexto}${c.etiqueta} ${i + 1} · `));
      }
    }
  };
  recorrer(esquema.secciones.flatMap((s) => s.campos), datos, [], "");
  return salida;
}

/** La traducción guardada de un texto, o "" si no hay. */
export function traduccionDe(datos: unknown, t: Pick<TextoTraducible, "objeto" | "campo">, idioma: string): string {
  let o: unknown = datos;
  for (const paso of t.objeto) o = esObjeto(o) || Array.isArray(o) ? (o as Json)[paso as string] : undefined;
  const propias = esObjeto(o) && esObjeto(o.traducciones) ? o.traducciones[idioma] : undefined;
  const valor = esObjeto(propias) ? propias[t.campo] : undefined;
  return typeof valor === "string" ? valor : "";
}

/**
 * Guarda (o borra, si `texto` está vacío) una traducción. Modifica `datos`. Mientras alguien
 * escribe no se recorta (si no, se comería el espacio entre palabras); el servidor recorta al guardar.
 */
export function ponerTraduccion(datos: Json, t: Pick<TextoTraducible, "objeto" | "campo">, idioma: string, texto: string, recortar = true) {
  let o: unknown = datos;
  for (const paso of t.objeto) o = (o as Json)[paso as string];
  if (!esObjeto(o)) return;
  const traducciones = (esObjeto(o.traducciones) ? o.traducciones : (o.traducciones = {})) as Json;
  const propias = (esObjeto(traducciones[idioma]) ? traducciones[idioma] : (traducciones[idioma] = {})) as Json;
  if (texto.trim()) propias[t.campo] = recortar ? texto.trim() : texto;
  else delete propias[t.campo];
  if (!Object.keys(propias).length) delete traducciones[idioma];
  if (!Object.keys(traducciones).length) delete o.traducciones;
}

/** Cuántos textos tienen traducción a cada idioma. */
export function avanceDeTraduccion(esquema: Esquema, datos: unknown, idiomas: readonly string[]) {
  const textos = textosTraducibles(esquema, datos);
  return Object.fromEntries(idiomas.map((i) => [i, { hechos: textos.filter((t) => traduccionDe(datos, t, i).trim()).length, total: textos.length }]));
}
