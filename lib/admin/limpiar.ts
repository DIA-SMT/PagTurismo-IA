/**
 * Revisa y limpia lo que manda un formulario del panel según su esquema: recorta textos,
 * convierte números y casillas, descarta campos que no existen y devuelve los errores por
 * campo (clave = ruta, por ejemplo "paradas.2.nombre"). Lo que se guarda en la base tiene
 * siempre la forma que espera lib/normalizar.ts.
 *
 * Sin dependencias del servidor: lo usan las acciones del panel y las pruebas.
 */

import { aInstante, esFechaValida } from "../fechas.ts";
import type { Campo, Esquema } from "./esquemas.ts";

/** Idiomas a los que se traduce el contenido (el español es el original). */
export const IDIOMAS_TRADUCCION = ["en", "pt"] as const;

export type Contexto = {
  temas: Set<string>;
  etiquetas: Set<string>;
  /** Slugs existentes por colección, para los campos de relación. */
  fichas: Record<string, Set<string>>;
};

type Json = Record<string, unknown>;
export type Resultado = { datos: Json; errores: Record<string, string> };

const URL_VALIDA = /^(https?:\/\/[^\s]+|\/[^\s]*|mailto:[^\s]+)$/;
const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const FECHA_HORA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

const vacio = (v: unknown) => v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);

function limpiarCampo(campo: Campo, valor: unknown, ruta: string, ctx: Contexto, errores: Record<string, string>): unknown {
  const falta = () => {
    if (campo.requerido) errores[ruta] = `Completá «${campo.etiqueta}».`;
    return undefined;
  };

  switch (campo.tipo) {
    case "texto":
    case "parrafo":
    case "url":
    case "correo": {
      const t = typeof valor === "string" ? valor.trim() : typeof valor === "number" ? String(valor) : "";
      if (!t) return falta() ?? "";
      if (campo.tipo === "url" && !URL_VALIDA.test(t)) errores[ruta] = "Tiene que ser una dirección completa (https://…) o una ruta del sitio (/…).";
      if (campo.tipo === "correo" && !CORREO_VALIDO.test(t)) errores[ruta] = "No parece un correo válido.";
      if (t.length > 5000) errores[ruta] = "Es demasiado largo.";
      return t;
    }
    case "numero": {
      if (vacio(valor)) return falta();
      const n = Number(valor);
      if (!Number.isFinite(n)) {
        errores[ruta] = "Tiene que ser un número.";
        return undefined;
      }
      if (campo.min !== undefined && n < campo.min) errores[ruta] = `Tiene que ser ${campo.min} o más.`;
      if (campo.max !== undefined && n > campo.max) errores[ruta] = `Tiene que ser ${campo.max} o menos.`;
      return n;
    }
    case "booleano":
      return valor === true || valor === "true" || valor === "on";
    case "opciones": {
      if (vacio(valor)) return falta();
      if (!campo.opciones.some((o) => o.valor === valor)) {
        errores[ruta] = "Elegí una de las opciones.";
        return undefined;
      }
      return valor;
    }
    case "temas":
    case "etiquetas": {
      const validos = campo.tipo === "temas" ? ctx.temas : ctx.etiquetas;
      const lista = Array.isArray(valor) ? valor.filter((v): v is string => typeof v === "string" && validos.has(v)) : [];
      if (!lista.length && campo.requerido) errores[ruta] = `Elegí al menos uno en «${campo.etiqueta}».`;
      return [...new Set(lista)];
    }
    case "relacion": {
      const existentes = ctx.fichas[campo.coleccion] ?? new Set<string>();
      const revisar = (slug: unknown) => {
        if (typeof slug !== "string" || !slug) return undefined;
        if (!existentes.has(slug)) {
          errores[ruta] = `«${slug}» no es una ficha existente.`;
          return undefined;
        }
        return slug;
      };
      if (campo.multiple) {
        const lista = (Array.isArray(valor) ? valor : []).map(revisar).filter((s): s is string => !!s);
        if (!lista.length && campo.requerido) errores[ruta] = `Elegí al menos una ficha en «${campo.etiqueta}».`;
        return [...new Set(lista)];
      }
      return revisar(valor) ?? falta() ?? "";
    }
    case "imagen": {
      const i = (valor ?? {}) as Json;
      const src = typeof i.src === "string" ? i.src.trim() : "";
      if (!src) return falta();
      if (!URL_VALIDA.test(src)) errores[`${ruta}.src`] = "La imagen tiene que ser una ruta del sitio o una dirección https.";
      const texto = (k: string) => (typeof i[k] === "string" ? (i[k] as string).trim() : "");
      const traducciones = limpiarTraducciones([ALT_TRADUCIBLE], i.traducciones);
      return { src, alt: texto("alt"), credito: texto("credito"), permiso: texto("permiso"), ...(traducciones && { traducciones }) };
    }
    case "fecha":
    case "fechaHora": {
      if (vacio(valor)) return falta() ?? "";
      const t = String(valor).trim();
      const ok = campo.tipo === "fecha" ? FECHA.test(t) : FECHA_HORA.test(t) || FECHA.test(t);
      if (!ok || !esFechaValida(t)) errores[ruta] = "Fecha inválida.";
      return t;
    }
    case "grupo": {
      const objeto = (valor && typeof valor === "object" && !Array.isArray(valor) ? valor : {}) as Json;
      return limpiarCampos(campo.campos, objeto, ruta, ctx, errores);
    }
    case "lista": {
      const filas = Array.isArray(valor) ? valor : [];
      if (!filas.length && campo.requerido) errores[ruta] = `Agregá al menos un elemento en «${campo.etiqueta}».`;
      if (filas.length > 200) errores[ruta] = "Demasiados elementos.";
      return filas.slice(0, 200).map((f, i) =>
        limpiarCampos(campo.campos, (f && typeof f === "object" ? f : {}) as Json, `${ruta}.${i}`, ctx, errores));
    }
  }
}

