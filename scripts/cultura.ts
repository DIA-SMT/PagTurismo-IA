/**
 * Importa la Agenda Cultural al portal (public.contenidos). Siempre arranca en PRUEBA EN SECO:
 * muestra qué haría y deja un informe JSON; solo escribe con --escribir.
 *
 *   npm run cultura -- espacios [--escribir] [--fotos]
 *       Los espacios relevados de la Agenda (datos/cultura/*.json) → lugares. Si el lugar ya existe
 *       en el portal se fusiona (solo completa lo vacío); si no, se crea en BORRADOR para revisar.
 *   npm run cultura -- eventos --desde-base [--escribir] [--actualizar] [--fotos]
 *       Los eventos de la base de la Agenda (AGENDA_DATABASE_URL, solo lectura) → eventos. Sus fotos se bajan
 *       del sitio de la Agenda (AGENDA_SITIO_URL, por defecto https://agendacultural.smt.gob.ar).
 *   npm run cultura -- eventos --desde-wordpress [--escribir] [--actualizar] [--fotos]
 *       Los eventos del WordPress viejo (agendaculturalsmt.com, API pública) → eventos.
 *
 *   npm run cultura -- talleres --desde-planilla "HORARIO TALLERES ANUALES 2026.xlsx" [--escribir]
 *       La planilla de talleres anuales de Gestión Cultural → datos/cultura/talleres.json (sin base). Lista los
 *       errores de la planilla (horarios imposibles, una O en lugar de un cero, talleres sin profesor…).
 *   npm run cultura -- completar-lugares [--escribir]
 *       Sin red: a cada evento enlazado a una ficha de lugar le copia el nombre (sede) y la dirección de
 *       esa ficha si los tiene vacíos. Así el evento publicado dice dónde es aunque la ficha siga en borrador.
 *
 *   --actualizar  a un evento ya importado solo le suma fechas nuevas (nunca cambia el estado de
 *                 una fecha ni los textos: lo editado en el panel manda).
 *   --fotos       baja las fotos a la carpeta de subidas (CARPETA_SUBIDAS o .local/subidas) y las
 *                 guarda sin metadatos. Sin --fotos, la ficha queda sin foto (las URLs del sitio viejo
 *                 no se publican tal cual).
 *   --reporte X   dónde dejar el informe (por defecto importacion-cultura.json).
 *
 * Base del portal: DATABASE_URL. Sin DATABASE_URL usa la base local (PGlite, .local/pgdata): en ese
 * caso el servidor de desarrollo tiene que estar apagado.
 * Cada alta o cambio queda en la auditoría como «sistema».
 */

import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

import { opcionesScript } from "../lib/db/conexion.ts";
import {
  buscarLugar, buscarPorLegado, categoriasNuevas, desdeEventOn, espacioALugar, eventoAContenido, fusionarLugar, slugLibre,
  completarVacios, sumarFechas, type EspacioAgenda, type EventoOrigen, type FichaExistente,
} from "../lib/cultura/importar.ts";
import { buildPlan } from "../lib/cultura/eventon.mjs";
import { leerXlsx } from "../lib/cultura/planilla.ts";
import { talleresDeLaPlanilla, type ArchivoTalleres } from "../lib/cultura/talleres.ts";

const args = process.argv.slice(2);
const [comando] = args;
const escribir = args.includes("--escribir");
const actualizar = args.includes("--actualizar");
const conFotos = args.includes("--fotos");
const iReporte = args.indexOf("--reporte");
const reporte = path.resolve(iReporte >= 0 && args[iReporte + 1] ? args[iReporte + 1] : "importacion-cultura.json");
const CARPETA = process.env.CARPETA_SUBIDAS || path.join(process.cwd(), ".local", "subidas");
const AGENTE = { "User-Agent": "PortalTurismoSMT-importador/1.0" };

type Json = Record<string, unknown>;
type Q = (texto: string, params?: unknown[]) => Promise<Json[]>;

