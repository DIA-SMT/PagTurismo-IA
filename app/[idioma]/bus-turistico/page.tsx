import type { Metadata } from "next";

import { TouristExperience } from "@/components/buses/tourist-bus/TouristExperience";
import { Aviso, EncabezadoPagina } from "@/components/Ui";
import { busesDisponible } from "@/lib/buses/db";
import { alternativas, idiomaActual, textosActuales } from "@/lib/i18n/servidor";

export async function generateMetadata(): Promise<Metadata> {
  const t = (await textosActuales()).buses.turistico;
  return { title: t.titulo, description: t.descripcion, alternates: await alternativas("/bus-turistico") };
}

/**
 * Bus Turístico: circuitos, próximas salidas con cupos reales y reserva. La reserva la resuelve la
 * base del bus (create_tourist_booking): una sola autoridad de escritura. Antes en busturistico.smt.gob.ar.
 */
export default async function BusTuristico() {
  const [idioma, textos] = await Promise.all([idiomaActual(), textosActuales()]);
  if (!busesDisponible()) {
    const t = textos.buses;
    return (
      <>
        <EncabezadoPagina migas={[{ texto: t.turistico.titulo }]} kicker={t.turistico.titulo} titulo={t.noDisponible.titulo} />
        <div className="contenedor bloque-interno"><Aviso tipo="alerta">{t.noDisponible.texto}</Aviso></div>
      </>
    );
  }
  return <TouristExperience idioma={idioma} />;
}
