import type { Metadata } from "next";

import { GuidePanel } from "@/components/buses/bicitour/GuidePanel";
import { AvisoBusesSinBase } from "@/components/admin/AvisoBusesSinBase";
import { requerirPermiso } from "@/lib/admin/sesion";
import { busesDisponible } from "@/lib/buses/db";

export const metadata: Metadata = { title: "BiciTour en vivo" };

/** BiciTour en vivo. Portado del panel de BotTurismo; los datos vienen de la base del Bus Turístico. */
export default async function Pagina({ params }: PageProps<"/admin/buses/bicitour/sesion/[id]">) {
  await requerirPermiso("buses", "ver");
  if (!busesDisponible()) return <AvisoBusesSinBase titulo="BiciTour en vivo" />;
  const { id } = await params;
  return (
    <div className="mod-buses">
      <GuidePanel sessionId={Number(id)} />
    </div>
  );
}
