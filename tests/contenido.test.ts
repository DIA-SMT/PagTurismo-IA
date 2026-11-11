/**
 * El contenido inicial (supabase/semilla) tiene que pasar el validador: relaciones
 * existentes, fechas bien cargadas, imágenes presentes. Las mismas reglas revisan
 * la base desde el tablero del panel.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { validarSemilla } from "../scripts/validar-contenido.ts";

const raiz = path.resolve(import.meta.dirname, "..");

describe("contenido inicial", () => {
  it("no tiene errores", () => {
    const { errores } = validarSemilla(raiz);
    assert.deepEqual(errores, []);
  });

  it("los eventos anuales no traen fechas inventadas", () => {
    for (const archivo of fs.readdirSync(path.join(raiz, "supabase", "semilla", "eventos"))) {
      const e = JSON.parse(fs.readFileSync(path.join(raiz, "supabase", "semilla", "eventos", archivo), "utf8"));
      if (e.clase === "efemeride") assert.deepEqual(e.ocurrencias, [], `${archivo} es una efeméride: no debe tener ocurrencias sin confirmar`);
    }
  });

  it("ninguna experiencia ofrece reservar sin destino", () => {
    for (const archivo of fs.readdirSync(path.join(raiz, "supabase", "semilla", "experiencias"))) {
      const e = JSON.parse(fs.readFileSync(path.join(raiz, "supabase", "semilla", "experiencias", archivo), "utf8"));
      if (e.accion?.tipo === "reservar") assert.ok(e.accion.url, `${archivo}: Reservar sin enlace`);
    }
  });
});

describe("validador", () => {
  function repoDePrueba(archivos: Record<string, unknown>) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "turismo-"));
    for (const [ruta, datos] of Object.entries(archivos)) {
      fs.mkdirSync(path.dirname(path.join(dir, ruta)), { recursive: true });
      fs.writeFileSync(path.join(dir, ruta), typeof datos === "string" ? datos : JSON.stringify(datos));
    }
    return dir;
  }
  const base = {
    "supabase/semilla/configuracion/categorias.json": { categorias: [{ id: "historia", imagen: "" }], etiquetas: [{ id: "gratis" }] },
    "supabase/semilla/configuracion/sitio.json": {},
  };

  it("detecta relaciones rotas, fechas inválidas y temas desconocidos", () => {
    const dir = repoDePrueba({
      ...base,
      "supabase/semilla/recorridos/r.json": { estado: "publicado", titulo: "R", resumen: "x", paradas: [{ nombre: "A", lugar: "no-existe" }] },
      "supabase/semilla/eventos/e.json": { estado: "publicado", titulo: "E", resumen: "x", categorias: ["deportes"], ocurrencias: [{ inicio: "mañana", estado: "confirmado" }] },
      "supabase/semilla/experiencias/x.json": { estado: "borrador", titulo: "X", accion: { tipo: "reservar", texto: "Reservar" } },
    });
    const { errores } = validarSemilla(dir);
    assert.ok(errores.some((e) => e.includes("lugares/no-existe")));
    assert.ok(errores.some((e) => e.includes("«mañana»")));
    assert.ok(errores.some((e) => e.includes("tema «deportes»")));
    assert.ok(errores.some((e) => e.includes("«Reservar» necesita un enlace")));
  });

  it("avisa cuando una ficha publicada apunta a un borrador", () => {
    const dir = repoDePrueba({
      ...base,
      "supabase/semilla/lugares/l.json": { estado: "borrador", titulo: "L" },
      "supabase/semilla/recorridos/r.json": { estado: "publicado", titulo: "R", resumen: "x", paradas: [{ nombre: "L", lugar: "l" }] },
    });
    const { errores, avisos } = validarSemilla(dir);
    assert.deepEqual(errores, []);
    assert.ok(avisos.some((a) => a.includes("está en borrador")));
  });

  it("marca un JSON roto sin caerse", () => {
    const dir = repoDePrueba({ ...base, "supabase/semilla/lugares/roto.json": "{ no es json" });
    assert.ok(validarSemilla(dir).errores.some((e) => e.includes("no es un JSON válido")));
  });
});
