import type { Metadata } from "next";

import BicitourRouteEditor from "@/components/buses/admin/BicitourRouteEditor";
import { AvisoBusesSinBase } from "@/components/admin/AvisoBusesSinBase";
import { requerirPermiso } from "@/lib/admin/sesion";
import { busesDisponible } from "@/lib/buses/db";

export const metadata: Metadata = { title: "Recorrido de BiciTour" };

/** Recorrido de BiciTour. Portado del panel de BotTurismo; los datos vienen de la base del Bus Turístico. */
export default async function Pagina({ params }: PageProps<"/admin/buses/bicitour/[id]">) {
  await requerirPermiso("buses", "ver");
  if (!busesDisponible()) return <AvisoBusesSinBase titulo="Recorrido de BiciTour" />;
  const { id } = await params;
  return (
    <div className="mod-buses">
      <BicitourRouteEditor routeId={Number(id)} />
    </div>
  );
}
