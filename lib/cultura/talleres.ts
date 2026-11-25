/**
 * Talleres anuales de los centros culturales (planilla «HORARIO TALLERES ANUALES» de la Dirección de
 * Gestión Cultural). La planilla tiene una hoja por centro con una grilla: número, taller, una columna
 * por día (lunes a sábado) y, en las filas de abajo, el detalle y el profesor. Esto la convierte en datos
 * y anota lo que no se puede leer bien, para corregirlo en la planilla. Funciones puras: se prueban sin
 * archivos.
 */
import type { FilaPlanilla, HojaPlanilla } from "./planilla.ts";

/** 1 = lunes … 6 = sábado. */
export type DiaTaller = 1 | 2 | 3 | 4 | 5 | 6;
export type HorarioTaller = { dia: DiaTaller; desde: string; hasta?: string; nota?: string };
export type Disciplina = "danza" | "musica" | "artes" | "oficios" | "bienestar" | "letras" | "teatro" | "otros";
export type Taller = {
  id: string;
  titulo: string;
  /** Línea aclaratoria de la planilla («Folklore infantil / folklore adultos»). */
  detalle?: string;
  profesor?: string;
  /** Slug del espacio cultural en el portal. */
  centro: string;
  /** La planilla separa los talleres municipales de los «no municipales». */
  municipal: boolean;
  disciplina: Disciplina;
  /** Hay horarios o detalles para chicos o adolescentes. */
  paraChicos: boolean;
  horarios: HorarioTaller[];
};
export type ProblemaTaller = { centro: string; taller: string; problema: string };
export type ArchivoTalleres = { fuente: string; actualizado: string; talleres: Taller[] };

export const DIAS_TALLER: DiaTaller[] = [1, 2, 3, 4, 5, 6];
export const DISCIPLINAS: Disciplina[] = ["danza", "musica", "artes", "oficios", "bienestar", "letras", "teatro", "otros"];

/** Nombre del centro en la planilla → slug del espacio en el portal. */
const CENTROS: [RegExp, string][] = [
  [/bicentenario/, "casa-del-bicentenario"],
  [/mercedes sosa|ccms/, "centro-cultural-mercedes-sosa"],
  [/don bosco|c\.?c\.?d\.?b/, "centro-cultural-don-bosco"],
  [/casa de la cultura/, "casa-de-la-cultura"],
];

const DIAS: Record<string, DiaTaller> = { lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6 };

const sinTildes = (t: string) => t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Palabras de la planilla que llegan sin tilde. */
const TILDES: Record<string, string> = {
  artesanias: "artesanías", ceramica: "cerámica", acrilica: "acrílica", molderia: "moldería", pedreria: "pedrería",
  arabe: "árabe", sublimacion: "sublimación", comunicacion: "comunicación", musica: "música", republica: "república",
  jardin: "jardín", norteno: "norteño", oleo: "óleo", confeccion: "confección", ninos: "niños", jovenes: "jóvenes",
};

const MENORES = new Set(["de", "del", "la", "las", "el", "los", "y", "en"]);

