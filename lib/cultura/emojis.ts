/**
 * Un emoji por categoría para los «stickers» de la portada. Copiado de Agenda Cultural
 * (src/lib/category-emoji.ts): las claves son los identificadores de categoría que trae la
 * importación (casi todos del WordPress viejo); las nuevas caen en las palabras clave de abajo.
 */
const POR_ID: Record<string, string> = {
  "acrobacia-en-tela": "🎪",
  ambiente: "🌿",
  anime: "📺",
  arte: "🖼️",
  bienestar: "🌸",
  bijouterie: "💍",
  "bordado-y-pedreria": "🧵",
  canto: "🎤",
  ceramica: "🏺",
  charla: "💬",
  cine: "🎬",
  cocina: "🍳",
  comedia: "😂",
  "corte-y-confeccion": "✂️",
  costura: "🪡",
  danza: "💃",
  "deco-hogar": "🪴",
  deportes: "⚽",
  desfile: "👗",
  dibujo: "✏️",
  "encuentro-comunitario": "🤝",
  "encuentro-religioso": "🕊️",
  familia: "🎈",
  "ferias-artesanos": "🧺",
  "ferias-gastronomicas": "🥟",
  "ferias-navidenas": "🎄",
  filatelia: "📮",
  folklore: "🥁",
  fotografia: "📷",
  gimnasia: "🤸",
  grafologia: "🖋️",
  historia: "🏛️",
  juegos: "🎲",
  "juventud-y-ninez": "🧒",
  literatura: "📚",
  manualidades: "🖍️",
  musica: "🎵",
  navideno: "🎄",
  origami: "🦢",
  pintura: "🎨",
  radio: "📻",
  reciclado: "♻️",
  representacion: "🎭",
  salud: "🩺",
  sublimacion: "👕",
  taekwondo: "🥋",
  teatro: "🎭",
  tejido: "🧶",
  turismo: "🗺️",
  yoga: "🧘",
};

/** Para identificadores que no están arriba: decide la primera palabra clave que aparezca. */
const POR_PALABRA: [string, string][] = [
  ["feria", "🛍️"],
  ["taller", "🛠️"],
  ["music", "🎵"],
  ["musica", "🎵"],
  ["danza", "💃"],
  ["baile", "💃"],
  ["teatro", "🎭"],
  ["cine", "🎬"],
  ["libro", "📚"],
  ["literatur", "📚"],
  ["deporte", "⚽"],
  ["navid", "🎄"],
  ["cocina", "🍳"],
  ["gastronom", "🍳"],
];

export function emojiDeCategoria(id: string): string {
  return POR_ID[id] ?? POR_PALABRA.find(([palabra]) => id.includes(palabra))?.[1] ?? "✨";
}
