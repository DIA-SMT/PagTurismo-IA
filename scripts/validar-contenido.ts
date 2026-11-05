/**
 * Revisa el contenido de `contenido/` antes de publicar.
 *
 *   npm run validar
 *
 * Errores (cortan con código 1): JSON roto, relaciones a fichas que no
 * existen, temas o etiquetas desconocidos, fechas mal cargadas, imágenes que
 * no están en public/.
 *
 * Avisos (no cortan): fichas publicadas que apuntan a borradores (el enlace
 * no se va a ver), revisiones vencidas, publicadas sin validación.
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { aInstante, diaLocal, esFechaValida } from "../lib/fechas.ts";

type Json = Record<string, any>;
type Ficha = { coleccion: string; slug: string; datos: Json };
export type Resultado = { errores: string[]; avisos: string[]; resumen: Record<string, { publicadas: number; borradores: number }> };

const COLECCIONES = ["lugares", "experiencias", "eventos", "recorridos", "planifica", "destacados", "sabores", "escapadas"];

export function validarContenido(raizRepo: string, ahora = Date.now()): Resultado {
  const raiz = path.join(raizRepo, "contenido");
  const errores: string[] = [];
  const avisos: string[] = [];
  const fichas = new Map<string, Map<string, Ficha>>();
  const resumen: Resultado["resumen"] = {};

  for (const c of COLECCIONES) {
    const mapa = new Map<string, Ficha>();
    fichas.set(c, mapa);
    resumen[c] = { publicadas: 0, borradores: 0 };
    const dir = path.join(raiz, c);
    if (!fs.existsSync(dir)) continue;
    for (const archivo of fs.readdirSync(dir).filter((a) => a.endsWith(".json"))) {
      const slug = archivo.slice(0, -5);
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) errores.push(`${c}/${archivo}: el nombre del archivo debe ser minúsculas, números y guiones.`);
      try {
        const datos = JSON.parse(fs.readFileSync(path.join(dir, archivo), "utf8"));
        mapa.set(slug, { coleccion: c, slug, datos });
        resumen[c][datos.estado === "publicado" ? "publicadas" : "borradores"] += 1;
      } catch (e) {
        errores.push(`${c}/${archivo}: no es un JSON válido (${(e as Error).message}).`);
      }
    }
  }

  let taxonomia: Json = { categorias: [], etiquetas: [] };
  try {
    taxonomia = JSON.parse(fs.readFileSync(path.join(raiz, "configuracion", "categorias.json"), "utf8"));
  } catch (e) {
    errores.push(`configuracion/categorias.json: ${(e as Error).message}`);
  }
  try {
    JSON.parse(fs.readFileSync(path.join(raiz, "configuracion", "sitio.json"), "utf8"));
  } catch (e) {
    errores.push(`configuracion/sitio.json: ${(e as Error).message}`);
  }
  const categorias = new Set<string>((taxonomia.categorias ?? []).map((c: Json) => c.id));
  const etiquetas = new Set<string>((taxonomia.etiquetas ?? []).map((e: Json) => e.id));
  for (const c of taxonomia.categorias ?? []) revisarImagen(c.imagen, `tema «${c.id}»`);

  const hoy = diaLocal(ahora);

  function revisarImagen(src: unknown, donde: string) {
    if (typeof src !== "string" || !src) return;
    if (/^https?:\/\//.test(src)) return;
    if (!fs.existsSync(path.join(raizRepo, "public", src))) errores.push(`${donde}: la imagen ${src} no está en public/.`);
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

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
  const { errores, avisos, resumen } = validarContenido(raiz);
  console.log("Contenido:");
  for (const [c, r] of Object.entries(resumen)) console.log(`  ${c.padEnd(13)} ${r.publicadas} publicadas · ${r.borradores} borradores`);
  if (avisos.length) {
    console.log(`\nAvisos (${avisos.length}):`);
    for (const a of avisos) console.log(`  · ${a}`);
  }
  if (errores.length) {
    console.error(`\nErrores (${errores.length}):`);
    for (const e of errores) console.error(`  ✗ ${e}`);
    process.exit(1);
  }
  console.log("\nSin errores.");
}
