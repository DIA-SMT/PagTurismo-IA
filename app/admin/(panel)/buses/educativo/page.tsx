import type { Metadata } from "next";

import EducationalRequestsPage from "@/components/buses/admin/EducationalRequestsPage";
import { AvisoBusesSinBase } from "@/components/admin/AvisoBusesSinBase";
import { requerirPermiso } from "@/lib/admin/sesion";
import { busesDisponible } from "@/lib/buses/db";

export const metadata: Metadata = { title: "Bus Educativo" };

/** Bus Educativo. Portado del panel de BotTurismo; los datos vienen de la base del Bus Turístico. */
export default async function Pagina() {
  await requerirPermiso("buses", "ver");
  if (!busesDisponible()) return <AvisoBusesSinBase titulo="Bus Educativo" />;
  return (
    <div className="mod-buses">
      <EducationalRequestsPage />
    </div>
  );
}
