import type { Metadata } from "next";

import BicitourAdminPage from "@/components/buses/admin/BicitourAdminPage";
import { AvisoBusesSinBase } from "@/components/admin/AvisoBusesSinBase";
import { requerirPermiso } from "@/lib/admin/sesion";
import { busesDisponible } from "@/lib/buses/db";

export const metadata: Metadata = { title: "BiciTour" };

/** BiciTour. Portado del panel de BotTurismo; los datos vienen de la base del Bus Turístico. */
export default async function Pagina() {
  await requerirPermiso("buses", "ver");
  if (!busesDisponible()) return <AvisoBusesSinBase titulo="BiciTour" />;
  return (
    <div className="mod-buses">
      <BicitourAdminPage />
    </div>
  );
}
