/**
 * Búsqueda y filtros del catálogo "Qué hacer".
 *
 * Los filtros viven en la URL (`?q=museo&categoria=…&gratis=1&tipo=lugar`)
 * para que una búsqueda se pueda compartir y se recupere al volver desde
 * una ficha. Sin dependencias: lo usan el navegador y las pruebas.
 */

import type { ItemCatalogo } from "./tipos";

export type Filtros = {
  q: string;
  categoria: string;
  tipo: "" | ItemCatalogo["entidad"];
  gratis: boolean;
};

export const FILTROS_VACIOS: Filtros = { q: "", categoria: "", tipo: "", gratis: false };

const TIPOS = new Set(["lugar", "experiencia", "recorrido", "evento"]);

/** Minúsculas y sin tildes: "Casa Histórica" y "casa historica" coinciden. */
export function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

type Parametros = { get(nombre: string): string | null };

export function leerFiltros(params: Parametros): Filtros {
  const tipo = params.get("tipo") ?? "";
  return {
    q: (params.get("q") ?? "").slice(0, 100),
    categoria: params.get("categoria") ?? "",
    tipo: TIPOS.has(tipo) ? (tipo as Filtros["tipo"]) : "",
    gratis: params.get("gratis") === "1",
  };
}

export function aParametros(f: Filtros): string {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set("q", f.q.trim());
  if (f.categoria) p.set("categoria", f.categoria);
  if (f.tipo) p.set("tipo", f.tipo);
  if (f.gratis) p.set("gratis", "1");
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function hayFiltros(f: Filtros): boolean {
  return !!(f.q.trim() || f.categoria || f.tipo || f.gratis);
}

/**
 * Puntaje de pertinencia: el título pesa más que el resumen, y que el título
 * empiece con lo buscado pesa más todavía. Así "casa historica" pone primero
 * la ficha del museo y después los recorridos que la mencionan.
 */
function puntaje(item: ItemCatalogo, palabras: string[], nombresCategoria: Record<string, string>): number {
  if (!palabras.length) return 1;
  const titulo = normalizar(item.titulo);
  const resto = normalizar([item.resumen, item.meta, ...item.categorias.map((c) => nombresCategoria[c] ?? c)].join(" "));
  let total = 0;
  for (const p of palabras) {
    if (titulo.includes(p)) total += 3;
    else if (resto.includes(p)) total += 1;
    else return 0; // todas las palabras tienen que aparecer
  }
  if (titulo.startsWith(palabras.join(" "))) total += 5;
  else if (titulo.includes(palabras.join(" "))) total += 2;
  return total;
}

const ORDEN_ENTIDAD: Record<ItemCatalogo["entidad"], number> = { lugar: 0, experiencia: 1, recorrido: 2, evento: 3 };

export function filtrarCatalogo(items: ItemCatalogo[], f: Filtros, nombresCategoria: Record<string, string> = {}): ItemCatalogo[] {
  const palabras = normalizar(f.q).split(/\s+/).filter((p) => p.length > 1);
  return items
    .filter((i) => (!f.categoria || i.categorias.includes(f.categoria))
      && (!f.tipo || i.entidad === f.tipo)
      && (!f.gratis || i.gratis))
    .map((i) => ({ i, p: puntaje(i, palabras, nombresCategoria) }))
    .filter((x) => x.p > 0)
    .sort((a, b) => b.p - a.p
      || Number(a.i.borrador) - Number(b.i.borrador)
      || ORDEN_ENTIDAD[a.i.entidad] - ORDEN_ENTIDAD[b.i.entidad]
      || a.i.titulo.localeCompare(b.i.titulo, "es"))
    .map((x) => x.i);
}
