import type { Metadata } from "next";

import { ParticipantExperience } from "@/components/buses/bicitour/ParticipantExperience";

export const metadata: Metadata = {
  title: "BiciTour en vivo",
  description: "Sumate al BiciTour de la Municipalidad de San Miguel de Tucumán: historia, juego y recorrido en vivo.",
  robots: { index: false, follow: false },
};

/** Participantes del BiciTour en vivo (código del QR del guía). Fuera del sitio público y de los idiomas. */
export default async function SesionBicitour({ params }: PageProps<"/bicitour/[codigo]">) {
  const { codigo } = await params;
  return <ParticipantExperience code={codigo.toUpperCase()} />;
}
