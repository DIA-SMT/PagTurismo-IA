import type { Metadata } from "next";
import { Suspense } from "react";

import { Catalogo } from "@/components/Catalogo";
import { EncabezadoPagina, TarjetaItem } from "@/components/Ui";
import { contenido, catalogo } from "@/lib/datos";
import { alternativas, textosActuales } from "@/lib/i18n/servidor";

export async function generateMetadata(): Promise<Metadata> {
  const t = await textosActuales();
  return {
    title: t.comun.nav.queHacer,
    description: t.catalogo.descripcion,
    alternates: await alternativas("/que-hacer"),
  };
}

export default async function QueHacer() {
  const [c, t] = await Promise.all([contenido(), textosActuales()]);
  const items = catalogo(c);
  const categorias = c.categorias.map(({ id, titulo }) => ({ id, titulo }));

  return (
    <>
      <EncabezadoPagina
        migas={[{ texto: t.comun.nav.queHacer }]}
        kicker={t.comun.nav.queHacer}
        titulo={t.catalogo.titulo}
        bajada={t.catalogo.bajada}
      />
      <div className="contenedor bloque-interno">
        {/* Sin JavaScript, o mientras carga, se ve el catálogo completo. */}
        <Suspense fallback={
          <ul className="items" aria-label={t.catalogo.listaResultados}>
            {items.map((i) => <li key={`${i.entidad}-${i.slug}`}><TarjetaItem item={i} /></li>)}
          </ul>
        }>
          <Catalogo items={items} categorias={categorias} />
        </Suspense>
      </div>
    </>
  );
}
