/**
 * Convierte la descripción de un evento (un bloque de texto, como llega de la Agenda o del WordPress viejo) en
 * partes que se pueden mostrar sin obligar a leer todo: datos clave («Duración: …», «Punto de encuentro: …»,
 * «presentarse 10 minutos antes», «se suspende por lluvia»), un itinerario con sus paradas, los enlaces como
 * botones y el resto como párrafos. No inventa nada: si no reconoce una forma, el texto queda tal cual.
 */

export type ClaveDato = "duracion" | "encuentro" | "horario" | "lugar" | "costo" | "cupo" | "edad" | "requisitos" | "organiza" | "docente";
export type DatoDescripcion = { clave: ClaveDato; valor: string };
export type ParadaItinerario = { titulo: string; detalle?: string };
export type EnlaceDescripcion = { url: string; tipo: "inscripcion" | "info" };
export type DescripcionEstructurada = {
  datos: DatoDescripcion[];
  /** Minutos antes que hay que presentarse. */
  anticipacion?: number;
  suspendePorLluvia: boolean;
  itinerario: ParadaItinerario[];
  enlaces: EnlaceDescripcion[];
  parrafos: string[];
};

/** Rótulos que se reconocen como «Rótulo: valor» dentro del texto. */
const ROTULOS: [RegExp, ClaveDato][] = [
  [/duraci[oó]n/i, "duracion"],
  [/punto de encuentro|lugar de encuentro|encuentro/i, "encuentro"],
  [/horarios?|d[ií]as y horarios?/i, "horario"],
  [/lugar|sede|d[oó]nde/i, "lugar"],
  [/costo|valor|precio|entrada/i, "costo"],
  [/cupos?/i, "cupo"],
  [/edad(es)?|para (ni[nñ]os|chicos|adultos)/i, "edad"],
  [/requisitos?|traer|llevar/i, "requisitos"],
  [/organiza|organizan/i, "organiza"],
  [/docentes?|profesor(a|es)?|a cargo de|coordina/i, "docente"],
];
const ROTULO = new RegExp(
  `(?:^|(?<=[.\\s]))(${ROTULOS.map(([re]) => re.source).join("|")})\\s*:\\s*`,
  "gi",
);

const URL = /https?:\/\/[^\s<>()"']+[^\s<>()"'.,;:!?]/gi;
const ANTICIPACION = /present[aá](?:rse|te)\s+(\d{1,3})\s*(?:minutos|min\.?)\s+antes\.?/i;
const LLUVIA = /(?:la actividad\s+)?se\s+suspende(?:r[aá])?\s+(?:por|en caso de|si hay)\s+lluvias?\.?/i;
const ITINERARIO = /^\s*(itinerario|recorrido|programa|paradas|cronograma)\s*:\s*/i;

const normalizar = (t: string) => t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const limpio = (t: string) => t.replace(/\s+/g, " ").replace(/\s+([.,;:])/g, "$1").trim();
const claveDe = (rotulo: string): ClaveDato => ROTULOS.find(([re]) => new RegExp(`^(?:${re.source})$`, "i").test(rotulo.trim()))?.[1] ?? "lugar";

/** «Museo de la Casa Histórica.» → { titulo }; «Paseo Calle Congreso: Museo Provincial…» → { titulo, detalle }. */
function parada(texto: string): ParadaItinerario | null {
  const t = limpio(texto).replace(/[.;]\s*$/, "");
  if (!t) return null;
  const i = t.indexOf(":");
  if (i > 0 && i <= 60) {
    const detalle = limpio(t.slice(i + 1));
    return { titulo: limpio(t.slice(0, i)), ...(detalle ? { detalle: detalle.charAt(0).toUpperCase() + detalle.slice(1) } : {}) };
  }
  return { titulo: t };
}

export function estructurarDescripcion(texto: string | undefined, resumen = ""): DescripcionEstructurada {
  const r: DescripcionEstructurada = { datos: [], suspendePorLluvia: false, itinerario: [], enlaces: [], parrafos: [] };
  if (!texto?.trim()) return r;
  const yaDicho = normalizar(resumen);

  // «Itinerario:» solo en una línea, con cada parada en la suya («• Museo…»).
  let enItinerario = false;
  for (const bloque of texto.split(/\n\s*\n|\n/)) {
    let p = limpio(bloque);
    if (!p || (yaDicho && normalizar(p) === yaDicho)) continue;
    if (ITINERARIO.test(p) && !limpio(p.replace(ITINERARIO, ""))) { enItinerario = true; continue; }
    if (enItinerario && /^[•·▪●\-–]\s*/.test(p)) {
      const x = parada(p.replace(/^[•·▪●\-–]\s*/, ""));
      if (x) r.itinerario.push(x);
      continue;
    }
    enItinerario = false;

    // Enlaces: botones. La frase que solo los presenta («… a través del siguiente enlace: URL») se va.
    for (const url of p.match(URL) ?? []) {
      if (!r.enlaces.some((e) => e.url === url)) r.enlaces.push({ url, tipo: /inscrib|inscripci|anot|reserv|registr/i.test(p) ? "inscripcion" : "info" });
    }
    p = limpio(p.replace(URL, ""));
    if (/(siguiente|este|el)\s+(enlace|link)\s*:?\s*$/i.test(p) || /^(m[aá]s info(rmaci[oó]n)?|link|enlace)\s*:?\s*$/i.test(p)) continue;

    const minutos = p.match(ANTICIPACION);
    if (minutos) { r.anticipacion = Number(minutos[1]); p = limpio(p.replace(ANTICIPACION, "")); }
    if (LLUVIA.test(p)) { r.suspendePorLluvia = true; p = limpio(p.replace(LLUVIA, "")); }

    // Itinerario: «Itinerario: • parada • parada…» o un párrafo con tres viñetas o más.
    const vinetas = p.split(/\s*[•·▪●]\s*/).filter(Boolean);
    if (ITINERARIO.test(p) || vinetas.length >= 4) {
      const cuerpo = p.replace(ITINERARIO, "");
      const partes = cuerpo.split(/\s*[•·▪●]\s*/).map(parada).filter((x): x is ParadaItinerario => !!x);
      if (partes.length >= 2) { r.itinerario.push(...partes); continue; }
    }

    // «Rótulo: valor» (puede haber varios seguidos en el mismo párrafo).
    const marcas = [...p.matchAll(ROTULO)];
    if (marcas.length) {
      const antes = limpio(p.slice(0, marcas[0].index));
      marcas.forEach((m, i) => {
        const desde = m.index! + m[0].length;
        const hasta = i + 1 < marcas.length ? marcas[i + 1].index! : p.length;
        const valor = limpio(p.slice(desde, hasta)).replace(/\.$/, "");
        const clave = claveDe(m[1]);
        if (valor && valor.length <= 160 && !r.datos.some((d) => d.clave === clave)) r.datos.push({ clave, valor });
        else if (valor) r.parrafos.push(`${m[1]}: ${valor}`);
      });
      if (antes) r.parrafos.push(antes);
      continue;
    }
    if (p && !/^[.,;:]+$/.test(p)) r.parrafos.push(p);
  }
  return r;
}
