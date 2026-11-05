/** Dónde vive cada entidad. Un solo lugar para armar URLs internas. */
export const rutas = {
  lugar: (slug: string) => `/lugares/${slug}`,
  experiencia: (slug: string) => `/experiencias/${slug}`,
  recorrido: (slug: string) => `/recorridos/${slug}`,
  evento: (slug: string) => `/agenda/${slug}`,
  guia: (slug: string) => `/planifica/${slug}`,
  categoria: (id: string) => `/que-hacer/${id}`,
};

export function esExterno(url: string): boolean {
  return /^https?:\/\//.test(url);
}
