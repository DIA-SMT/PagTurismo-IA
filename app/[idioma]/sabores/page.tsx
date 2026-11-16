import type { Metadata } from "next";
import Image from "next/image";

import { Vinculo as Link } from "@/components/i18n/Idioma";
import { Icono } from "@/components/Iconos";
import { EncabezadoPagina, TarjetaItem } from "@/components/Ui";
import { contenido, catalogo } from "@/lib/datos";
import { alternativas, textosActuales } from "@/lib/i18n/servidor";

export async function generateMetadata(): Promise<Metadata> {
  const t = (await textosActuales()).paginas.sabores;
  return { title: t.titulo, description: t.descripcion, alternates: await alternativas("/sabores") };
}

export default async function Sabores() {
  const [c, textos] = await Promise.all([contenido(), textosActuales()]);
  const t = textos.paginas.sabores;
  const platos = c.platos;
  const relacionados = catalogo(c).filter((i) => i.categorias.includes("sabores-tucumanos"));

  return (
    <>
      <EncabezadoPagina
        migas={[{ texto: textos.comun.nav.queHacer, url: "/que-hacer" }, { texto: t.titulo }]}
        kicker={t.kicker}
        titulo={t.titulo}
        bajada={t.bajada}
      />
      <div className="contenedor bloque-interno">
        <ul className="sabores">
          {platos.map((s) => (
            <li key={s.slug}>
              <article className={`sabor tono-${s.tono}`}>
                <div className="sabor__imagen"><Image src={s.imagen.src} alt={s.imagen.alt} fill sizes="(max-width: 1024px) 45vw, 22vw" /></div>
                <div className="sabor__texto">
                  <h2>{s.titulo}</h2>
                  <p>{s.detalle}</p>
                </div>
              </article>
            </li>
          ))}
        </ul>

        {relacionados.length > 0 && (
          <section className="grupo" aria-labelledby="relacionados">
            <h2 id="relacionados">{t.relacionados}</h2>
            <ul className="items">{relacionados.map((i) => <li key={`${i.entidad}-${i.slug}`}><TarjetaItem item={i} /></li>)}</ul>
          </section>
        )}

        <p className="texto-suave">
          <Link className="enlace-flecha" href="/que-hacer/sabores-tucumanos">{t.todoEnElCatalogo} <Icono nombre="flecha" tamano={16} /></Link>
        </p>
      </div>
    </>
  );
}
