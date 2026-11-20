// Copiado de DIA-SMT/Agenda-Cultural (src/lib/importacion/eventon.mjs, commit df005ae) sin cambios de lógica.
// El portal lo usa en scripts/cultura.ts; la conversión al modelo del portal está en lib/cultura/importar.ts.
// Mapeo de los eventos del WordPress anterior (EventON 5) al esquema de la Agenda.
// Funciones puras: las usa scripts/importar-eventos.mjs, que baja los datos y escribe en la base.
//
// Fuentes (todas públicas):
//   · /wp-json/wp/v2/ajde_events      título, slug, descripción, enlace y categorías de cada evento;
//   · /wp-json/wp/v2/event_type{,_2,_3}  nombres de las categorías;
//   · POST /?evo-ajax=eventon_init_load  lo mismo que pide el calendario de /que-hacer/: cada función con su
//     horario, los metadatos de EventON (subtítulo, destacado, hora de cierre oculta) y el HTML de las tarjetas,
//     que trae el lugar en microdatos schema.org.

// Argentina no aplica horario de verano: Tucumán está siempre en UTC−3.
const TUCUMAN_OFFSET_SECONDS = 3 * 60 * 60;

// Lugares del sitio anterior que corresponden a un lugar ya cargado con otro nombre. Las coincidencias exactas
// (sin tildes ni mayúsculas) no hace falta listarlas. Ojo: "Casa de la Ciudad" (Catamarca 920) NO es la
// Casa Museo de la Ciudad; por eso no se compara por palabras sueltas.
export const PLACE_ALIASES = {
  "mia (museo de la industria azucarera)": "museo-de-la-industria-azucarera-mia",
  "museo mercedes sosa casa natal": "museo-mercedes-sosa",
  "casa historica": "casa-historica",
};

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", laquo: "«", raquo: "»", ndash: "–", mdash: "—", hellip: "…", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”" };

