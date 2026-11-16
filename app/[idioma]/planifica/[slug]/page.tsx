import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Icono } from "@/components/Iconos";
import { Vinculo as Link } from "@/components/i18n/Idioma";
import { AvisoBorrador, AvisoSinTraducir, EncabezadoPagina, Enlace, Fuentes, Parrafos } from "@/components/Ui";
import { contenido, porSlug } from "@/lib/datos";
import { alternativas, textosActuales } from "@/lib/i18n/servidor";
import { esExterno, rutas } from "@/lib/rutas";

export async function generateMetadata({ params }: PageProps<"/[idioma]/planifica/[slug]">): Promise<Metadata> {
  const c = await contenido();
  const g = porSlug(c.guias, (await params).slug);
  if (!g) return {};
  return {
    title: g.titulo,
    description: g.resumen,
    alternates: await alternativas(`/planifica/${g.slug}`),
    robots: g.estado === "borrador" ? { index: false } : undefined,
  };
}

export default async function PaginaGuia({ params }: PageProps<"/[idioma]/planifica/[slug]">) {
  const { slug } = await params;
  const [c, t] = await Promise.all([contenido(), textosActuales()]);
  const tg = t.recorridos.guia;
  const g = porSlug(c.guias, slug);
  if (!g) notFound();
  const otras = c.guias.filter((o) => o.slug !== g.slug);
  const { turismo } = c.sitio;

  return (
    <>
      <EncabezadoPagina
        migas={[{ texto: t.comun.nav.planifica, url: "/planifica" }, { texto: g.titulo }]}
        kicker={t.comun.nav.planifica}
        titulo={g.titulo}
        bajada={g.resumen}
      />

      <div className="contenedor ficha">
        <div className="ficha__principal">
          <AvisoSinTraducir sinTraducir={c.sinTraducir.has(`planifica/${slug}`)} />
          {g.estado === "borrador" && <AvisoBorrador />}
          {g.secciones.map((s, i) => (
            <section key={i} aria-labelledby={s.titulo ? `seccion-${i}` : undefined}>
              {s.titulo && <h2 id={`seccion-${i}`}>{s.titulo}</h2>}
              <Parrafos texto={s.texto} className="prosa" />
            </section>
          ))}
          {g.enlaces.length > 0 && (
            <section aria-labelledby="enlaces">
              <h2 id="enlaces">{tg.enlacesUtiles}</h2>
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
            <h2 id="otras-guias">{tg.masParaTuViaje}</h2>
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
              {tg.noEncontraste} <a href={`mailto:${turismo.email}`}>{turismo.email}</a>.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
