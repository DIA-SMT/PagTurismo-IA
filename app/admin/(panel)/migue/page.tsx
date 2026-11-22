import type { Metadata } from "next";

import FaqsPage from "@/components/buses/admin/FaqsPage";
import { AvisoBusesSinBase } from "@/components/admin/AvisoBusesSinBase";
import { requerirPermiso } from "@/lib/admin/sesion";
import { busesDisponible } from "@/lib/buses/db";

export const metadata: Metadata = { title: "Preguntas frecuentes de Migue" };

/** Preguntas frecuentes de Migue. Portado del panel de BotTurismo; los datos vienen de la base del Bus Turístico. */
export default async function Pagina() {
  await requerirPermiso("migue", "ver");
  if (!busesDisponible()) return <AvisoBusesSinBase titulo="Preguntas frecuentes de Migue" />;
  return (
    <div className="mod-buses">
      <FaqsPage />
    </div>
  );
}
