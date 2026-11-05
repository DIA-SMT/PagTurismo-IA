import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Icono } from "@/components/Iconos";
import { AvisoBorrador, EncabezadoPagina, Enlace, Fuentes, Parrafos } from "@/components/Ui";
import { getGuia, getGuias, getSitio } from "@/lib/datos";
import { esExterno, rutas } from "@/lib/rutas";

export const dynamicParams = false;

export function generateStaticParams() {
  return getGuias().map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: PageProps<"/planifica/[slug]">): Promise<Metadata> {
  const g = getGuia((await params).slug);
  if (!g) return {};
  return {
    title: g.titulo,
    description: g.resumen,
    alternates: { canonical: `/planifica/${g.slug}` },
    robots: g.estado === "borrador" ? { index: false } : undefined,
  };
}

export default async function PaginaGuia({ params }: PageProps<"/planifica/[slug]">) {
  const g = getGuia((await params).slug);
  if (!g) notFound();
  const otras = getGuias().filter((o) => o.slug !== g.slug);
  const { turismo } = getSitio();

  return (
    <>
      <EncabezadoPagina
        migas={[{ texto: "Planificá tu visita", url: "/planifica" }, { texto: g.titulo }]}
        kicker="Planificá tu visita"
        titulo={g.titulo}
        bajada={g.resumen}
      />

      <div className="contenedor ficha">
        <div className="ficha__principal">
          {g.estado === "borrador" && <AvisoBorrador />}
          {g.secciones.map((s, i) => (
            <section key={i} aria-labelledby={s.titulo ? `seccion-${i}` : undefined}>
              {s.titulo && <h2 id={`seccion-${i}`}>{s.titulo}</h2>}
              <Parrafos texto={s.texto} className="prosa" />
            </section>
          ))}
          {g.enlaces.length > 0 && (
            <section aria-labelledby="enlaces">
              <h2 id="enlaces">Enlaces útiles</h2>
              <ul className="lista-enlaces">
                {g.enlaces.map((e) => (
                  <li key={e.url}>
                    <Enlace href={e.url} className="enlace-flecha">
                      {e.texto} <Icono nombre={esExterno(e.url) ? "externo" : "flecha"} tamano={16} />
                    </Enlace>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <Fuentes fuentes={g.fuentes} validacion={g.validacion} />
        </div>

        <aside className="ficha__lateral" aria-labelledby="otras-guias">
          <div className="panel-practico">
            <h2 id="otras-guias">Más para tu viaje</h2>
            <ul className="lista-enlaces">
              {otras.map((o) => (
                <li key={o.slug}>
                  <Link className="enlace-flecha" href={rutas.guia(o.slug)}>
                    <Icono nombre={o.icono} tamano={18} /> {o.titulo}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="dato-ficha__nota">
              ¿Algo que no encontraste? Escribí a <a href={`mailto:${turismo.email}`}>{turismo.email}</a>.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
