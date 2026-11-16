/**
 * Lo que lee Migue (GET /api/migue/contenido): solo lo publicado, con direcciones del sitio
 * que existen y en un tamaño que entra en el pedido al modelo.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { leerSemilla } from "../lib/db/semilla.ts";
import { localizarDatos } from "../lib/i18n/contenido.ts";
import { paraMigue } from "../lib/migue.ts";
import {
  normalizarEscapada, normalizarEvento, normalizarExperiencia, normalizarGuia, normalizarLugar,
  normalizarPlato, normalizarRecorrido,
} from "../lib/normalizar.ts";
import type { Contenido } from "../lib/datos.ts";

const filas = leerSemilla();
const publicadas = filas.filter((f) => f.estado === "publicado");
const de = <T>(coleccion: string, n: (c: Record<string, unknown>, slug: string) => T) =>
  publicadas.filter((f) => f.coleccion === coleccion).map((f) => n({ ...localizarDatos(f.datos, "es"), estado: f.estado }, f.slug));
const config = (slug: string) => localizarDatos(filas.find((f) => f.coleccion === "configuracion" && f.slug === slug)?.datos ?? {}, "es");

// El mismo armado que lib/datos.ts (que no se puede importar fuera de Next): en español y sin borradores.
const contenido = {
  lugares: de("lugares", normalizarLugar),
  experiencias: de("experiencias", normalizarExperiencia),
  eventos: de("eventos", normalizarEvento),
  recorridos: de("recorridos", normalizarRecorrido),
  guias: de("planifica", normalizarGuia),
  platos: de("sabores", normalizarPlato),
  escapadas: de("escapadas", normalizarEscapada),
  destacados: [],
  categorias: (config("categorias") as Contenido).categorias ?? [],
  etiquetas: (config("categorias") as Contenido).etiquetas ?? [],
  sitio: config("sitio") as Contenido["sitio"],
  conBorradores: false,
  idioma: "es",
  sinTraducir: new Set(),
} as Contenido;

const datos = paraMigue(contenido, Date.parse("2026-11-16T12:00:00-03:00"));
const todo = JSON.stringify(datos);
// Para mirar el texto: node --test tests/migue.test.ts con MIGUE_VER=1.
if (process.env.MIGUE_VER) console.log(`${todo.length} caracteres\n\n${datos.general}\n\n${datos.fichas.map((f) => `## ${f.tipo}: ${f.titulo} (${f.url})\n${f.texto}`).join("\n\n")}`);

describe("contenido para Migue", () => {
  it("no menciona fichas en borrador", () => {
    const titulosPublicados = new Set(publicadas.map((f) => f.datos.titulo));
    for (const f of filas.filter((f) => f.estado === "borrador")) {
      const titulo = String(f.datos.titulo ?? "");
      if (!titulo || titulosPublicados.has(titulo)) continue;
      assert.ok(!datos.fichas.some((x) => x.titulo === titulo), `${f.coleccion}/${f.slug} es borrador y aparece como ficha`);
      assert.ok(!datos.fichas.some((x) => x.url.endsWith(`/${f.slug}`)), `${f.coleccion}/${f.slug} es borrador y tiene enlace`);
    }
  });

  it("cada ficha tiene una dirección interna del sitio", () => {
    for (const f of datos.fichas) assert.match(f.url, /^\/[a-z0-9/-]*$/, `${f.titulo}: ${f.url}`);
  });

  it("un evento anual dice cuándo es sin inventar fechas", () => {
    const empanada = datos.fichas.find((f) => f.titulo === "Fiesta Nacional de la Empanada");
    assert.ok(empanada, "falta la Fiesta Nacional de la Empanada");
    assert.match(empanada.texto, /todos los años, en septiembre/);
  });

  it("un horario sin confirmar se avisa", () => {
    const sinConfirmar = contenido.lugares.find((l) => l.horario?.texto && !l.horario.confirmado);
    if (!sinConfirmar) return;
    const ficha = datos.fichas.find((f) => f.titulo === sinConfirmar.titulo);
    assert.match(ficha!.texto, /dato a confirmar/);
  });

  it("trae los teléfonos de emergencia y el contacto de turismo", () => {
    assert.match(datos.general, /Emergencia Policial 911/);
    assert.match(datos.general, /turismo@smt\.gob\.ar/);
  });

  it("entra cómodo en el pedido al modelo", () => {
    assert.ok(todo.length < 60000, `pesa ${todo.length} caracteres`);
  });
});