/** «FOLKLORE "VIEJO VIZCACHA"» → «Folklore «Viejo Vizcacha»»; «CERAMICA -INICIAL-» → «Cerámica (inicial)». */
export function prolijo(texto: string): string {
  let t = texto.toLowerCase().replace(/\s+,/g, ",").replace(/\s*-\s*([^-]+?)\s*-\s*$/, " ($1)").trim();
  t = t.replace(/[\p{L}]+/gu, (p) => TILDES[sinTildes(p)] ?? p);
  t = t.replace(/["“]([^"”]+)["”]/g, (_, dentro: string) => `«${dentro.replace(/(^|\s|')(\p{L}+)/gu, (m, a: string, p: string) =>
    a + (a && MENORES.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))}»`);
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** «PROF. VERONICA VILLAFAÑE» → «Veronica Villafañe». */
const nombre = (t: string) =>
  t.replace(/^prof(\.|esor[a]?)?\s*/i, "").toLowerCase().replace(/(^|\s|-)(\p{L})/gu, (m, a: string, l: string) => a + l.toUpperCase()).trim();

export function disciplinaDe(titulo: string): Disciplina {
  const t = sinTildes(titulo);
  if (/folklore|tango|danza|ballet|caporales|hip.?hop|breaking|baile|academia|malambo|latinas/.test(t)) return "danza";
  if (/guitarra|canto|murga|musica/.test(t)) return "musica";
  if (/teatro/.test(t)) return "teatro";
  if (/pintura|dibujo|anime|ceramica|mosaiq|origami|oleo/.test(t)) return "artes";
  if (/corte|confeccion|diseno|molderia|tejido|bordado|deco|sublimacion|artesania|bijouterie|reciclad/.test(t)) return "oficios";
  if (/yoga|gimnasia|acrobacia/.test(t)) return "bienestar";
  if (/literario|lectura|radio|streaming|filatelia|comunicacion/.test(t)) return "letras";
  return "otros";
}

const hora = (h: string) => {
  const [a, b] = h.replace(".", ":").split(":");
  return `${a.padStart(2, "0")}:${b}`;
};

/**
 * Lee la celda de un día: «20:00 A 22:00», «19:30 A 20:30 /20:30 A 22:00»,
 * «19:00 A 20:30 (NIÑOS) 20:30 A 22:00 (ADULTOS)». Corrige la letra O escrita en lugar del cero.
 */
export function leerHorarios(celda: string, dia: DiaTaller, anotar: (p: string) => void): HorarioTaller[] {
  let texto = celda;
  if (/\dO|O\d/.test(texto)) {
    anotar(`«${celda}»: tiene una letra O en lugar de un cero`);
    texto = texto.replace(/(\d)O/g, "$10").replace(/O(\d)/g, "0$1");
  }
  const horarios: HorarioTaller[] = [];
  for (const m of texto.matchAll(/(\d{1,2}[:.]\d{2})(?:\s*a\s*(\d{1,2}[:.]\d{2}))?\s*(?:\(\s*([^)]*?)\s*\))?/gi)) {
    const desde = hora(m[1]);
    let hasta = m[2] ? hora(m[2]) : undefined;
    if (!hasta) anotar(`«${celda}»: falta la hora de fin`);
    else if (hasta <= desde) {
      anotar(`«${celda}»: la hora de fin (${hasta}) es anterior a la de inicio`);
      hasta = undefined;
    }
    horarios.push({ dia, desde, ...(hasta ? { hasta } : {}), ...(m[3] ? { nota: prolijo(m[3]) } : {}) });
  }
  if (!horarios.length) anotar(`«${celda}»: no se entiende el horario`);
  return horarios;
}

const slug = (t: string) => sinTildes(t).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Una hoja de la planilla (un centro cultural) → sus talleres y los problemas encontrados. */
export function talleresDeLaHoja(hoja: HojaPlanilla): { centro: string | null; talleres: Taller[]; problemas: ProblemaTaller[] } {
  const filas = hoja.filas;
  const nombreCentro = filas.slice(0, 4).flatMap((f) => Object.values(f.celdas)).find((v) => !/talleres \d{4}/i.test(v)) ?? hoja.nombre;
  const centro = CENTROS.find(([re]) => re.test(sinTildes(nombreCentro)) || re.test(sinTildes(hoja.nombre)))?.[1] ?? null;
  const problemas: ProblemaTaller[] = [];
  if (!centro) return { centro, talleres: [], problemas: [{ centro: hoja.nombre, taller: "", problema: `No reconozco el centro «${nombreCentro}»` }] };

  // La fila de títulos dice en qué columna está cada día y la del taller.
  const titulos = filas.find((f) => Object.values(f.celdas).some((v) => /^talleres$/i.test(v)));
  if (!titulos) return { centro, talleres: [], problemas: [{ centro, taller: "", problema: "No encuentro la fila de títulos (TALLERES, LUNES…)" }] };
  const colTaller = Object.entries(titulos.celdas).find(([, v]) => /^talleres$/i.test(v))![0];
  const colDias = Object.entries(titulos.celdas).flatMap(([col, v]) => (DIAS[sinTildes(v)] ? [[col, DIAS[sinTildes(v)]] as const] : []));
  const colNumero = String.fromCharCode(colTaller.charCodeAt(0) - 1);

  const talleres: Taller[] = [];
  let municipal = true;
  let actual: { titulo: string; lineas: string[]; horarios: HorarioTaller[]; municipal: boolean } | null = null;
  const cerrar = () => {
    if (!actual) return;
    const profesor = actual.lineas.at(-1);
    const detalle = actual.lineas.slice(0, -1).join(" · ");
    const titulo = prolijo(actual.titulo);
    const texto = sinTildes(`${actual.titulo} ${detalle} ${actual.horarios.map((h) => h.nota ?? "").join(" ")}`);
    if (!actual.horarios.length) problemas.push({ centro, taller: titulo, problema: "No tiene días ni horarios" });
    if (!profesor) problemas.push({ centro, taller: titulo, problema: "No figura quién lo dicta" });
    talleres.push({
      id: slug(`${centro}-${actual.titulo}`),
      titulo,
      ...(detalle ? { detalle: prolijo(detalle) } : {}),
      ...(profesor ? { profesor: nombre(profesor) } : {}),
      centro,
      municipal: actual.municipal,
      disciplina: disciplinaDe(actual.titulo),
      paraChicos: /nin[oa]s|infantil|adolescente|jovenes/.test(texto),
      horarios: actual.horarios,
    });
    actual = null;
  };

  for (const fila of filas.filter((f: FilaPlanilla) => f.n > titulos.n)) {
    const c = fila.celdas;
    const grupo = Object.values(c).find((v) => /^(no )?municipales$/i.test(v));
    if (grupo) municipal = !/^no /i.test(grupo);
    if (c[colNumero] && /^\d+$/.test(c[colNumero]) && c[colTaller]) {
      cerrar();
      actual = { titulo: c[colTaller], lineas: [], horarios: [], municipal };
      for (const [col, dia] of colDias) {
        if (c[col]) actual.horarios.push(...leerHorarios(c[col], dia, (p) => problemas.push({ centro, taller: prolijo(c[colTaller]), problema: p })));
      }
    } else if (actual && c[colTaller]) {
      actual.lineas.push(c[colTaller]);
    }
  }
  cerrar();
  // Mismo taller dos veces en el mismo centro (mismo nombre): ids distintos.
  const vistos = new Map<string, number>();
  for (const t of talleres) {
    const n = (vistos.get(t.id) ?? 0) + 1;
    vistos.set(t.id, n);
    if (n > 1) t.id = `${t.id}-${n}`;
  }
  return { centro, talleres, problemas };
}

/** Toda la planilla: los talleres de todos los centros y la lista de problemas. */
export function talleresDeLaPlanilla(hojas: HojaPlanilla[]): { talleres: Taller[]; problemas: ProblemaTaller[] } {
  const partes = hojas.map(talleresDeLaHoja);
  return { talleres: partes.flatMap((p) => p.talleres), problemas: partes.flatMap((p) => p.problemas) };
}

const BORDE = "[^a-z0-9áéíóúñü]";
const TALLER = new RegExp(`(^|${BORDE})(taller(es)?|clases?|cursos?)($|${BORDE})`, "i");
const ANUAL = /talleres?\s+(culturales\s+)?anuales?/i;

/** Clases, cursos o talleres (por el título o el resumen). */
export const esTaller = (o: { titulo: string; resumen?: string }) => TALLER.test(`${o.titulo} ${o.resumen ?? ""}`);

/**
 * Un taller ANUAL de los centros culturales (no un taller de un día en un museo): dice «talleres culturales
 * anuales» o es un taller con muchas fechas por delante (una por semana). Van en /talleres, no en la agenda.
 */
export const esTallerAnual = (o: { titulo: string; resumen?: string }, fechasPorDelante = 0) =>
  ANUAL.test(`${o.titulo} ${o.resumen ?? ""}`) || (esTaller(o) && fechasPorDelante >= 8);

/** Filtros de la página de talleres (se leen de la URL). */
export type FiltrosTalleres = { q: string; centro: string; dia: number; disciplina: string; chicos: boolean };

export function filtrarTalleres(talleres: Taller[], f: FiltrosTalleres, nombreDe: (centro: string) => string = (c) => c): Taller[] {
  const q = sinTildes(f.q.trim());
  return talleres.filter((t) =>
    (!f.centro || t.centro === f.centro)
    && (!f.dia || t.horarios.some((h) => h.dia === f.dia))
    && (!f.disciplina || t.disciplina === f.disciplina)
    && (!f.chicos || t.paraChicos)
    && (!q || sinTildes(`${t.titulo} ${t.detalle ?? ""} ${t.profesor ?? ""} ${nombreDe(t.centro)}`).includes(q)));
}
