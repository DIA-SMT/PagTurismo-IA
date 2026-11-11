import type { Metadata } from "next";
import Link from "next/link";

import { Icono } from "@/components/Iconos";
import { EncabezadoPagina, TarjetaItem } from "@/components/Ui";
import { contenido, catalogo } from "@/lib/datos";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Descubrí San Miguel",
  description: "Los imperdibles de San Miguel de Tucumán, itinerarios para tu primera visita y la historia de la ciudad donde se declaró la Independencia.",
  alternates: { canonical: "/descubri" },
};

export default async function Descubri() {
  const c = await contenido();
  const todos = catalogo(c);
  const item = (entidad: string, slug: string) => todos.find((i) => i.entidad === entidad && i.slug === slug)!;
  const imperdibles = c.lugares.filter((l) => l.imperdible);
  const itinerarios = c.recorridos.filter((r) => r.tipo === "itinerario");
  const { historia } = c.sitio;
  const categorias = c.categorias;

  return (
    <>
      <EncabezadoPagina
        migas={[{ texto: "Descubrí San Miguel" }]}
        kicker="Descubrí San Miguel"
        titulo="La ciudad donde nació la Independencia"
        bajada="Desde el año 2000, por la Ley 25.275, el casco urbano de San Miguel de Tucumán es Ciudad Histórica. Empezá por lo esencial."
      />

      <div className="contenedor bloque-interno">
        {imperdibles.length > 0 && (
          <section className="grupo" aria-labelledby="imperdibles">
            <h2 id="imperdibles">Imperdibles</h2>
            <p className="texto-suave">Si es tu primera vez, estos son los lugares para no perderte.</p>
            <ul className="items">{imperdibles.map((l) => <li key={l.slug}><TarjetaItem item={item("lugar", l.slug)} /></li>)}</ul>
          </section>
        )}

        {itinerarios.length > 0 && (
          <section className="grupo" id="primera-visita" aria-labelledby="tiempo">
            <h2 id="tiempo">¿Cuánto tiempo tenés?</h2>
            <p className="texto-suave">Itinerarios sugeridos según el tiempo disponible.</p>
            <ul className="items">{itinerarios.map((r) => <li key={r.slug}><TarjetaItem item={item("recorrido", r.slug)} /></li>)}</ul>
          </section>
        )}

        <section className="grupo" aria-labelledby="temas">
          <h2 id="temas">Elegí por lo que te gusta</h2>
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
              <p className="kicker">Historia</p>
              <h2 id="historia-titulo">Una ciudad que hizo historia</h2>
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
