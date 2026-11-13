import type { Metadata } from "next";
import Image from "next/image";

import { Vinculo as Link } from "@/components/i18n/Idioma";
import { Icono } from "@/components/Iconos";
import { EncabezadoPagina, TarjetaItem } from "@/components/Ui";
import { contenido, catalogo } from "@/lib/datos";
import { alternativas, textosActuales } from "@/lib/i18n/servidor";

export async function generateMetadata(): Promise<Metadata> {
  const t = (await textosActuales()).paginas.descubri;
  return { title: t.titulo, description: t.descripcion, alternates: await alternativas("/descubri") };
}

export default async function Descubri() {
  const [c, textos] = await Promise.all([contenido(), textosActuales()]);
  const t = textos.paginas.descubri;
  const todos = catalogo(c);
  const item = (entidad: string, slug: string) => todos.find((i) => i.entidad === entidad && i.slug === slug)!;
  const imperdibles = c.lugares.filter((l) => l.imperdible);
  const itinerarios = c.recorridos.filter((r) => r.tipo === "itinerario");
  const { historia } = c.sitio;
  const categorias = c.categorias;

  return (
    <>
      <EncabezadoPagina
        migas={[{ texto: t.titulo }]}
        kicker={t.titulo}
        titulo={t.encabezado}
        bajada={t.bajada}
      />

      <div className="contenedor bloque-interno">
        {imperdibles.length > 0 && (
          <section className="grupo" aria-labelledby="imperdibles">
            <h2 id="imperdibles">{t.imperdibles}</h2>
            <p className="texto-suave">{t.imperdiblesBajada}</p>
            <ul className="items">{imperdibles.map((l) => <li key={l.slug}><TarjetaItem item={item("lugar", l.slug)} /></li>)}</ul>
          </section>
        )}

        {itinerarios.length > 0 && (
          <section className="grupo" id="primera-visita" aria-labelledby="tiempo">
            <h2 id="tiempo">{t.tiempo}</h2>
            <p className="texto-suave">{t.tiempoBajada}</p>
            <ul className="items">{itinerarios.map((r) => <li key={r.slug}><TarjetaItem item={item("recorrido", r.slug)} /></li>)}</ul>
          </section>
        )}

        <section className="grupo" aria-labelledby="temas">
          <h2 id="temas">{t.temas}</h2>
          <ul className="temas">
            {categorias.map((c) => (
              <li key={c.id}>
                <Link className={`tema-tarjeta${c.tono !== undefined ? ` tono-${c.tono}` : ""}`} href={`/que-hacer/${c.id}`}>
                  <span className={`tema-tarjeta__media${c.tono !== undefined ? " tema-tarjeta__media--sticker" : ""}`}>
                    <Image src={c.imagen} alt="" fill sizes="(max-width: 600px) 50vw, 16vw" />
                  </span>
                  <span className="tema-tarjeta__titulo">{c.titulo} <Icono nombre="flecha" tamano={16} /></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="historia" aria-labelledby="historia-titulo">
        <div className="contenedor">
          <div className="cabecera">
            <div>
              <p className="kicker">{t.historiaKicker}</p>
              <h2 id="historia-titulo">{t.historiaTitulo}</h2>
            </div>
          </div>
          <ol className="historia__lista">
            {historia.map((f) => (
              <li key={f.anio}>
                <span className="historia__anio">{f.anio}</span>
                <h3>{f.titulo}</h3>
                <p>{f.detalle}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
