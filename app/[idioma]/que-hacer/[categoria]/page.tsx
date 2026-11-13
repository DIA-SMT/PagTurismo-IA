import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { Icono } from "@/components/Iconos";
import { Vinculo as Link } from "@/components/i18n/Idioma";
import { EncabezadoPagina, TarjetaItem } from "@/components/Ui";
import { contenido, categoriaPorId, catalogo } from "@/lib/datos";
import { alternativas, textosActuales } from "@/lib/i18n/servidor";
import type { ItemCatalogo } from "@/lib/tipos";

export async function generateMetadata({ params }: PageProps<"/[idioma]/que-hacer/[categoria]">): Promise<Metadata> {
  const c = await contenido();
  const cat = categoriaPorId(c, (await params).categoria);
  if (!cat) return {};
  return {
    title: cat.titulo,
    description: cat.detalle,
    alternates: await alternativas(`/que-hacer/${cat.id}`),
    openGraph: { images: [cat.imagen] },
  };
}

const GRUPOS: ItemCatalogo["entidad"][] = ["lugar", "experiencia", "recorrido", "evento"];

export default async function PaginaCategoria({ params }: PageProps<"/[idioma]/que-hacer/[categoria]">) {
  const [c, t] = await Promise.all([contenido(), textosActuales()]);
  const { categoria } = await params;
  const cat = categoriaPorId(c, categoria);
  if (!cat) notFound();

  const items = catalogo(c).filter((i) => i.categorias.includes(cat.id));
  const platos = cat.id === "sabores-tucumanos" ? c.platos : [];
  const tc = t.catalogo.categoria;
  const tituloGrupo = (entidad: ItemCatalogo["entidad"]) => (entidad === "evento" ? tc.eventos : t.catalogo.tipos[entidad]);

  return (
    <>
      <EncabezadoPagina
        migas={[{ texto: t.comun.nav.queHacer, url: "/que-hacer" }, { texto: cat.titulo }]}
        kicker={t.comun.nav.queHacer}
        titulo={cat.titulo}
        bajada={cat.detalle}
      >
        <Link className="cabecera__enlace" href={`/que-hacer?categoria=${cat.id}`}>
          {tc.filtrar} <Icono nombre="flecha" tamano={18} />
        </Link>
      </EncabezadoPagina>

      <div className="contenedor bloque-interno">
        {platos.length > 0 && (
          <section className="grupo" aria-labelledby="platos-titulo">
            <h2 id="platos-titulo">{tc.platos}</h2>
            <ul className="sabores">
              {platos.map((s) => (
                <li key={s.slug}>
                  <article className={`sabor tono-${s.tono}`}>
                    <div className="sabor__imagen"><Image src={s.imagen.src} alt={s.imagen.alt} fill sizes="(max-width: 1024px) 45vw, 22vw" /></div>
                    <div className="sabor__texto">
                      <h3>{s.titulo}</h3>
                      <p>{s.detalle}</p>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          </section>
        )}

        {GRUPOS.map((entidad) => {
          const delGrupo = items.filter((i) => i.entidad === entidad);
          if (!delGrupo.length) return null;
          return (
            <section className="grupo" key={entidad} aria-labelledby={`grupo-${entidad}`}>
              <h2 id={`grupo-${entidad}`}>{tituloGrupo(entidad)}</h2>
              <ul className="items">
                {delGrupo.map((i) => <li key={i.slug}><TarjetaItem item={i} /></li>)}
              </ul>
            </section>
          );
        })}

        {items.length === 0 && platos.length === 0 && (
          <div className="vacio">
            <h2>{tc.vacioTitulo}</h2>
            <p>{tc.vacioTexto}</p>
            <div className="vacio__acciones">
              <Link className="boton boton--primario" href="/que-hacer">{tc.verTodo}</Link>
              <Link className="boton boton--claro" href="/recorridos">{t.comun.nav.recorridos}</Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
