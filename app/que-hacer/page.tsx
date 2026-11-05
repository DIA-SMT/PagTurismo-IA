import type { Metadata } from "next";
import { Suspense } from "react";

import { Catalogo } from "@/components/Catalogo";
import { EncabezadoPagina, TarjetaItem } from "@/components/Ui";
import { getCatalogo, getCategorias } from "@/lib/datos";

export const metadata: Metadata = {
  title: "Qué hacer",
  description: "Lugares, experiencias, recorridos y fechas de San Miguel de Tucumán. Buscá por tema o filtrá las propuestas gratuitas.",
  alternates: { canonical: "/que-hacer" },
};

export default function QueHacer() {
  const items = getCatalogo();
  const categorias = getCategorias().map(({ id, titulo }) => ({ id, titulo }));

  return (
    <>
      <EncabezadoPagina
        migas={[{ texto: "Qué hacer" }]}
        kicker="Qué hacer"
        titulo="Qué hacer en San Miguel de Tucumán"
        bajada="Museos, plazas, parques, recorridos guiados y fechas para agendar. Buscá por tema o mirá sólo lo gratuito."
      />
      <div className="contenedor bloque-interno">
        {/* Sin JavaScript, o mientras carga, se ve el catálogo completo. */}
        <Suspense fallback={
          <ul className="items" aria-label="Resultados">
            {items.map((i) => <li key={`${i.entidad}-${i.slug}`}><TarjetaItem item={i} /></li>)}
          </ul>
        }>
          <Catalogo items={items} categorias={categorias} />
        </Suspense>
      </div>
    </>
  );
}
