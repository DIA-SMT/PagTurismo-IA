import type { Metadata } from "next";

import InteractionsPage from "@/components/buses/admin/InteractionsPage";
import { AvisoBusesSinBase } from "@/components/admin/AvisoBusesSinBase";
import { requerirPermiso } from "@/lib/admin/sesion";
import { busesDisponible } from "@/lib/buses/db";

export const metadata: Metadata = { title: "Interacciones con Migue" };

/** Interacciones con Migue. Portado del panel de BotTurismo; los datos vienen de la base del Bus Turístico. */
export default async function Pagina() {
  await requerirPermiso("migue", "ver");
  if (!busesDisponible()) return <AvisoBusesSinBase titulo="Interacciones con Migue" />;
  return (
    <div className="mod-buses">
      <InteractionsPage />
    </div>
  );
}
