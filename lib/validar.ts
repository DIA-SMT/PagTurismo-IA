/**
 * Revisión del contenido: relaciones a fichas que no existen, temas o etiquetas desconocidos,
 * fechas mal cargadas e imágenes que faltan (errores); fichas publicadas que apuntan a
 * borradores, revisiones vencidas y publicadas sin validación (avisos).
 *
 * Lo usan el tablero del panel (sobre la base) y `npm run validar` (sobre la semilla).
 * Sin dependencias del servidor.
 */

import { aInstante, diaLocal, esFechaValida } from "./fechas.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>;
type Ficha = { coleccion: string; slug: string; datos: Json };
export type FilaValidable = { coleccion: string; slug: string; estado: string; datos: Record<string, unknown> };
export type Resultado = { errores: string[]; avisos: string[]; resumen: Record<string, { publicadas: number; borradores: number }> };

export const COLECCIONES = ["lugares", "experiencias", "eventos", "recorridos", "planifica", "destacados", "sabores", "escapadas"];

export function validarFilas(
  filas: FilaValidable[],
  { existeImagen = () => true, ahora = Date.now() }: { existeImagen?: (src: string) => boolean; ahora?: number } = {},
): Resultado {
  const errores: string[] = [];
  const avisos: string[] = [];
  const resumen: Resultado["resumen"] = Object.fromEntries(COLECCIONES.map((c) => [c, { publicadas: 0, borradores: 0 }]));
  const fichas = new Map<string, Map<string, Ficha>>(COLECCIONES.map((c) => [c, new Map()]));
  for (const f of filas) {
    if (!fichas.has(f.coleccion)) continue;
    fichas.get(f.coleccion)!.set(f.slug, { coleccion: f.coleccion, slug: f.slug, datos: { ...f.datos, estado: f.estado } });
    resumen[f.coleccion][f.estado === "publicado" ? "publicadas" : "borradores"] += 1;
  }
  const taxonomia = (filas.find((f) => f.coleccion === "configuracion" && f.slug === "categorias")?.datos ?? {}) as Json;
  if (!taxonomia.categorias) errores.push("Falta la configuración de temas y etiquetas.");
  const categorias = new Set<string>((taxonomia.categorias ?? []).map((c: Json) => c.id));
  const etiquetas = new Set<string>((taxonomia.etiquetas ?? []).map((e: Json) => e.id));
  for (const c of taxonomia.categorias ?? []) revisarImagen(c.imagen, `tema «${c.id}»`);

  const hoy = diaLocal(ahora);

  function revisarImagen(src: unknown, donde: string) {
    if (typeof src !== "string" || !src) return;
    if (!existeImagen(src)) errores.push(`${donde}: la imagen ${src} no se encuentra.`);
  }

  /** Relación a otra ficha: si no existe es error; si es borrador y la de origen está publicada, aviso. */
  function revisarRelacion(origen: Ficha, coleccion: string, slug: unknown, campo: string) {
    if (typeof slug !== "string" || !slug) return;
    const destino = fichas.get(coleccion)?.get(slug);
    const donde = `${origen.coleccion}/${origen.slug}`;
    if (!destino) {
      errores.push(`${donde}: ${campo} apunta a ${coleccion}/${slug}, que no existe.`);
    } else if (origen.datos.estado === "publicado" && destino.datos.estado !== "publicado") {
      avisos.push(`${donde}: ${campo} apunta a ${coleccion}/${slug}, que está en borrador (el enlace no se va a ver).`);
    }
  }

  function revisarFecha(valor: unknown, donde: string, obligatoria: boolean) {
    if (valor === undefined || valor === null || valor === "") {
      if (obligatoria) errores.push(`${donde}: falta la fecha.`);
      return;
    }
    if (typeof valor !== "string" || !esFechaValida(valor)) errores.push(`${donde}: fecha «${valor}» con formato inválido (AAAA-MM-DD o AAAA-MM-DDTHH:mm).`);
  }

  function revisarRango(o: Json, donde: string) {
    revisarFecha(o.inicio, `${donde} inicio`, true);
    revisarFecha(o.fin, `${donde} fin`, false);
    if (esFechaValida(o.inicio) && esFechaValida(o.fin) && aInstante(o.fin) < aInstante(o.inicio)) {
      errores.push(`${donde}: termina antes de empezar.`);
    }
  }

  for (const [coleccion, mapa] of fichas) {
    for (const f of mapa.values()) {
      const d = f.datos;
      const donde = `${coleccion}/${f.slug}`;
      if (d.estado !== "publicado" && d.estado !== "borrador") errores.push(`${donde}: estado «${d.estado}» desconocido.`);
      if (!d.titulo) errores.push(`${donde}: falta el título.`);
      if (["lugares", "experiencias", "eventos", "recorridos", "planifica"].includes(coleccion) && d.estado === "publicado" && !d.resumen) {
        errores.push(`${donde}: una ficha publicada necesita resumen.`);
      }
      for (const c of d.categorias ?? []) if (!categorias.has(c)) errores.push(`${donde}: tema «${c}» desconocido.`);
      for (const e of d.etiquetas ?? []) if (!etiquetas.has(e)) errores.push(`${donde}: etiqueta «${e}» desconocida.`);
      revisarImagen(d.imagen?.src, donde);
      if (d.imagen?.src && d.imagen.alt === undefined) avisos.push(`${donde}: la imagen no tiene texto alternativo.`);

      const v = d.validacion ?? {};
      revisarFecha(v.fecha, `${donde} validación`, false);
      revisarFecha(v.proximaRevision, `${donde} próxima revisión`, false);
      if (d.estado === "publicado" && esFechaValida(v.proximaRevision) && v.proximaRevision < hoy) {
        avisos.push(`${donde}: la revisión venció el ${v.proximaRevision}.`);
      }

      if (coleccion === "experiencias") {
        for (const l of d.lugares ?? []) revisarRelacion(f, "lugares", l, "lugares");
        (d.salidas ?? []).forEach((s: Json, i: number) => revisarRango(s, `${donde} salida ${i + 1}`));
        if (d.accion?.tipo === "reservar" && !d.accion?.url) errores.push(`${donde}: la acción «Reservar» necesita un enlace.`);
      }
      if (coleccion === "eventos") {
        revisarRelacion(f, "lugares", d.lugar, "lugar");
        (d.ocurrencias ?? []).forEach((o: Json, i: number) => revisarRango(o, `${donde} ocurrencia ${i + 1}`));
        if (d.estado === "publicado" && !d.recurrente && !(d.ocurrencias ?? []).length) {
          avisos.push(`${donde}: está publicado pero no tiene fechas.`);
        }
      }
      if (coleccion === "recorridos") {
        (d.paradas ?? []).forEach((p: Json, i: number) => revisarRelacion(f, "lugares", p.lugar, `parada ${i + 1}`));
        revisarRelacion(f, "experiencias", d.experiencia, "experiencia");
        if (!(d.paradas ?? []).length) errores.push(`${donde}: un recorrido necesita paradas.`);
      }
      if (coleccion === "destacados") {
        const destino = d.destino ?? {};
        if (destino.coleccion === "externo") {
          if (!destino.url) errores.push(`${donde}: un destacado externo necesita URL.`);
        } else {
          if (!destino.slug) errores.push(`${donde}: falta la ficha de destino.`);
          else revisarRelacion(f, destino.coleccion, destino.slug, "destino");
        }
        revisarFecha(d.desde, `${donde} desde`, false);
        revisarFecha(d.hasta, `${donde} hasta`, false);
        if (d.estado === "publicado" && esFechaValida(d.hasta) && d.hasta < hoy) avisos.push(`${donde}: su ventana de publicación terminó el ${d.hasta}.`);
      }
    }
  }

  const sinValidar = [...fichas.entries()]
    .filter(([c]) => ["lugares", "experiencias", "eventos", "recorridos"].includes(c))
    .flatMap(([, m]) => [...m.values()])
    .filter((f) => f.datos.estado === "publicado" && !f.datos.validacion?.fecha).length;
  if (sinValidar) avisos.push(`${sinValidar} fichas publicadas todavía no tienen fecha de validación.`);

  return { errores, avisos, resumen };
}
