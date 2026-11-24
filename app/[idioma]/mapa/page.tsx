import type { Metadata } from "next";
import { Suspense } from "react";

import { MapaInteractivo } from "@/components/MapaInteractivo";
import { EncabezadoPagina } from "@/components/Ui";
import { MAPA } from "@/lib/contenido";
import { alternativas, textosActuales } from "@/lib/i18n/servidor";

export async function generateMetadata(): Promise<Metadata> {
  const t = (await textosActuales()).mapa;
  return { title: t.titulo, description: t.metaDescripcion, alternates: await alternativas("/mapa") };
}

/** Mapa interactivo dentro del portal: los datos del mapa de la Municipalidad y los lugares del portal. */
export default async function Mapa() {
  const t = (await textosActuales()).mapa;
  return (
    <>
      <EncabezadoPagina migas={[{ texto: t.titulo }]} kicker={t.titulo} titulo={t.titulo} bajada={t.bajada} />
      <div className="contenedor bloque-interno">
        <Suspense>
          <MapaInteractivo t={t} urlMunicipal={MAPA} />
        </Suspense>
      </div>
    </>
  );
}