/** La base del portal: PostgreSQL (DATABASE_URL) o la local de desarrollo. */
async function abrirBase(): Promise<{ q: Q; transaccion: <T>(fn: (q: Q) => Promise<T>) => Promise<T>; cerrar: () => Promise<void> }> {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (url) {
    const sql = postgres(url, opcionesScript(url));
    return {
      q: (t, p = []) => sql.unsafe(t, p as never[]) as never,
      transaccion: (fn) => sql.begin((tx) => fn((t, p = []) => tx.unsafe(t, p as never[]) as never)) as never,
      cerrar: () => sql.end(),
    };
  }
  const { crearBaseLocal } = await import("../lib/db/local/preparar.ts");
  const db = await crearBaseLocal({ carpeta: path.join(process.cwd(), ".local", "pgdata") });
  return {
    q: async (t, p = []) => (await db.query(t, p)).rows as Json[],
    transaccion: (fn) => db.transaction((tx) => fn(async (t, p = []) => (await tx.query(t, p)).rows as Json[])),
    cerrar: () => db.close(),
  };
}

/** Baja una foto, la normaliza (sin EXIF, máx. 2000 px) y devuelve su dirección /subidas/…; null si falla. */
async function bajarFoto(url: string, carpeta: string, nombre: string, errores: string[]): Promise<string | null> {
  if (!conFotos || !/^https?:\/\//.test(url)) return url.startsWith("/") ? url : null;
  const ruta = `cultura/${carpeta}/${nombre}.jpg`;
  const destino = path.join(CARPETA, ruta);
  if (fs.existsSync(destino)) return `/subidas/${ruta}`;
  if (!escribir) return `/subidas/${ruta}`;
  try {
    const r = await fetch(url, { headers: AGENTE });
    const tipo = r.headers.get("content-type") ?? "";
    if (!r.ok || !tipo.startsWith("image/")) throw new Error(`respondió ${r.status} (${tipo})`);
    const { default: sharp } = await import("sharp");
    const datos = await sharp(Buffer.from(await r.arrayBuffer())).rotate()
      .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" }).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.writeFileSync(destino, datos);
    return `/subidas/${ruta}`;
  } catch (e) {
    errores.push(`${url}: ${e instanceof Error ? e.message : e}`);
    return null;
  }
}

/** Reemplaza las URLs de las fotos por las bajadas (o las quita si no se bajaron). */
async function fotosLocales(datos: Json, carpeta: string, errores: string[]): Promise<Json> {
  const d = structuredClone(datos);
  const img = d.imagen as Json | undefined;
  if (img?.src) {
    const src = await bajarFoto(String(img.src), carpeta, "principal", errores);
    if (src) img.src = src; else delete d.imagen;
  }
  const galeria: Json[] = [];
  let n = 1;
  for (const g of (d.galeria as Json[] | undefined) ?? []) {
    const foto = (g.foto ?? g) as Json;
    const src = await bajarFoto(String(foto.src), carpeta, `galeria-${n++}`, errores);
    if (src) galeria.push({ foto: { ...foto, src } });
  }
  d.galeria = galeria;
  return d;
}

const leerEspacios = (): EspacioAgenda[] =>
  ["espacios-culturales.json", "espacios-al-aire-libre.json"].flatMap((f) =>
    JSON.parse(fs.readFileSync(path.join(process.cwd(), "datos", "cultura", f), "utf8")).espacios);

async function fichas(q: Q, coleccion: string): Promise<FichaExistente[]> {
  return (await q("select coleccion, slug, estado, datos from public.contenidos where coleccion = $1", [coleccion])) as FichaExistente[];
}

/* ---- espacios ---- */

async function importarEspacios(q: Q, transaccion: <T>(fn: (q: Q) => Promise<T>) => Promise<T>) {
  const lugares = await fichas(q, "lugares");
  const informe = { creados: [] as string[], fusionados: [] as { espacio: string; lugar: string; campos: string[] }[], sinCambios: [] as string[], dudosos: [] as { espacio: string; parecidos: string[] }[], fotosConError: [] as string[] };
  const escrituras: { sql: string; params: unknown[] }[] = [];

  for (const e of leerEspacios()) {
    const { slug, dudosos } = buscarLugar(e, lugares);
    const nuevo = await fotosLocales(espacioALugar(e), e.slug, informe.fotosConError);
    if (slug) {
      const actual = lugares.find((l) => l.slug === slug)!;
      const { datos, cambios } = fusionarLugar(actual.datos, nuevo);
      if (!cambios.length) { informe.sinCambios.push(slug); continue; }
      informe.fusionados.push({ espacio: e.slug, lugar: slug, campos: cambios });
      escrituras.push({ sql: "update public.contenidos set datos = $3::text::jsonb where coleccion = $1 and slug = $2", params: ["lugares", slug, JSON.stringify(datos)] });
    } else {
      if (dudosos.length) informe.dudosos.push({ espacio: e.slug, parecidos: dudosos });
      informe.creados.push(e.slug);
      escrituras.push({ sql: "insert into public.contenidos (coleccion, slug, estado, datos) values ($1, $2, 'borrador', $3::text::jsonb) on conflict do nothing", params: ["lugares", e.slug, JSON.stringify(nuevo)] });
    }
  }

  console.log(`Espacios: ${informe.creados.length} nuevos (en borrador), ${informe.fusionados.length} fusionados con lugares existentes, ${informe.sinCambios.length} sin cambios.`);
  for (const f of informe.fusionados) console.log(`  fusiona ${f.espacio} → ${f.lugar}: ${f.campos.join(", ")}`);
  for (const d of informe.dudosos) console.log(`  REVISAR: ${d.espacio} se crea nuevo, pero se parece a ${d.parecidos.join(", ")}`);
  if (escribir) await transaccion(async (tx) => { for (const w of escrituras) await tx(w.sql, w.params); });
  return informe;
}

/* ---- eventos ---- */

/**
 * La Agenda guarda sus fotos con una ruta propia («/media/eventos/…»): se completan con la dirección de su sitio
 * (AGENDA_SITIO_URL) para que --fotos las baje y las copie al portal.
 */
const desdeLaAgenda = (ruta: string | null) =>
  ruta && ruta.startsWith("/") ? new URL(ruta, process.env.AGENDA_SITIO_URL || "https://agendacultural.smt.gob.ar").href : ruta;

async function eventosDeLaBase(): Promise<EventoOrigen[]> {
  const url = process.env.AGENDA_DATABASE_URL;
  if (!url) throw new Error("Falta AGENDA_DATABASE_URL (la base de la Agenda Cultural; se lee, no se escribe).");
  const sql = postgres(url, opcionesScript(url));
  try {
    const filas = await sql`
      select e.*, p.slug as place_slug,
        coalesce((select json_agg(json_build_object('slug', c.slug, 'nombre', c.name)) from public.event_categories ec
                  join public.categories c on c.id = ec.category_id where ec.event_id = e.id), '[]') as categorias,
        coalesce((select json_agg(json_build_object('inicio', o.starts_at, 'fin', o.ends_at, 'todoElDia', o.all_day, 'estado', o.status, 'nota', o.notes)
                  order by o.starts_at) from public.event_occurrences o where o.event_id = e.id), '[]') as fechas
      from public.events e left join public.places p on p.id = e.place_id
      order by e.created_at`;
    return filas.map((e) => ({
      // Lo que vino del WordPress se identifica por su id de WordPress: así otra importación no lo duplica.
      origen: e.legacy_id ? "wordpress" : "agenda",
      id: String(e.legacy_id ?? e.id),
      url: e.legacy_url,
      slug: e.slug, titulo: e.title, resumen: e.summary, descripcion: e.description,
      estado: ["published", "suspended", "rescheduled", "finished"].includes(e.status) ? "publicado" : "borrador",
      destacado: e.featured, acceso: e.access_type, precio: e.price,
      lugarAgenda: e.place_slug, sede: e.custom_place_name, direccion: e.custom_address, lat: e.custom_latitude, lng: e.custom_longitude,
      organizador: e.organizer, entradas: e.ticket_url ?? e.registration_url, capacidad: e.capacity,
      accesibilidad: e.accessibility, requisitos: e.requirements,
      contacto: { telefono: e.contact_info?.phone, email: e.contact_info?.email },
      imagen: desdeLaAgenda(e.main_image_path), galeria: (e.gallery_paths as string[] | null)?.map(desdeLaAgenda),
      categorias: e.categorias,
      fechas: (e.fechas as { inicio: string; fin?: string; todoElDia?: boolean; estado?: string; nota?: string }[])
        .map((f) => ({ ...f, inicio: new Date(f.inicio).toISOString(), fin: f.fin ? new Date(f.fin).toISOString() : null })),
    }) as EventoOrigen);
  } finally {
    await sql.end();
  }
}

const SITIO_VIEJO = "https://agendaculturalsmt.com";
async function getJson(url: string, init?: RequestInit) {
  const r = await fetch(url, { ...init, headers: { ...AGENTE, ...(init?.headers ?? {}) } });
  if (!r.ok) throw new Error(`${url} respondió ${r.status}`);
  return r.json();
}
async function todasLasPaginas(ruta: string) {
  const items: Json[] = [];
  for (let p = 1; ; p++) {
    const lote = await getJson(`${SITIO_VIEJO}/wp-json/wp/v2/${ruta}${ruta.includes("?") ? "&" : "?"}per_page=100&page=${p}`) as Json[];
    items.push(...lote);
    if (lote.length < 100) return items;
  }
}

/** Mismo pedido que hace el calendario público del sitio viejo (scripts/importar-eventos.mjs de la Agenda). */
async function eventosDelWordPress(): Promise<EventoOrigen[]> {
  const pagina = await (await fetch(`${SITIO_VIEJO}/que-hacer/`, { headers: AGENTE })).text();
  const nonce = JSON.parse(pagina.match(/evo_general_params\s*=\s*(\{[\s\S]*?\});/)?.[1] ?? "{}").n;
  if (!nonce) throw new Error("No encontré el nonce de EventON en /que-hacer/.");
  const cuerpo = new URLSearchParams();
  const sc: Record<string, string> = {
    calendar_type: "default", event_past_future: "all", event_status: "all", event_type: "all", event_type_2: "all", event_type_3: "all",
    hide_past: "no", show_repeats: "no", sort_by: "sort_date", event_order: "ASC", number_of_months: "1", lang: "L1", _cver: "5.0.2",
    focus_start_date_range: String(Date.UTC(2015, 0, 1) / 1000), focus_end_date_range: String(Date.UTC(2035, 0, 1) / 1000),
  };
  for (const [k, v] of Object.entries(sc)) cuerpo.append(`cals[c][sc][${k}]`, v);
  cuerpo.append("nonce", nonce);
  const datos = await getJson(`${SITIO_VIEJO}/?evo-ajax=eventon_init_load`, { method: "POST", body: cuerpo }) as { cals?: Record<string, { json?: unknown[]; html?: string }> };
  const cal = Object.values(datos.cals ?? {})[0];
  if (!cal?.json) throw new Error("EventON no devolvió eventos.");
  const [wpEvents, ...terminos] = await Promise.all([
    todasLasPaginas("ajde_events?_fields=id,slug,link,title,content,event_type,event_type_2,event_type_3"),
    todasLasPaginas("event_type?_fields=id,slug,name"),
    todasLasPaginas("event_type_2?_fields=id,slug,name"),
    todasLasPaginas("event_type_3?_fields=id,slug,name"),
  ]);
  const plan = buildPlan({
    wpEvents: wpEvents as never, instances: cal.json as never, cardsHtml: cal.html ?? "", terms: terminos.flat() as never,
    places: leerEspacios().map(({ slug, name }) => ({ slug, name })),
  });
  for (const a of plan.warnings) console.log(`  aviso: ${a}`);
  const nombres = new Map(plan.categories.map((k) => [k.slug, k.name]));
  return plan.events.filter((e) => e.occurrences.length).map((e) => desdeEventOn(e, nombres));
}

async function importarEventos(q: Q, transaccion: <T>(fn: (q: Q) => Promise<T>) => Promise<T>) {
  const desdeBase = args.includes("--desde-base");
  if (!desdeBase && !args.includes("--desde-wordpress")) throw new Error("Elegí el origen: --desde-base o --desde-wordpress.");
  console.log(desdeBase ? "Leyendo la base de la Agenda Cultural…" : "Bajando eventos del WordPress viejo…");
  const origenes = desdeBase ? await eventosDeLaBase() : await eventosDelWordPress();

  const [eventos, lugares, [config]] = await Promise.all([
    fichas(q, "eventos"), fichas(q, "lugares"),
    q("select datos from public.contenidos where coleccion = 'configuracion' and slug = 'categorias-agenda'"),
  ]);
  // Espacio de la Agenda → lugar del portal (por legado, alias, slug o nombre; ver lib/cultura/importar.ts).
  const mapaLugares = new Map<string, string>();
  const nombres = new Map(leerEspacios().map((e) => [e.slug, e.name]));
  const direcciones = new Map(leerEspacios().flatMap((e) => (e.address ? [[e.slug, e.address] as [string, string]] : [])));
  for (const e of leerEspacios()) {
    const { slug } = buscarLugar(e, lugares);
    if (slug) mapaLugares.set(e.slug, slug);
  }
  const ocupados = new Set(eventos.map((e) => e.slug));
  const informe = { creados: [] as string[], actualizados: [] as string[], salteados: [] as string[], sinLugar: {} as Record<string, number>, fotosConError: [] as string[], categoriasNuevas: [] as string[] };
  const escrituras: { sql: string; params: unknown[] }[] = [];

  for (const o of origenes) {
    const nuevo = await fotosLocales(eventoAContenido(o, mapaLugares, nombres, direcciones), `eventos-${o.origen}-${o.id}`.toLowerCase().replace(/[^a-z0-9-]/g, ""), informe.fotosConError);
    if (!nuevo.lugar && o.sede) informe.sinLugar[o.sede] = (informe.sinLugar[o.sede] ?? 0) + 1;
    const ya = buscarPorLegado(eventos, o);
    if (ya) {
      if (!actualizar) { informe.salteados.push(ya.slug); continue; }
      const conFechas = sumarFechas(ya.datos, nuevo);
      const { datos, completado } = completarVacios(conFechas.datos, nuevo);
      const agregadas = conFechas.agregadas;
      if (!agregadas && !completado) { informe.salteados.push(ya.slug); continue; }
      informe.actualizados.push(`${ya.slug} (${[agregadas ? `+${agregadas} fechas` : "", completado ? "datos vacíos completados" : ""].filter(Boolean).join(", ")})`);
      escrituras.push({ sql: "update public.contenidos set datos = $3::text::jsonb where coleccion = $1 and slug = $2", params: ["eventos", ya.slug, JSON.stringify(datos)] });
      continue;
    }
    const slug = slugLibre(o, ocupados);
    ocupados.add(slug);
    informe.creados.push(slug);
    escrituras.push({ sql: "insert into public.contenidos (coleccion, slug, estado, datos) values ($1, $2, $3, $4::text::jsonb)", params: ["eventos", slug, o.estado, JSON.stringify(nuevo)] });
  }

  const actuales = ((config?.datos as Json | undefined)?.categorias as { id: string; titulo: string; tono?: number }[] | undefined) ?? [];
  const nuevas = categoriasNuevas(actuales, origenes.flatMap((o) => o.categorias));
  informe.categoriasNuevas = nuevas.map((k) => k.id);
  if (nuevas.length) {
    escrituras.unshift({
      sql: `insert into public.contenidos (coleccion, slug, estado, datos) values ('configuracion', 'categorias-agenda', 'publicado', $1::text::jsonb)
            on conflict (coleccion, slug) do update set datos = excluded.datos`,
      params: [JSON.stringify({ ...((config?.datos as Json) ?? {}), categorias: [...actuales, ...nuevas] })],
    });
  }

  console.log(`Eventos: ${origenes.length} en el origen → ${informe.creados.length} nuevos, ${informe.actualizados.length} con fechas nuevas, ${informe.salteados.length} ya estaban.`);
  console.log(`Categorías nuevas: ${informe.categoriasNuevas.join(", ") || "ninguna"}.`);
  const sinLugar = Object.entries(informe.sinLugar).sort((a, b) => b[1] - a[1]);
  if (sinLugar.length) console.log(`Con lugar escrito a mano (sin ficha): ${sinLugar.slice(0, 10).map(([s, n]) => `${s} (${n})`).join(", ")}${sinLugar.length > 10 ? "…" : ""}`);
  if (escribir) await transaccion(async (tx) => { for (const w of escrituras) await tx(w.sql, w.params); });
  return informe;
}

/* ---- completar lugares (sin red) ---- */

async function completarLugares(q: Q, transaccion: <T>(fn: (q: Q) => Promise<T>) => Promise<T>) {
  const [eventos, lugares] = await Promise.all([fichas(q, "eventos"), fichas(q, "lugares")]);
  const porSlug = new Map(lugares.map((l) => [l.slug, l.datos]));
  const informe = { completados: [] as string[], sinFicha: [] as string[] };
  const escrituras: { sql: string; params: unknown[] }[] = [];
  for (const e of eventos) {
    const slugLugar = e.datos.lugar as string | undefined;
    if (!slugLugar) continue;
    const lugar = porSlug.get(slugLugar);
    if (!lugar) { informe.sinFicha.push(`${e.slug} → ${slugLugar}`); continue; }
    const { datos, completado } = completarVacios(e.datos, { sede: lugar.titulo, lugarManual: { direccion: lugar.direccion } });
    if (!completado) continue;
    informe.completados.push(e.slug);
    escrituras.push({ sql: "update public.contenidos set datos = $3::text::jsonb where coleccion = $1 and slug = $2", params: ["eventos", e.slug, JSON.stringify(datos)] });
  }
  console.log(`Eventos con el lugar completado: ${informe.completados.length}. Enlazados a una ficha que no existe: ${informe.sinFicha.length}.`);
  if (escribir) await transaccion(async (tx) => { for (const w of escrituras) await tx(w.sql, w.params); });
  return informe;
}

/* ---- talleres anuales (planilla de Gestión Cultural, sin base) ---- */

/**
 * La planilla .xlsx → datos/cultura/talleres.json. No toca la base: el archivo se revisa y se versiona.
 * En prueba en seco solo muestra qué leyó y los problemas de la planilla.
 */
function importarTalleres() {
  const i = args.indexOf("--desde-planilla");
  const archivo = i >= 0 ? args[i + 1] : undefined;
  if (!archivo || !fs.existsSync(archivo)) throw new Error("Indicá la planilla: --desde-planilla \"ruta/al/archivo.xlsx\".");
  const { talleres, problemas } = talleresDeLaPlanilla(leerXlsx(fs.readFileSync(archivo)));
  const porCentro = Object.entries(Object.groupBy(talleres, (t) => t.centro)).map(([c, l]) => `${c} (${l?.length ?? 0})`);
  console.log(`Talleres: ${talleres.length} → ${porCentro.join(", ")}.`);
  if (problemas.length) {
    console.log(`Problemas de la planilla para corregir (${problemas.length}):`);
    for (const p of problemas) console.log(`  - ${p.centro} · ${p.taller}: ${p.problema}`);
  }
  if (escribir) {
    const datos: ArchivoTalleres = {
      fuente: `Planilla «${path.basename(archivo)}» de la Dirección de Gestión Cultural`,
      actualizado: new Date().toISOString().slice(0, 10),
      talleres,
    };
    fs.writeFileSync(path.join(process.cwd(), "datos", "cultura", "talleres.json"), `${JSON.stringify(datos, null, 2)}\n`);
  }
  return { talleres: talleres.length, problemas };
}

/* ---- principal ---- */

if (comando === "talleres") {
  try {
    const resultado = importarTalleres();
    fs.writeFileSync(reporte, JSON.stringify({ generado: new Date().toISOString(), modo: escribir ? "escritura" : "prueba en seco", comando: args, resultado }, null, 2));
    console.log(escribir ? `Listo: datos/cultura/talleres.json. Informe: ${reporte}` : `PRUEBA EN SECO: no se escribió nada. Informe: ${reporte}. Para guardar, repetí con --escribir.`);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  }
  process.exit();
}

const base = await abrirBase();
try {
  let resultado: unknown;
  if (comando === "espacios") resultado = await importarEspacios(base.q, base.transaccion);
  else if (comando === "eventos") resultado = await importarEventos(base.q, base.transaccion);
  else if (comando === "completar-lugares") resultado = await completarLugares(base.q, base.transaccion);
  else {
    console.error("Uso: npm run cultura -- espacios | eventos --desde-base | eventos --desde-wordpress | completar-lugares | talleres --desde-planilla X  [--escribir] [--actualizar] [--fotos]");
    process.exitCode = 1;
  }
  if (resultado) {
    fs.writeFileSync(reporte, JSON.stringify({ generado: new Date().toISOString(), modo: escribir ? "escritura" : "prueba en seco", comando: args, resultado }, null, 2));
    console.log(escribir ? `Listo. Informe: ${reporte}` : `PRUEBA EN SECO: no se escribió nada. Informe: ${reporte}. Para cargar, repetí con --escribir.`);
  }
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await base.cerrar();
}
