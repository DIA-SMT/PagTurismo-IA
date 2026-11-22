import type { Metadata } from "next";

import TouristDeparturesPage from "@/components/buses/admin/TouristDeparturesPage";
import { AvisoBusesSinBase } from "@/components/admin/AvisoBusesSinBase";
import { requerirPermiso } from "@/lib/admin/sesion";
import { busesDisponible } from "@/lib/buses/db";

export const metadata: Metadata = { title: "Salidas y reservas" };

/** Salidas y reservas. Portado del panel de BotTurismo; los datos vienen de la base del Bus Turístico. */
export default async function Pagina() {
  await requerirPermiso("buses", "ver");
  if (!busesDisponible()) return <AvisoBusesSinBase titulo="Salidas y reservas" />;
  return (
    <div className="mod-buses">
      <TouristDeparturesPage />
    </div>
  );
}
