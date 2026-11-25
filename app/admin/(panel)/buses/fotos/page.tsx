import type { Metadata } from "next";

import PhotoBooksPage from "@/components/buses/admin/PhotoBooksPage";
import { AvisoBusesSinBase } from "@/components/admin/AvisoBusesSinBase";
import { requerirPermiso } from "@/lib/admin/sesion";
import { busesDisponible } from "@/lib/buses/db";

export const metadata: Metadata = { title: "Books de fotos" };

/** Books de fotos. Portado del panel de BotTurismo; los datos vienen de la base del Bus Turístico. */
export default async function Pagina() {
  await requerirPermiso("buses", "ver");
  if (!busesDisponible()) return <AvisoBusesSinBase titulo="Books de fotos" />;
  return (
    <div className="mod-buses">
      <PhotoBooksPage />
    </div>
  );
}
