import type { Metadata } from "next";

import PhotoGallery from "./PhotoGallery";

export const metadata: Metadata = { title: "Fotos del recorrido", robots: { index: false, follow: false } };

/** Book de fotos de una salida (QR impreso). Antes: busturistico.smt.gob.ar/fotos/<token>. */
export default async function Pagina({ params }: PageProps<"/[idioma]/galeria/[token]">) {
  const { token } = await params;
  return <div data-modulo="buses"><PhotoGallery token={token} /></div>;
}