export function decodeEntities(text) {
  return String(text ?? "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => ENTITIES[name.toLowerCase()] ?? match);
}

/** Descripción de WordPress (bloques de Gutenberg) a párrafos de texto plano. */
export function htmlToParagraphs(html) {
  return decodeEntities(String(html ?? "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, ""))
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/[ \t ]+/g, " ").replace(/ *\n */g, "\n").trim())
    .filter((paragraph) => paragraph && !/^[•\s]*$/.test(paragraph));
}

function truncate(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" ") > max * 0.6 ? cut.lastIndexOf(" ") : max).replace(/[,;:.\s]+$/, "")}…`;
}

/** El subtítulo de EventON; si no hay, la descripción de Yoast; si no, el comienzo de la descripción. */
export function summaryFrom({ subtitle, metaDescription, paragraphs }) {
  const candidate = [subtitle, metaDescription].map((value) => decodeEntities(value ?? "").replace(/\s+/g, " ").trim()).find(Boolean)
    ?? paragraphs[0] ?? "";
  // Se ve debajo del título: más de un par de renglones tapa la foto.
  return candidate ? truncate(candidate, 220) : null;
}

const FREE = /gratuit|entrada libre|acceso libre|sin costo|libre y gratuit/i;
export function accessTypeFrom(texts) {
  return texts.some((text) => FREE.test(text ?? "")) ? "free" : "check";
}

export function normalizeName(name) {
  return decodeEntities(name ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Nombre de categoría prolijo: sin puntuación suelta al final y con mayúscula inicial. */
export function categoryName(name) {
  const clean = decodeEntities(name).trim().replace(/[\s,.;:]+$/, "");
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/** Lugar e imagen de cada evento, leídos de los microdatos schema.org de su primera tarjeta. */
export function cardDetails(html) {
  const details = new Map();
  for (const match of String(html ?? "").matchAll(/<div id="event_(\d+)_\d+"[\s\S]*?<\/script>/g)) {
    if (details.has(match[1])) continue;
    const card = match[0];
    const location = card.match(/itemprop="location"[\s\S]*?itemprop="name">([^<]*)</)?.[1];
    const address = card.match(/itemprop="streetAddress">([^<]*)</)?.[1];
    const image = card.match(/itemprop='image' content="([^"]+)"/)?.[1];
    details.set(match[1], {
      placeName: location ? decodeEntities(location).trim() : null,
      address: address ? decodeEntities(address).trim() : null,
      image: image ?? null,
    });
  }
  return details;
}

/**
 * Funciones de un evento. `unix_start`/`unix_end` son los instantes que EventON calcula con la zona del evento
 * (`timezone_offset`, en segundos al oeste de UTC). Coinciden con la hora cargada en 381 de 383 eventos; los otros
 * 2 quedaron con zona UTC por error, y ahí la hora cargada es la de Tucumán: se corrige con la diferencia.
 * (`event_start_unix` no sirve: según cómo se guardó el evento es la hora de pared o el instante real.)
 * Si el cierre estaba oculto, EventON guarda un 23:59 de relleno: no se importa.
 */
export function occurrencesFrom(instances, hideEndTime) {
  const seen = new Set();
  const occurrences = [];
  for (const instance of [...instances].sort((a, b) => a.unix_start - b.unix_start)) {
    const correction = TUCUMAN_OFFSET_SECONDS - Number(instance.timezone_offset ?? TUCUMAN_OFFSET_SECONDS);
    const start = Number(instance.unix_start) + correction;
    const end = Number(instance.unix_end) + correction;
    if (!Number.isFinite(start) || seen.has(start)) continue;
    seen.add(start);
    occurrences.push({
      startsAt: new Date(start * 1000).toISOString(),
      endsAt: hideEndTime || !Number.isFinite(end) || end <= start ? null : new Date(end * 1000).toISOString(),
    });
  }
  return occurrences;
}

const meta = (instance, key) => instance?.event_pmv?.[key]?.[0] ?? null;

/**
 * Arma el plan de importación.
 * @param wpEvents   registros de /wp/v2/ajde_events
 * @param instances  arreglo `json` del calendario de EventON (una entrada por función)
 * @param cardsHtml  HTML de las tarjetas del calendario
 * @param terms      términos de las tres taxonomías: [{ id, slug, name }]
 * @param places     lugares ya cargados: [{ slug, name }]
 */
export function buildPlan({ wpEvents, instances, cardsHtml, terms, places }) {
  const termsById = new Map(terms.map((term) => [term.id, term]));
  const placesByName = new Map(places.map((place) => [normalizeName(place.name), place.slug]));
  const placeSlugs = new Set(places.map((place) => place.slug));
  const instancesById = new Map();
  for (const instance of instances) {
    const key = String(instance.ID);
    if (!instancesById.has(key)) instancesById.set(key, []);
    instancesById.get(key).push(instance);
  }
  const cards = cardDetails(cardsHtml);

  const categories = new Map();
  const warnings = [];
  const events = [];
  for (const wp of wpEvents) {
    const legacyId = String(wp.id);
    const own = instancesById.get(legacyId) ?? [];
    const first = own[0];
    const occurrences = occurrencesFrom(own, meta(first, "evo_hide_endtime") === "yes");
    if (!occurrences.length) warnings.push(`${wp.slug}: sin fechas en EventON`);

    const card = cards.get(legacyId) ?? {};
    const aliasSlug = card.placeName ? PLACE_ALIASES[normalizeName(card.placeName)] : undefined;
    const placeSlug = card.placeName
      ? (placesByName.get(normalizeName(card.placeName)) ?? (aliasSlug && placeSlugs.has(aliasSlug) ? aliasSlug : null))
      : null;

    const eventCategories = [];
    for (const id of [...(wp.event_type ?? []), ...(wp.event_type_2 ?? []), ...(wp.event_type_3 ?? [])]) {
      const term = termsById.get(id);
      if (!term) continue;
      if (!categories.has(term.slug)) categories.set(term.slug, { slug: term.slug, name: categoryName(term.name) });
      if (!eventCategories.includes(term.slug)) eventCategories.push(term.slug);
    }

    const title = decodeEntities(wp.title?.rendered ?? "").trim();
    const paragraphs = htmlToParagraphs(wp.content?.rendered);
    events.push({
      legacyId,
      legacyUrl: wp.link,
      slug: wp.slug,
      title,
      summary: summaryFrom({ subtitle: meta(first, "evcal_subtitle"), metaDescription: meta(first, "_yoast_wpseo_metadesc"), paragraphs }),
      description: paragraphs.join("\n\n") || null,
      // En el sitio anterior el 73 % de los eventos estaba marcado como destacado: así no distingue nada.
      // Los destacados se eligen de nuevo desde el panel.
      featured: false,
      accessType: accessTypeFrom([title, meta(first, "evcal_subtitle"), ...paragraphs]),
      placeSlug,
      customPlaceName: placeSlug ? null : (card.placeName || "Lugar a confirmar"),
      customAddress: placeSlug ? null : card.address,
      image: card.image,
      categorySlugs: eventCategories,
      occurrences,
    });
  }
  return { events, categories: [...categories.values()], warnings };
}

/** Totales para el informe de la prueba en seco. */
export function summarize(plan, now = new Date()) {
  const pending = (event) => event.occurrences.some((o) => Date.parse(o.endsAt ?? o.startsAt) >= now.getTime());
  const linked = {};
  const custom = {};
  for (const event of plan.events) {
    if (event.placeSlug) linked[event.placeSlug] = (linked[event.placeSlug] ?? 0) + 1;
    else custom[event.customPlaceName] = (custom[event.customPlaceName] ?? 0) + 1;
  }
  return {
    events: plan.events.length,
    withPendingDates: plan.events.filter(pending).length,
    occurrences: plan.events.reduce((total, event) => total + event.occurrences.length, 0),
    free: plan.events.filter((event) => event.accessType === "free").length,
    linkedPlaces: linked,
    customPlaces: custom,
    categories: plan.categories.length,
    images: new Set(plan.events.map((event) => event.image).filter(Boolean)).size,
    warnings: plan.warnings,
  };
}
