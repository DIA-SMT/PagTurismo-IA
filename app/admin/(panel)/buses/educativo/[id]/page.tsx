import type { Metadata } from "next";

import EducationalRequestDetailPage from "@/components/buses/admin/EducationalRequestDetailPage";
import { AvisoBusesSinBase } from "@/components/admin/AvisoBusesSinBase";
import { requerirPermiso } from "@/lib/admin/sesion";
import { busesDisponible } from "@/lib/buses/db";

export const metadata: Metadata = { title: "Solicitud del Bus Educativo" };

/** Solicitud del Bus Educativo. Portado del panel de BotTurismo; los datos vienen de la base del Bus Turístico. */
export default async function Pagina({ params }: PageProps<"/admin/buses/educativo/[id]">) {
  await requerirPermiso("buses", "ver");
  if (!busesDisponible()) return <AvisoBusesSinBase titulo="Solicitud del Bus Educativo" />;
  const { id } = await params;
  return (
    <div className="mod-buses">
      <EducationalRequestDetailPage requestId={id} />
    </div>
  );
}