function limpiarCampos(campos: Campo[], objeto: Json, ruta: string, ctx: Contexto, errores: Record<string, string>): Json {
  const salida: Json = {};
  for (const campo of campos) {
    const r = limpiarCampo(campo, objeto[campo.nombre], ruta ? `${ruta}.${campo.nombre}` : campo.nombre, ctx, errores);
    if (r !== undefined) salida[campo.nombre] = r;
  }
  const traducciones = limpiarTraducciones(campos, objeto.traducciones);
  if (traducciones) salida.traducciones = traducciones;
  return salida;
}

/** El texto alternativo de una imagen también se traduce. */
const ALT_TRADUCIBLE: Campo = { tipo: "texto", nombre: "alt", etiqueta: "Texto alternativo", traducible: true };

/**
 * Traducciones de los textos propios de un objeto (ver lib/i18n/contenido.ts): solo los campos
 * marcados como traducibles, recortados, y sin idiomas vacíos. Una traducción nunca es obligatoria.
 */
function limpiarTraducciones(campos: Campo[], valor: unknown): Json | undefined {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return undefined;
  const salida: Json = {};
  for (const idioma of IDIOMAS_TRADUCCION) {
    const propias = (valor as Json)[idioma];
    if (!propias || typeof propias !== "object" || Array.isArray(propias)) continue;
    const limpias: Json = {};
    for (const campo of campos) {
      if ((campo.tipo !== "texto" && campo.tipo !== "parrafo") || !campo.traducible) continue;
      const t = (propias as Json)[campo.nombre];
      if (typeof t === "string" && t.trim()) limpias[campo.nombre] = t.trim().slice(0, 5000);
    }
    if (Object.keys(limpias).length) salida[idioma] = limpias;
  }
  return Object.keys(salida).length ? salida : undefined;
}

/** Reglas que dependen de más de un campo. */
function reglasDeColeccion(esquema: Esquema, d: Json, errores: Record<string, string>) {
  const rango = (lista: unknown, nombre: string) => {
    (Array.isArray(lista) ? (lista as Json[]) : []).forEach((o, i) => {
      const inicio = o.inicio as string | undefined;
      const fin = o.fin as string | undefined;
      if (inicio && fin && esFechaValida(inicio) && esFechaValida(fin) && aInstante(fin) < aInstante(inicio)) {
        errores[`${nombre}.${i}.fin`] = "Termina antes de empezar.";
      }
    });
  };
  if (esquema.id === "experiencias") {
    const a = (d.accion ?? {}) as Json;
    if (a.tipo === "reservar" && !a.url) errores["accion.url"] = "Para «Reservar» hace falta el enlace al sistema de reservas.";
    rango(d.salidas, "salidas");
  }
  if (esquema.id === "eventos") {
    rango(d.ocurrencias, "ocurrencias");
    const r = (d.recurrente ?? {}) as Json;
    if (r.dia !== undefined && r.mes === undefined) errores["recurrente.mes"] = "Si cargás el día, cargá también el mes.";
  }
  if (esquema.id === "destacados") {
    const destino = (d.destino ?? {}) as Json;
    if (destino.coleccion === "externo" && !destino.url) errores["destino.url"] = "Falta la dirección del sitio externo.";
    if (destino.coleccion && destino.coleccion !== "externo" && !destino.slug) errores["destino.slug"] = "Falta la ficha de destino.";
    if (typeof d.desde === "string" && typeof d.hasta === "string" && d.desde && d.hasta && d.hasta < d.desde) {
      errores.hasta = "«Hasta» es anterior a «Desde».";
    }
  }
  if (esquema.id === "temas") {
    const ids = (lista: unknown, nombre: string) => {
      const vistos = new Set<string>();
      (Array.isArray(lista) ? (lista as Json[]) : []).forEach((t, i) => {
        const id = String(t.id ?? "");
        if (id && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) errores[`${nombre}.${i}.id`] = "Solo minúsculas, números y guiones.";
        if (vistos.has(id)) errores[`${nombre}.${i}.id`] = "Ese identificador está repetido.";
        vistos.add(id);
      });
    };
    ids(d.categorias, "categorias");
    ids(d.etiquetas, "etiquetas");
  }
}

export function limpiarFicha(esquema: Esquema, valor: unknown, ctx: Contexto): Resultado {
  const errores: Record<string, string> = {};
  const datos = limpiarCampos(
    esquema.secciones.flatMap((s) => s.campos),
    (valor && typeof valor === "object" ? valor : {}) as Json,
    "",
    ctx,
    errores,
  );
  reglasDeColeccion(esquema, datos, errores);
  return { datos, errores };
}

/** Dirección (slug) a partir del título: minúsculas, sin tildes, con guiones. */
export function slugDe(texto: string): string {
  return texto
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
}

export const SLUG_VALIDO = /^[a-z0-9]+(-[a-z0-9]+)*$/;
