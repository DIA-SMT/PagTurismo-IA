/**
 * Servidor para las pruebas de punta a punta (Playwright). Lo arranca playwright.config.ts.
 *
 * Arma desde cero una base local APARTE (.local-e2e, no toca la de desarrollo): el contenido inicial,
 * las cuentas de prueba (supabase/local/seed-local.sql), la base del bus con sus salidas de prueba
 * (lib/buses/sql/semilla-local.sql) y unos eventos de la agenda con fechas relativas a hoy. Después
 * levanta `next dev` en modo local apuntando a esa carpeta.
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { crearBaseBuses } from "../lib/buses/local/preparar.ts";
import { crearBaseLocal } from "../lib/db/local/preparar.ts";
import { diaLocal } from "../lib/fechas.ts";

const PUERTO = process.env.E2E_PUERTO || "3005";
const CARPETA = path.join(process.cwd(), ".local-e2e");

fs.rmSync(CARPETA, { recursive: true, force: true });

const dia = (n: number) => diaLocal(Date.now() + n * 86_400_000);

const EVENTOS = [
  {
    slug: "concierto-e2e", estado: "publicado",
    datos: {
      titulo: "Concierto de prueba E2E", clase: "espectaculo", resumen: "Banda municipal en el teatro.", rubros: ["musica"],
      destacado: true, sede: "Teatro San Martín", costo: { modalidad: "gratis" }, categorias: [], etiquetas: [], fuentes: [], validacion: {},
      lugarManual: { direccion: "Av. Sarmiento 601", lat: -26.8269, lng: -65.2045 },
      ocurrencias: [{ inicio: `${dia(1)}T21:00`, fin: `${dia(1)}T23:00`, estado: "confirmado" }, { inicio: `${dia(8)}T21:00`, estado: "confirmado" }],
    },
  },
  {
    slug: "feria-e2e", estado: "publicado",
    datos: {
      titulo: "Feria de artesanos E2E", clase: "feria", resumen: "Artesanías de la ciudad.", rubros: ["ferias-artesanos"],
      sede: "Plaza Independencia", costo: { modalidad: "consultar" }, categorias: [], etiquetas: [], fuentes: [], validacion: {},
      ocurrencias: [{ inicio: dia(3), estado: "confirmado" }, { inicio: dia(10), estado: "cancelado" }],
    },
  },
  {
    slug: "borrador-e2e", estado: "borrador",
    datos: {
      titulo: "Evento en borrador E2E", clase: "otro", resumen: "No se tiene que ver en el sitio.", rubros: [],
      sede: "Lugar X", costo: { modalidad: "consultar" }, categorias: [], etiquetas: [], fuentes: [], validacion: {},
      ocurrencias: [{ inicio: `${dia(2)}T18:00`, estado: "confirmado" }],
    },
  },
];

const portal = await crearBaseLocal({ carpeta: path.join(CARPETA, "pgdata") });
for (const e of EVENTOS) {
  await portal.query("insert into public.contenidos (coleccion, slug, estado, datos) values ('eventos', $1, $2, $3::text::jsonb)", [
    e.slug, e.estado, JSON.stringify(e.datos),
  ]);
}
await portal.close();
await (await crearBaseBuses({ carpeta: path.join(CARPETA, "buses") })).close();
console.log(`Base de pruebas lista en ${CARPETA}. Levantando el portal en el puerto ${PUERTO}…`);

const next = spawn(process.execPath, [path.join("node_modules", "next", "dist", "bin", "next"), "dev", "-p", PUERTO], {
  stdio: "inherit",
  env: {
    ...process.env,
    DATABASE_URL: "",
    CARPETA_LOCAL: CARPETA,
    DIRECTORIO_NEXT: ".next-e2e",
    BUSES_PUERTO_LOCAL: "54360",
    SESION_LOCAL_SECRETO: "secreto-solo-para-pruebas-e2e-no-usar-en-produccion",
    // Sin el chat de Migue: las pruebas no salen a internet.
    NEXT_PUBLIC_MIGUE_URL: "no",
  },
});
const terminar = () => next.kill();
process.on("SIGINT", terminar);
process.on("SIGTERM", terminar);
next.on("exit", (codigo) => process.exit(codigo ?? 0));
